// server.js
import express from "express";
import fs from "fs";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { validateAnswer, processAnswer, getNextQuestion, getFirstQuestion } from "./logic.js";

dotenv.config();
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// load JSON once on startup
const data = JSON.parse(fs.readFileSync("./symptoms.json", "utf8"));

// simple in-memory session store
const sessions = new Map();

/**
 * POST /chat/start
 */
app.post("/chat/start", (req, res) => {
  const section = "CommonIntake";
  const firstQ = getFirstQuestion(data, section);
  if (!firstQ) return res.status(500).json({ error: "No starting question configured." });

  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    section,
    currentId: firstQ.id,
    answers: {}
  };

  sessions.set(sessionId, session);

  return res.json({
    sessionId,
    currentQuestion: firstQ
  });
});

/**
 * POST /chat/ask
 * body: { sessionId, answer }
 *
 * - validates
 * - processes
 * - stores processed answer (as returned by processAnswer)
 * - computes next question using getNextQuestion(data, section, currentId, session)
 * - if invalid input -> returns error + same question (does not move forward)
 */
app.post("/chat/ask", async (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "Invalid sessionId" });

    const sectionQuestions = data[session.section];
    const currentQuestion = sectionQuestions.find(q => q.id === session.currentId);
    if (!currentQuestion) return res.status(500).json({ error: "Current question not found" });

    // Validate first. If invalid, re-ask same question.
    const ok = validateAnswer(currentQuestion, answer);
    if (!ok) {
      return res.status(400).json({
        error: "Invalid input for this question. Please answer with the correct type/option.",
        currentQuestion
      });
    }

    // Process and store answer
    const processed = await processAnswer(currentQuestion, answer);
    session.answers[session.currentId] = processed;

    // Determine next question (pass session so routing rules can use previous answers)
    const nextQuestion = getNextQuestion(data, session.section, session.currentId, session);

    // If we have a next question and it belongs to another section (SYMPTOM_ROUTING returns section item),
    // session.section may need to change if nextQuestion comes from different section. We detect this by id mismatch
    // (but in our setup SYMPTOM_ROUTING returns a question object from other section, so we must update session.section)
    if (nextQuestion) {
      // find which section the nextQuestion belongs to
      let foundSection = null;
      for (const secName of Object.keys(data)) {
        if (data[secName].some(q => q.id === nextQuestion.id)) {
          foundSection = secName;
          break;
        }
      }
      if (foundSection) {
        session.section = foundSection;
      }

      session.currentId = nextQuestion.id;
      sessions.set(sessionId, session);

      return res.json({
        sessionId,
        answered: { id: currentQuestion.id, prompt: currentQuestion.prompt, answer: processed },
        nextQuestion
      });
    }

    // no next question -> end of flow
    return res.json({
      sessionId,
      answered: { id: currentQuestion.id, prompt: currentQuestion.prompt, answer: processed },
      message: "End of flow",
      answers: session.answers
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message) });
  }
});

/**
 * POST /chat/recommend
 */
app.post("/chat/recommend", (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const sectionData = data[session.section] || [];
  const rec = sectionData.find(q => q.type === "recommendation");

  return res.json({
    sessionId,
    recommendation: rec ? rec.details : ["No recommendation available."]
  });
});

/**
 * POST /chat/approve (simulate confirmation)
 */
app.post("/chat/approve", (req, res) => {
  const { sessionId, approved } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  session.approved = !!approved;
  return res.json({
    sessionId,
    message: approved ? "✅ Approved! Proceeding." : "❌ Not approved."
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
