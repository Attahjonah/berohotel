import express from "express";
import {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom
} from "../controllers/roomController.js";

const router = express.Router();

/**
 * @swagger
 * /api/room:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomName
 *               - roomTypeId
 *             properties:
 *               roomName:
 *                 type: string
 *                 example: "Room 101"
 *               roomTypeId:
 *                 type: string
 *                 example: "rt_8934kldf98"
 *               isAvailable:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Room created successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: RoomType not found
 *       500:
 *         description: Server error
 */

router.post("/", createRoom);

/**
 * @swagger
 * /api/room:
 *   get:
 *     summary: Get all rooms (supports filtering and caching)
 *     tags: [Rooms]  
 *     responses:
 *       200:
 *         description: List of rooms
 *       500:
 *         description: Server error
 */

router.get("/", getAllRooms);

/**
 * @swagger
 * /api/room/{id}:
 *   get:
 *     summary: Get a single room by ID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "room_39284kd"
 *     responses:
 *       200:
 *         description: Room details
 *       404:
 *         description: Room not found
 *       500:
 *         description: Server error
 */

router.get("/:id", getRoomById);

/**
 * @swagger
 * /api/room/{id}:
 *   patch:
 *     summary: Update a room's details
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "room_39284kd"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roomName:
 *                 type: string
 *                 example: "Updated Room 101"
 *               roomTypeId:
 *                 type: string
 *                 example: "rt_8934kldf98"
 *               isAvailable:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Room updated successfully
 *       404:
 *         description: Room not found
 *       500:
 *         description: Server error
 */

router.put("/:id", updateRoom);

/**
 * @swagger
 * /api/room/{id}:
 *   delete:
 *     summary: Delete a room by ID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "room_39284kd"
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *       404:
 *         description: Room not found
 *       500:
 *         description: Server error
 */

router.delete("/:id", deleteRoom);

export default router;
