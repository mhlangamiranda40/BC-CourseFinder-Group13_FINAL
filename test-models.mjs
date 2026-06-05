import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const SYSTEM_PROMPT = `You are an AI career guidance assistant for Belgium Campus IT programs. Help students learn about IT careers, subject requirements, diploma vs degree options, and career paths. Be helpful, encouraging, and informative. Keep responses focused on IT education and careers at Belgium Campus.

Example responses should be informative and structured like:
"Software Development is an excellent IT career path! You'll learn programming languages like Java, Python, JavaScript, and C#. You'll need strong problem-solving skills and logical thinking. Belgium Campus offers both diploma and degree programs in Software Development that prepare you for roles like web developer, mobile app developer, or systems analyst."`;

async function testModel(modelName, inputs, useToken = false) {
  console.log(`\n--- Testing ${modelName} ---`);
  const url = `https://api-inference.huggingface.co/models/${modelName}`;

  const headers = {
    "Content-Type": "application/json",
  };

  if (useToken && process.env.HF_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.HF_TOKEN}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(inputs),
    });

    console.log("Status:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log("Success! Response:", JSON.stringify(data, null, 2));
      return data;
    } else {
      const errorText = await response.text();
      console.log("Error response:", errorText);
      return null;
    }
  } catch (error) {
    console.log("Network error:", error.message);
    return null;
  }
}

async function runTests() {
  console.log("Testing various Hugging Face models...");

  const testMessage = "What are the requirements for software development?";

  // Test GPT-Neo
  await testModel("EleutherAI/gpt-neo-125M", {
    inputs: `${SYSTEM_PROMPT}\n\nUser: ${testMessage}\n\nAssistant:`,
    parameters: {
      max_new_tokens: 150,
      temperature: 0.8,
      do_sample: true,
    },
  });

  // Test DialoGPT-small
  await testModel("microsoft/DialoGPT-small", {
    inputs: testMessage,
    parameters: {
      max_length: 100,
      temperature: 0.8,
      do_sample: true,
    },
  });

  // Test with token
  if (process.env.HF_TOKEN) {
    await testModel(
      "microsoft/DialoGPT-medium",
      {
        inputs: {
          past_user_inputs: [],
          generated_responses: [],
          text: testMessage,
        },
        parameters: {
          max_length: 1000,
          temperature: 0.7,
        },
      },
      true
    );
  }

  // Test a different conversational model
  await testModel("facebook/blenderbot-400M-distill", {
    inputs: {
      past_user_inputs: [],
      generated_responses: [],
      text: testMessage,
    },
    parameters: {
      max_length: 1000,
      temperature: 0.7,
    },
  });

  console.log("\n--- Test complete ---");
}

runTests().catch(console.error);
