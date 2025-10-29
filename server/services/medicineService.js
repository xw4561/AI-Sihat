/**
 * Medicine Service
 * Business logic for medicine inventory operations
 */

const prisma = require("../prisma/client");

/**
 * Create a new medicine
 * @param {object} medicineData - { medicine_name, medicine_type, medicine_quantity }
 * @returns {Promise<object>} Created medicine
 */
async function createMedicine(medicineData) {
  const { medicine_name, medicine_type, medicine_quantity } = medicineData;

  // Validate required fields
  if (!medicine_name || !medicine_type || medicine_quantity === undefined) {
    throw new Error("Missing required fields: medicine_name, medicine_type, medicine_quantity");
  }

  // Validate quantity
  if (typeof medicine_quantity !== "number" || medicine_quantity < 0) {
    throw new Error("Quantity must be a non-negative number");
  }

  // Check if medicine already exists
  const existing = await prisma.medicine.findFirst({
    where: {
      medicineName: medicine_name,
      medicineType: medicine_type
    }
  });

  if (existing) {
    throw new Error("Medicine with this name and type already exists");
  }

  const medicine = await prisma.medicine.create({
    data: {
      medicineName: medicine_name,
      medicineType: medicine_type,
      medicineQuantity: medicine_quantity,
    }
  });

  return medicine;
}

/**
 * Get all medicines
 * @param {object} filters - Optional filters { type, inStock }
 * @returns {Promise<Array>} Array of medicines
 */
async function getAllMedicines(filters = {}) {
  const where = {};

  if (filters.type) {
    where.medicineType = filters.type;
  }

  if (filters.inStock) {
    where.medicineQuantity = { gt: 0 };
  }

  return await prisma.medicine.findMany({ where });
}

/**
 * Get medicine by ID
 * @param {number} medicineId - Medicine ID
 * @returns {Promise<object>} Medicine
 */
async function getMedicineById(medicineId) {
  const medicine = await prisma.medicine.findUnique({
    where: { medicineId: parseInt(medicineId) }
  });
  
  if (!medicine) {
    throw new Error("Medicine not found");
  }
  
  return medicine;
}

/**
 * Update medicine details
 * @param {number} medicineId - Medicine ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated medicine
 */
async function updateMedicine(medicineId, updates) {
  // Validate quantity if provided
  if (updates.medicine_quantity !== undefined) {
    if (typeof updates.medicine_quantity !== "number" || updates.medicine_quantity < 0) {
      throw new Error("Quantity must be a non-negative number");
    }
  }

  // Map snake_case to camelCase
  const data = {};
  if (updates.medicine_name) data.medicineName = updates.medicine_name;
  if (updates.medicine_type) data.medicineType = updates.medicine_type;
  if (updates.medicine_quantity !== undefined) data.medicineQuantity = updates.medicine_quantity;

  const medicine = await prisma.medicine.update({
    where: { medicineId: parseInt(medicineId) },
    data
  });

  return medicine;
}

/**
 * Update medicine stock quantity
 * @param {number} medicineId - Medicine ID
 * @param {number} quantity - New quantity
 * @returns {Promise<object>} Updated medicine
 */
async function updateStock(medicineId, quantity) {
  if (typeof quantity !== "number" || quantity < 0) {
    throw new Error("Quantity must be a non-negative number");
  }

  const medicine = await prisma.medicine.update({
    where: { medicineId: parseInt(medicineId) },
    data: { medicineQuantity: quantity }
  });
  
  return medicine;
}

/**
 * Increase medicine stock
 * @param {number} medicineId - Medicine ID
 * @param {number} amount - Amount to add
 * @returns {Promise<object>} Updated medicine
 */
async function increaseStock(medicineId, amount) {
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const medicine = await prisma.medicine.update({
    where: { medicineId: parseInt(medicineId) },
    data: { medicineQuantity: { increment: amount } }
  });
  
  return medicine;
}

/**
 * Decrease medicine stock
 * @param {number} medicineId - Medicine ID
 * @param {number} amount - Amount to subtract
 * @returns {Promise<object>} Updated medicine
 */
async function decreaseStock(medicineId, amount) {
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const medicine = await prisma.medicine.findUnique({
    where: { medicineId: parseInt(medicineId) }
  });

  if (!medicine) {
    throw new Error("Medicine not found");
  }

  if (medicine.medicineQuantity < amount) {
    throw new Error(`Insufficient stock. Available: ${medicine.medicineQuantity}`);
  }

  const updated = await prisma.medicine.update({
    where: { medicineId: parseInt(medicineId) },
    data: { medicineQuantity: { decrement: amount } }
  });
  
  return updated;
}

/**
 * Delete a medicine
 * @param {number} medicineId - Medicine ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteMedicine(medicineId) {
  await prisma.medicine.delete({
    where: { medicineId: parseInt(medicineId) }
  });
  
  return true;
}

/**
 * Search medicines by name
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching medicines
 */
async function searchMedicines(searchTerm) {
  return await prisma.medicine.findMany({
    where: {
      medicineName: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    }
  });
}

module.exports = {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  updateStock,
  increaseStock,
  decreaseStock,
  deleteMedicine,
  searchMedicines
};
