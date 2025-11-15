/**
 * Order Service
 * Business logic for order operations and points calculation
 */

const prisma = require("../prisma/client");

/**
 * Calculate points earned from an order
 * @param {number} quantity - Quantity ordered
 * @param {boolean} useAI - Whether AI consultation was used
 * @returns {number} Points earned
 */
function calculatePoints(quantity, useAI) {
  const basePoints = quantity * 10;
  return useAI ? basePoints * 2 : basePoints;
}

/**
 * Create a new order with multiple items
 * @param {object} orderData - { userId, items: [{medicineId, quantity, price, prescriptionItemId?}], customerName, customerPhone, customerAddress?, prescriptionId? }
 * @returns {Promise<object>} { order, updatedPoints, earnedPoints }
 */
async function createOrder(orderData) {
  const { userId, items, customerName, customerPhone, customerAddress, prescriptionId } = orderData;

  // Validate required fields
  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    throw new Error("Missing required fields: userId, items (must be non-empty array)");
  }

  if (!customerName || !customerPhone) {
    throw new Error("Missing required fields: customerName, customerPhone");
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { userId: userId }
  });
  if (!user) {
    throw new Error("User not found");
  }
  if (!user.lastSelectedBranchId) {
    throw new Error("No branch selected. Please select a pharmacy branch to place an order.");
  }

  // Validate all medicines exist and calculate totals
  let totalPrice = 0;
  let totalPoints = 0;

  for (const item of items) {
    if (!item.medicineId || !item.quantity || !item.price) {
      throw new Error("Each item must have medicineId, quantity, and price");
    }

    const medicine = await prisma.medicine.findUnique({
      where: { medicineId: item.medicineId }
    });

    if (!medicine) {
      throw new Error(`Medicine not found: ${item.medicineId}`);
    }

    // Check stock
    if (medicine.medicineQuantity < item.quantity) {
      throw new Error(`Insufficient stock for ${medicine.medicineName}. Available: ${medicine.medicineQuantity}`);
    }

    const itemTotal = parseFloat(item.price) * item.quantity;
    totalPrice += itemTotal;
    
    // Calculate points: 1 point per RM spent
    totalPoints += Math.floor(itemTotal);
  }

  // Create order and order items in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        userId,
        branchId: user.lastSelectedBranchId,
        prescriptionId: prescriptionId || null,
        totalPrice,
        totalPoints,
        customerName,
        customerPhone,
        customerAddress: customerAddress || null,
        status: "pending",
      }
    });

    // Create order items
    for (const item of items) {
      await tx.orderItem.create({ /* ... */ });
      await tx.medicine.update({ /* ... */ });
    }

    // Update user points...
    const updatedUser = await tx.user.update({ /* ... */ });

    // Fetch complete order...
    const completeOrder = await tx.order.findUnique({ /* ... */ });

    return { completeOrder, updatedUser };
  });

  return {
    order: result.completeOrder,
    updatedPoints: result.updatedUser.points,
    earnedPoints: totalPoints
  };
}

/**
 * Get all orders for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of orders
 */
async function getUserOrders(userId) {
  return await prisma.order.findMany({
    where: { userId: userId },
    include: {
      medicine: {
        select: {
          medicineId: true,
          medicineName: true,
          medicineType: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<object>} Order with user and medicine details
 */
async function getOrderById(orderId) {
  const order = await prisma.order.findUnique({
    where: { orderId: orderId },
    include: {
      user: {
        select: { userId: true, username: true, email: true }
      },
      medicine: {
        select: { medicineId: true, medicineName: true, medicineType: true }
      }
    }
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status (pending, completed, cancelled)
 * @returns {Promise<object>} Updated order
 */
async function updateOrderStatus(orderId, status) {
  const validStatuses = ["pending", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status. Must be: pending, completed, or cancelled");
  }

  const order = await prisma.order.update({
    where: { orderId: orderId },
    data: { status }
  });

  return order;
}

/**
 * Cancel an order and refund points
 * @param {string} orderId - Order ID
 * @returns {Promise<object>} { order, refundedPoints }
 */
async function cancelOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { orderId: orderId }
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "cancelled") {
    throw new Error("Order already cancelled");
  }

  // Update order and refund points in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update order status
    const updatedOrder = await tx.order.update({
      where: { orderId: orderId },
      data: { status: "cancelled" }
    });

    // Refund points to user
    await tx.user.update({
      where: { userId: order.userId },
      data: { points: { decrement: order.totalPoints } }
    });

    return updatedOrder;
  });

  return {
    order: result,
    refundedPoints: order.totalPoints
  };
}

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  calculatePoints
};
