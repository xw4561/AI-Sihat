const db = require("../models");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw { errors: errors.array() };

    const { username, email, password } = req.body;

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.log(error);
    res.status(400).json(error);
  }
};

exports.findAll = async (req, res) => {
  try {
    const users = await db.user.findAll({
      attributes: ["user_id", "username", "email", "points"],
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.user.findByPk(id, {
      attributes: ["user_id", "username", "email", "points"],
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.updatePoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    const user = await db.user.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.points = points;
    await user.save();

    res.status(200).json({ message: "Points updated", user });
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.user.destroy({ where: { user_id: id } });
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(400).json(error);
  }
};
