import { Router } from 'express';
import {
  initiatePayment,
  confirmManualPayment,
  handlePaystackWebhook,
  handlePaystackRedirect,
  verifyPaystackTransaction,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { paymentLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Authenticated routes
router.post('/initiate', paymentLimiter, initiatePayment);
router.patch('/:id/confirm', authenticate, paymentLimiter, confirmManualPayment);

// Public routes
router.post('/webhook', handlePaystackWebhook); 
router.get('/redirect', handlePaystackRedirect); 
router.get('/verify/:reference', paymentLimiter, verifyPaystackTransaction);

export default router;