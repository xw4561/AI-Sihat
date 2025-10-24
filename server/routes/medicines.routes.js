import express from "express";
import { createMedicine, validateMedicine, getAllMedicines } from "../controllers/medicines.controller.js";

const router = express.Router();

router.post("/", validateMedicine, createMedicine);
router.get("/", getAllMedicines);

export default router;

