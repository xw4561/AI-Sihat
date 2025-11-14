module.exports = (app) => {
  try {
    require("./medicines.routes")(app);
    console.log("✅ Medicines routes loaded");
  } catch (e) {
    console.error("❌ Medicines routes failed:", e.message);
  }

  try {
    require("./users.routes")(app);
    console.log("✅ Users routes loaded");
  } catch (e) {
    console.error("❌ Users routes failed:", e.message);
  }

  try {
    require("./orders.routes")(app);
    console.log("✅ Orders routes loaded");
  } catch (e) {
    console.error("❌ Orders routes failed:", e.message);
  }

  try {
    require("./chats.routes")(app);
    console.log("✅ Chats routes loaded");
  } catch (e) {
    console.error("❌ Chats routes failed:", e.message);
  }
};

