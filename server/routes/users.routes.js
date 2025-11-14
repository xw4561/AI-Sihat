module.exports = (app) => {
  const controller = require("../controllers/users.controller.js");
  var router = require("express").Router();

  router.post("/", controller.create);           // Create user
  router.get("/", controller.findAll);          // Get all users
  router.get("/:id", controller.findOne);       // Get user by id
  router.put("/:id", controller.update);        // Update user (username, email, password)
  router.put("/:id/points", controller.updatePoints); // Update user points
  router.post("/delete", controller.delete);    // Delete user (POST style)

  app.use("/ai-sihat/user", router);
};
