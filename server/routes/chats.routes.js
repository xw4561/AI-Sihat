module.exports = (app) => {
  const controller = require("../controllers/chats.controller.js");
  var router = require("express").Router();

  router.get("/", controller.findAll);          // Get all chats
  router.get("/:id", controller.findOne);       // Get chat by id
  router.delete("/:id", controller.delete);     // Delete chat

  app.use("/ai-sihat/chats", router);
};
