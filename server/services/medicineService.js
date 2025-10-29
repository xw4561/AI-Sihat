/**
 * Medicine Service
 * Business logic for medicine inventory operations
 */

/**
 * Create a new medicine
 * @param {object} db - Sequelize db instance
 * @param {object} medicineData - { medicine_name, medicine_type, medicine_quantity }
 * @returns {Promise<object>} Created medicine
 */
async function createMedicine(db, medicineData) {
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
  const existing = await db.medicine.findOne({
    where: { medicine_name, medicine_type }
  });

  if (existing) {
    throw new Error("Medicine with this name and type already exists");
  }

  const medicine = await db.medicine.create({
    medicine_name,
    medicine_type,
    medicine_quantity,
  });

  return medicine;
}

/**
 * Get all medicines
 * @param {object} db - Sequelize db instance
 * @param {object} filters - Optional filters { type, inStock }
 * @returns {Promise<Array>} Array of medicines
 */
async function getAllMedicines(db, filters = {}) {
  const where = {};

  if (filters.type) {
    where.medicine_type = filters.type;
  }

  if (filters.inStock) {
    where.medicine_quantity = { [db.Sequelize.Op.gt]: 0 };
  }

  return await db.medicine.findAll({ where });
}

/**
 * Get medicine by ID
 * @param {object} db - Sequelize db instance
 * @param {number} medicineId - Medicine ID
 * @returns {Promise<object>} Medicine
 */
async function getMedicineById(db, medicineId) {
  const medicine = await db.medicine.findByPk(medicineId);
  
  if (!medicine) {
    throw new Error("Medicine not found");
  }
  
  return medicine;
}

/**
 * Update medicine details
 * @param {object} db - Sequelize db instance
 * @param {number} medicineId - Medicine ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated medicine
 */
async function updateMedicine(db, medicineId, updates) {
  const medicine = await db.medicine.findByPk(medicineId);
  
  if (!medicine) {
    throw new Error("Medicine not found");
  }

  // Validate quantity if provided
  if (updates.medicine_quantity !== undefined) {
    if (typeof updates.medicine_quantity !== "number" || updates.medicine_quantity < 0) {
      throw new Error("Quantity must be a non-negative number");
    }
  }

  await medicine.update(updates);
  return medicine;
}

/**
 * Update medicine stock quantity
 * @param {object} db - Sequelize db instance
 * @param {number} medicineId - Medicine ID
 * @param {number} quantity - New quantity
 * @returns {Promise<object>} Updated medicine
 */
async function updateStock(db, medicineId, quantity) {
  if (typeof quantity !== "number" || quantity < 0) {
    throw new Error("Quantity must be a non-negative number");
  }

  const medicine = await db.medicine.findByPk(medicineId);
  
  if (!medicine) {
    throw new Error("Medicine not found");
  }

  medicine.medicine_quantity = quantity;
  await medicine.save();
  
  return medicine;
}

/**
 * Increase medicine stock
 * @param {object} db - Sequelize db instance
 * @param {number} medicineId - Medicine ID
 * @param {number} amount - Amount to add
 * @returns {Promise<object>} Updated medicine
 */
async function increaseStock(db, medicineId, amount) {
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const medicine = await db.medicine.findByPk(medicineId);
  
  if (!medicine) {
    throw new Error("Medicine not found");
  }

  medicine.medicine_quantity += amount;
  await medicine.save();
  
  return medicine;
}

/**
 * Decrease medicine stock
 * @param {object} db - Sequelize db instance
 * @param {number} medicineId - Medicine ID
 * @param {number} amount - Amount to subtract
 * @returns {Promise<object>} Updated medicine
 */
async function decreaseStock(db, medicineId, amount) {
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const medicine = await db.medicine.findByPk(medicineId);
  
  if (!medicine) {
    throw new Error("Medicine not found");
  }

  if (medicine.medicine_quantity < amount) {
    throw new Error(`Insufficient stock. Available: ${medicine.medicine_quantity}`);
  }

  medicine.medicine_quantity -= amount;
  await medicine.save();
  
  return medicine;
}

/**
 * Delete a medicine
 * @param {object} db - Sequelize db instance
 * @param {number} medicineId - Medicine ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteMedicine(db, medicineId) {
  const deleted = await db.medicine.destroy({ where: { medicine_id: medicineId } });
  
  if (!deleted) {
    throw new Error("Medicine not found");
  }
  
  return true;
}

/**
 * Search medicines by name
 * @param {object} db - Sequelize db instance
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching medicines
 */
async function searchMedicines(db, searchTerm) {
  return await db.medicine.findAll({
    where: {
      medicine_name: {
        [db.Sequelize.Op.like]: `%${searchTerm}%`
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
