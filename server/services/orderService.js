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
 * Create a new order and update user points
 * @param {object} orderData - { user_id, medicine_id, quantity, order_type, use_ai }
 * @returns {Promise<object>} { order, updatedPoints }
 */
async function createOrder(orderData) {
  const { user_id, medicine_id, quantity, order_type, use_ai } = orderData;

  // Validate required fields
  if (!user_id || !medicine_id || !quantity || !order_type) {
    throw new Error("Missing required fields: user_id, medicine_id, quantity, order_type");
  }

  // Validate order type
  const validOrderTypes = ["pickup", "delivery"];
  if (!validOrderTypes.includes(order_type)) {
    throw new Error("Invalid order_type. Must be 'pickup' or 'delivery'");
  }

  // Validate quantity
  if (typeof quantity !== "number" || quantity <= 0) {
    throw new Error("Quantity must be a positive number");
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { userId: parseInt(user_id) }
  });
  if (!user) {
    throw new Error("User not found");
  }

  // Check if medicine exists
  const medicine = await prisma.medicine.findUnique({
    where: { medicineId: parseInt(medicine_id) }
  });
  if (!medicine) {
    throw new Error("Medicine not found");
  }

  // Check medicine stock
  if (medicine.medicineQuantity < quantity) {
    throw new Error(`Insufficient stock. Available: ${medicine.medicineQuantity}`);
  }

  // Calculate points
  const earnedPoints = calculatePoints(quantity, use_ai || false);

  // Create order and update user points in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: parseInt(user_id),
        medicineId: parseInt(medicine_id),
        quantity,
        orderType: order_type,
        useAi: use_ai || false,
        totalPoints: earnedPoints,
        status: "completed",
      },
      include: {
        user: {
          select: { userId: true, username: true, email: true, points: true }
        },
        medicine: true
      }
    });

    // Update user points
    const updatedUser = await tx.user.update({
      where: { userId: parseInt(user_id) },
      data: { points: { increment: earnedPoints } }
    });

    return { newOrder, updatedUser };
  });

  return {
    order: result.newOrder,
    updatedPoints: result.updatedUser.points,
    earnedPoints
  };
}

/**
 * Get all orders for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of orders
 */
async function getUserOrders(userId) {
  return await prisma.order.findMany({
    where: { userId: parseInt(userId) },
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
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} Order with user and medicine details
 */
async function getOrderById(orderId) {
  const order = await prisma.order.findUnique({
    where: { orderId: parseInt(orderId) },
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
 * @param {number} orderId - Order ID
 * @param {string} status - New status (pending, completed, cancelled)
 * @returns {Promise<object>} Updated order
 */
async function updateOrderStatus(orderId, status) {
  const validStatuses = ["pending", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status. Must be: pending, completed, or cancelled");
  }

  const order = await prisma.order.update({
    where: { orderId: parseInt(orderId) },
    data: { status }
  });

  return order;
}

/**
 * Cancel an order and refund points
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} { order, refundedPoints }
 */
async function cancelOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { orderId: parseInt(orderId) }
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
      where: { orderId: parseInt(orderId) },
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
