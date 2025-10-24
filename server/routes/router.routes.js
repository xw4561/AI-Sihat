import express from "express";
import medicinesRoutes from "./medicines.routes.js";
import usersRoutes from "./users.routes.js";
import ordersRoutes from "./orders.routes.js";

const router = express.Router();

router.use("/medicines", medicinesRoutes);
router.use("/users", usersRoutes);
router.use("/orders", ordersRoutes);

export default router;

