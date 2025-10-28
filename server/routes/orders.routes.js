module.exports = (app) => {
  const controller = require("../controllers/orders.controller.js");
  var router = require("express").Router();

  router.post("/", controller.create);           // Create order

  app.use("/ai-sihat/order", router);
};
