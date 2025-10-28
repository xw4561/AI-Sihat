import { runGemini } from "./gemini.js";

//Validates and processes answers.
export async function processAnswer(question, userInput) {
  if (question.useGemini) {
    const aiResponse = await runGemini(userInput);
    return { userInput, aiResponse };
  }

  switch (question.type) {
    case "single_choice":
      if (question.options.includes(userInput)) return userInput;
      // also support numeric index (e.g., "1")
      if (!isNaN(userInput)) {
        const idx = parseInt(userInput) - 1;
        return question.options[idx] || "Invalid";
      }
      return "Invalid";

    case "multiple_choice":
      if (Array.isArray(userInput)) {
        return userInput.map(a => {
          if (question.options.includes(a)) return a;
          if (!isNaN(a)) return question.options[parseInt(a) - 1];
          return null;
        }).filter(a => a); // remove nulls
      }

      if (typeof userInput === "string") {
        // allow comma-separated or single string
        return userInput.split(",").map(a => {
          const trimmed = a.trim();
          if (question.options.includes(trimmed)) return trimmed;
          if (!isNaN(trimmed)) return question.options[parseInt(trimmed) - 1];
          return null;
        }).filter(a => a);
      }

      return [];
      
    case "number_input":
      return Number(userInput);
    case "text_input":
      return String(userInput).trim();
    default:
      return userInput;
  }
}

//Finds next question based on dataset and current ID.
import fs from "fs";

export function getNextQuestion(data, section, currentId, sessionData) {
  const questions = data[section];
  if (!questions) return null;

  const currentQ = questions.find(q => q.id === currentId);
  if (!currentQ) return null;

  const nextLogic = currentQ.next_logic;

  // 1️⃣ Sequential fallback
  if (nextLogic === undefined || nextLogic === null) {
    const idx = questions.findIndex(q => q.id === currentId);
    if (idx === -1 || idx === questions.length - 1) return null;
    return questions[idx + 1];
  }

  // 2️⃣ SYMPTOM ROUTING (after CommonIntake ID 11)
  if (nextLogic === "SYMPTOM_ROUTING") {
    const mainSymptoms = sessionData.answers["7"]; // user’s main symptoms
    if (!mainSymptoms || mainSymptoms.length === 0) return null;

    const firstSymptom = mainSymptoms[0].toLowerCase();

    const symptomRoutes = {
      fever: "Fever",
      cough: "Cough",
      flu: "Flu",
      cold: "Cold",
      nausea: "Nausea",
      vomiting: "Vomiting",
      diarrhoe: "Diarrhoe",
      constipation: "Constipation"
    };

    const nextFlow = symptomRoutes[firstSymptom];
    if (!nextFlow) return null;

    const fileData = JSON.parse(fs.readFileSync("./symptoms.json"));
    const nextSection = fileData[nextFlow];
    return nextSection ? nextSection[0] : null;
  }

  // 3️⃣ Direct ID match (e.g., next_logic: "5")
  const nextQ = questions.find(q => q.id === nextLogic);
  if (nextQ) return nextQ;

  // 4️⃣ Fallback sequential
  const idx = questions.findIndex(q => q.id === currentId);
  if (idx === -1 || idx === questions.length - 1) return null;
  return questions[idx + 1];
}

//Start a new conversation flow.
export function getFirstQuestion(data, section) {
  const questions = data[section];
  if (!questions) return null;
  return questions[0];
}