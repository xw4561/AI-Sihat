module.exports = (app) => {
  require("./medicines.routes")(app);
  require("./users.routes")(app);
  require("./orders.routes")(app);
  require("./chats.routes")(app);
};

