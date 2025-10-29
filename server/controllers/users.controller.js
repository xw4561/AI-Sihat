const db = require("../models");
const { validationResult } = require("express-validator");
const userService = require("../services/userService");

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await userService.createUser(db, req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const users = await userService.getAllUsers(db);
    res.status(200).json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(db, id);
    res.status(200).json(user);
  } catch (error) {
    console.error("Get user error:", error);
    const status = error.message === "User not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.updatePoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    const user = await userService.updateUserPoints(db, id, points);
    res.status(200).json({ message: "Points updated", user });
  } catch (error) {
    console.error("Update points error:", error);
    const status = error.message === "User not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(db, id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    const status = error.message === "User not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};
