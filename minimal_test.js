import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function runMinimalTest() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Chybí GEMINI_API_KEY v .env. Please ensure it's set with your new, secured key.");
    process.exit(1);
  }
  console.log("ℹ️  Starting minimal API test...");
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-vision-preview" }); // Using vision model for consistency, though a text model would also work for this simple text prompt.
    
    const prompt = "Test"; // Simplest possible ASCII prompt
    console.log(`ℹ️  Attempting API call with prompt: "${prompt}"`);
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    console.log("✅ API Call Successful. Response text:");
    console.log(response.text());
  } catch (e) {
    console.error("❌ Minimal API Test Failed:");
    console.error("   Message:", e.message);
    if (e.stack) {
      console.error("   Stack:", e.stack);
    }
    if (e.cause) {
      console.error("   Cause:", e.cause);
    }
  }
}

runMinimalTest();
