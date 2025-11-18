import { Router } from 'express';
import { createManualBooking,
        createOnlineBooking,
        cancelBooking, 
        getBookingById, 
        getAllBookings 
    } from '../controllers/bookingController.js';
import { authenticate } from '../middlewares/auth.js';
import { getBookingSummary } from '../controllers/getBookingSummary.js';
import { bookingLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         roomId:
 *           type: string
 *         userId:
 *           type: string
 *           nullable: true
 *         checkIn:
 *           type: string
 *           format: date-time
 *         checkOut:
 *           type: string
 *           format: date-time
 *         guestName:
 *           type: string
 *         guestEmail: 
 *           type: string
 *         guestPhone:
 *           type: string
 *         notes:
 *           type: string
 *           nullable: true
 *         bookingReference:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED]
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

//router.get('/:id/summary', bookingLimiter, getBookingSummary);


/**
 * @swagger
 * /api/booking/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get booking by ID
 *     description: Returns booking details including room and user info. Uses Redis cache when available.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "booking_123"
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Booking"
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */

router.get('/:id', bookingLimiter, getBookingById)

/**
 * @swagger
 * /api/booking:
 *   get:
 *     tags: [Bookings]
 *     summary: Get all bookings (Admin/Staff only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         example: 10
 *     responses:
 *       200:
 *         description: Paginated list of all bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 total:
 *                   type: number
 *                 totalPages:
 *                   type: number
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Booking"
 *       403:
 *         description: Access denied — only admins/staff allowed
 *       500:
 *         description: Server error
 */

router.get('/', bookingLimiter, authenticate, getAllBookings)


/**
 * @swagger
 * /api/booking/manual:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a manual booking (Admin/Staff)
 *     security:
 *       - bearerAuth: []
 *     description: Allows staff or admin to create a booking for walk-in guests. Requires authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - checkIn
 *               - checkOut
 *               - guestName
 *               - guestEmail
 *               - guestPhone
 *             properties:
 *               roomId:
 *                 type: string
 *               checkIn:
 *                 type: string
 *                 format: date
 *               checkOut:
 *                 type: string
 *                 format: date
 *               guestName:
 *                 type: string
 *               guestEmail:
 *                 type: string
 *               guestPhone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Manual booking created successfully
 *       400:
 *         description: Validation errors
 *       404:
 *         description: Room not found
 *       403:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */

router.post('/manual', bookingLimiter, authenticate, createManualBooking);


/**
 * @swagger
 * /api/booking/online:
 *   post:
 *     tags: [Bookings]
 *     summary: Create an online booking
 *     description: Creates a room booking submitted by a customer online. Validates dates, room availability, and guest information.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - checkIn
 *               - checkOut
 *               - guestName
 *               - guestEmail
 *               - guestPhone
 *             properties:
 *               roomId:
 *                 type: string
 *                 example: "room_123"
 *               checkIn:
 *                 type: string
 *                 format: date
 *                 example: "2025-02-15"
 *               checkOut:
 *                 type: string
 *                 format: date
 *                 example: "2025-02-20"
 *               guestName:
 *                 type: string
 *                 example: "John Doe"
 *               guestEmail:
 *                 type: string
 *                 example: "john@example.com"
 *               guestPhone:
 *                 type: string
 *                 example: "+2348012345678"
 *               notes:
 *                 type: string
 *                 example: "Requesting airport pickup"
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking created successfully"
 *                 booking:
 *                   $ref: "#/components/schemas/Booking"
 *
 *       400:
 *         description: Invalid input or room conflict
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   example: "Room is already booked for selected dates"
 *
 *       404:
 *         description: Room not found
 *
 *       500:
 *         description: Server error
 */

router.post('/online', bookingLimiter, createOnlineBooking);


/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   patch:
 *     tags: [Bookings]
 *     summary: Cancel a booking
 *     description: Cancels a booking unless it is already cancelled.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "booking_123"
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Booking already cancelled
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */

router.patch('/:id/cancel', bookingLimiter, cancelBooking);

export default router;





// import { Router } from "express";
// import {
//   createManualBooking,
//   createOnlineBooking,
//   cancelBooking,
//   getBookingById,
//   getUserBookings,
// } from "../controllers/bookingController.js";
// import { authenticate } from "../middlewares/auth.js";
// import { getBookingSummary } from "../controllers/getBookingSummary.js";
// import { bookingLimiter } from "../middlewares/rateLimiter.js";

// const router = Router();

// // ✅ Booking summary for one booking
// router.get("/:id/summary", bookingLimiter, getBookingSummary);

// // ✅ Get booking by ID
// router.get("/:id", bookingLimiter, getBookingById);

// // ✅ Staff-only: get logged-in user’s bookings
// router.get("/", bookingLimiter, authenticate, getUserBookings);

// // ✅ Staff manual booking (requires login)
// router.post("/manual", bookingLimiter, authenticate, createManualBooking);

// // ✅ Guest online booking (no login required)
// router.post("/online", bookingLimiter, createOnlineBooking);

// // ✅ Cancel booking (staff or system)
// router.patch("/:id/cancel", bookingLimiter, cancelBooking);

// export default router;

