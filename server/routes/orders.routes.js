module.exports = (app) => {
  const controller = require("../controllers/order.controller.js");
  var router = require("express").Router();

  router.post("/", controller.create);           // Create order
  router.get("/", controller.findAll);          // Get all orders
  router.get("/:id", controller.findOne);       // Get order by id
  router.post("/delete", controller.delete);    // Delete order (POST style)

  app.use("/ai-sihat/order", router);
};
