/**
 * Chat Service (Merged)
 * Handles all chat flow logic, question routing, and answer processing
 */

const fs = require("fs");
const path = require('path');
const sessionService = require("./sessionService");
const { runGemini } = require("./geminiService");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Load symptom data once on startup
let symptomsData = null;

/**
 * Get the prompt in the correct language from a question object.
 * @param {object} question - The question object.
 * @param {string} lang - The selected language ('English', 'Malay').
 * @returns {string} The translated prompt.
 */
function getPrompt(question, lang) {
  if (lang === 'Malay' && question.prompt_my) {
    return question.prompt_my;
  }
  return question.prompt;
}

/**
 * Create a question object with the correct language prompt.
 * @param {object} question - The original question object.
 * @param {string} lang - The selected language.
 * @returns {object} A new question object with the correct prompt.
 */
function localizeQuestion(question, lang) {
  if (!question) return null;
  return {
    ...question,
    prompt: getPrompt(question, lang),
  };
}

/* -------------------- Data Loading -------------------- */
function loadSymptomsData() {
  if (!symptomsData) {
  const dataPath = path.resolve(__dirname, '..', 'data', 'symptoms.json');
    try {
      const raw = fs.readFileSync(dataPath, 'utf8');
      symptomsData = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Failed to load symptoms data from ${dataPath}: ${err.message}`);
    }
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
      // For questions where a text input is expected for a "yes" answer,
      // the input will be the free text itself. We should not validate
      // it against the options list.
      const hasOpenTextOption = question.options.some(o => 
        o.toLowerCase().includes('yes') || o.toLowerCase().includes('other')
      );

      if (hasOpenTextOption) {
        // If the user selected "No", it's a valid option.
        if (typeof input === "string" && question.options?.includes(input)) {
          return true;
        }
        // If the user selected "Yes" and typed something, it's also valid.
        // The input will be the typed string.
        if (typeof input === "string" && input.trim() !== "") {
          return true;
        }
        return false;
      }

      // For standard single-choice questions, perform the original validation.
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
    const storedSymptoms = answers["7"]; // Corrected from "8" to "7"
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
    const rawAns = answers["8"];
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
/**
 * Start a new chat session
 * @param {string|null} userId - Optional user ID
 * @returns {Promise<object>} { sessionId, currentQuestion }
 */
async function startChat(userId = null) {
  const { v4: uuidv4 } = await import('uuid');
  const section = "CommonIntake";
  const firstQ = getFirstQuestion(section);
  const sessionId = uuidv4();

  // Save session in memory
  sessionService.createSession(sessionId, {
    section,
    answers: {},
    currentId: firstQ?.id,
    userId
  });

  // Save session in database (single record)
  await prisma.chat.create({
    data: {
      userId,
      sessionData: {},
    },
  });

  return {
    sessionId,
    currentQuestion: localizeQuestion(firstQ, 'English'),
  };
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

  // Handle language selection
  if (currentId === "1") {
    session.lang = processed;
  }

  let nextQ = null;

  // CASE 1: next_logic pointing to another section
  if (currentQ.next_logic && data[currentQ.next_logic]) {
    session.section = currentQ.next_logic;
    nextQ = getFirstQuestion(session.section);
    session.currentId = nextQ?.id;
    sessionService.updateSession(sessionId, session);

    // Save chat record safely
    const sectionData = data[session.section];
    const recommendationObj = sectionData?.find(q => q.type === "recommendation");
    const recommendation = recommendationObj ? recommendationObj.details.join("\n") : null;

    if (session.userId) {
      await prisma.chat.upsert({
        where: { userId: session.userId },
        update: {
          sessionData: session.answers,
          recommendation: recommendation,
        },
        create: {
          userId: session.userId,
          sessionData: session.answers,
          recommendation: recommendation,
        },
      });
    } else {
      await prisma.chat.create({
        data: {
          sessionData: session.answers,
          recommendation: recommendation,
        },
      });
    }

    return {
      sessionId,
      answered: { id: currentId, prompt: getPrompt(currentQ, session.lang), answer: processed },
      nextQuestion: localizeQuestion(nextQ, session.lang),
    };
  }

  // CASE 2: CommonIntake flow (gender-based / symptom routing)
  if (section === "CommonIntake") {
    if (currentId === "3" && processed === "Male") nextQ = questions.find(q => q.id === "5");
    else if (currentId === "3" && processed === "Female") nextQ = questions.find(q => q.id === "4");
    else if (currentId === "4") nextQ = questions.find(q => q.id === "5");
    else if (currentId === "10") {
      const storedSymptoms = session.answers["5"];
      if (storedSymptoms && storedSymptoms.length > 0) {
        const firstSymptom = storedSymptoms[0];
        if (data[firstSymptom]) {
          session.section = firstSymptom;
          session.currentId = data[firstSymptom][0].id;
          nextQ = data[firstSymptom][0];
        }
      }
    } else {
      nextQ = getNextQuestion(section, currentId, session);
    }
  }

  // CASE 3: Other sections
  if (!nextQ && data[section]) nextQ = getNextQuestion(section, currentId, session);

  // Update session
  session.currentId = nextQ ? nextQ.id : null;
  sessionService.updateSession(sessionId, session);

  // Get recommendation if any
  const sectionData = data[session.section];
  const recommendationObj = sectionData?.find(q => q.type === "recommendation");
  const recommendation = recommendationObj ? recommendationObj.details.join("\n") : null;

  // Upsert or create chat record safely
  if (session.userId) {
    await prisma.chat.upsert({
      where: { userId: session.userId },
      update: { 
        sessionData: session.answers,
        recommendation: recommendation,
      },
      create: {
        userId: session.userId,
        sessionData: session.answers,
        recommendation: recommendation,
      },
    });
  } else {
    await prisma.chat.create({
      data: {
        sessionData: session.answers,
        recommendation: recommendation,
      },
    });
  }

  return {
    sessionId,
    answered: { id: currentId, prompt: currentQ.prompt, answer: processed },
    nextQuestion: nextQ || null
  };
}

/**
 * Get recommendation based on session answers
 * @param {string} sessionId - Session identifier
 * @returns {object} { sessionId, recommendation }
 */
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

/**
 * Handle approval/confirmation
 * @param {string} sessionId - Session identifier
 * @param {boolean} approved - Whether user approved
 * @returns {object} { sessionId, message, approved }
 */
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
