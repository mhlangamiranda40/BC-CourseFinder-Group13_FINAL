import fetch from "node-fetch";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const token = env
  .split("\n")
  .find((line) => line.startsWith("HF_TOKEN="))
  .split("=")[1]
  .trim();

console.log("Testing Hugging Face APIs...");

async function testAPI(name, url, options) {
  try {
    console.log(`\n--- Testing ${name} ---`);
    console.log("URL:", url);
    const response = await fetch(url, options);
    console.log("Status:", response.status, response.statusText);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log("Response length:", text.length);
    console.log("Response preview:", text.substring(0, 200));

    if (response.ok) {
      try {
        const json = JSON.parse(text);
        console.log("JSON response:", JSON.stringify(json, null, 2));
      } catch (e) {
        console.log("Not JSON response");
      }
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
}

// Test DialoGPT
await testAPI(
  "DialoGPT",
  "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      inputs: "Hello, how are you?",
      parameters: { max_new_tokens: 50, temperature: 0.7 },
    }),
  }
);

// Test GPT-2
await testAPI("GPT-2", "https://api-inference.huggingface.co/models/gpt2", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    inputs: "Hello, how are you?",
    parameters: { max_new_tokens: 50, temperature: 0.7 },
  }),
});

console.log("\n--- Test complete ---");
