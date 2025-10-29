/**
 * Chat Routes
 * Handles all chat-related endpoints
 */

const chatService = require("../services/chatService");

module.exports = (app) => {
  /**
   * POST /chat/start
   * Create a new chat session
   */
  app.post("/chat/start", (req, res) => {
    try {
      const result = chatService.startChat();
      res.json(result);
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
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const result = await chatService.answerQuestion(sessionId, answer);
      res.json(result);
    } catch (error) {
      console.error("Answer question error:", error);
      const status = error.message === "Invalid session" ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  });

  /**
   * POST /chat/recommend
   * Provide a simple recommendation based on answers
   */
  app.post("/chat/recommend", (req, res) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const result = chatService.getRecommendation(sessionId);
      res.json(result);
    } catch (error) {
      console.error("Get recommendation error:", error);
      const status = error.message === "Session not found" ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  });

  /**
   * POST /chat/approve
   * Simulate approval or confirmation
   */
  app.post("/chat/approve", (req, res) => {
    try {
      const { sessionId, approved } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const result = chatService.approveRecommendation(sessionId, approved);
      res.json(result);
    } catch (error) {
      console.error("Approve recommendation error:", error);
      const status = error.message === "Session not found" ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  });
};
