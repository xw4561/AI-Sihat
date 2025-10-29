const db = require("../models");
const { validationResult } = require("express-validator");
const orderService = require("../services/orderService");

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await orderService.createOrder(db, req.body);

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
