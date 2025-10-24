import express from "express";
import { createOrder, validateOrder, getAllOrders } from "../controllers/orders.controller.js";

const router = express.Router();

router.post("/", validateOrder, createOrder);
router.get("/", getAllOrders);

export default router;


