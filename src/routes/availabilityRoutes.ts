// src/routes/availabilityRoutes.ts
import { Router } from "express";
import { getAvailableRooms } from "../controllers/availabilityController.js";

const router = Router();


/**
 * @swagger
 * /api/available:
 *   get:
 *     tags: [Rooms]
 *     summary: Get fully and partially available rooms
 *     description: >
 *       Returns a list of rooms that are **fully available** and **partially available**
 *       for a given date range.  
 *       <br><br>
 *       - Fully Available: No booked dates within the requested period  
 *       - Partially Available: Some dates are booked, some are free  
 *       <br><br>
 *       Caching is used (Redis) to improve performance.
 *     parameters:
 *       - in: query
 *         name: checkIn
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-02-10"
 *         description: Start date of the booking (YYYY-MM-DD)
 *
 *       - in: query
 *         name: checkOut
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-02-15"
 *         description: End date of the booking (YYYY-MM-DD)
 *
 *     responses:
 *       200:
 *         description: Available rooms fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checkIn:
 *                   type: string
 *                   example: "2025-02-10"
 *                 checkOut:
 *                   type: string
 *                   example: "2025-02-15"
 *                 fullyAvailable:
 *                   type: array
 *                   description: Rooms with no booking conflicts
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "room_123"
 *                       roomNumber:
 *                         type: string
 *                         example: "A12"
 *                       isAvailable:
 *                         type: boolean
 *                         example: true
 *                       roomType:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "type_01"
 *                           name:
 *                             type: string
 *                             example: "Deluxe Suite"
 *                           description:
 *                             type: string
 *                             example: "A spacious deluxe suite"
 *                           price:
 *                             type: number
 *                             example: 35000
 *                           imageUrl:
 *                             type: string
 *                             example: "https://example.com/image.jpg"
 *
 *                 partiallyAvailable:
 *                   type: array
 *                   description: Rooms that have some booked and some free dates
 *                   items:
 *                     type: object
 *                     properties:
 *                       room:
 *                         $ref: "#/components/schemas/Room"
 *                       bookedDates:
 *                         type: array
 *                         items:
 *                           type: string
 *                           example: "2025-02-12"
 *                       freeDates:
 *                         type: array
 *                         items:
 *                           type: string
 *                           example: "2025-02-10"
 *
 *       400:
 *         description: Invalid or missing dates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Start and end dates are required"
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 *
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         roomNumber:
 *           type: string
 *         isAvailable:
 *           type: boolean
 *         roomType:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             description:
 *               type: string
 *             price:
 *               type: number
 *             imageUrl:
 *               type: string
 */

router.get("/", getAvailableRooms);

export default router;
