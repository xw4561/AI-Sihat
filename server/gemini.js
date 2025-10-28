import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";  // Load environment variables from .env file

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Missing GEMINI_API_KEY in .env file");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

export async function runGemini(userInput) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Summarize the user's symptom description and briefly suggest possible over-the-counter relief options (in under 80 words). 
Avoid medical disclaimers or repetition. Keep it short and clear.\n\nSymptom description: "${userInput}"`,
            },
          ],
        },
      ],
    });

    //Log full raw response
    //console.log("Raw Gemini response:", response);

    //Extract text safely from candidates
    const output =
      response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return output || "No analysis generated.";

  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I couldn't get a response from Gemini.";
  }
}