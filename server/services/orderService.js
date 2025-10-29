/**
 * Order Service
 * Business logic for order operations and points calculation
 */

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
 * @param {object} db - Sequelize db instance
 * @param {object} orderData - { user_id, medicine_id, quantity, order_type, use_ai }
 * @returns {Promise<object>} { order, updatedPoints }
 */
async function createOrder(db, orderData) {
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
  const user = await db.user.findByPk(user_id);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if medicine exists
  const medicine = await db.medicine.findByPk(medicine_id);
  if (!medicine) {
    throw new Error("Medicine not found");
  }

  // Check medicine stock
  if (medicine.medicine_quantity < quantity) {
    throw new Error(`Insufficient stock. Available: ${medicine.medicine_quantity}`);
  }

  // Calculate points
  const earnedPoints = calculatePoints(quantity, use_ai || false);

  // Create order
  const newOrder = await db.order.create({
    user_id,
    medicine_id,
    quantity,
    order_type,
    use_ai: use_ai || false,
    total_points: earnedPoints,
    status: "completed",
  });

  // Update user points
  user.points += earnedPoints;
  await user.save();

  // Update medicine stock (optional - uncomment if you want to track inventory)
  // medicine.medicine_quantity -= quantity;
  // await medicine.save();

  return {
    order: newOrder,
    updatedPoints: user.points,
    earnedPoints
  };
}

/**
 * Get all orders for a user
 * @param {object} db - Sequelize db instance
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of orders
 */
async function getUserOrders(db, userId) {
  return await db.order.findAll({
    where: { user_id: userId },
    include: [
      {
        model: db.medicine,
        attributes: ["medicine_id", "medicine_name", "medicine_type"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });
}

/**
 * Get order by ID
 * @param {object} db - Sequelize db instance
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} Order with user and medicine details
 */
async function getOrderById(db, orderId) {
  const order = await db.order.findByPk(orderId, {
    include: [
      {
        model: db.user,
        attributes: ["user_id", "username", "email"]
      },
      {
        model: db.medicine,
        attributes: ["medicine_id", "medicine_name", "medicine_type"]
      }
    ]
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
}

/**
 * Update order status
 * @param {object} db - Sequelize db instance
 * @param {number} orderId - Order ID
 * @param {string} status - New status (pending, completed, cancelled)
 * @returns {Promise<object>} Updated order
 */
async function updateOrderStatus(db, orderId, status) {
  const validStatuses = ["pending", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status. Must be: pending, completed, or cancelled");
  }

  const order = await db.order.findByPk(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  order.status = status;
  await order.save();

  return order;
}

/**
 * Cancel an order and refund points
 * @param {object} db - Sequelize db instance
 * @param {number} orderId - Order ID
 * @returns {Promise<object>} { order, refundedPoints }
 */
async function cancelOrder(db, orderId) {
  const order = await db.order.findByPk(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "cancelled") {
    throw new Error("Order already cancelled");
  }

  // Get user and refund points
  const user = await db.user.findByPk(order.user_id);
  if (user) {
    user.points -= order.total_points;
    await user.save();
  }

  // Update order status
  order.status = "cancelled";
  await order.save();

  return {
    order,
    refundedPoints: order.total_points
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
