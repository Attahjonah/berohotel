import { Router } from "express";
import {
  createRoomType,
  getRoomTypes,
  getRoomTypeById,
  updateRoomType,
  deleteRoomType,
  addRoomTypePhoto,
  getRoomTypePhotos
} from "../controllers/roomType.controllers.js";

const router = Router();

router.post("/", createRoomType);
router.get("/", getRoomTypes);
router.get("/:id", getRoomTypeById);
router.put("/:id", updateRoomType);
router.delete("/:id", deleteRoomType);
router.get("/:id/photos", getRoomTypePhotos);
router.post("/:id/photos", addRoomTypePhoto);
router.put("/:id/photo", addRoomTypePhoto);

export default router;
