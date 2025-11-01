/**
 * Chat Service (Merged)
 * Handles all chat flow logic, question routing, and answer processing
 */

const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const sessionService = require("./sessionService");
const { runGemini } = require("./geminiService");

// Load symptom data once
let symptomsData = null;

/* -------------------- Data Loading -------------------- */
function loadSymptomsData() {
  if (!symptomsData) {
    symptomsData = JSON.parse(fs.readFileSync("./data/symptoms.json", "utf8"));
  }
  return symptomsData;
}

/* -------------------- Validation -------------------- */
function validateAnswer(question, input) {
  if (!question) return false;

  switch (question.type) {
    case "text_input":
      return typeof input === "string" && input.trim() !== "";

    case "number_input":
      return input !== null && input !== undefined && !isNaN(Number(input));

    case "single_choice":
      if (typeof input === "string" && question.options?.includes(input)) return true;
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

/* -------------------- Process Answer -------------------- */
async function processAnswer(question, userInput) {
  if (!question) return userInput;

  if (question.useGemini) {
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
        return userInput
          .map(a => (question.options?.includes(a) ? a : null))
          .filter(Boolean);
      }
      if (typeof userInput === "string") {
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

/* -------------------- Get First Question -------------------- */
function getFirstQuestion(section) {
  const data = loadSymptomsData();
  const questions = data[section];
  if (!questions || questions.length === 0) return null;
  return questions[0];
}

/* -------------------- Get Duration Recommendation -------------------- */
function getDurationRecommendation(answer) {
  const short = ["less than 1 day", "2 days"];
  const long = ["3 days", "more than 3 days"];

  if (short.includes(String(answer).toLowerCase())) return "R1";
  if (long.includes(String(answer).toLowerCase())) return "R2";
  return null;
}

/* -------------------- Get Next Question -------------------- */
function getNextQuestion(section, currentId, sessionData) {
  const data = loadSymptomsData();
  const questions = data[section];
  if (!questions) return null;

  const currentQ = questions.find(q => q.id === currentId);
  if (!currentQ) return null;
  const answers = sessionData?.answers || {};

  // Direct string jump within same section
  if (
    currentQ.next_logic &&
    typeof currentQ.next_logic === "string" &&
    !["SYMPTOM_ROUTING", "BRANCH_ON_PHLEGM", "AppFlow"].includes(currentQ.next_logic) &&
    !currentQ.next_logic.includes("_REC")
  ) {
    const target = questions.find(q => q.id === currentQ.next_logic);
    if (target) return target;
  }

  // Object mapping (conditional)
  if (typeof currentQ.next_logic === "object" && currentQ.next_logic !== null) {
    const rawAns = answers[currentId];
    const userAns = typeof rawAns === "object" && rawAns?.userInput ? rawAns.userInput : rawAns;

    const nextId = currentQ.next_logic[userAns];
    if (nextId) {
      if (data[nextId]) {
        sessionData.section = nextId;
        return data[nextId][0];
      }
      const mapped = questions.find(q => q.id === nextId);
      if (mapped) return mapped;
    }
  }

  // Symptom routing
  if (currentQ.next_logic === "SYMPTOM_ROUTING") {
    const storedSymptoms = answers["8"];
    if (!storedSymptoms || storedSymptoms.length === 0) return null;

    const first = String(storedSymptoms[0]).toLowerCase();
    const routes = {
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
      "itchy skin": "Itchy Skin"
    };

    const nextSection = routes[first];
    if (!nextSection) return null;
    sessionData.section = nextSection;
    return data[nextSection] ? data[nextSection][0] : null;
  }

  // Branch on phlegm (cough-specific)
  if (currentQ.next_logic === "BRANCH_ON_PHLEGM") {
    const rawAns = answers["CA2"];
    const userAns = typeof rawAns === "object" && rawAns?.userInput ? rawAns.userInput : rawAns;
    const targetId = String(userAns).toLowerCase() === "yes" ? "CA3_WET" : "CA3_DRY";
    return data[section].find(q => q.id === targetId);
  }

  // Recommendation logic
  if (currentQ.next_logic && currentQ.next_logic.includes("_REC")) {
    const rawAns = answers["9"];
    if (!rawAns) {
      sessionData.section = "AppFlow";
      return data["AppFlow"][0];
    }

    const durationValue =
      typeof rawAns === "object" && rawAns?.userInput ? rawAns.userInput : rawAns;
    const route = getDurationRecommendation(durationValue);
    let targetId = route;

    if (currentQ.next_logic === "CA4_REC_WET") {
      targetId = route === "R1" ? "CA_R1_WET" : "CA_R2_WET";
    } else if (currentQ.next_logic === "CA4_REC_DRY") {
      targetId = route === "R1" ? "CA_R1_DRY" : "CA_R2_DRY";
    }

    return data[section].find(q => q.id === targetId);
  }

  // Sequential fallback
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
      sessionData.section = "AppFlow";
      return data["AppFlow"][0];
    }
    return null;
  }

  // Skip pregnancy if male
  if (candidate.id === "7") {
    const genderRaw = answers["6"];
    const gender = typeof genderRaw === "object" && genderRaw?.userInput ? genderRaw.userInput : genderRaw;
    if (String(gender).toLowerCase() === "male") {
      candidate = questions[idx + 2] || null;
    }
  }

  return candidate;
}

/* -------------------- Chat Flow Methods -------------------- */
function startChat() {
  const section = "CommonIntake";
  const firstQ = getFirstQuestion(section);
  const sessionId = uuidv4();

  sessionService.createSession(sessionId, {
    section,
    answers: {},
    currentId: firstQ?.id
  });

  return { sessionId, currentQuestion: firstQ };
}

async function answerQuestion(sessionId, answer) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Invalid session");

  const data = loadSymptomsData();
  const { section, currentId } = session;
  const questions = data[section];
  const currentQ = questions.find(q => q.id === currentId);
  if (!currentQ) throw new Error("Question not found");

  if (!validateAnswer(currentQ, answer)) {
    throw new Error("Invalid input for this question");
  }

  const processed = await processAnswer(currentQ, answer);
  session.answers[currentId] = processed;

  const nextQ = getNextQuestion(section, currentId, session);
  session.currentId = nextQ ? nextQ.id : null;
  sessionService.updateSession(sessionId, session);

  return {
    sessionId,
    answered: { id: currentId, prompt: currentQ.prompt, answer: processed },
    nextQuestion: nextQ || null
  };
}

function getRecommendation(sessionId) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Session not found");

  const data = loadSymptomsData();
  const sectionData = data[session.section];
  const rec = sectionData?.find(q => q.type === "recommendation");

  return {
    sessionId,
    recommendation: rec ? rec.details : ["No recommendation available."]
  };
}

function approveRecommendation(sessionId, approved) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Session not found");

  session.approved = approved;
  sessionService.updateSession(sessionId, session);

  return {
    sessionId,
    approved,
    message: approved
      ? "✅ Approved! Proceeding to payment."
      : "❌ Not approved. Session ended."
  };
}

/* -------------------- Exports -------------------- */
module.exports = {
  startChat,
  answerQuestion,
  getRecommendation,
  approveRecommendation,
  // internal helpers
  validateAnswer,
  processAnswer,
  getNextQuestion,
  getFirstQuestion,
  loadSymptomsData,
  getDurationRecommendation
};
