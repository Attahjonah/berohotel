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

router.get('/:id/summary', bookingLimiter, getBookingSummary);
router.get('/:id', bookingLimiter, getBookingById)
router.get('/', bookingLimiter, authenticate, getAllBookings)
router.post('/manual', bookingLimiter, authenticate, createManualBooking);
router.post('/online', bookingLimiter, createOnlineBooking);
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

