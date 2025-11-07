const chatService = require("../services/chatService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = (app) => {
  /**
   * POST /chat/start
   * Create a new chat session
   */
  app.post("/api/chat/start", (req, res) => {
    console.log('[chat.routes] POST /api/chat/start', { body: req.body });
    try {
      const body = req.body || {};
      const { userId } = body; // optional, pass userId if available
      const result = await chatService.startChat(userId);
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
  app.post("/api/chat/ask", async (req, res) => {
    console.log('[chat.routes] POST /api/chat/ask', { body: req.body });
    try {
      const { sessionId, answer } = req.body;
      if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

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
   * Provide a recommendation
   */
  app.post("/api/chat/recommend", (req, res) => {
    console.log('[chat.routes] POST /api/chat/recommend', { body: req.body });
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

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
  app.post("/api/chat/approve", (req, res) => {
    console.log('[chat.routes] POST /api/chat/approve', { body: req.body });
    try {
      const { sessionId, approved } = req.body;
      if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

      const result = chatService.approveRecommendation(sessionId, approved);
      res.json(result);
    } catch (error) {
      console.error("Approve recommendation error:", error);
      const status = error.message === "Session not found" ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  });

  /**
   * GET /chat/:sessionId
   * Fetch the latest chat session and Prisma record
   */
  app.get("/chat/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = chatService.getSession(sessionId); // ensure chatService exports getSession
      if (!session) return res.status(404).json({ error: "Session not found" });

      const chatRecord = await prisma.chat.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
      });

      res.json({ session, chatRecord });
    } catch (error) {
      console.error("Fetch chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });
};
