const db = require("../models");
const { validationResult } = require("express-validator");

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw { errors: errors.array() };

    const { medicine_name, medicine_type, medicine_quantity } = req.body;

    const payload = {
      medicine_name,
      medicine_type,
      medicine_quantity,
    };

    const medicine = await db.medicine.create(payload);
    res.status(201).json(medicine);
  } catch (error) {
    console.log(error);
    res.status(400).json(error);
  }
};

exports.findAll = async (req, res) => {
  try {
    const data = await db.medicine.findAll();
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await db.medicine.findByPk(id);
    if (!data) return res.status(404).json({ message: "Medicine not found" });
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await db.medicine.update(req.body, {
      where: { medicine_id: id },
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    const updatedMedicine = await db.medicine.findByPk(id);
    res.status(200).json(updatedMedicine);
  } catch (error) {
    res.status(400).json(error);
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.medicine.destroy({ where: { medicine_id: id } });
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(400).json(error);
  }
};
