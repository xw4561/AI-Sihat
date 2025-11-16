const { validationResult } = require("express-validator");
const orderService = require("../services/orderService");
const prisma = require("../prisma/client");
// --- ADD THIS LINE ---
const { translateText } = require("../services/geminiService"); // Adjust path if needed
const { Role } = require("../prisma/client");

const getPharmacistBranch = async (userId) => {
  if (!userId) {
    throw new Error("Authentication required.");
  }
  const pharmacyBranch = await prisma.pharmacyBranch.findUnique({
    where: { userId: userId },
    select: { branchId: true },
  });

  if (!pharmacyBranch) {
    throw new Error("Access denied. Not associated with a pharmacy branch.");
  }
  return pharmacyBranch.branchId;
};

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await orderService.createOrder(req.body);

    res.status(201).json({
      message: "Order created successfully",
      order: result.order,
      updatedPoints: result.updatedPoints,
      earnedPoints: result.earnedPoints
    });
  } catch (error) {
    console.error("Create order error:", error);
    const status = error.message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // console.log("Retrieved orders:", orders);

    res.status(200).json(orders);
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.findByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await prisma.order.findMany({
      where: { userId: userId },
      select: { orderId: true, createdAt: true, status: true, totalPrice: true, paymentMethod: true,prescription: { include: { items: { include: { medicine: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform orders to match expected format
    const transformedOrders = orders.map(order => ({
      orderId: order.orderId,
      orderDate: order.createdAt,
      orderStatus: order.status.charAt(0).toUpperCase() + order.status.slice(1),
      totalAmount: order.totalPrice,
      paymentMethod: order.paymentMethod ? (order.paymentMethod === 'CASH' ? 'Cash' : 'Online Banking') : null,
      prescriptions: order.prescription?.items?.map(item => ({
        prescriptionId: item.prescriptionItemId,
        quantity: item.quantity,
        medicine: item.medicine
      })) || []
    }));
    
    res.status(200).json(transformedOrders);
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    res.status(200).json(order);
  } catch (error) {
    console.error("Get order error:", error);
    const status = error.message === "Order not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.order.delete({
      where: { orderId: id }
    });
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    const status = error.code === 'P2025' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
};

// Get pending prescriptions with chat data for pharmacist review
exports.getPendingAiOrders = async (req, res) => {
  console.log('[Pending AI Route] POST /ai-sihat/pending-ai', { body: req.body });
  try {
    const userId = req.body?.userId; 
    // const role = req.body?.role;
    const branchId = await getPharmacistBranch(userId);

    if (!userId) {
      return res.status(400).json({ error: "Missing userId or role" });
    }
    
    let whereClause = { 
      status: "pending",
      branchId: branchId
    };

    // if (role === Role.PHARMACIST) {
    //   const branchId = await getPharmacistBranch(userId);
    //   whereClause.chat = {
    //     branchId: branchId,
    //   };
    // } else if (role !== Role.ADMIN) {
    //   return res.status(403).json({ error: "Access denied." });
    // }

     const prescriptions = await prisma.prescription.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        },
        chat: {
          select: {
            summary: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log("Retrieved pending prescriptions:", prescriptions);
    res.status(200).json(prescriptions);

  } catch (error) {
    console.error("Get pending prescriptions error:", error);
    const status = error.message.includes("denied") ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
};

// Approve prescription (pharmacist) - supports multiple medicines and new medicine creation
exports.approveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedMedicines, pharmacistId } = req.body;
    
    // approvedMedicines format: [{ medicineId?, medicineName, medicineType, quantity, symptom?, aiRecommendation?, notes?, isNew? }]
    if (!approvedMedicines || !Array.isArray(approvedMedicines) || approvedMedicines.length === 0) {
      return res.status(400).json({ error: "At least one medicine must be approved" });
    }

    // Get the pending prescription
    const prescription = await prisma.prescription.findUnique({ 
      where: { prescriptionId: id },
      include: { user: true, chat: true }
    });
    
    if (!prescription) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    const prescriptionItems = [];
    
    // Process each approved medicine
    for (const med of approvedMedicines) {
      let medicineId = med.medicineId;
      
      // If it's a new medicine, create it first
      if (med.isNew) {
        const newMedicine = await prisma.medicine.create({
          data: {
            medicineName: med.medicineName,
            medicineType: med.medicineType || 'OTC',
            medicineQuantity: 1000, // Default stock
            price: parseFloat(med.price) || 0,
            imageUrl: med.imageUrl || 'https://via.placeholder.com/150'
          }
        });
        medicineId = newMedicine.medicineId;
      }
      
      // Prepare prescription item data
      prescriptionItems.push({
        medicineId: medicineId,
        quantity: parseInt(med.quantity),
        symptom: med.symptom || null,
        // --- FIX: Store original AI recommendation text
        aiRecommendation: med.recommendationText || null,
        wasRejected: med.action === 'reject',
        rejectionReason: med.rejectionReason || null,
        // --- FIX: Store original AI rec text if rejected
        originalAiRecommendation: med.action === 'reject' ? (med.recommendationText || null) : null,
        notes: med.notes || null
      });
    }
    
    // Update prescription to approved and create prescription items
    const approvedPrescription = await prisma.prescription.update({
      where: { prescriptionId: id },
      data: {
        status: "approved",
        pharmacistId: pharmacistId || null,
        approvedAt: new Date(),
        items: {
          create: prescriptionItems
        }
      },
      include: {
        user: true,
        pharmacist: {
          select: {
            username: true,
            email: true
          }
        },
        items: {
          include: {
            medicine: true
          }
        }
      }
    });
    
    res.status(200).json({ message: "Prescription approved successfully", prescription: approvedPrescription });
  } catch (error) {
    console.error("Approve prescription error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Reject prescription (pharmacist)
exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, pharmacistId } = req.body;
    
    const prescription = await prisma.prescription.update({
      where: { prescriptionId: id },
      data: {
        status: "rejected",
        pharmacistId: pharmacistId || null,
        rejectedAt: new Date(),
        rejectionReason: reason || "No reason provided"
      },
      include: {
        user: true,
        pharmacist: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });
    
    res.status(200).json({ message: "Prescription rejected successfully", prescription });
  } catch (error) {
    console.error("Reject prescription error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Get prescription by ID (for polling status)
// --- THIS IS THE MODIFIED FUNCTION ---
exports.getPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const prescription = await prisma.prescription.findUnique({
      where: { prescriptionId: id },
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        },
        pharmacist: {
          select: {
            username: true,
            email: true
          }
        },
        items: {
          include: {
            medicine: true
          }
        },
        // --- ADD THIS ---
        chat: {
          select: {
            summary: true
          }
        }
        // --- END ADD ---
      }
    });
    
    if (!prescription) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    // --- START: TRANSLATION LOGIC ---
    // Get the user's language from the saved summary
    const userLang = prescription.chat?.summary?.lang || 'en';

    // If language is NOT English, translate rejection reasons
    if (userLang !== 'en' && prescription.items) {
      // We use Promise.all to translate all items in parallel
      await Promise.all(
        prescription.items.map(async (item) => {
          if (item.rejectionReason) {
            // Translate the reason and replace it on the item object
            item.rejectionReason = await translateText(item.rejectionReason, userLang);
          }
          return item;
        })
      );
    }
    // --- END: TRANSLATION LOGIC ---
    
    res.status(200).json(prescription);
  } catch (error) {
    console.error("Get prescription error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Get all prescriptions (with items) - useful for admin DB manager
exports.findAllPrescriptions = async (req, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: {
        user: {
          select: { username: true, email: true }
        },
        pharmacist: {
          select: { username: true, email: true }
        },
        chat: {
          select: { summary: true }
        },
        items: {
          include: {
            medicine: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(prescriptions);
  } catch (error) {
    console.error("Get all prescriptions error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Mark order as picked up by pharmacist
exports.markOrderPickedUp = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await require('../services/orderService').updateOrderStatus(id, 'picked_up');
    res.status(200).json({ message: 'Order marked as picked up', order: updated });
  } catch (error) {
    console.error('Mark picked up error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Mark order as delivered by pharmacist
exports.markOrderDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await require('../services/orderService').updateOrderStatus(id, 'delivered');
    res.status(200).json({ message: 'Order marked as delivered', order: updated });
  } catch (error) {
    console.error('Mark delivered error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get orders for pharmacist's branch (server-side filtered)
exports.getOrdersForBranch = async (req, res) => {
  try {
    const userId = req.body?.userId;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const branchId = await getPharmacistBranch(userId);

    // Optional status filter (all/pending/completed)
    const status = req.body?.status || 'all';
    const allowedStatuses = ['all', 'pending', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const whereClause = { branchId };
    if (status && status !== 'all') {
      // 'completed' should include picked_up, delivered and any explicit completed flag
      if (status === 'completed') {
        whereClause.status = { in: ['picked_up', 'delivered', 'completed'] };
      } else {
        whereClause.status = status;
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: { include: { medicine: true } },
        user: { select: { userId: true, username: true, email: true } },
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error('Get orders for branch error:', error);
    const status = error.message.includes('denied') ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
};