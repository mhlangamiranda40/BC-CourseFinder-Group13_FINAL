import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { searchKnowledgeBase } from "./knowledgeBase.js";

dotenv.config();
console.log("Gemini Key Loaded:", !!process.env.GEMINI_API_KEY);
console.log("OpenRouter Key Loaded:", !!process.env.OPENROUTER_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Send the login page when someone visits the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Serve static files (CSS, images, HTML pages) after the custom root route
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

// Ethical guardrails appended to the system prompt
const ETHICAL_GUARDRAILS = `
You must also adhere strictly to these Ethical Guardrails:
1. REFUSALS: Never complete assignments, give direct exam answers, predict results, or provide medical/legal/financial advice. Decline politely and explain why.
2. HUMAN GUIDANCE: If a student expresses emotional distress, medical concerns, or mentions self-harm, immediately suggest speaking to a teacher, school counselor, or trusted adult.
3. UNCERTAINTY: Do not guarantee university placement. State clearly when information might change and encourage checking official university websites.
4. DECISION SUPPORT: Function as a guide, not a decision-maker. Present options rather than commands.
`;

const FULL_SYSTEM_INSTRUCTION = SYSTEM_PROMPT + "\n\n" + ETHICAL_GUARDRAILS;

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: Google Gemini via the CORRECT modern REST API (v1beta, generateContent)
// Get a FREE key at https://aistudio.google.com/app/apikey
// ─────────────────────────────────────────────────────────────────────────────
async function tryGemini(enrichedMessage, history = []) {
  if (!process.env.GEMINI_API_KEY) return null;

  // Build the conversation history in Gemini's format
  const geminiHistory = history.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

  // Add the current user message at the end
  geminiHistory.push({ role: "user", parts: [{ text: enrichedMessage }] });

  // Models to try in order of preference (all free on Google AI Studio)
  const modelsToTry = [
  "gemini-2.5-flash",
  "gemini-2.5-pro"
];
  for (const model of modelsToTry) {
    try {
      console.log(`Trying Gemini model: ${model}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: FULL_SYSTEM_INSTRUCTION }]
          },
          contents: geminiHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          console.log(`✅ Gemini ${model} succeeded`);
          return reply;
        }
        console.warn(`Gemini ${model} returned no text, trying next model.`);
      } else {
        const errorBody = await response.json().catch(() => ({}));
        console.warn(`Gemini ${model} failed with status ${response.status}:`, JSON.stringify(errorBody));
        // If it's an auth error (400/403), stop trying — wrong key
        if (response.status === 400 || response.status === 403) break;
      }
    } catch (e) {
      console.error(`Gemini ${model} exception:`, e.message);
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: OpenRouter — free models (no credits needed for some)
// Sign up at https://openrouter.ai and get a free key
// Free models: google/gemini-flash-1.5, meta-llama/llama-3-8b-instruct:free
// ─────────────────────────────────────────────────────────────────────────────
async function tryOpenRouter(messages) {
  if (!process.env.OPENROUTER_API_KEY) return null;

  // These models are available on the free tier of OpenRouter (no credits needed)
  const freeModels = [
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.3-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free"
];

  for (const model of freeModels) {
    try {
      console.log(`Trying OpenRouter model: ${model}`);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3001",
          "X-Title": "BC CourseFinder"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1200
        })
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.choices?.[0]?.message?.content) {
        console.log(`✅ OpenRouter ${model} succeeded`);
        return data.choices[0].message.content;
      }

      console.warn(`OpenRouter ${model} failed (${res.status}):`, JSON.stringify(data));
      // 402 = credits needed for this model, try next
      // 429 = rate limit, try next
      // 400 = bad auth, stop all
      if (res.status === 400 || res.status === 401) break;
    } catch (e) {
      console.error(`OpenRouter ${model} exception:`, e.message);
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: HuggingFace Inference API (free with account token)
// Get a free token at https://huggingface.co/settings/tokens
// ─────────────────────────────────────────────────────────────────────────────
async function tryHuggingFace(enrichedMessage) {
  if (!process.env.HF_TOKEN) return null;

  const prompt = `<s>[INST] ${FULL_SYSTEM_INSTRUCTION}\n\nStudent question: ${enrichedMessage} [/INST]`;

  try {
    console.log("Trying HuggingFace Mistral fallback...");
    const res = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.HF_TOKEN}`
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 1000 }
        })
      }
    );

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.[0]?.generated_text || "";
      const reply = rawText.split("[/INST]").pop()?.trim();
      if (reply) {
        console.log("✅ HuggingFace succeeded");
        return reply;
      }
    } else {
      console.warn("HuggingFace failed:", res.status);
    }
  } catch (e) {
    console.error("HuggingFace exception:", e.message);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main chat endpoint
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { message: userMessage, history = [] } = req.body;

  if (!userMessage || typeof userMessage !== "string" || userMessage.trim() === "") {
    return res.status(400).json({
      reply: "Please provide a valid question so I can assist you."
    });
  }

  // Search the local knowledge base first
  const knowledgeContext = searchKnowledgeBase(userMessage);
  if (knowledgeContext) {
    console.log("Knowledge base match found for:", userMessage);
  } else {
    console.log("No knowledge base match for:", userMessage);
  }

  // Enrich the user message with knowledge base context if available
  const enrichedMessage = knowledgeContext
    ? `Use the following Belgium Campus facts to answer accurately:\n\n${knowledgeContext}\n\nStudent question: ${userMessage}`
    : userMessage;

  try {
    // TIER 1: Google Gemini (primary — free with AI Studio key)
    const geminiReply = await tryGemini(enrichedMessage, history);
    if (geminiReply) return res.json({ reply: geminiReply });

    // TIER 2: OpenRouter free models
    const openRouterMessages = [
      { role: "system", content: FULL_SYSTEM_INSTRUCTION },
      ...history,
      { role: "user", content: enrichedMessage }
    ];
    const openRouterReply = await tryOpenRouter(openRouterMessages);
    if (openRouterReply) return res.json({ reply: openRouterReply });

    // TIER 3: HuggingFace Mistral
    const hfReply = await tryHuggingFace(enrichedMessage);
    if (hfReply) return res.json({ reply: hfReply });

    // All tiers failed
    throw new Error("All AI endpoints failed to generate a response.");

  } catch (error) {
    console.error("System Failure in /api/chat:", error.message);
    res.status(500).json({
      reply: "⚠️ I'm temporarily unable to connect to the AI service. The knowledge base is still working — try asking: 'What subjects do I need for IT?' or 'Tell me about Belgium Campus programs.' You can also visit the Belgium Campus website for real-time support."
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// API health check endpoint (useful for debugging)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  res.json({
    gemini: !!process.env.GEMINI_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    huggingface: !!process.env.HF_TOKEN,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`BC CourseFinder running on port ${PORT}`));
app.get("/api/debug", (req, res) => {
  res.json({
    GEMINI_API_KEY_EXISTS: !!process.env.GEMINI_API_KEY,
    OPENROUTER_API_KEY_EXISTS: !!process.env.OPENROUTER_API_KEY,
    GEMINI_LENGTH: process.env.GEMINI_API_KEY?.length || 0,
    OPENROUTER_LENGTH: process.env.OPENROUTER_API_KEY?.length || 0
  });
});