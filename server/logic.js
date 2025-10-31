import { runGemini } from "./gemini.js";
import fs from "fs";

/**
 * validateAnswer(question, input)
 * Returns true if input matches expected type for question.
 */
export function validateAnswer(question, input) {
  if (!question) return false;

  switch (question.type) {
    case "text_input":
      return typeof input === "string" && input.trim() !== "";

    case "number_input":
      // Allow numeric strings and numbers
      return input !== null && input !== undefined && !isNaN(Number(input));

    case "single_choice":
      if (typeof input === "string" && question.options?.includes(input)) return true;
      // allow index (1-based)
      if (!isNaN(input)) {
        const idx = parseInt(input, 10) - 1;
        return question.options && question.options[idx] !== undefined;
      }
      return false;

    case "multiple_choice":
      if (Array.isArray(input)) return input.length > 0;
      if (typeof input === "string") return input.trim() !== "";
      return false;

    default:
      return true;
  }
}

/**
 * processAnswer(question, userInput)
 * Normalize and return a processed answer object or value.
 */
export async function processAnswer(question, userInput) {
  if (!question) return userInput;

  if (question.useGemini) {
    // returns an object containing userInput and the AI response
    const aiResponse = await runGemini(String(userInput));
    return { userInput: String(userInput), aiResponse };
  }

  switch (question.type) {
    case "single_choice":
      if (typeof userInput === "string" && question.options?.includes(userInput)) return userInput;
      if (!isNaN(userInput)) {
        const idx = parseInt(userInput, 10) - 1;
        return question.options ? question.options[idx] : null;
      }
      return userInput;

    case "multiple_choice":
      if (Array.isArray(userInput)) {
        // return only valid options
        return userInput
          .map(a => (question.options?.includes(a) ? a : null))
          .filter(Boolean);
      }
      if (typeof userInput === "string") {
        // support comma-separated values
        return userInput
          .split(",")
          .map(s => s.trim())
          .filter(s => question.options?.includes(s));
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

/**
 * getFirstQuestion(data, section)
 */
export function getFirstQuestion(data, section) {
  if (!data || !data[section]) return null;
  return data[section][0] || null;
}

// logic.js
export function getNextQuestion(data, section, currentId, session) {
  const questions = data[section];
  if (!questions) return null;

  const currentQ = questions.find(q => q.id === currentId);
  if (!currentQ) return null;

  const answers = session?.answers || {};

  /** ✅ 1) direct next_logic (within the same section) */
  if (
    currentQ.next_logic &&
    typeof currentQ.next_logic === "string" &&
    // MODIFIED: Added checks to ignore all custom/section logic strings
    !["SYMPTOM_ROUTING", "BRANCH_ON_PHLEGM", "AppFlow"].includes(currentQ.next_logic) &&
    !currentQ.next_logic.includes("_REC")
  ) {
    // This block now ONLY handles jumps to other questions in the SAME section
    const target = questions.find(q => q.id === currentQ.next_logic);
    if (target) return target;
  }

  /** ✅ 1.1) object mapping next_logic (A1, A2 cases) */
  if (
    currentQ.next_logic &&
    typeof currentQ.next_logic === "object" &&
    currentQ.next_logic !== null
  ) {
    const rawAns = answers[currentId];
    const userAns =
      typeof rawAns === "object" && rawAns?.userInput
        ? rawAns.userInput
        : rawAns;

    const nextId = currentQ.next_logic[userAns];
    if (nextId) {
      // This can also be a section jump, so check data keys first
      if (data[nextId]) {
        session.section = nextId;
        return data[nextId][0];
      }
      // Otherwise, find in current section
      const mapped = questions.find(q => q.id === nextId);
      if (mapped) return mapped;
    }
  }

  /** ✅ 2) SYMPTOM ROUTING */
  if (currentQ.next_logic === "SYMPTOM_ROUTING") {
    const storedSymptoms = answers["8"];
    if (!storedSymptoms || storedSymptoms.length === 0) return null;

    const first = String(storedSymptoms[0]).toLowerCase();
    const nextSectionName = {
      fever: "Fever",
      cough: "Cough",
      flu: "Flu",
      cold: "Cold",
      diarrhoe: "Diarrhoe",
      constipation: "Constipation",
      "nausea and vomiting": "Nausea and Vomiting",
      indigestion: "Indigestion",
      bloat: "Bloat",
      "menstrual pain": "Menstrual Pain",
      "joint pain": "Joint Pain",
      "muscle pain": "Muscle Pain",
      "itchy skin": "Itchy Skin",
    }[first];

    if (!nextSectionName) return null;

    session.section = nextSectionName;
    return data[nextSectionName] ? data[nextSectionName][0] : null; 
  }

  /** ✅ 2.1) [!!! NEW BLOCK !!!] SECTION JUMP LOGIC (e.g., to AppFlow) */
  // This handles direct string jumps to other sections (like R1 -> AppFlow)
  if (
    currentQ.next_logic &&
    typeof currentQ.next_logic === "string" &&
    data[currentQ.next_logic] // Check if the next_logic value is a key in the main data object
  ) {
    const nextSectionName = currentQ.next_logic;

    // Make sure it's not one of the *other* logic triggers
    if (
      !["SYMPTOM_ROUTING", "BRANCH_ON_PHLEGM"].includes(nextSectionName) &&
      !nextSectionName.includes("_REC")
    ) {
      session.section = nextSectionName;
      return data[nextSectionName] ? data[nextSectionName][0] : null;
    }
  }


  /**
   * ✅ 2.5) CUSTOM LOGIC BLOCK (Phlegm & Recommendation)
   */

  // Handle Cough Phlegm Branch
  if (currentQ.next_logic === "BRANCH_ON_PHLEGM") {
    const rawAns = answers["CA2"]; // Answer to the phlegm question
    const userAns =
      typeof rawAns === "object" && rawAns?.userInput
        ? rawAns.userInput
        : rawAns;
    
    const targetId = (String(userAns).toLowerCase() === "yes") ? "CA3_WET" : "CA3_DRY";
    const targetQ = data[section].find(q => q.id === targetId);
    if (targetQ) return targetQ;
  }

  // Handle ALL recommendation routing based on duration (id '9')
  if (
    currentQ.next_logic &&
    typeof currentQ.next_logic === "string" &&
    currentQ.next_logic.includes("_REC")
  ) {
    const rawAns = answers["9"]; 
    if (!rawAns) {
      session.section = "AppFlow";
      return data["AppFlow"][0];
    }
    
    const durationValue =
      typeof rawAns === "object" && rawAns?.userInput
        ? rawAns.userInput
        : rawAns;

    const route = getDurationRecommendation(durationValue); // "R1" or "R2"
    let targetId = route; 

    if (currentQ.next_logic === "CA4_REC_WET") {
      targetId = route === "R1" ? "CA_R1_WET" : "CA_R2_WET";
    } else if (currentQ.next_logic === "CA4_REC_DRY") {
      targetId = route === "R1" ? "CA_R1_DRY" : "CA_R2_DRY";
    }
    
    if (targetId) {
      const recQ = data[section].find(q => q.id === targetId);
      if (recQ) {
        return recQ;
      }
    }
  }

  /** ✅ 3) Sequential fallback */
  const idx = questions.findIndex(q => q.id === currentId);
  if (idx === -1) return null;

  let candidate = questions[idx + 1] || null;
  if (!candidate) {
    const symptomSections = [
        "Fever", "Flu", "Cough", "Cold", "Diarrhoe", "Constipation",
        "Nausea and Vomiting", "Indigestion", "Bloat", "Menstrual Pain",
        "Joint Pain", "Muscle Pain", "Itchy Skin"
    ];
    if (symptomSections.includes(section)) {
      session.section = "AppFlow";
      return data["AppFlow"][0];
    }
    return null;
  }

  /** ✅ skip pregnancy if male */
  if (candidate.id === "7") {
    const genderRaw = answers["6"];
    const gender =
      typeof genderRaw === "object" && genderRaw?.userInput
        ? genderRaw.userInput
        : genderRaw;

    if (String(gender).toLowerCase() === "male") {
      candidate = questions[idx + 2] || null;
    }
  }

  /** ✅ skip Pickup if Delivery */
  if (candidate.id === "A3") {
    const choiceRaw = answers["A2"];
    const choice =
      typeof choiceRaw === "object" && choiceRaw?.userInput
        ? choiceRaw.userInput
        : choiceRaw;

    if (String(choice).toLowerCase() === "delivery") {
      candidate = questions.find(q => q.id === "A4") || null;
    }
  }

  return candidate;
}

export function getDurationRecommendation(answer) {
  const short = ["less than 1 day", "2 days"];
  const long = ["3 days", "More than 3 days"];

  if (short.includes(String(answer).toLowerCase())) return "R1";
  if (long.includes(String(answer).toLowerCase())) return "R2";

  return null;
}
