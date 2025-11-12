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
    
    case "recommendation_display":
      // Recommendation display doesn't need validation, any input proceeds
      return true;

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
    !(typeof currentQ.next_logic === "string" && currentQ.next_logic.includes("_REC"))
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

    // Store all symptoms in the queue if not already done
    if (!sessionData.symptomQueue || sessionData.symptomQueue.length === 0) {
      sessionData.symptomQueue = storedSymptoms.map(s => String(s).toLowerCase());
      sessionData.currentSymptomIndex = 0;
      sessionData.allRecommendations = [];
    }

    // Get the current symptom to process
    const currentSymptom = sessionData.symptomQueue[sessionData.currentSymptomIndex];
    
    const routes = {
      fever: "Fever",
      cough: "Cough",
      flu: "Flu",
      cold: "Cold",
      diarrhoea: "Diarrhoea",
      constipation: "Constipation",
      "nausea and vomiting": "Nausea and Vomiting",
      "indigestion/heartburn": "Indigestion/Heartburn",
      bloat: "Bloat",
      "menstrual pain": "Menstrual Pain",
      "joint pain": "Joint Pain",
      "muscle pain": "Muscle Pain",
      "itchy skin": "Itchy Skin"
    };

    const nextSection = routes[currentSymptom];
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

  // Recommendation logic based on duration
  if (typeof currentQ.next_logic === "string" && currentQ.next_logic.includes("_REC")) {
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

    const recommendationObj = data[section].find(q => q.id === targetId);
    
    // Check if we're in multi-symptom flow
    const symptomSections = [
      "Fever", "Flu", "Cough", "Cold", "Diarrhoea", "Constipation",
      "Nausea and Vomiting", "Indigestion/Heartburn", "Bloat", "Menstrual Pain",
      "Joint Pain", "Muscle Pain", "Itchy Skin"
    ];
    
    if (symptomSections.includes(section) && sessionData.symptomQueue && sessionData.symptomQueue.length > 1) {
      // Multi-symptom mode: collect recommendation and check for more symptoms
      if (recommendationObj && recommendationObj.prompt) {
        if (!sessionData.allRecommendations) {
          sessionData.allRecommendations = [];
        }
        
        const alreadyCollected = sessionData.allRecommendations.some(
          rec => rec.symptom === section
        );
        
        if (!alreadyCollected) {
          sessionData.allRecommendations.push({
            symptom: section,
            details: recommendationObj.prompt
          });
        }
      }
      
      // Check if there are more symptoms to process
      if (sessionData.currentSymptomIndex < sessionData.symptomQueue.length - 1) {
        sessionData.currentSymptomIndex++;
        const nextSymptom = sessionData.symptomQueue[sessionData.currentSymptomIndex];
        
        const routes = {
          fever: "Fever",
          cough: "Cough",
          flu: "Flu",
          cold: "Cold",
          diarrhoea: "Diarrhoea",
          constipation: "Constipation",
          "nausea and vomiting": "Nausea and Vomiting",
          "indigestion/heartburn": "Indigestion/Heartburn",
          bloat: "Bloat",
          "menstrual pain": "Menstrual Pain",
          "joint pain": "Joint Pain",
          "muscle pain": "Muscle Pain",
          "itchy skin": "Itchy Skin"
        };
        
        const nextSection = routes[nextSymptom];
        if (nextSection && data[nextSection]) {
          sessionData.section = nextSection;
          return data[nextSection][0];
        }
      }
      
      // All symptoms processed! Show combined recommendations
      if (sessionData.allRecommendations && sessionData.allRecommendations.length > 0) {
        const combinedPrompt = sessionData.allRecommendations.flatMap(rec => {
          return [
            `--- ${rec.symptom} ---`,
            ...(Array.isArray(rec.details) ? rec.details : [rec.details])
          ];
        });
        
        // Extract medications from recommendations for cart
        const medications = sessionData.allRecommendations.map(rec => {
          // Get the first line which contains medication name and dosage
          const details = Array.isArray(rec.details) ? rec.details : [rec.details];
          const medicationLine = details.find(line => 
            line && typeof line === 'string' && line.trim().length > 0
          );
          
          return {
            name: medicationLine || `Medication for ${rec.symptom}`,
            symptom: rec.symptom,
            imageUrl: null // Placeholder for now
          };
        }).filter(med => med.name); // Remove any invalid entries
        
        // Store medications in session for AppFlow
        sessionData.medications = medications;
        
        return {
          id: "COMBINED_REC",
          type: "recommendation",
          prompt: combinedPrompt,
          next_logic: "AppFlow"
        };
      }
    }
    
    // Single symptom or fallback: return recommendation directly
    return recommendationObj;
  }

  // Sequential fallback
  const idx = questions.findIndex(q => q.id === currentId);
  if (idx === -1) return null;

  let candidate = questions[idx + 1] || null;
  if (!candidate) {
    const symptomSections = [
      "Fever", "Flu", "Cough", "Cold", "Diarrhoea", "Constipation",
      "Nausea and Vomiting", "Indigestion/Heartburn", "Bloat", "Menstrual Pain",
      "Joint Pain", "Muscle Pain", "Itchy Skin"
    ];
    
    // If we're at the end of a symptom section in multi-symptom flow
    if (symptomSections.includes(section)) {
      const sectionData = data[section];
      const recommendationObj = sectionData?.find(q => q.type === "recommendation");
      
      // Collect the recommendation silently
      if (recommendationObj && recommendationObj.prompt) {
        if (!sessionData.allRecommendations) {
          sessionData.allRecommendations = [];
        }
        
        // Check if already collected (avoid duplicates)
        const alreadyCollected = sessionData.allRecommendations.some(
          rec => rec.symptom === section
        );
        
        if (!alreadyCollected) {
          sessionData.allRecommendations.push({
            symptom: section,
            details: recommendationObj.prompt
          });
        }
      }
      
      // Check if there are more symptoms to process
      if (sessionData.symptomQueue && 
          sessionData.currentSymptomIndex < sessionData.symptomQueue.length - 1) {
        // Move to next symptom WITHOUT showing recommendation
        sessionData.currentSymptomIndex++;
        const nextSymptom = sessionData.symptomQueue[sessionData.currentSymptomIndex];
        
        const routes = {
          fever: "Fever",
          cough: "Cough",
          flu: "Flu",
          cold: "Cold",
          diarrhoea: "Diarrhoea",
          constipation: "Constipation",
          "nausea and vomiting": "Nausea and Vomiting",
          "indigestion/heartburn": "Indigestion/Heartburn",
          bloat: "Bloat",
          "menstrual pain": "Menstrual Pain",
          "joint pain": "Joint Pain",
          "muscle pain": "Muscle Pain",
          "itchy skin": "Itchy Skin"
        };
        
        const nextSection = routes[nextSymptom];
        if (nextSection && data[nextSection]) {
          sessionData.section = nextSection;
          return data[nextSection][0];
        }
      }
      
      // All symptoms processed! Show combined recommendations
      if (sessionData.allRecommendations && sessionData.allRecommendations.length > 0) {
        const combinedPrompt = sessionData.allRecommendations.flatMap(rec => {
          return [
            `--- ${rec.symptom} ---`,
            ...(Array.isArray(rec.details) ? rec.details : [rec.details])
          ];
        });
        
        // Return synthetic combined recommendation
        return {
          id: "COMBINED_REC",
          type: "recommendation",
          prompt: combinedPrompt,
          next_logic: "AppFlow"
        };
      }
    }
    return null;
  }

  // Skip pregnancy question (id "6") if male
  if (candidate && candidate.id === "6") {
    const genderRaw = answers["5"];
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
    userId,
    symptomQueue: [], // Queue to track multiple symptoms
    currentSymptomIndex: 0, // Track which symptom we're currently on
    allRecommendations: [] // Collect all recommendations
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
  
  // Special handling for COMBINED_REC (dynamically created recommendation)
  if (currentId === "COMBINED_REC") {
    // Transition to AppFlow
    session.section = "AppFlow";
    const nextQ = data["AppFlow"][0];
    session.currentId = nextQ?.id;
    session.answers[currentId] = answer;
    sessionService.updateSession(sessionId, session);
    
    // Inject medications into cart question
    if (nextQ && nextQ.type === "medication_cart") {
      if (session.medications && session.medications.length > 0) {
        const medicationCartQ = {
          ...nextQ,
          medications: session.medications
        };
        
        return {
          sessionId,
          answered: { id: currentId, prompt: "Based on your symptoms, here are our recommendations", answer },
          nextQuestion: medicationCartQ
        };
      }
    }
    
    return {
      sessionId,
      answered: { id: currentId, prompt: "Based on your symptoms, here are our recommendations", answer },
      nextQuestion: nextQ
    };
  }
  
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
    const recommendation = recommendationObj ? (Array.isArray(recommendationObj.prompt) ? recommendationObj.prompt.join("\n") : recommendationObj.prompt) : null;

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

  // Handle recommendation display type - inject actual recommendations into the question
  if (nextQ && nextQ.type === "recommendation_display") {
    // Combine all collected recommendations
    if (session.allRecommendations && session.allRecommendations.length > 0) {
      const recsText = session.allRecommendations.map(rec => {
        return `\n--- ${rec.symptom} ---\n` + rec.details.join("\n");
      }).join("\n\n");
      nextQ = {
        ...nextQ,
        prompt: nextQ.prompt + "\n\n" + recsText
      };
    }
  }

  // CASE 2: CommonIntake flow (gender-based / symptom routing)
  if (section === "CommonIntake") {
    if (currentId === "5" && processed === "Male") {
      // Skip pregnancy question for males, go directly to symptoms
      nextQ = questions.find(q => q.id === "7");
    }
    else if (currentId === "5" && processed === "Female") {
      // Ask pregnancy question for females
      nextQ = questions.find(q => q.id === "6");
    }
    else if (currentId === "6") {
      // After pregnancy question, go to symptoms
      nextQ = questions.find(q => q.id === "7");
    }
    else {
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
  
  // Combine all collected recommendations for multi-symptom cases
  let recommendation = null;
  if (session.allRecommendations && session.allRecommendations.length > 0) {
    // Format all recommendations from multiple symptoms
    const allRecsText = session.allRecommendations.map(rec => {
      return `\n--- ${rec.symptom} ---\n` + rec.details.join("\n");
    }).join("\n\n");
    recommendation = allRecsText;
  } else if (recommendationObj) {
    // Single symptom recommendation
    recommendation = Array.isArray(recommendationObj.prompt) ? recommendationObj.prompt.join("\n") : recommendationObj.prompt;
  }

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

  // Inject medications into AppFlow medication_cart question
  if (nextQ && session.section === "AppFlow" && nextQ.type === "medication_cart") {
    if (session.medications && session.medications.length > 0) {
      nextQ = {
        ...nextQ,
        medications: session.medications
      };
    }
  }

  // Customize completion message based on cart activity
  if (nextQ && nextQ.type === "completion_message") {
    // Check if user added items to cart (from A1 answer)
    const cartAnswer = session.answers["A1"];
    const itemsAdded = cartAnswer && typeof cartAnswer === 'string' && cartAnswer.includes('Added') && !cartAnswer.includes('No items added');
    
    if (itemsAdded) {
      // User added items - show success message
      nextQ = {
        ...nextQ,
        prompt: "Thank you for using AI-Sihat! Your medications have been successfully added to cart. You can proceed to checkout from the cart page. Wish you a speedy recovery!"
      };
    } else {
      // User didn't add items - show basic thank you
      nextQ = {
        ...nextQ,
        prompt: "Thank you for using AI-Sihat! We hope our recommendations were helpful. Feel free to visit our pharmacy if you need assistance. Wish you a speedy recovery!"
      };
    }
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
    recommendation: rec ? rec.prompt : ["No recommendation available."]
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
