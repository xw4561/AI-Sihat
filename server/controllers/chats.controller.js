const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Get all chat sessions
 */
exports.findAll = async (req, res) => {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(chats);
  } catch (error) {
    console.error("Get all chats error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get one chat session by ID
 */
exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await prisma.chat.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }
    
    res.status(200).json(chat);
  } catch (error) {
    console.error("Get chat error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a chat session
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.chat.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({ error: error.message });
  }
};
