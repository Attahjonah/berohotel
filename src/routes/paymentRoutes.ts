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

// Manual payment routes
router.post('/initiate', authenticate, paymentLimiter, initiatePayment);
router.patch('/:id/confirm', authenticate, paymentLimiter, confirmManualPayment);

// Online payment routes
router.post('/webhook', handlePaystackWebhook); 
router.get('/redirect', handlePaystackRedirect); 
router.get('/verify/:reference', paymentLimiter, verifyPaystackTransaction);

export default router;