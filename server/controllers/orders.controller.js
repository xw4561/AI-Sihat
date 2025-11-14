const { validationResult } = require("express-validator");
const orderService = require("../services/orderService");
const prisma = require("../prisma/client");

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await orderService.createOrder(req.body);

    res.status(201).json({
      message: "Order created successfully",
      order: result.order,
      updatedPoints: result.updatedPoints,
      earnedPoints: result.earnedPoints
    });
  } catch (error) {
    console.error("Create order error:", error);
    const status = error.message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    res.status(200).json(order);
  } catch (error) {
    console.error("Get order error:", error);
    const status = error.message === "Order not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.order.delete({
      where: { orderId: id }
    });
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    const status = error.code === 'P2025' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

// Get pending AI-assisted orders with chat data for pharmacist review
exports.getPendingAiOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        useAi: true,
        status: "pending"
      },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            chats: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json(orders);
  } catch (error) {
    console.error("Get pending AI orders error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Approve order (pharmacist)
exports.approveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { medicineId, quantity } = req.body;
    
    if (!medicineId || !quantity) {
      return res.status(400).json({ error: "medicineId and quantity are required" });
    }

    const order = await prisma.order.update({
      where: { orderId: id },
      data: {
        status: "approved",
        medicineId: medicineId,
        quantity: parseInt(quantity),
        updatedAt: new Date()
      },
      include: {
        user: true,
        medicine: true
      }
    });
    
    res.status(200).json({ message: "Order approved successfully", order });
  } catch (error) {
    console.error("Approve order error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Reject order (pharmacist)
exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const order = await prisma.order.update({
      where: { orderId: id },
      data: {
        status: "rejected",
        updatedAt: new Date()
        // Note: You may want to add a 'rejectionReason' field to the schema
      },
      include: {
        user: true
      }
    });
    
    res.status(200).json({ message: "Order rejected successfully", order, reason });
  } catch (error) {
    console.error("Reject order error:", error);
    res.status(400).json({ error: error.message });
  }
};

