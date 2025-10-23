const db = require("../models");
const { validationResult } = require("express-validator");

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw { errors: errors.array() };

    const { user_id, medicine_id, quantity, order_type, use_ai } = req.body;

    const user = await db.user.findByPk(user_id);
    const medicine = await db.medicine.findByPk(medicine_id);

    if (!user || !medicine)
      return res.status(404).json({ message: "User or Medicine not found" });

    const basePoints = quantity * 10;
    const earnedPoints = use_ai ? basePoints * 2 : basePoints;

    const newOrder = await db.order.create({
      user_id,
      medicine_id,
      quantity,
      order_type,
      use_ai,
      total_points: earnedPoints,
      status: "completed",
    });

    user.points += earnedPoints;
    await user.save();

    res.status(201).json({
      message: "Order created successfully",
      order: newOrder,
      updatedPoints: user.points,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json(error);
  }
};
