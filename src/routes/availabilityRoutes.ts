// src/routes/availabilityRoutes.ts
import { Router } from "express";
import { getAvailableRooms } from "../controllers/availabilityController.js";

const router = Router();

router.get("/", getAvailableRooms);

export default router;
