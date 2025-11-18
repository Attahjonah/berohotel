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


/**
 * @swagger
 * tags:
 *   name: RoomTypes
 *   description: Room type management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RoomType:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         capacity:
 *           type: number
 *         price:
 *           type: number
 *         numberOfRooms:
 *           type: number
 *         imageUrl:
 *           type: string
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *         rooms:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Room'
 */

/**
 * @swagger
 * /api/room-types:
 *   post:
 *     summary: Create a room type
 *     tags: [RoomTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, capacity, price, numberOfRooms]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               capacity: { type: number }
 *               price: { type: number }
 *               numberOfRooms: { type: number }
 *               imageUrl: { type: string }
 *     responses:
 *       201:
 *         description: Room type created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomType'
 *       400:
 *         description: Missing required fields
 */
router.post("/", createRoomType);

/**
 * @swagger
 * /api/room-types:
 *   get:
 *     summary: Get all room types
 *     tags: [RoomTypes]
 *     responses:
 *       200:
 *         description: List of room types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RoomType'
 */

router.get("/", getRoomTypes);

/**
 * @swagger
 * /api/room-types/{id}:
 *   get:
 *     summary: Get room type by ID
 *     tags: [RoomTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room type found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomType'
 *       404:
 *         description: Room type not found
 */

router.get("/:id", getRoomTypeById);

/**
 * @swagger
 * /api/room-types/{id}:
 *   put:
 *     summary: Update room type
 *     tags: [RoomTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               capacity: { type: number }
 *               price: { type: number }
 *               numberOfRooms: { type: number }
 *               imageUrl: { type: string }
 *     responses:
 *       200:
 *         description: Room type updated
 *       404:
 *         description: Room type not found
 */

router.put("/:id", updateRoomType);

/**
 * @swagger
 * /api/room-types/{id}:
 *   delete:
 *     summary: Delete room type by ID
 *     tags: [RoomTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room type deleted successfully
 *       404:
 *         description: Room type not found
 */

router.delete("/:id", deleteRoomType);

/**
 * @swagger
 * /api/room-types/{id}/photos:
 *   get:
 *     summary: Get photos for a room type
 *     tags: [RoomTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Photos returned
 *       404:
 *         description: Room type not found
 */
router.get("/:id/photos", getRoomTypePhotos);

/**
 * @swagger
 * /api/room-types/{id}/photos:
 *   post:
 *     summary: Add photo to room type
 *     tags: [RoomTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [photoUrl]
 *             properties:
 *               photoUrl: { type: string }
 *     responses:
 *       200:
 *         description: Photo added successfully
 *       400:
 *         description: photoUrl missing
 *       404:
 *         description: Room type not found
 */
router.post("/:id/photos", addRoomTypePhoto);
router.put("/:id/photo", addRoomTypePhoto);

export default router;
