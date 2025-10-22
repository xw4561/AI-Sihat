const express = require("express");
const app = express();
app.use(express.json());

// Routers
require("./routes/medicine.routes.js")(app);
require("./routes/user.routes.js")(app);
require("./routes/order.routes.js")(app);

const db = require("./models");
db.sequelize.sync({ force: false }).then(() => {
  console.log("✅ Database synced successfully!");
});

app.listen(8080, () => console.log("🚀 Server running on port 8080"));
