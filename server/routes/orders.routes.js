module.exports = (app) => {
  const controller = require("../controllers/orders.controller.js");
  var router = require("express").Router();

  router.post("/", controller.create);           // Create order
  router.get("/user/:userId", controller.findByUser);  // Get orders by user (must be before /:id)
  router.post("/pending-ai", controller.getPendingAiOrders);  // Get pending prescriptions for pharmacist
  router.get("/", controller.findAll);           // Get all orders
  router.get("/:id", controller.findOne);        // Get order by id
  router.put("/:id/approve", controller.approveOrder);  // Approve prescription (pharmacist)
  router.put("/:id/reject", controller.rejectOrder);    // Reject prescription (pharmacist)
  router.delete("/:id", controller.delete);      // Delete order

  app.use("/ai-sihat/order", router);
  
  // Prescription routes
  var prescriptionRouter = require("express").Router();
  // List all prescriptions (for admin DB manager)
  prescriptionRouter.get("/", controller.findAllPrescriptions);
  prescriptionRouter.get("/:id", controller.getPrescription);  // Get prescription by id
  app.use("/ai-sihat/prescriptions", prescriptionRouter);
};
