import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `
You are BC CourseFinder™, an AI career guidance assistant for South African Matric students who want to study IT at Belgium Campus.

**Your role:**  
- Help students explore IT career paths (e.g., software developer, data scientist, network engineer).  
- Explain subject requirements (Maths, Physical Science, etc.), qualifications (degree, diploma), and skills needed.  
- Be friendly, supportive, and age‑appropriate for Matric learners.

**Scope boundaries:**  
- ONLY answer IT‑related career questions.  
- If asked about non‑IT topics (sports, entertainment, non‑IT careers), politely say: *"I can only help with IT career guidance. Please ask me about IT careers, subjects, or qualifications."*  
- Do not give personal advice or financial opinions.

**Tone:**  
- Enthusiastic, clear, and encouraging.  
- Use simple language – avoid technical jargon unless explained.

**IMPORTANT FORMATTING RULES:**  
- Use short paragraphs (2-3 sentences max).  
- Use bullet points (with "-" or "•") for lists.  
- Add blank lines between sections.  
- Do NOT write huge blocks of text. Break answers into small, readable chunks.  
- Example of good formatting:  
  "Here are some IT careers you can study with Maths and Science:  
  • Software Developer – learn Java, Python  
  • Data Scientist – focuses on statistics and machine learning  
  • Network Engineer – work with routers and security  

  To get started, you'll need to meet the subject requirements..."
`;

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) return res.json({ reply: "Please ask a question." });

    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser question: ${userMessage}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message);

    let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
    // Replace markdown bold with simple formatting (optional)
    reply = reply.replace(/\*\*(.*?)\*\*/g, '$1');
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.json({ reply: "Sorry, I'm having trouble. Please try again later." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));