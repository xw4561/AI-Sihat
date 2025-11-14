module.exports = (app) => {
  const controller = require("../controllers/orders.controller.js");
  var router = require("express").Router();

  router.post("/", controller.create);           // Create order
  router.get("/", controller.findAll);           // Get all orders
  router.get("/pending-ai", controller.getPendingAiOrders);  // Get pending AI orders for pharmacist
  router.get("/:id", controller.findOne);        // Get order by id
  router.put("/:id/approve", controller.approveOrder);  // Approve order (pharmacist)
  router.put("/:id/reject", controller.rejectOrder);    // Reject order (pharmacist)
  router.delete("/:id", controller.delete);      // Delete order

  app.use("/ai-sihat/order", router);
};
