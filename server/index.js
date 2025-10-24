import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import router from "./routes/router.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/ai-sihat", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));


