/**
 * Gemini Service
 * Handles AI-powered symptom analysis and translation using Google's Gemini API
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
 * Translates a given text string to English using Gemini.
 * @param {string} text - The text to translate.
 * @returns {Promise<string>} The translated English text.
 */
async function translateToEnglish(text) {
  if (!ai) {
    console.warn("Gemini translation unavailable - API key not configured.");
    return text; // Return original text if AI is not available
  }
  
  // Do not attempt to translate empty, null, or undefined strings
  if (!text || typeof text !== 'string' || text.trim() === "") {
    return text;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Using flash for fast translation
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Translate the following text to English. 
If the text is already in English, return the original text. 
Do not add any preamble, commentary, or quotation marks.

Text: "${text}"`,
            },
          ],
        },
      ],
      // Add safety settings to be less restrictive if needed, though translation is usually safe
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    });

    const output =
      response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return output || text; // Fallback to original text if translation fails

  } catch (error) {
    console.error("Gemini Translation API error:", error);
    return text; // Fallback to original text on error
  }
}

/**
 * Translates a given text string to a target language code using Gemini.
 * @param {string} text - The text to translate.
 * @param {string} targetLang - The target language code (e.g., 'ms', 'zh').
 * @returns {Promise<string>} The translated text.
 */
async function translateText(text, targetLang) {
  if (!ai) {
    console.warn("Gemini translation unavailable - API key not configured.");
    return text;
  }
  // If no text, no target lang, or target is English, return original text
  if (!text || typeof text !== 'string' || text.trim() === "" || !targetLang || targetLang === 'en') {
    return text;
  }

  const langMap = {
    'my': 'Malay',
    'zh': 'Chinese (Simplified)',
    'en': 'English'
  };
  const targetLanguage = langMap[targetLang] || targetLang;
  
  // If target is somehow English, use the other function's more specific prompt
  if (targetLanguage === 'English') {
    return translateToEnglish(text);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{
        text: `Translate the following English text to ${targetLanguage}. 
Do not add any preamble, commentary, or quotation marks. 
Just return the translated text.
Text: "${text}"`
      }] }],
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    });

    const output = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return output || text; // Fallback to original text if translation fails
  } catch (error) {
    console.error("Gemini Translation API error:", error);
    return text; // Fallback to original text on error
  }
}

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
  runGemini,  // Keep for backward compatibility
  translateToEnglish,
  translateText // <-- Export the new function
};