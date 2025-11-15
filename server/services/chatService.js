/**
 * Chat Service (Merged)
 * Handles all chat flow logic, question routing, and answer processing
 */

const fs = require("fs");
const path = require('path');
const sessionService = require("./sessionService");
const { runGemini, translateToEnglish } = require("./geminiService");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Load symptom data once on startup
let symptomsData = null;

/**
 * Get the prompt in the correct language from a question object.
 * @param {object} question - The question object.
 * @param {string} lang - The selected language ('en', 'my', 'zh').
 * @returns {string} The translated prompt.
 */
function getPrompt(question, lang) {
  if (!question) return '';
  
  // Default to English if no language specified
  if (!lang || lang === 'en') {
    return question.prompt || '';
  }
  
  // Return Malay translation if available
  if (lang === 'my' && question.prompt_my) {
    return question.prompt_my;
  }
  
  // Return Chinese translation if available
  if ((lang === 'zh' || lang === '中文') && question.prompt_zh) {
    return question.prompt_zh;
  }
  
  // Fallback to English prompt if translation not available
  return question.prompt || '';
}

/**
 * Return the recommendation prompt content as an array of lines in the requested language.
 * If the question has an array prompt in the chosen language, return that array.
 * If only a string prompt exists, return a single-element array with the localized string.
 */
function getPromptArray(question, lang) {
  if (!question) return [];

  // If language-specific array exists, prefer it
  if (lang === 'my' && Array.isArray(question.prompt_my)) return question.prompt_my;
  if ((lang === 'zh' || lang === '中文') && Array.isArray(question.prompt_zh)) return question.prompt_zh;

  // If default prompt is an array, return it (for English or fallback)
  if (Array.isArray(question.prompt)) return question.prompt;

  // Fallback: use localized single-string prompt and return as array
  const p = getPrompt(question, lang);
  return p ? [p] : [];
}

/**
 * Create a question object with the correct language prompt and options.
 * @param {object} question - The original question object.
 * @param {string} lang - The selected language ('en', 'my', 'zh').
 * @returns {object} A new question object with the correct prompt and options.
 */
function localizeQuestion(question, lang) {
  if (!question) return null;
  
  const localized = {
    ...question,
    prompt: getPrompt(question, lang),
  };

  // Store the original (English/backend) options
  const originalOptions = localized.options;
  
  // Check if options exist and are an array
  if (originalOptions && Array.isArray(originalOptions) && lang) {
    
    // Store original options for mapping
    localized.originalOptions = originalOptions;

    // Select the correct translated options array
    if (lang === 'my' && localized.options_my && Array.isArray(localized.options_my)) {
      localized.options = localized.options_my;
    } else if ((lang === 'zh' || lang === '中文') && localized.options_zh && Array.isArray(localized.options_zh)) {
      localized.options = localized.options_zh;
    }
    // If English or no translation, localized.options just stays as the original 'options' array.

    // Create a mapping from the *displayed* option back to the *original* value
    localized.optionMapping = {};
    if (localized.options && localized.originalOptions) {
      localized.options.forEach((displayed, index) => {
        // Ensure we don't go out of bounds
        if (index < localized.originalOptions.length) {
          const originalValue = localized.originalOptions[index];
          localized.optionMapping[displayed] = originalValue;
        }
      });
    }
  }
  
  return localized;
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

      // --- START FIX ---
      // 始终根据 *原始* (英文) 选项进行检查，以确定这是否是一个开放式文本问题。
      // 这样可以确保即便是 "Yes (List details)" 或 "Other (Specify)" 被翻译后也能被正确识别。
      const referenceOptions = question.originalOptions || question.options;
      const hasOpenTextOption = referenceOptions.some(o => 
        o.toLowerCase().includes('yes') || o.toLowerCase().includes('other')
      );
      // --- END FIX ---

      if (hasOpenTextOption) {
        // 检查是否存在映射 (已翻译的选项)
        // 这将验证用户是否选择了一个简单的选项，如 "No" (或 "否")
        if (question.optionMapping && typeof input === "string" && question.optionMapping[input]) {
          return true; // 已翻译的选项 (如 "No") 是有效的
        }
        // 这将验证用户是否选择了 *原始* 的英文 "No"
        if (typeof input === "string" && (question.originalOptions || []).includes(input)) {
          return true;
        }
        // 如果用户选择了 "Yes" 并输入了内容，那也是有效的。
        // 此时 'input' 将是输入的字符串。
        if (typeof input === "string" && input.trim() !== "") {
          return true;
        }
        return false;
      }

      // 对于标准的单项选择题 (例如 Male/Female)，执行原始验证。
      const validateOptions = question.originalOptions || question.options;
      if (question.optionMapping && typeof input === "string" && question.optionMapping[input]) {
        return true; // 已翻译的选项是有效的
      }
      if (typeof input === "string" && validateOptions?.includes(input)) return true;
      if (!isNaN(input)) {
        const idx = parseInt(input, 10) - 1;
        return validateOptions && validateOptions[idx] !== undefined;
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
      // Check if we have a mapping (translated options)
      if (question.optionMapping && typeof userInput === "string" && question.optionMapping[userInput]) {
        return question.optionMapping[userInput]; // Return original value
      }
      // Check original options if available
      const optionsToCheck = question.originalOptions || question.options;
      if (typeof userInput === "string" && optionsToCheck?.includes(userInput)) return userInput;
      if (!isNaN(userInput)) {
        const idx = parseInt(userInput, 10) - 1;
        return optionsToCheck ? optionsToCheck[idx] : null;
      }
      return userInput;

    case "multiple_choice":
      const multiOptionsToCheck = question.originalOptions || question.options;
      if (Array.isArray(userInput)) {
        return userInput
          .map(a => {
            // Map translated option back to original if mapping exists
            if (question.optionMapping && question.optionMapping[a]) {
              return question.optionMapping[a];
            }
            // If it's already an original option, keep it
            if (multiOptionsToCheck?.includes(a)) {
              return a;
            }
            // --- START FIX ---
            // If it's not a translated option (key) and not an original option (value),
            // it must be the "Other" free text. Keep it.
            if (!question.optionMapping || !question.optionMapping[a]) {
              return a;
            }
            // --- END FIX ---
            return null;
          })
          .filter(Boolean);
      }
      if (typeof userInput === "string") {
        return userInput
          .split(",")
          .map(s => {
            const trimmed = s.trim();
            // Map translated option back to original if mapping exists
            if (question.optionMapping && question.optionMapping[trimmed]) {
              return question.optionMapping[trimmed];
            }
            // --- START FIX ---
            // If it's already an original option, keep it
            if (multiOptionsToCheck?.includes(trimmed)) {
              return trimmed;
            }
            // If it's not a translated option (key) and not an original option (value),
            // it must be the "Other" free text. Keep it.
            if (!question.optionMapping || !question.optionMapping[trimmed]) {
              return trimmed;
            }
            // --- END FIX ---
            return null;
          })
          .filter(Boolean);
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
    
    // Define symptom sections list
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
          // --- START FIX ---
          // Save the recommendation ID to find the English text later
          // Save the TRANSLATED text for the user to see
          sessionData.allRecommendations.push({
            symptom: section,
            recommendationId: recommendationObj.id, // Save ID
            details: getPromptArray(recommendationObj, sessionData.lang || 'en') // Save translated text
          });
          // --- END FIX ---
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
        
        console.log('Extracted medications:', medications);
        
        // Store medications in session for AppFlow
        sessionData.medications = medications;
        
        return {
          id: "COMBINED_REC",
          type: "recommendation",
          prompt: combinedPrompt, // This prompt is now correctly translated for the user
          next_logic: "AppFlow"
        };
      }
    }
    
    // Single symptom or fallback: return recommendation directly with symptom name
    if (recommendationObj && symptomSections.includes(section)) {
      return {
        ...recommendationObj,
        symptomName: section
      };
    }
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
          // --- START FIX ---
          // Save the recommendation ID to find the English text later
          // Save the TRANSLATED text for the user to see
          sessionData.allRecommendations.push({
            symptom: section,
            recommendationId: recommendationObj.id, // Save ID
            details: getPromptArray(recommendationObj, sessionData.lang || 'en') // Save translated text
          });
          // --- END FIX ---
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
          prompt: combinedPrompt, // This prompt is now correctly translated for the user
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
  // VALIDATE: A user must be logged in to start a chat
  if (!userId) {
    throw new Error("User ID is required to start a chat.");
  }

  // Find the user to get their selected branch
  const user = await prisma.user.findUnique({
    where: { userId: userId },
    select: { lastSelectedBranchId: true },
  });

  // VALIDATE: Did the user select a branch?
  if (!user || !user.lastSelectedBranchId) {
    throw new Error(
      "No branch selected. Please select a pharmacy branch to start a chat."
    );
  }

  const { v4: uuidv4 } = await import('uuid');
  const section = "CommonIntake";
  const firstQ = getFirstQuestion(section);
  const sessionId = uuidv4();

  let newChat;
  // Save session in database (with branchId)
  try {
    newChat = await prisma.chat.create({
      data: {
        userId: userId,
        branchId: user.lastSelectedBranchId, // <-- THE FIX
        summary: {},
      },
    });
  } catch (err) {
    console.error('Failed to create chat record:', err);
    throw new Error("Could not start chat session in database.");
  }

  // Save session in memory
  sessionService.createSession(sessionId, {
    section,
    answers: {},
    currentId: firstQ?.id,
    userId,
    lang: 'en', // Default language, will be updated when user selects language
    symptomQueue: [], // Queue to track multiple symptoms
    currentSymptomIndex: 0, // Track which symptom we're currently on
    allRecommendations: [] // Collect all recommendations
  });

  // Save session in database (single record)
  try {
    const chat = await prisma.chat.create({
      data: {
        userId,
      },
    });
    
    // Store chatId in session for later use
    sessionService.updateSession(sessionId, { chatId: chat.id });
  } catch (err) {
    console.error('Failed to create chat record:', err);
  }

  // Special handling for language selection question - show all three translations
  let languageQuestion = localizeQuestion(firstQ, 'en');
  if (firstQ && firstQ.id === "1") {
    
    // --- FIX: Dynamically build translations from JSON data ---
    const translatedOptions = firstQ.options.map((opt, index) => {
      // Get translated option from options_my, default to original 'opt' if not found
      const my_opt = (firstQ.options_my && firstQ.options_my[index]) 
        ? firstQ.options_my[index] 
        : opt;
      
      // Get translated option from options_zh, default to original 'opt' if not found
      const zh_opt = (firstQ.options_zh && firstQ.options_zh[index]) 
        ? firstQ.options_zh[index] 
        : opt;
      
      return {
        value: opt, // The original value (e.g., "English", "Malay", "Chinese")
        display: {
          en: opt,     // e.g., "English"
          my: my_opt,  // e.g., "Inggeris"
          zh: zh_opt   // e.g., "华语"
        }
      };
    });
    
    languageQuestion = {
      ...firstQ,
      prompt: `${firstQ.prompt}\n${firstQ.prompt_my || ''}\n${firstQ.prompt_zh || ''}`,
      showAllTranslations: true,
      translations: {
        en: firstQ.prompt,
        my: firstQ.prompt_my || firstQ.prompt,
        zh: firstQ.prompt_zh || firstQ.prompt
      },
      optionsWithTranslations: translatedOptions
    };
  }

  return {
    sessionId,
    currentQuestion: languageQuestion,
  };
}

async function answerQuestion(sessionId, answer) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Invalid session");

  const lang = session.lang || 'en';
  
  // --- START FIX: Get currentQ logic moved up ---
  const data = loadSymptomsData();
  const { section, currentId } = session;
  
  let currentQ;
  if (currentId === "COMBINED_REC") {
    // This is a synthetic question. The "type" is what matters.
    // We also need its "prompt" for the `answered` block.
    currentQ = { 
      id: "COMBINED_REC", 
      type: "recommendation",
      prompt: "Based on your symptoms, here are our recommendations",
      prompt_my: "Berdasarkan simptom anda, berikut adalah cadangan kami:",
      prompt_zh: "根据您的症状，以下是我们的建议：" 
    };
  } else {
    const questions = data[section];
    currentQ = questions?.find(q => q.id === currentId);
  }
  
  if (!currentQ) throw new Error(`Question not found for section "${section}" and id "${currentId}"`);
  // --- END FIX ---


  // --- START FIX: Modified special handling ---
  // Now checks for type, catching "COMBINED_REC" AND single recs (e.g., "F_R1")
  if (currentQ.type === "recommendation") {
    // The frontend flow (continueFromCart) sends an answer here
    // AFTER pharmacist approval (e.g., "Added 1 item(s)").
    // We must NOT show the AppFlow cart (A1).
    // We skip directly to the completion message (A2).
    
    session.answers[currentId] = answer;
    
    // Find the completion question (A2) from AppFlow
    const completionQ = data["AppFlow"]?.find(q => q.type === "completion_message");
    
    if (completionQ) {
      session.section = "AppFlow"; // Set section for localization
      session.currentId = completionQ.id;
      sessionService.updateSession(sessionId, session);
      
      let localizedCompletionQ = localizeQuestion(completionQ, lang);
      
      // --- START: Customization logic ---
      const cartAnswer = answer; // The answer is "Added..." or "No items added"
      const itemsAdded = cartAnswer && typeof cartAnswer === 'string' && cartAnswer.includes('Added') && !cartAnswer.includes('No items added');
      
      const successMsg = {
        en: "Thank you for using AI-Sihat! Your medications have been successfully added to cart. You can proceed to checkout from the cart page. Wish you a speedy recovery!",
        my: "Terima kasih kerana menggunakan AI-Sihat! Ubat-ubatan anda telah berjaya ditambah ke troli. Anda boleh meneruskan ke 'checkout' dari halaman troli. Semoga anda cepat sembuh!",
        zh: "感谢您使用 AI-Sihat！您的药物已成功添加到购物车。您可以从购物车页面继续结帐。祝您早日康复！"
      };
      
      const noItemsMsg = {
        en: "Thank you for using AI-Sihat! We hope our recommendations were helpful. Feel free to visit our pharmacy if you need assistance. Wish you a speedy recovery!",
        my: "Terima kasih kerana menggunakan AI-Sihat! Kami harap cadangan kami membantu. Sila kunjungi farmasi kami jika anda memerlukan bantuan. Semoga anda cepat sembuh!",
        zh: "感谢您使用 AI-Sihat！我们希望我们的建议对您有所帮助。如果您需要帮助，欢迎光临我们的药房。祝您早日康复！"
      };
      
      // --- START BUG FIX ---
      // Was: const langKey = (lang === '中文') ? 'zh' : (lang === 'Malay' ? 'my' : 'en');
      const langKey = (lang === 'zh') ? 'zh' : (lang === 'my' ? 'my' : 'en');
      // --- END BUG FIX ---
      
      if (itemsAdded) {
        localizedCompletionQ.prompt = successMsg[langKey];
      } else {
        localizedCompletionQ.prompt = noItemsMsg[langKey];
      }
      // --- END: Customization logic ---
      
      return {
        sessionId,
        // Get the prompt for the "answered" object.
        // We must use the *original* question data for getPrompt.
        // If it's COMBINED_REC, we use the hardcoded prompt from above.
        // If it's F_R1, we must find it in the data again to get translations.
        answered: { id: currentId, prompt: getPrompt(currentQ, session.lang), answer },
        nextQuestion: localizedCompletionQ
      };
    }
    
    // Fallback: just end the chat
    session.currentId = null;
    sessionService.updateSession(sessionId, session);
    return {
        sessionId,
        answered: { id: currentId, prompt: getPrompt(currentQ, session.lang), answer },
        nextQuestion: null
    };
  }
  // --- END FIX ---

  
  // --- NORMAL LOGIC ---
  
  // Localize the *real* question for validation
  const localizedQ = localizeQuestion(currentQ, lang);

  if (!validateAnswer(localizedQ, answer)) {
    // --- SPECIAL CHECK for Q1 ---
    if (currentId === "1") {
      let validQ1Ans = false;
      if (currentQ.options_my && currentQ.options_my.includes(answer)) {
        validQ1Ans = true;
      } else if (currentQ.options_zh && currentQ.options_zh.includes(answer)) {
        validQ1Ans = true;
      }
      
      if (!validQ1Ans) {
        throw new Error("Invalid input for this question");
      }
    } else {
      throw new Error("Invalid input for this question");
    }
  }

  const processed = await processAnswer(localizedQ, answer);
  session.answers[currentId] = processed;

  // --- START: NEW TRANSLATION LOGIC ---
  let finalAnswer = processed; // Default to the processed value
  const sessionLang = session.lang || 'en';
  
  // Define the list of question IDs that contain free-text input to be translated
  // We exclude "3" (Name) as that should not be translated.
  const idsToTranslate = [
    "2",   // "Can you describe your symptoms...?"
    "7",   // "What are your symptoms?" (for "Other (Specify)")
    "10",  // "Do you have allergies...?" (for "Yes (List down details)")
    "11",  // "Did you take any medication...?" (for "Yes (List down details)")
    "DI1", // "Do you experience diarrhoea before?" (for "Yes , When___?")
    "DI5", // "Do you start any new medication?" (for "Yes , What__?")
    "CN1", // "Do you experience constipation before?" (for "Yes , When___?")
    "CN5", // "Do you start any new medication?" (for "Yes , What__?")
    "JP1", // "Which joint you feel pain?"
    "MU1", // "Where is the location of muscle you feel pain?"
    "MU4", // "Did you do any vigorous activity...?" (for "Yes , What__?")
    "IS1"  // "What is the body part you feel itchy?"
  ];

  // Only run translation if the user is NOT chatting in English
  if (sessionLang !== 'en' && idsToTranslate.includes(currentId)) {
    
    if (currentId === "2") {
      // Special case for Q2 (useGemini: true)
      // 'processed' is an object: { userInput, aiResponse }
      if (processed && processed.userInput) {
        const translatedInput = await translateToEnglish(processed.userInput);
        finalAnswer = {
          ...processed,
          userInput: translatedInput, // Store translated version
          originalInput: processed.userInput // Optional: keep original for reference
        };
      }
    } else if (currentId === "7") {
      // Special case for Q7 (multiple_choice)
      // 'processed' is an array, e.g., ["Fever", "Cough", "sakit kepala"]
      const originalOptions = localizedQ.originalOptions || localizedQ.options || [];
      
      if (Array.isArray(processed)) {
        finalAnswer = await Promise.all(processed.map(async (ans) => {
          // If 'ans' is NOT in the original options list, it's free text ("Other")
          if (typeof ans === 'string' && !originalOptions.includes(ans)) {
            return await translateToEnglish(ans); // Translate it
          }
          return ans; // It's a standard option, keep as is
        }));
      }
    } else if (typeof processed === 'string' && processed.trim() !== "") {
      // Standard free-text answer (from text_input or single_choice 'Yes')
      const options = localizedQ.originalOptions || localizedQ.options || [];
      // Check if the answer is just a standard option (e.g., "No")
      const isAnOption = options.some(opt => opt.toLowerCase() === processed.toLowerCase());

      // Only translate if it's NOT a standard option (e.g., it's "Panadol", not "No")
      if (!isAnOption) { 
        finalAnswer = await translateToEnglish(processed);
      }
    }
  }
  // --- END: NEW TRANSLATION LOGIC ---
  
  session.answers[currentId] = finalAnswer;

  // Handle language selection
  if (currentId === "1") {
    let selected = processed;
    
    const langMapping = {
      'english': 'en',
      'malay': 'my',
      'chinese': 'zh'
    };

    if (typeof selected === 'string' && !langMapping[selected.toLowerCase()]) {
        const reverseMap = {
          'english': 'en',
          'inggeris': 'en',
          '英语': 'en',
          'malay': 'my',
          'melayu': 'my',
          '马来语': 'my',
          'chinese': 'zh',
          'cina': 'zh',
          '华语': 'zh'
        };
        session.lang = reverseMap[selected.toLowerCase()] || 'en';
    } else {
      const candidate = (typeof selected === 'string') ? selected.trim() : String(selected);
      const lower = candidate.toLowerCase();
      session.lang = langMapping[lower] || selected || 'en';
    }
    
    sessionService.updateSession(sessionId, session);
  }

  let nextQ = null;

  // CASE 1: next_logic pointing to another section
  // This block will now be correctly SKIPPED for recommendations
  // because the check above will catch them first.
  if (currentQ.next_logic && data[currentQ.next_logic]) {
    session.section = currentQ.next_logic;
    nextQ = getFirstQuestion(session.section);
    session.currentId = nextQ?.id;
    sessionService.updateSession(sessionId, session);

    // Save chat record safely
    const sectionData = data[session.section];
    const recommendationObj = sectionData?.find(q => q.type === "recommendation");
    const recommendation = recommendationObj ? (Array.isArray(recommendationObj.prompt) ? recommendationObj.prompt.join("\n") : recommendationObj.prompt) : null;

    try {
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
    } catch (err) {
      console.error('Failed to save chat record:', err);
    }

    return {
      sessionId,
      answered: { id: currentId, prompt: getPrompt(localizedQ, session.lang), answer: processed },
      nextQuestion: localizeQuestion(nextQ, session.lang),
    };
  }

  // CASE 2: CommonIntake flow (gender-based / symptom routing)
  if (section === "CommonIntake") {
    if (currentId === "5" && processed === "Male") {
      nextQ = data[section].find(q => q.id === "7");
    }
    else if (currentId === "5" && processed === "Female") {
      nextQ = data[section].find(q => q.id === "6");
    }
    else if (currentId === "6") {
      nextQ = data[section].find(q => q.id === "7");
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

  // Localize the question first (before any modifications)
  if (nextQ) {
    const langForNext = session.lang || 'en';
    nextQ = localizeQuestion(nextQ, langForNext);
  }

  // Handle recommendation display type
  if (nextQ && nextQ.type === "recommendation_display") {
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

  // Inject medications into AppFlow medication_cart question
  if (nextQ && session.section === "AppFlow" && nextQ.type === "medication_cart") {
    console.log('General injection - Session medications:', session.medications);
    if (session.medications && session.medications.length > 0) {
      nextQ = {
        ...nextQ,
        medications: session.medications
      };
      console.log('General injection - Injected medications into cart question:', nextQ.medications);
    }
  }

  // Customize completion message based on cart activity
  if (nextQ && nextQ.type === "completion_message") {
    const cartAnswer = session.answers["A1"]; // This logic is now for the *original* flow
    const itemsAdded = cartAnswer && typeof cartAnswer === 'string' && cartAnswer.includes('Added') && !cartAnswer.includes('No items added');
    
    const lang = session.lang || 'en'; // <-- Use 'en' as default
    let basePrompt = getPrompt(nextQ, lang);

    const successMsg = {
      en: "Thank you for using AI-Sihat! Your medications have been successfully added to cart. You can proceed to checkout from the cart page. Wish you a speedy recovery!",
      my: "Terima kasih kerana menggunakan AI-Sihat! Ubat-ubatan anda telah berjaya ditambah ke troli. Anda boleh meneruskan ke 'checkout' dari halaman troli. Semoga anda cepat sembuh!",
      zh: "感谢您使用 AI-Sihat！您的药物已成功添加到购物车。您可以从购物车页面继续结帐。祝您早日康复！"
    };
    
    const noItemsMsg = {
      en: "Thank you for using AI-Sihat! We hope our recommendations were helpful. Feel free to visit our pharmacy if you need assistance. Wish you a speedy recovery!",
      my: "Terima kasih kerana menggunakan AI-Sihat! Kami harap cadangan kami membantu. Sila kunjungi farmasi kami jika anda memerlukan bantuan. Semoga anda cepat sembuh!",
      zh: "感谢您使用 AI-Sihat！我们希望我们的建议对您有所帮助。如果您需要帮助，欢迎光临我们的药房。祝您早日康复！"
    };
    
    // --- START BUG FIX ---
    // Was: const langKey = (lang === '中文') ? 'zh' : (lang === 'Malay' ? 'my' : 'en');
    const langKey = (lang === 'zh') ? 'zh' : (lang === 'my' ? 'my' : 'en');
    // --- END BUG FIX ---
    
    if (itemsAdded) {
      nextQ.prompt = successMsg[langKey];
    } else {
      nextQ.prompt = noItemsMsg[langKey];
    }
  }

  // --- Generate summary when chat ends ---
  let summary = null;
  if (!nextQ) {  // chat finished
    summary = await generateSummary(sessionId);  // this will also save to DB
  }

  return {
    sessionId,
    answered: { id: currentId, prompt: getPrompt(localizedQ, lang), answer: processed },
    nextQuestion: nextQ || null,
    summary,
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

/**
 * Create an order from chat session for pharmacist approval
 * @param {string} sessionId
 * @param {string} branchId
 * @returns {object} Created order
 */
async function createOrderFromChat(sessionId, branchId) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Session not found");
  if (!session.userId) throw new Error("User ID required to create order");

  const answers = session.answers || {};
  const symptoms = answers["7"] || [];
  
  // Generate summary first
  const summary = await generateSummary(sessionId);
  
  // Save summary to chat record
  await prisma.chat.update({
    where: { id: session.chatId },
    data: { summary },
  });

  // Create a pending prescription (pharmacist will review and approve)
  const prescription = await prisma.prescription.create({
    data: {
      chatId: session.chatId,
      userId: session.userId,
      branchId: branchId,
      customerName: summary.name || "Unknown",
      customerPhone: summary.phoneNumber || "N/A",
      customerAddress: null,
      status: "pending",
    },
  });

  return { prescription, summary };
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
  // --- FIX: Report is always in English for pharmacist ---
  // const lang = session.lang || 'English'; // <-- REMOVED

  // Build detailed report with all answers
  const report = {
    lang: session.lang || 'en',
    name: answers["3"] || "N/A",
    age: answers["4"] || "N/A",
    gender: answers["5"] || "N/A",
    pregnant: answers["6"] || "N/A",
    userDescription: answers["2"]?.userInput || "N/A", // User's own description of symptoms
    symptoms: answers["7"] || [],
    duration: answers["8"] || "N/A",
    temperature: answers["9"] || "N/A",
    allergies: answers["10"] || "N/A",
    medication: answers["11"] || "N/A",
    allAnswers: answers, // Include all allAnswers for complete history
    recommendedMedicines: [], // Medicines extracted from AI recommendations
  };

  // Get full recommendation details - remove duplicate
  // Store recommendations in recommendedMedicines array only
  
  // Get recommendation object for single symptom case
  const sectionData = data[session.section];
  const recommendationObj = sectionData?.find(q => q.type === "recommendation");
  
  // Include all collected recommendations if multi-symptom
  if (session.allRecommendations && session.allRecommendations.length > 0) {
    report.allRecommendations = session.allRecommendations;
    
    // Extract medicine names from recommendations and match with database
    const symptoms = Array.isArray(answers["7"]) ? answers["7"] : [];
    const medicines = await prisma.medicine.findMany();
    
    for (const symptom of symptoms) {
      const recForSymptom = session.allRecommendations.find(r => r.symptom === symptom);
      if (recForSymptom) {
        
        // --- START FIX: Get ENGLISH text for pharmacist ---
        const symptomSectionData = data[symptom]; // e.g., data['Fever']
        let originalRecObj = null;
        if (symptomSectionData && recForSymptom.recommendationId) {
             originalRecObj = symptomSectionData.find(q => q.id === recForSymptom.recommendationId);
        }

        // Get the ENGLISH prompt array
        const englishPromptArray = originalRecObj 
            ? getPromptArray(originalRecObj, 'en') 
            : recForSymptom.details; // Fallback to whatever we have (which might be translated)

        const recText = englishPromptArray.join(' '); // This is now the ENGLISH text!
        // --- END FIX ---
        
        // Try to match medicine name from recommendation text
        let matchedMedicine = null;
        for (const med of medicines) {
          if (recText.toLowerCase().includes(med.medicineName.toLowerCase())) {
            matchedMedicine = med;
            break;
          }
        }
        
        report.recommendedMedicines.push({
          symptom: symptom,
          recommendationText: recText, // This is now ENGLISH
          medicineName: matchedMedicine ? matchedMedicine.medicineName : null,
          medicineId: matchedMedicine ? matchedMedicine.medicineId : null,
          medicineType: matchedMedicine ? matchedMedicine.medicineType : 'OTC',
          price: matchedMedicine ? parseFloat(matchedMedicine.price) : 0,
          imageUrl: matchedMedicine ? matchedMedicine.imageUrl : null,
          quantity: 1,
          status: 'pending'
        });
      }
    }
  } else if (recommendationObj) {
    // Single symptom - try to extract medicine
    const symptoms = Array.isArray(answers["7"]) ? answers["7"] : [];
    // --- START FIX: Get ENGLISH text for pharmacist ---
    const recText = getPromptArray(recommendationObj, 'en').join(' '); // Use 'en'
    // --- END FIX ---
    const medicines = await prisma.medicine.findMany();
    
    for (const symptom of symptoms) {
      let matchedMedicine = null;
      for (const med of medicines) {
        if (recText.toLowerCase().includes(med.medicineName.toLowerCase())) {
          matchedMedicine = med;
          break;
        }
      }
      
      report.recommendedMedicines.push({
        symptom: symptom,
        recommendationText: recText, // This is now ENGLISH
        medicineName: matchedMedicine ? matchedMedicine.medicineName : null,
        medicineId: matchedMedicine ? matchedMedicine.medicineId : null,
        medicineType: matchedMedicine ? matchedMedicine.medicineType : 'OTC',
        price: matchedMedicine ? parseFloat(matchedMedicine.price) : 0,
        imageUrl: matchedMedicine ? matchedMedicine.imageUrl : null,
        quantity: 1,
        status: 'pending'
      });
    }
  }

  // Save summary to database - update the most recent chat for this user
  if (session.userId) {
    const latestChat = await prisma.chat.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' }
    });
    
    if (latestChat) {
      await prisma.chat.update({
        where: { id: latestChat.id },
        data: { summary: report },
      });
    }
  }

  return report;
}

// --- START: Duplicated functions from messy file. Applying fixes here too. ---

async function answerQuestion(sessionId, answer) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Invalid session");

  const lang = session.lang || 'en';
  
  // --- START FIX: Get currentQ logic moved up ---
  const data = loadSymptomsData();
  const { section, currentId } = session;
  
  let currentQ;
  if (currentId === "COMBINED_REC") {
    // This is a synthetic question. The "type" is what matters.
    // We also need its "prompt" for the `answered` block.
    currentQ = { 
      id: "COMBINED_REC", 
      type: "recommendation",
      prompt: "Based on your symptoms, here are our recommendations",
      prompt_my: "Berdasarkan simptom anda, berikut adalah cadangan kami:",
      prompt_zh: "根据您的症状，以下是我们的建议：" 
    };
  } else {
    const questions = data[section];
    currentQ = questions?.find(q => q.id === currentId);
  }
  
  if (!currentQ) throw new Error(`Question not found for section "${section}" and id "${currentId}"`);
  // --- END FIX ---


  // --- START FIX: Modified special handling ---
  // Now checks for type, catching "COMBINED_REC" AND single recs (e.g., "F_R1")
  if (currentQ.type === "recommendation") {
    // The frontend flow (continueFromCart) sends an answer here
    // AFTER pharmacist approval (e.g., "Added 1 item(s)").
    // We must NOT show the AppFlow cart (A1).
    // We skip directly to the completion message (A2).
    
    session.answers[currentId] = answer;
    
    // Find the completion question (A2) from AppFlow
    const completionQ = data["AppFlow"]?.find(q => q.type === "completion_message");
    
    if (completionQ) {
      session.section = "AppFlow"; // Set section for localization
      session.currentId = completionQ.id;
      sessionService.updateSession(sessionId, session);
      
      let localizedCompletionQ = localizeQuestion(completionQ, lang);
      
      // --- START: Customization logic ---
      const cartAnswer = answer; // The answer is "Added..." or "No items added"
      const itemsAdded = cartAnswer && typeof cartAnswer === 'string' && cartAnswer.includes('Added') && !cartAnswer.includes('No items added');
      
      const successMsg = {
        en: "Thank you for using AI-Sihat! Your medications have been successfully added to cart. You can proceed to checkout from the cart page. Wish you a speedy recovery!",
        my: "Terima kasih kerana menggunakan AI-Sihat! Ubat-ubatan anda telah berjaya ditambah ke troli. Anda boleh meneruskan ke 'checkout' dari halaman troli. Semoga anda cepat sembuh!",
        zh: "感谢您使用 AI-Sihat！您的药物已成功添加到购物车。您可以从购物车页面继续结帐。祝您早日康复！"
      };
      
      const noItemsMsg = {
        en: "Thank you for using AI-Sihat! We hope our recommendations were helpful. Feel free to visit our pharmacy if you need assistance. Wish you a speedy recovery!",
        my: "Terima kasih kerana menggunakan AI-Sihat! Kami harap cadangan kami membantu. Sila kunjungi farmasi kami jika anda memerlukan bantuan. Semoga anda cepat sembuh!",
        zh: "感谢您使用 AI-Sihat！我们希望我们的建议对您有所帮助。如果您需要帮助，欢迎光临我们的药房。祝您早日康复！"
      };
      
      // --- START BUG FIX ---
      // Was: const langKey = (lang === '中文') ? 'zh' : (lang === 'Malay' ? 'my' : 'en');
      const langKey = (lang === 'zh') ? 'zh' : (lang === 'my' ? 'my' : 'en');
      // --- END BUG FIX ---
      
      if (itemsAdded) {
        localizedCompletionQ.prompt = successMsg[langKey];
      } else {
        localizedCompletionQ.prompt = noItemsMsg[langKey];
      }
      // --- END: Customization logic ---
      
      return {
        sessionId,
        // Get the prompt for the "answered" object.
        // We must use the *original* question data for getPrompt.
        // If it's COMBINED_REC, we use the hardcoded prompt from above.
        // If it's F_R1, we must find it in the data again to get translations.
        answered: { id: currentId, prompt: getPrompt(currentQ, session.lang), answer },
        nextQuestion: localizedCompletionQ
      };
    }
    
    // Fallback: just end the chat
    session.currentId = null;
    sessionService.updateSession(sessionId, session);
    return {
        sessionId,
        answered: { id: currentId, prompt: getPrompt(currentQ, session.lang), answer },
        nextQuestion: null
    };
  }
  // --- END FIX ---

  
  // --- NORMAL LOGIC ---
  
  // Localize the *real* question for validation
  const localizedQ = localizeQuestion(currentQ, lang);

  if (!validateAnswer(localizedQ, answer)) {
    // --- SPECIAL CHECK for Q1 ---
    if (currentId === "1") {
      let validQ1Ans = false;
      if (currentQ.options_my && currentQ.options_my.includes(answer)) {
        validQ1Ans = true;
      } else if (currentQ.options_zh && currentQ.options_zh.includes(answer)) {
        validQ1Ans = true;
      }
      
      if (!validQ1Ans) {
        throw new Error("Invalid input for this question");
      }
    } else {
      throw new Error("Invalid input for this question");
    }
  }

  const processed = await processAnswer(localizedQ, answer);
  session.answers[currentId] = processed;

  // --- START: NEW TRANSLATION LOGIC ---
  let finalAnswer = processed; // Default to the processed value
  const sessionLang = session.lang || 'en';
  
  // Define the list of question IDs that contain free-text input to be translated
  // We exclude "3" (Name) as that should not be translated.
  const idsToTranslate = [
    "2",   // "Can you describe your symptoms...?"
    "7",   // "What are your symptoms?" (for "Other (Specify)")
    "10",  // "Do you have allergies...?" (for "Yes (List down details)")
    "11",  // "Did you take any medication...?" (for "Yes (List down details)")
    "DI1", // "Do you experience diarrhoea before?" (for "Yes , When___?")
    "DI5", // "Do you start any new medication?" (for "Yes , What__?")
    "CN1", // "Do you experience constipation before?" (for "Yes , When___?")
    "CN5", // "Do you start any new medication?" (for "Yes , What__?")
    "JP1", // "Which joint you feel pain?"
    "MU1", // "Where is the location of muscle you feel pain?"
    "MU4", // "Did you do any vigorous activity...?" (for "Yes , What__?")
    "IS1"  // "What is the body part you feel itchy?"
  ];

  // Only run translation if the user is NOT chatting in English
  if (sessionLang !== 'en' && idsToTranslate.includes(currentId)) {
    
    if (currentId === "2") {
      // Special case for Q2 (useGemini: true)
      // 'processed' is an object: { userInput, aiResponse }
      if (processed && processed.userInput) {
        const translatedInput = await translateToEnglish(processed.userInput);
        finalAnswer = {
          ...processed,
          userInput: translatedInput, // Store translated version
          originalInput: processed.userInput // Optional: keep original for reference
        };
      }
    } else if (currentId === "7") {
      // Special case for Q7 (multiple_choice)
      // 'processed' is an array, e.g., ["Fever", "Cough", "sakit kepala"]
      const originalOptions = localizedQ.originalOptions || localizedQ.options || [];
      
      if (Array.isArray(processed)) {
        finalAnswer = await Promise.all(processed.map(async (ans) => {
          // If 'ans' is NOT in the original options list, it's free text ("Other")
          if (typeof ans === 'string' && !originalOptions.includes(ans)) {
            return await translateToEnglish(ans); // Translate it
          }
          return ans; // It's a standard option, keep as is
        }));
      }
    } else if (typeof processed === 'string' && processed.trim() !== "") {
      // Standard free-text answer (from text_input or single_choice 'Yes')
      const options = localizedQ.originalOptions || localizedQ.options || [];
      // Check if the answer is just a standard option (e.g., "No")
      const isAnOption = options.some(opt => opt.toLowerCase() === processed.toLowerCase());

      // Only translate if it's NOT a standard option (e.g., it's "Panadol", not "No")
      if (!isAnOption) { 
        finalAnswer = await translateToEnglish(processed);
      }
    }
  }
  // --- END: NEW TRANSLATION LOGIC ---
  
  session.answers[currentId] = finalAnswer;

  // Handle language selection
  if (currentId === "1") {
    let selected = processed;
    
    const langMapping = {
      'english': 'en',
      'malay': 'my',
      'chinese': 'zh'
    };

    if (typeof selected === 'string' && !langMapping[selected.toLowerCase()]) {
        const reverseMap = {
          'english': 'en',
          'inggeris': 'en',
          '英语': 'en',
          'malay': 'my',
          'melayu': 'my',
          '马来语': 'my',
          'chinese': 'zh',
          'cina': 'zh',
          '华语': 'zh'
        };
        session.lang = reverseMap[selected.toLowerCase()] || 'en';
    } else {
      const candidate = (typeof selected === 'string') ? selected.trim() : String(selected);
      const lower = candidate.toLowerCase();
      session.lang = langMapping[lower] || selected || 'en';
    }
    
    sessionService.updateSession(sessionId, session);
  }

  let nextQ = null;

  // CASE 1: next_logic pointing to another section
  // This block will now be correctly SKIPPED for recommendations
  // because the check above will catch them first.
  if (currentQ.next_logic && data[currentQ.next_logic]) {
    session.section = currentQ.next_logic;
    nextQ = getFirstQuestion(session.section);
    session.currentId = nextQ?.id;
    sessionService.updateSession(sessionId, session);

    // Save chat record safely
    const sectionData = data[session.section];
    const recommendationObj = sectionData?.find(q => q.type === "recommendation");
    const recommendation = recommendationObj ? (Array.isArray(recommendationObj.prompt) ? recommendationObj.prompt.join("\n") : recommendationObj.prompt) : null;

    try {
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
    } catch (err) {
      console.error('Failed to save chat record:', err);
    }

    return {
      sessionId,
      answered: { id: currentId, prompt: getPrompt(localizedQ, session.lang), answer: processed },
      nextQuestion: localizeQuestion(nextQ, session.lang),
    };
  }

  // CASE 2: CommonIntake flow (gender-based / symptom routing)
  if (section === "CommonIntake") {
    if (currentId === "5" && processed === "Male") {
      nextQ = data[section].find(q => q.id === "7");
    }
    else if (currentId === "5" && processed === "Female") {
      nextQ = data[section].find(q => q.id === "6");
    }
    else if (currentId === "6") {
      nextQ = data[section].find(q => q.id === "7");
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

  // Localize the question first (before any modifications)
  if (nextQ) {
    const langForNext = session.lang || 'en';
    nextQ = localizeQuestion(nextQ, langForNext);
  }

  // Handle recommendation display type
  if (nextQ && nextQ.type === "recommendation_display") {
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

  // Inject medications into AppFlow medication_cart question
  if (nextQ && session.section === "AppFlow" && nextQ.type === "medication_cart") {
    console.log('General injection - Session medications:', session.medications);
    if (session.medications && session.medications.length > 0) {
      nextQ = {
        ...nextQ,
        medications: session.medications
      };
      console.log('General injection - Injected medications into cart question:', nextQ.medications);
    }
  }

  // Customize completion message based on cart activity
  if (nextQ && nextQ.type === "completion_message") {
    const cartAnswer = session.answers["A1"]; // This logic is now for the *original* flow
    const itemsAdded = cartAnswer && typeof cartAnswer === 'string' && cartAnswer.includes('Added') && !cartAnswer.includes('No items added');
    
    const lang = session.lang || 'en'; // <-- Use 'en' as default
    let basePrompt = getPrompt(nextQ, lang);

    const successMsg = {
      en: "Thank you for using AI-Sihat! Your medications have been successfully added to cart. You can proceed to checkout from the cart page. Wish you a speedy recovery!",
      my: "Terima kasih kerana menggunakan AI-Sihat! Ubat-ubatan anda telah berjaya ditambah ke troli. Anda boleh meneruskan ke 'checkout' dari halaman troli. Semoga anda cepat sembuh!",
      zh: "感谢您使用 AI-Sihat！您的药物已成功添加到购物车。您可以从购物车页面继续结帐。祝您早日康复！"
    };
    
    const noItemsMsg = {
      en: "Thank you for using AI-Sihat! We hope our recommendations were helpful. Feel free to visit our pharmacy if you need assistance. Wish you a speedy recovery!",
      my: "Terima kasih kerana menggunakan AI-Sihat! Kami harap cadangan kami membantu. Sila kunjungi farmasi kami jika anda memerlukan bantuan. Semoga anda cepat sembuh!",
      zh: "感谢您使用 AI-Sihat！我们希望我们的建议对您有所帮助。如果您需要帮助，欢迎光临我们的药房。祝您早日康复！"
    };
    
    // --- START BUG FIX ---
    // Was: const langKey = (lang === '中文') ? 'zh' : (lang === 'Malay' ? 'my' : 'en');
    const langKey = (lang === 'zh') ? 'zh' : (lang === 'my' ? 'my' : 'en');
    // --- END BUG FIX ---
    
    if (itemsAdded) {
      nextQ.prompt = successMsg[langKey];
    } else {
      nextQ.prompt = noItemsMsg[langKey];
    }
  }

  // --- Generate summary when chat ends ---
  let summary = null;
  if (!nextQ) {  // chat finished
    summary = await generateSummary(sessionId);  // this will also save to DB
  }

  return {
    sessionId,
    answered: { id: currentId, prompt: getPrompt(localizedQ, lang), answer: processed },
    nextQuestion: nextQ || null,
    summary,
  };
}

async function generateSummary(sessionId) {
  const session = sessionService.getSession(sessionId);
  if (!session) throw new Error("Session not found");

  const answers = session.answers || {};
  const data = loadSymptomsData();
  // --- FIX: Report is always in English for pharmacist ---
  // const lang = session.lang || 'English'; // <-- REMOVED

  // Build detailed report with all answers
  const report = {
    lang: session.lang || 'en',
    name: answers["3"] || "N/A",
    age: answers["4"] || "N/A",
    gender: answers["5"] || "N/A",
    pregnant: answers["6"] || "N/A",
    userDescription: answers["2"]?.userInput || "N/A", // User's own description of symptoms
    symptoms: answers["7"] || [],
    duration: answers["8"] || "N/A",
    temperature: answers["9"] || "N/A",
    allergies: answers["10"] || "N/A",
    medication: answers["11"] || "N/A",
    allAnswers: answers, // Include all allAnswers for complete history
    recommendedMedicines: [], // Medicines extracted from AI recommendations
  };

  // Get full recommendation details - remove duplicate
  // Store recommendations in recommendedMedicines array only
  
  // Get recommendation object for single symptom case
  const sectionData = data[session.section];
  const recommendationObj = sectionData?.find(q => q.type === "recommendation");
  
  // Include all collected recommendations if multi-symptom
  if (session.allRecommendations && session.allRecommendations.length > 0) {
    report.allRecommendations = session.allRecommendations;
    
    // Extract medicine names from recommendations and match with database
    const symptoms = Array.isArray(answers["7"]) ? answers["7"] : [];
    const medicines = await prisma.medicine.findMany();
    
    for (const symptom of symptoms) {
      const recForSymptom = session.allRecommendations.find(r => r.symptom === symptom);
      if (recForSymptom) {
        
        // --- START FIX: Get ENGLISH text for pharmacist ---
        const symptomSectionData = data[symptom]; // e.g., data['Fever']
        let originalRecObj = null;
        if (symptomSectionData && recForSymptom.recommendationId) {
             originalRecObj = symptomSectionData.find(q => q.id === recForSymptom.recommendationId);
        }

        // Get the ENGLISH prompt array
        const englishPromptArray = originalRecObj 
            ? getPromptArray(originalRecObj, 'en') 
            : recForSymptom.details; // Fallback to whatever we have (which might be translated)

        const recText = englishPromptArray.join(' '); // This is now the ENGLISH text!
        // --- END FIX ---
        
        // Try to match medicine name from recommendation text
        let matchedMedicine = null;
        for (const med of medicines) {
          if (recText.toLowerCase().includes(med.medicineName.toLowerCase())) {
            matchedMedicine = med;
            break;
          }
        }
        
        report.recommendedMedicines.push({
          symptom: symptom,
          recommendationText: recText, // This is now ENGLISH
          medicineName: matchedMedicine ? matchedMedicine.medicineName : null,
          medicineId: matchedMedicine ? matchedMedicine.medicineId : null,
          medicineType: matchedMedicine ? matchedMedicine.medicineType : 'OTC',
          price: matchedMedicine ? parseFloat(matchedMedicine.price) : 0,
          imageUrl: matchedMedicine ? matchedMedicine.imageUrl : null,
          quantity: 1,
          status: 'pending'
        });
      }
    }
  } else if (recommendationObj) {
    // Single symptom - try to extract medicine
    const symptoms = Array.isArray(answers["7"]) ? answers["7"] : [];
    // --- START FIX: Get ENGLISH text for pharmacist ---
    const recText = getPromptArray(recommendationObj, 'en').join(' '); // Use 'en'
    // --- END FIX ---
    const medicines = await prisma.medicine.findMany();
    
    for (const symptom of symptoms) {
      let matchedMedicine = null;
      for (const med of medicines) {
        if (recText.toLowerCase().includes(med.medicineName.toLowerCase())) {
          matchedMedicine = med;
          break;
        }
      }
      
      report.recommendedMedicines.push({
        symptom: symptom,
        recommendationText: recText, // This is now ENGLISH
        medicineName: matchedMedicine ? matchedMedicine.medicineName : null,
        medicineId: matchedMedicine ? matchedMedicine.medicineId : null,
        medicineType: matchedMedicine ? matchedMedicine.medicineType : 'OTC',
        price: matchedMedicine ? parseFloat(matchedMedicine.price) : 0,
        imageUrl: matchedMedicine ? matchedMedicine.imageUrl : null,
        quantity: 1,
        status: 'pending'
      });
    }
  }

  // Save summary to database - update the most recent chat for this user
  if (session.userId) {
    const latestChat = await prisma.chat.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' }
    });
    
    if (latestChat) {
      await prisma.chat.update({
        where: { id: latestChat.id },
        data: { summary: report },
      });
    }
  }

  return report;
}

// --- END: Duplicated functions ---

module.exports = {
  startChat,
  answerQuestion,
  getRecommendation,
  approveRecommendation,
  generateSummary,
  createOrderFromChat,
};