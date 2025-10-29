/**
 * Medicine Service
 * Business logic for medicine inventory operations
 */

const prisma = require("../prisma/client");

/**
 * Create a new medicine
 * @param {object} medicineData - { medicineName, medicineType, medicineQuantity }
 * @returns {Promise<object>} Created medicine
 */
async function createMedicine(medicineData) {
  const { medicineName, medicineType, medicineQuantity } = medicineData;

  // Validate required fields
  if (!medicineName || !medicineType || medicineQuantity === undefined) {
    throw new Error("Missing required fields: medicineName, medicineType, medicineQuantity");
  }

  // Validate quantity
  if (typeof medicineQuantity !== "number" || medicineQuantity < 0) {
    throw new Error("Quantity must be a non-negative number");
  }

  // Check if medicine already exists
  const existing = await prisma.medicine.findFirst({
    where: {
      medicineName: medicineName,
      medicineType: medicineType
    }
  });

  if (existing) {
    throw new Error("Medicine with this name and type already exists");
  }

  const medicine = await prisma.medicine.create({
    data: {
      medicineName: medicineName,
      medicineType: medicineType,
      medicineQuantity: medicineQuantity,
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
 * @param {string} medicineId - Medicine ID
 * @returns {Promise<object>} Medicine
 */
async function getMedicineById(medicineId) {
  const medicine = await prisma.medicine.findUnique({
    where: { medicineId: medicineId }
  });
  
  if (!medicine) {
    throw new Error("Medicine not found");
  }
  
  return medicine;
}

/**
 * Update medicine details
 * @param {string} medicineId - Medicine ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated medicine
 */
async function updateMedicine(medicineId, updates) {
  // Validate quantity if provided
  if (updates.medicineQuantity !== undefined) {
    if (typeof updates.medicineQuantity !== "number" || updates.medicineQuantity < 0) {
      throw new Error("Quantity must be a non-negative number");
    }
  }

  // Build update data object
  const data = {};
  if (updates.medicineName) data.medicineName = updates.medicineName;
  if (updates.medicineType) data.medicineType = updates.medicineType;
  if (updates.medicineQuantity !== undefined) data.medicineQuantity = updates.medicineQuantity;

  const medicine = await prisma.medicine.update({
    where: { medicineId: medicineId },
    data
  });

  return medicine;
}

/**
 * Update medicine stock quantity
 * @param {string} medicineId - Medicine ID
 * @param {number} quantity - New quantity
 * @returns {Promise<object>} Updated medicine
 */
async function updateStock(medicineId, quantity) {
  if (typeof quantity !== "number" || quantity < 0) {
    throw new Error("Quantity must be a non-negative number");
  }

  const medicine = await prisma.medicine.update({
    where: { medicineId: medicineId },
    data: { medicineQuantity: quantity }
  });
  
  return medicine;
}

/**
 * Increase medicine stock
 * @param {string} medicineId - Medicine ID
 * @param {number} amount - Amount to add
 * @returns {Promise<object>} Updated medicine
 */
async function increaseStock(medicineId, amount) {
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const medicine = await prisma.medicine.update({
    where: { medicineId: medicineId },
    data: { medicineQuantity: { increment: amount } }
  });
  
  return medicine;
}

/**
 * Decrease medicine stock
 * @param {string} medicineId - Medicine ID
 * @param {number} amount - Amount to subtract
 * @returns {Promise<object>} Updated medicine
 */
async function decreaseStock(medicineId, amount) {
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const medicine = await prisma.medicine.findUnique({
    where: { medicineId: medicineId }
  });

  if (!medicine) {
    throw new Error("Medicine not found");
  }

  if (medicine.medicineQuantity < amount) {
    throw new Error(`Insufficient stock. Available: ${medicine.medicineQuantity}`);
  }

  const updated = await prisma.medicine.update({
    where: { medicineId: medicineId },
    data: { medicineQuantity: { decrement: amount } }
  });
  
  return updated;
}

/**
 * Delete a medicine
 * @param {string} medicineId - Medicine ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteMedicine(medicineId) {
  await prisma.medicine.delete({
    where: { medicineId: medicineId }
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
