module.exports = (app) => {
  const controller = require("../controllers/medicines.controller.js");
  var router = require("express").Router();
  
  router.post("/", controller.create);           // Create medicine
  router.get("/", controller.findAll);           // Get all medicines
  router.get("/:id", controller.findOne);        // Get medicine by id
  router.put("/:id", controller.update);         // Update medicine
  router.delete("/:id", controller.delete);      // Delete medicine

  app.use("/ai-sihat/medicines", router);
};
