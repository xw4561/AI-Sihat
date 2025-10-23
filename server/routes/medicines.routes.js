module.exports = (app) => {
  const controller = require("../controllers/medicines.controller.js");
  var router = require("express").Router();
  router.post("/", controller.create);           // Create order

  app.use("/ai-sihat/medicines", router);
};
