/**
 * Pharmacy Service
 * Business logic for pharmacy branch operations.
 */

const bcrypt = require("bcrypt");
const prisma = require("../prisma/client");
const { Role } = require("@prisma/client"); // Import Role enum

/**
 * Create a new Pharmacy Branch.
 * This function is transactional. It creates a new User with the
 * PHARMACIST role and then creates the PharmacyBranch linked to that user.
 *
 * @param {object} branchData - { username, email, password, name, address, phone }
 * @returns {Promise<object>} Created pharmacy branch (with associated user info)
 */
async function createBranch(branchData) {
  const { username, email, password, name, address, phone } = branchData;

  // Validate required fields
  if (!username || !email || !password || !name || !address) {
    throw new Error(
      "Missing required fields: username, email, password, name, address"
    );
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Use a transaction to ensure both user and branch are created
  const newBranch = await prisma.$transaction(async (tx) => {
    // 1. Create the User account for the branch
    const newUser = await tx.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: Role.PHARMACIST, // Set role to PHARMACIST
      },
    });

    // 2. Create the Pharmacy Branch linked to the new user
    const branch = await tx.pharmacyBranch.create({
      data: {
        name,
        address,
        phone,
        userId: newUser.userId, // Link to the user created above
      },
    });

    return branch;
  });

  return newBranch;
}

/**
 * Get all pharmacy branches.
 * This is for public lists, so it only selects safe fields.
 *
 * @returns {Promise<Array>} Array of pharmacy branches
 */
async function getAllBranches() {
  return await prisma.pharmacyBranch.findMany({
    include: {
      user: { // Include the associated user's login info
        select: {
          email: true,
          username: true
        }
      }
    },
    orderBy: {
      name: "asc", // Order alphabetically by name
    },
  });
}

/**
 * Get a single pharmacy branch by its branchId.
 * Includes the associated user's email and username.
 *
 * @param {string} branchId - The ID of the pharmacy branch
 * @returns {Promise<object>} Pharmacy branch details
 */
async function getBranchById(branchId) {
  const branch = await prisma.pharmacyBranch.findUnique({
    where: { branchId: branchId },
    include: {
      user: {
        select: {
          // Select only safe fields from the associated user
          userId: true,
          email: true,
          username: true,
        },
      },
    },
  });

  if (!branch) {
    throw new Error("Pharmacy branch not found");
  }
  return branch;
}

/**
 * Update a pharmacy branch's details.
 *
 * @param {string} branchId - The ID of the branch to update
 * @param {object} updateData - { name, address, phone }
 * @returns {Promise<object>} The updated pharmacy branch
 */
async function updateBranch(branchId, updateData) {
  const { name, address, phone } = updateData;

  // Ensure user cannot update the linked userId
  const dataToUpdate = {
    name,
    address,
    phone,
  };

  try {
    return await prisma.pharmacyBranch.update({
      where: { branchId: branchId },
      data: dataToUpdate,
    });
  } catch (error) {
    // Handle case where branch doesn't exist
    if (error.code === "P2025") {
      throw new Error("Pharmacy branch not found");
    }
    throw error;
  }
}

/**
 * Delete a pharmacy branch and its associated user account.
 * Uses a transaction to ensure both are deleted.
 *
 * @param {string} branchId - The ID of the branch to delete
 * @returns {Promise<void>}
 */
async function deleteBranch(branchId) {
  // Use a transaction to delete both the branch and its user account
  await prisma.$transaction(async (tx) => {
    // 1. Find the branch to get its associated userId
    const branch = await tx.pharmacyBranch.findUnique({
      where: { branchId: branchId },
      select: { userId: true },
    });

    if (!branch) {
      throw new Error("Pharmacy branch not found");
    }

    // 2. Delete the PharmacyBranch first
    await tx.pharmacyBranch.delete({
      where: { branchId: branchId },
    });

    // 3. Delete the associated User account
    await tx.user.delete({
      where: { userId: branch.userId },
    });
  });
}

module.exports = {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
};