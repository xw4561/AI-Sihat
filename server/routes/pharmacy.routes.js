/**
 * Pharmacy Routes
 * Defines API endpoints for managing Pharmacy Branches.
 */
module.exports = (app) => {
  const controller = require("../controllers/pharmacy.controller.js");
  var router = require("express").Router();

  // Create a new pharmacy branch (and its associated user account)
  router.post("/", controller.create);

  // Get all pharmacy branches (for customer selection lists)
  router.get("/", controller.findAll);

  // Get a single pharmacy branch by its branchId
  router.get("/:id", controller.findOne);

  // Update a pharmacy branch's details (name, address, phone)
  router.put("/:id", controller.update);

  // Delete a pharmacy branch (and its associated user account)
  router.delete("/:id", controller.delete);

  app.use("/ai-sihat/pharmacy", router);
};