const prisma = require("../prisma/client");
const { Role } = require("@prisma/client");

const getPharmacistBranch = async (userId) => {
  if (!userId) {
    throw new Error("User authentication is required.");
  }
  const pharmacyBranch = await prisma.pharmacyBranch.findUnique({
    where: { userId: userId },
    select: { branchId: true },
  });
  if (!pharmacyBranch) {
    throw new Error("Access denied. Not associated with a pharmacy branch.");
  }
  return pharmacyBranch.branchId;
};

/**
 * Get all chat sessions
 */
exports.findAll = async (req, res) => {
  try {
    const { userId, role } = req.user;
    let whereClause = {};
    if (role === Role.PHARMACIST) {
      const branchId = await getPharmacistBranch(userId);
      whereClause.branchId = branchId;
    } else if (role !== Role.ADMIN) {
      return res.status(403).json({ error: "Access denied." });
    }

    const chats = await prisma.chat.findMany({
    where: whereClause,
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

    const { userId, role } = req.user;
    let whereClause = { id: parseInt(id) };

    if (role === Role.PHARMACIST) {
      const branchId = await getPharmacistBranch(userId);
      whereClause.branchId = branchId;
    } else if (role !== Role.ADMIN) {
      return res.status(403).json({ error: "Access denied." });
    }

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

    const { userId, role } = req.user;
    if (role !== Role.ADMIN) {
      return res.status(403).json({ error: "Access denied. Only Admins can delete chats." });
    }

    await prisma.chat.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({ error: error.message });
  }
};
