import express from "express";
import {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom
} from "../controllers/roomController.js";

const router = express.Router();

router.post("/", createRoom);
router.get("/", getAllRooms);
router.get("/:id", getRoomById);
router.put("/:id", updateRoom);
router.delete("/:id", deleteRoom);

export default router;
