import { Router } from 'express';
import { createBooking, cancelBooking, getBookingById, getUserBookings } from '../controllers/bookingController.js';
import { authenticate } from '../middlewares/auth.js';
import { getBookingSummary } from '../controllers/getBookingSummary.js';
import { bookingLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.get('/:id/summary', bookingLimiter, getBookingSummary);
router.get('/:id', bookingLimiter, getBookingById)
router.get('/', bookingLimiter, authenticate, getUserBookings)
router.post('/', bookingLimiter, createBooking);
router.patch('/:id/cancel', bookingLimiter, cancelBooking);

export default router;