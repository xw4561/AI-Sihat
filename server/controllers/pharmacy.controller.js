/**
 * Pharmacy Controller
 * Handles HTTP requests for pharmacy branch operations.
 */

const pharmacyService = require("../services/pharmacyService");

// Create a new pharmacy branch
exports.create = async (req, res) => {
  try {
    // Data from request body: { username, email, password, name, address, phone }
    const branch = await pharmacyService.createBranch(req.body);
    res.status(201).json(branch);
  } catch (error) {
    console.error("Create pharmacy branch error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Retrieve all pharmacy branches
exports.findAll = async (req, res) => {
  try {
    const branches = await pharmacyService.getAllBranches();
    res.status(200).json(branches);
  } catch (error) {
    console.error("Get all pharmacy branches error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Retrieve a single pharmacy branch by ID
exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await pharmacyService.getBranchById(id);
    res.status(200).json(branch);
  } catch (error) {
    console.error("Get pharmacy branch error:", error);
    const status = error.message === "Pharmacy branch not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

// Update a pharmacy branch by ID
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;

    // Validate input
    if (!name && !address && !phone) {
      return res
        .status(400)
        .json({ error: "At least one field (name, address, or phone) is required" });
    }

    const branch = await pharmacyService.updateBranch(id, { name, address, phone });
    res.status(200).json(branch);
  } catch (error) {
    console.error("Update pharmacy branch error:", error);
    const status = error.message === "Pharmacy branch not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

// Delete a pharmacy branch by ID
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await pharmacyService.deleteBranch(id);
    res.status(200).json({ message: "Pharmacy branch deleted successfully" });
  } catch (error) {
    console.error("Delete pharmacy branch error:", error);
    const status = error.message === "Pharmacy branch not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};