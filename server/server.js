// server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { processAnswer, getFirstQuestion, getNextQuestion } from "./logic.js";

dotenv.config();

const app = express();
// Configure CORS from env (CORS_ORIGIN supports comma-separated origins); default allows all
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(s => s.trim()).filter(Boolean)
  : [];
const corsOptions = allowedOrigins.length > 0 ? { origin: allowedOrigins } : undefined;
app.use(cors(corsOptions));
app.use(express.json());
const PORT = process.env.PORT || 3000;

// load data
const data = JSON.parse(fs.readFileSync("./symptoms.json", "utf8"));

// in-memory session store
const sessions = new Map();

/**
 * POST /chat/start
 * Create a new chat session
 */
app.post("/chat/start", (req, res) => {
  const section = "CommonIntake"; // 👈 Always start here
  const firstQ = getFirstQuestion(data, section);

  const sessionId = uuidv4();
  sessions.set(sessionId, {
    id: sessionId,
    section,
    answers: {},
    currentId: firstQ?.id
  });

  return res.json({
    sessionId,
    currentQuestion: firstQ
  });
});

/**
 * POST /chat/ask
 * Answer a question and get the next one
 */
app.post("/chat/ask", async (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "Invalid session" });

    const { section, currentId } = session;
    const questions = data[section];
    const currentQ = questions.find(q => q.id === currentId);
    if (!currentQ) return res.status(404).json({ error: "Question not found" });

    // ✅ Normalize multiple_choice answer
    let normalizedAnswer = answer;
    if (currentQ.type === "multiple_choice") {
      let chosenSymptoms = [];
      if (Array.isArray(answer)) {
        chosenSymptoms = answer.filter(a => a);
      } else if (typeof answer === "string" && answer.trim() !== "") {
        chosenSymptoms = [answer];
      }
      normalizedAnswer = chosenSymptoms;
    }

    const processed = await processAnswer(currentQ, normalizedAnswer);
    session.answers[currentId] = processed;

    let nextQ = null;

    // 🧩 CASE 1: Handle next_logic manually (Language → CommonIntake)
    if (currentQ.next_logic && data[currentQ.next_logic]) {
      session.section = currentQ.next_logic;
      nextQ = getFirstQuestion(data, session.section);
      session.currentId = nextQ.id;
      sessions.set(sessionId, session);

      return res.json({
        sessionId,
        answered: { id: currentId, prompt: currentQ.prompt, answer: processed },
        nextQuestion: nextQ,
      });
    }

    // 🧩 CASE 2: Handle CommonIntake flow
    if (section === "CommonIntake") {
      if (currentId === "3" && processed === "Male") {
        // skip pregnancy question (id 4)
        nextQ = questions.find(q => q.id === "5");
      } else if (currentId === "3" && processed === "Female") {
        // include pregnancy question
        nextQ = questions.find(q => q.id === "4");
      } else if (currentId === "4") {
        // after pregnancy question → go to id 5
        nextQ = questions.find(q => q.id === "5");
      } 
      // else if (currentId === "5" && currentQ.next_logic === "SYMPTOM_ROUTE") {
      //   // ✅ Route to the correct symptom flow
      //   const chosenSymptom = normalizedAnswer[0];
      //   if (data[chosenSymptom]) {
      //     session.section = chosenSymptom;
      //     nextQ = getFirstQuestion(data, chosenSymptom);
      //   }
      // } 
      else if (section === "CommonIntake" && currentId === "10") {
        const storedSymptoms = session.answers["5"];
        if (storedSymptoms && storedSymptoms.length > 0) {
          const firstSymptom = storedSymptoms[0];
          if (data[firstSymptom]) {
            session.section = firstSymptom;
            session.currentId = data[firstSymptom][0].id;
            sessions.set(sessionId, session);

            return res.json({
              sessionId,
              answered: { id: currentId, prompt: currentQ.prompt, answer: processed },
              nextQuestion: data[firstSymptom][0],
            });
          }
        }
      }
      else {
        // default next question in CommonIntake
        nextQ = getNextQuestion(data, section, currentId, session);
      }
    }

    // 🧩 CASE 3: For other sections (Flu, Fever, etc.)
    if (!nextQ && data[section]) {
      nextQ = getNextQuestion(data, section, currentId, session);
    }

    session.currentId = nextQ ? nextQ.id : null;
    sessions.set(sessionId, session);

    return res.json({
      sessionId,
      answered: { id: currentId, prompt: currentQ.prompt, answer: processed },
      nextQuestion: nextQ || null,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message) });
  }
});

/**
 * POST /chat/recommend
 * Provide a simple recommendation based on answers
 */
app.post("/chat/recommend", (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  // Example: pick recommendation from the selected section
  const sectionData = data[session.section];
  const rec = sectionData.find(q => q.type === "recommendation");

  return res.json({
    sessionId,
    recommendation: rec ? rec.details : ["No recommendation available."]
  });
});

/**
 * POST /chat/approve
 * Simulate approval or confirmation
 */
app.post("/chat/approve", (req, res) => {
  const { sessionId, approved } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  session.approved = approved;
  return res.json({
    sessionId,
    message: approved
      ? "✅ Approved! Proceeding to payment."
      : "❌ Not approved. Session ended."
  });
});

// Simple health/test endpoint (useful for client/dev checks)
app.get("/api/test", (req, res) => {
  res.json({
    message: "Test API is working!",
    timestamp: new Date().toISOString(),
    status: "success",
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
