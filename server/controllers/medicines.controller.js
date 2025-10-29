const { validationResult } = require("express-validator");
const medicineService = require("../services/medicineService");

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const medicine = await medicineService.createMedicine(req.body);
    res.status(201).json(medicine);
  } catch (error) {
    console.error("Create medicine error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      inStock: req.query.inStock === "true"
    };
    const medicines = await medicineService.getAllMedicines(filters);
    res.status(200).json(medicines);
  } catch (error) {
    console.error("Get all medicines error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await medicineService.getMedicineById(id);
    res.status(200).json(medicine);
  } catch (error) {
    console.error("Get medicine error:", error);
    const status = error.message === "Medicine not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await medicineService.updateMedicine(id, req.body);
    res.status(200).json(medicine);
  } catch (error) {
    console.error("Update medicine error:", error);
    const status = error.message === "Medicine not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await medicineService.deleteMedicine(id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Delete medicine error:", error);
    const status = error.message === "Medicine not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};
