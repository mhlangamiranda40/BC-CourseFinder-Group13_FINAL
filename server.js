import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { searchKnowledgeBase } from "./knowledgeBase.js";

dotenv.config();

// Resolve __dirname for ES module files since it is not available by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Serve all files inside the public folder as static assets
// MOVED THIS LINE AFTER THE ROOT ROUTE (see below)
// app.use(express.static(path.join(__dirname, "public")));

// Send the login page when someone visits the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Now serve static files (CSS, images, chat.html, etc.) AFTER the custom root route
app.use(express.static(path.join(__dirname, "public")));

// System prompt that defines the bot identity, role, scope, and formatting rules
const SYSTEM_PROMPT = `
You are BC CourseFinder™, an AI career guidance assistant for South African Matric students who want to study IT at Belgium Campus.

**Your role:**  
- Help students explore IT career paths (e.g., software developer, data scientist, network engineer).  
- Explain subject requirements (Maths, Physical Science, etc.), qualifications (degree, diploma), and skills needed.  
- Reference the APS (Admission Points Score) calculator when discussing eligibility. Students can use the "My APS" button on the home page to calculate their APS and see which Belgium Campus programs they qualify for.
- Be friendly, supportive, and age-appropriate for Matric learners.

**APS Calculator context:**  
- If a student mentions their APS score, endorsement, or course eligibility, reference the official APS Calculator results from their profile (stored locally on the browser).
- Provide personalized guidance based on their APS score and endorsement type.
- For low APS: "Based on your profile, the Diploma in IT may be your best route."
- For high APS + strong Maths: "You are a strong candidate for the Bachelor of Computing."
- Always suggest they verify requirements on the official Belgium Campus website.

**Scope boundaries:**  
- ONLY answer IT-related career questions.  
- If asked about non-IT topics (sports, entertainment, non-IT careers), politely say: "I can only help with IT career guidance. Please ask me about IT careers, subjects, or qualifications."  
- Do not give personal advice or financial opinions.

**Tone:**  
- Enthusiastic, clear, and encouraging.  
- Use simple language and avoid technical jargon unless explained.

**IMPORTANT FORMATTING RULES:**  
- Use short paragraphs of 2 to 3 sentences max.  
- Use bullet points for lists.  
- Add blank lines between sections.  
- Do NOT write huge blocks of text.
- Do NOT show your thinking or drafting process. Only show the final answer.
`;

// Ethical guardrails appended to the system prompt to keep the bot responsible and honest
const ETHICAL_GUARDRAILS = `
You must also adhere strictly to these Ethical Guardrails:
1. REFUSALS: Never complete assignments, give direct exam answers, predict results, or provide medical/legal/financial advice. Decline politely and explain why.
2. HUMAN GUIDANCE: If a student expresses emotional distress, medical concerns, or mentions self-harm, immediately suggest speaking to a teacher, school counselor, or trusted adult.
3. UNCERTAINTY: Do not guarantee university placement. State clearly when information might change and encourage checking official university websites.
4. DECISION SUPPORT: Function as a guide, not a decision-maker. Present options rather than commands.
`;

// Combined instruction string passed to Gemini as the system instruction
const FULL_GEMINI_INSTRUCTION = SYSTEM_PROMPT + "\n\n" + ETHICAL_GUARDRAILS;

// Attempts to get a response from OpenRouter or HuggingFace as fallback engines
async function tryOpenRouterResponse(messages, maxTokens) {
  try {
    console.log(`OpenRouter attempt with max_tokens=${maxTokens}`);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: messages,
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.choices?.[0]?.message?.content) {
      return { success: true, reply: data.choices[0].message.content };
    }

    if (res.status === 402) {
      console.warn(`OpenRouter credit limit reached at max_tokens=${maxTokens}:`, JSON.stringify(data));
      return { success: false, retryWithLowerTokens: true };
    }

    console.error("OpenRouter response error:", data || await res.text());
    return { success: false, retryWithLowerTokens: false };
  } catch (e) {
    console.error("OpenRouter error:", e.message);
    return { success: false, retryWithLowerTokens: false };
  }
}

async function getAIResponse(userMessage, history = [], knowledgeContext = "") {

  // If the knowledge base returned relevant facts, prepend them to the user message
  const enrichedMessage = knowledgeContext
    ? `Use the following Belgium Campus facts to answer accurately:\n\n${knowledgeContext}\n\nStudent question: ${userMessage}`
    : userMessage;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: enrichedMessage }
  ];

  // Tier 2: Try OpenRouter using the free Gemini 3.5 Flash model with a token cap suited to current credits
  if (process.env.OPENROUTER_API_KEY) {
    const tokenCaps = [1200, 800, 600, 400, 200, 100];
    for (const maxTokens of tokenCaps) {
      const attempt = await tryOpenRouterResponse(messages, maxTokens);
      if (attempt.success) {
        return attempt.reply;
      }
      if (!attempt.retryWithLowerTokens) {
        break;
      }
    }
  }

  // Tier 3: Try HuggingFace Mistral as the final fallback if the token is available
  if (process.env.HF_TOKEN) {
    try {
      const res = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.HF_TOKEN}`
        },
        body: JSON.stringify({
          inputs: `<s>[INST] ${SYSTEM_PROMPT} \n\n User: ${enrichedMessage} [/INST]`,
          parameters: {
            max_new_tokens: 1500   // Added to prevent truncation in HF
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data[0].generated_text.split('[/INST]').pop().trim();
      }
    } catch (e) {
      console.error("HF error:", e.message);
    }
  }

  // Return null if both fallback engines fail so the caller can handle it
  return null;
}

// Chat endpoint that receives a user message and returns an AI reply
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  // Reject empty or invalid messages before hitting any AI engine
  if (!userMessage || typeof userMessage !== "string" || userMessage.trim() === "") {
    return res.status(400).json({
      reply: "Please provide a valid question so I can assist you."
    });
  }

  // Search the knowledge base using the user message and retrieve any matching facts
  const knowledgeContext = searchKnowledgeBase(userMessage);

  // Log whether the knowledge base found relevant content for this question
  if (knowledgeContext) {
    console.log("Knowledge base match found for:", userMessage);
  } else {
    console.log("No knowledge base match for:", userMessage);
  }

  // If the knowledge base returned facts, inject them into the prompt before the user message
  const enrichedMessage = knowledgeContext
    ? `Use the following Belgium Campus facts to answer accurately:\n\n${knowledgeContext}\n\nStudent question: ${userMessage}`
    : userMessage;

  try {

    // Tier 1: Try Google Gemini as the primary AI engine
    if (process.env.GEMINI_API_KEY) {
      const modelsToTry = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-mini", "text-bison-001"];
      let geminiSucceeded = false;

      const useBearer = process.env.GEMINI_API_KEY?.startsWith('AQ.') || process.env.GEMINI_API_KEY?.startsWith('ya29.');
      for (const model of modelsToTry) {
        const baseUrl = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateText`;
        const url = useBearer ? baseUrl : `${baseUrl}?key=${process.env.GEMINI_API_KEY}`;
        const headers = {
          "Content-Type": "application/json"
        };
        if (useBearer) {
          headers.Authorization = `Bearer ${process.env.GEMINI_API_KEY}`;
        }
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: {
              text: `${FULL_GEMINI_INSTRUCTION}\n\n${enrichedMessage}`
            },
            temperature: 0.3,
            maxOutputTokens: 1500
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiReply = data?.candidates?.[0]?.output || data?.output?.[0]?.content || data?.output;
          if (aiReply) {
            geminiSucceeded = true;
            return res.json({ reply: aiReply });
          }
          console.warn(`Gemini model ${model} returned no output; trying next model.`);
        } else {
          let errorBody;
          try {
            errorBody = await response.json();
          } catch (err) {
            errorBody = await response.text();
          }
          console.warn(`Gemini API issue for model ${model}:`, response.status, errorBody);
        }
      }

      if (!geminiSucceeded) {
        console.warn("Gemini API issue for all models. Attempting model list for diagnostics...");
        try {
          const listUrl = `https://generativelanguage.googleapis.com/v1beta2/models?key=${process.env.GEMINI_API_KEY}`;
          const listResponse = await fetch(listUrl);
          const listData = await listResponse.json();
          console.warn("Available Google models:", JSON.stringify(listData, null, 2));
        } catch (listError) {
          console.warn("Failed to list Google models:", listError.message || listError);
        }
        console.warn("Falling back to alternative models...");
      }
    }

    // Tier 2 and 3: Try OpenRouter then HuggingFace via the getAIResponse function
    const fallbackReply = await getAIResponse(userMessage, [], knowledgeContext);

    if (fallbackReply) {
      return res.json({ reply: fallbackReply });
    }

    // If every engine fails throw an error to trigger the catch block below
    throw new Error("All AI endpoints failed to generate a response.");

  } catch (error) {
    console.error("System Failure in /api/chat:", error.message);

    // Tier 4: Return a friendly error message so the UI does not break
    res.status(500).json({
      reply: "⚠️ I'm temporarily unable to generate responses (API credits exhausted). The knowledge base is still working! Try asking: 'What subjects do I need for IT?' or 'Tell me about Belgium Campus programs.' For real-time support, visit the Belgium Campus website."
    });
  }
});

// Start the Express server on the configured port or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BC CourseFinder Secure Agent running on port ${PORT}`));