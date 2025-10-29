/**
 * Gemini Service
 * Handles AI-powered symptom analysis using Google's Gemini API
 */

const { GoogleGenAI } = require("@google/genai");
const dotenv = require("dotenv");

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ Missing GEMINI_API_KEY in .env file - AI features will be disabled");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Generate AI analysis for user's symptom description
 * @param {string} userInput - User's symptom description
 * @returns {Promise<string>} AI-generated analysis and suggestions
 */
async function analyzeSymptoms(userInput) {
  if (!ai) {
    return "AI analysis unavailable - API key not configured.";
  }

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

    // Extract text safely from candidates
    const output =
      response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return output || "No analysis generated.";

  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I couldn't get a response from Gemini.";
  }
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use analyzeSymptoms instead
 */
async function runGemini(userInput) {
  return analyzeSymptoms(userInput);
}

module.exports = {
  analyzeSymptoms,
  runGemini  // Keep for backward compatibility
};
