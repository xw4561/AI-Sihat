require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./models/index.js");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const app = express();

const bcrypt = require("bcrypt");

db.sequelize.sync({ alter: true });
app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(bodyParser.json());
require("./routes/router.routes")(app);

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
const secretKey = process.env.SECRET_KEY;



// set port, listen for requests
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
