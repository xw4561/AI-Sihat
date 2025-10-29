module.exports = (app) => {
  const controller = require("../controllers/orders.controller.js");
  var router = require("express").Router();

  router.post("/", controller.create);           // Create order
  router.get("/", controller.findAll);           // Get all orders
  router.get("/:id", controller.findOne);        // Get order by id
  router.delete("/:id", controller.delete);      // Delete order

  app.use("/ai-sihat/order", router);
};
