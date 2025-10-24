import express from "express";
import { createUser, validateUser, getAllUsers } from "../controllers/users.controller.js";

const router = express.Router();

router.post("/", validateUser, createUser);
router.get("/", getAllUsers);

export default router;


