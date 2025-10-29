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
      where: { orderId: parseInt(id) }
    });
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    const status = error.code === 'P2025' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};
