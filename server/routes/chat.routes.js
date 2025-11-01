/**
 * Chat Routes (Combined)
 * Handles all chat-related endpoints
 */

const { v4: uuidv4 } = require("uuid");

// Import helpers and data (from code2)
const {
  getFirstQuestion,
  getNextQuestion,
  validateAnswer,
  processAnswer,
} = require("../services/chatService"); 
const data = require("../data/symptoms.json"); // or wherever your data is stored

// In-memory session store
const sessions = new Map();

const chatService = require("../services/chatService");

module.exports = (app) => {
  /**
   * POST /chat/start
   * Create a new chat session
   */
  app.post("/chat/start", (req, res) => {
    try {
      // ======= CODE2 LOGIC ADDED =======
      const section = "CommonIntake";
      const firstQ = getFirstQuestion(data, section);
      if (!firstQ)
        return res.status(500).json({ error: "No starting question configured." });

      const sessionId = uuidv4();
      const session = {
        id: sessionId,
        section,
        currentId: firstQ.id,
        answers: {},
      };

      sessions.set(sessionId, session);

      res.json({
        sessionId,
        currentQuestion: firstQ,
      });
    } catch (error) {
      console.error("Start chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /chat/ask
   * Answer a question and get the next one
   */
  app.post("/chat/ask", async (req, res) => {
    try {
      const { sessionId, answer } = req.body;
      if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

      const session = sessions.get(sessionId);
      if (!session) return res.status(404).json({ error: "Invalid sessionId" });

      const sectionQuestions = data[session.section];
      const currentQuestion = sectionQuestions.find(
        (q) => q.id === session.currentId
      );
      if (!currentQuestion)
        return res.status(500).json({ error: "Current question not found" });

      // Validate answer first
      const ok = validateAnswer(currentQuestion, answer);
      if (!ok) {
        return res.status(400).json({
          error:
            "Invalid input for this question. Please answer with the correct type/option.",
          currentQuestion,
        });
      }

      // Process and store answer
      const processed = await processAnswer(currentQuestion, answer);
      session.answers[session.currentId] = processed;

      // Determine next question
      const nextQuestion = getNextQuestion(
        data,
        session.section,
        session.currentId,
        session
      );

      // If next question belongs to a new section, update session.section
      if (nextQuestion) {
        let foundSection = null;
        for (const secName of Object.keys(data)) {
          if (data[secName].some((q) => q.id === nextQuestion.id)) {
            foundSection = secName;
            break;
          }
        }
        if (foundSection) session.section = foundSection;

        session.currentId = nextQuestion.id;
        sessions.set(sessionId, session);

        return res.json({
          sessionId,
          answered: {
            id: currentQuestion.id,
            prompt: currentQuestion.prompt,
            answer: processed,
          },
          nextQuestion,
        });
      }

      // No next question → end of flow
      return res.json({
        sessionId,
        answered: {
          id: currentQuestion.id,
          prompt: currentQuestion.prompt,
          answer: processed,
        },
        message: "End of flow",
        answers: session.answers,
      });
    } catch (error) {
      console.error("Answer question error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /chat/recommend
   * Provide recommendation based on session data
   */
  app.post("/chat/recommend", (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId)
        return res.status(400).json({ error: "sessionId is required" });

      const session = sessions.get(sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const sectionData = data[session.section] || [];
      const rec = sectionData.find((q) => q.type === "recommendation");

      res.json({
        sessionId,
        recommendation: rec ? rec.details : ["No recommendation available."],
      });
    } catch (error) {
      console.error("Get recommendation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /chat/approve
   * Simulate pharmacist approval or confirmation
   */
  app.post("/chat/approve", (req, res) => {
    try {
      const { sessionId, approved } = req.body;

      if (!sessionId)
        return res.status(400).json({ error: "sessionId is required" });

      const session = sessions.get(sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });

      session.approved = !!approved;

      res.json({
        sessionId,
        message: approved
          ? "✅ Approved! Proceeding."
          : "❌ Not approved.",
      });
    } catch (error) {
      console.error("Approve recommendation error:", error);
      res.status(500).json({ error: error.message });
    }
  });
};
