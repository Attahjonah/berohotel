import { Router } from 'express';
import {
  initiatePayment,
  confirmManualPayment,
  handlePaystackWebhook,
  handlePaystackRedirect,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Authenticated routes
router.post('/initiate', authenticate, initiatePayment);
router.patch('/:id/confirm', authenticate, confirmManualPayment);

// Public routes
router.post('/webhook', handlePaystackWebhook); // Paystack sends events here
router.get('/redirect', handlePaystackRedirect); // Paystack redirects users here

export default router;