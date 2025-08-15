import { Router } from 'express';
import { createBooking, cancelBooking } from '../controllers/bookingController.js';
import { authenticate } from '../middlewares/auth.js';
import { getBookingSummary } from '../controllers/getBookingSummary.js';

const router = Router();

router.get('/:id/summary', getBookingSummary)
router.post('/', authenticate, createBooking);
router.patch('/:id/cancel', authenticate, cancelBooking);

export default router;