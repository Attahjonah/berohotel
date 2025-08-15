import { Router } from "express";
import {
  createRoomType,
  getRoomTypes,
  getRoomTypeById,
  updateRoomType,
  deleteRoomType
} from "../controllers/roomType.controllers.js";

const router = Router();

router.post("/", createRoomType);
router.get("/", getRoomTypes);
router.get("/:id", getRoomTypeById);
router.put("/:id", updateRoomType);
router.delete("/:id", deleteRoomType);

export default router;
