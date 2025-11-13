/**
 * Chat Service
 * Handles all chat flow logic, question routing, and answer processing
 */

const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const sessionService = require("./sessionService");
const { runGemini } = require("./geminiService");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Load symptom data once on startup
let symptomsData = null;

/**
 * Load symptoms data from JSON file
 * @returns {object} Symptoms data
 */
function loadSymptomsData() {
  if (!symptomsData) {
    symptomsData = JSON.parse(fs.readFileSync("./data/symptoms.json", "utf8"));
  }
  return symptomsData;
}

/**
 * Get the first question of a section
 * @param {string} section - Section name (e.g., "CommonIntake", "Fever")
 * @returns {object|null} First question or null
 */
function getFirstQuestion(section) {
  const data = loadSymptomsData();
  const questions = data[section];
  if (!questions || questions.length === 0) return null;
  return questions[0];
}

/**
 * Process and validate user's answer based on question type
 * @param {object} question - Question object
 * @param {any} userInput - User's raw input
 * @returns {Promise<any>} Processed answer
 */
async function processAnswer(question, userInput) {
  // If question requires Gemini AI processing
  if (question.useGemini) {
    const aiResponse = await runGemini(userInput);
    return { userInput, aiResponse };
  }

  switch (question.type) {
    case "single_choice":
      if (question.options.includes(userInput)) return userInput;
      // Support numeric index (e.g., "1" → first option)
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
        // Allow comma-separated or single string
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

/**
 * Get next question based on current question and session state
 * @param {string} section - Current section
 * @param {string} currentId - Current question ID
 * @param {object} sessionData - Full session data
 * @returns {object|null} Next question or null
 */
function getNextQuestion(section, currentId, sessionData) {
  const data = loadSymptomsData();
  const questions = data[section];
  if (!questions) return null;

  const currentQ = questions.find(q => q.id === currentId);
  if (!currentQ) return null;

  const nextLogic = currentQ.next_logic;

  // 1️⃣ Sequential fallback (no next_logic defined)
  if (nextLogic === undefined || nextLogic === null) {
    const idx = questions.findIndex(q => q.id === currentId);
    if (idx === -1 || idx === questions.length - 1) return null;
    return questions[idx + 1];
  }

  // 2️⃣ SYMPTOM ROUTING (after CommonIntake)
  if (nextLogic === "SYMPTOM_ROUTING") {
    const mainSymptoms = sessionData.answers["7"]; // user's main symptoms
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

    const nextSection = data[nextFlow];
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

/**
 * Normalize multiple choice answers into array format
 * @param {any} answer - Raw answer from request
 * @returns {Array} Normalized array of choices
 */
function normalizeMultipleChoice(answer) {
  let chosenSymptoms = [];
  if (Array.isArray(answer)) {
    chosenSymptoms = answer.filter(a => a);
  } else if (typeof answer === "string" && answer.trim() !== "") {
    chosenSymptoms = [answer];
  }
  return chosenSymptoms;
}

/**
 * Start a new chat session
 * @returns {object} { sessionId, currentQuestion }
 */
async function startChat(userId = null) {
  const section = "CommonIntake";
  const firstQ = getFirstQuestion(section);

  const sessionId = uuidv4();

  // Save session in memory
  sessionService.createSession(sessionId, {
    section,
    answers: {},
    currentId: firstQ?.id
  });

  // Save session in database
  await prisma.chat.create({
    data: {
      userId,
      sessionData: {},
    },
  });

  return {
    sessionId,
    currentQuestion: firstQ
  };
}

/**
 * Handle answering a question and getting the next one
 * @param {string} sessionId - Session identifier
 * @param {any} answer - User's answer
 * @returns {Promise<object>} { sessionId, answered, nextQuestion }
 */
async function answerQuestion(sessionId, answer) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Invalid session");

  const data = loadSymptomsData();
  const { section, currentId } = session;
  const questions = data[section];
  const currentQ = questions.find(q => q.id === currentId);
  if (!currentQ) throw new Error("Question not found");

  // Normalize multiple_choice answers
  let normalizedAnswer = answer;
  if (currentQ.type === "multiple_choice") {
    normalizedAnswer = normalizeMultipleChoice(answer);
  }

  // Process the answer
  const processed = await processAnswer(currentQ, normalizedAnswer);
  session.answers[currentId] = processed;

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
    const recommendation = recommendationObj ? recommendationObj.details : null;

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
      nextQuestion: nextQ,
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
  const recommendation = recommendationObj ? recommendationObj.details : null;

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

  // --- Generate summary when chat ends ---
let summary = null;
if (!nextQ) {  // chat finished
  summary = await generateSummary(sessionId);  // this will also save to DB
}

  return {
    sessionId,
    answered: { id: currentId, prompt: currentQ.prompt, answer: processed },
    nextQuestion: nextQ || null,
    summary,
  };
}


/**
 * Handle approval/confirmation
 * @param {string} sessionId - Session identifier
 * @param {boolean} approved - Whether user approved
 * @returns {object} { sessionId, message, approved }
 */

function getRecommendation(sessionId) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Session not found");
  
  return session.recommendation || null;
}


function approveRecommendation(sessionId, approved) {
  const session = sessionService.getSession(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

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

/**
 * Generate summary report based on stored session answers
 * @param {string} sessionId
 * @returns {object} Summary report
 */
async function generateSummary(sessionId) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Session not found");

  const answers = session.answers || {};
  const data = loadSymptomsData();

  // Build report
  const report = {
    name: answers["3"] || "N/A",
    age: answers["4"] || "N/A",
    gender: answers["5"] || "N/A",
    symptoms: answers["7"] || [],
    duration: answers["8"] || "N/A",
    temperature: answers["9"] || "N/A",
    allergies: answers["10"] || "N/A",
    medication: answers["11"] || "N/A",
    recommendation: null,
  };

  // Get recommendation if any
  const sectionData = data[session.section];
  const recommendationObj = sectionData?.find(q => q.type === "recommendation");
  if (recommendationObj) {
    report.recommendation = recommendationObj.details;
  }

  // Save summary to database
  if (session.userId) {
    await prisma.chat.update({
      where: { userId: session.userId },  // or use chat id
      data: { summary: report },
    });
  }

  return report;
}
