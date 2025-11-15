/**
 * Chat Routes (Combined)
 * Handles all chat-related endpoints
 */

const chatService = require("../services/chatService");
const sessionService = require("../services/sessionService");
const prisma = require("../prisma/client");

module.exports = (app) => {
  /**
   * POST /chat/start
   * Create a new chat session
   */
  app.post("/api/chat/start", async (req, res) => {
    console.log('[chat.routes] POST /api/chat/start', { body: req.body });
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
      }
      const result = await chatService.startChat(userId);
      res.json(result);
    } catch (error) {
      console.error("Start chat error:", error);
      if (error.message.includes("No branch selected")) {
        return res.status(400).json({ error: error.message });
      }
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
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /chat/recommend
   * Provide a recommendation
   */
  app.post("/api/chat/recommend", async (req, res) => {
    console.log('[chat.routes] POST /api/chat/recommend', { body: req.body });
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

      const result = await chatService.getRecommendation(sessionId);
      res.json(result);
    } catch (error) {
      console.error("Get recommendation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /chat/complete
   * Complete chat and create order for pharmacist approval
   */
  app.post("/api/chat/complete", async (req, res) => {
    console.log('[chat.routes] POST /api/chat/complete', { body: req.body });
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

      const { branchId } = req.body;
      if (!branchId) return res.status(400).json({ error: "branchId is required" });

      const result = await chatService.createOrderFromChat(sessionId, branchId);
      res.json(result);
    } catch (error) {
      console.error("Complete chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /chat/approve
   * Simulate pharmacist approval or confirmation
   */
  app.post("/api/chat/approve", async (req, res) => {
    console.log('[chat.routes] POST /api/chat/approve', { body: req.body });
    try {
      const { sessionId, approved } = req.body;
      if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

      const result = await chatService.approveRecommendation(sessionId, approved);
      res.json(result);
    } catch (error) {
      console.error("Approve recommendation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /chat/:sessionId
   * Fetch the latest chat session and Prisma record
   */
  app.get("/chat/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = sessionService.getSession(sessionId);
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
