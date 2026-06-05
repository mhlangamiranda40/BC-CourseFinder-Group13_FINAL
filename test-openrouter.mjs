import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

async function testOpenRouter() {
  console.log("Testing OpenRouter API...");

  if (
    !process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY === "your_openrouter_api_key_here"
  ) {
    console.log("❌ OpenRouter API key not set");
    return;
  }

  const testMessage = "What are the requirements for software development?";

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "BC CourseFinder Chat",
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an AI career guidance assistant for Belgium Campus IT programs. Help students learn about IT careers, subject requirements, diploma vs degree options, and career paths. Be helpful, encouraging, and informative.",
            },
            {
              role: "user",
              content: testMessage,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    console.log("Status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Success! Response:", JSON.stringify(data, null, 2));

      if (data?.choices?.[0]?.message?.content) {
        console.log("✅ AI Response:", data.choices[0].message.content);
      }
    } else {
      const errorText = await response.text();
      console.log("❌ Error:", errorText);
    }
  } catch (error) {
    console.log("❌ Network error:", error.message);
  }
}

testOpenRouter();
