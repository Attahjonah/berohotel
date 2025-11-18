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

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate a payment for a booking
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: string
 *                 description: Booking ID
 *                 example: "clu123abc456"
 *               bookingReference:
 *                 type: string
 *                 description: Booking reference (if bookingId is not provided)
 *                 example: "BR-2025-0099"
 *               method:
 *                 type: string
 *                 description: Payment method
 *                 enum: [PAYSTACK, MANUAL]
 *                 example: "PAYSTACK"
 *     responses:
 *       200:
 *         description: Returns authorization_url for Paystack or manual payment confirmation
 *         content:
 *           application/json:
 *             examples:
 *               paystack:
 *                 value:
 *                   authorization_url: "https://checkout.paystack.com/abc123"
 *               manual:
 *                 value:
 *                   message: "Manual payment initiated"
 *                   payment:
 *                     id: "pay123"
 *                     amount: 50000
 *       400:
 *         description: Missing parameters or invalid booking dates
 *       404:
 *         description: Booking or room type not found
 *       500:
 *         description: Server error
 */

router.post('/initiate', paymentLimiter, initiatePayment);

/**
 * @swagger
 * /api/payments/manual/{id}:
 *   patch:
 *     summary: Confirm a manual payment and update booking status
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "pay_12345"
 *     responses:
 *       200:
 *         description: Manual payment confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 payment:
 *                   type: object
 *       400:
 *         description: Payment expired or room already booked
 *       404:
 *         description: Payment or booking not found
 *       500:
 *         description: Server error
 */

router.patch('/:id/confirm', authenticate, paymentLimiter, confirmManualPayment);

// Online payment routes
/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Handle Paystack webhook notifications
 *     tags: [Payments]
 *     description: Paystack calls this endpoint after transaction events such as charge.success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Raw webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid Paystack signature
 *       400:
 *         description: Room already booked for selected dates
 *       500:
 *         description: Server error
 */

router.post('/webhook', handlePaystackWebhook); 

/**
 * @swagger
 * /api/payments/redirect:
 *   get:
 *     summary: Paystack redirect URL after payment
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         example: "PSK_ref_09888"
 *     description: Paystack redirects here after payment. Verifies transaction, updates booking, generates receipt, and redirects user to frontend.
 *     responses:
 *       302:
 *         description: Redirects to frontend success or failure page
 *       500:
 *         description: Server error while verifying payment
 */

router.get('/redirect', handlePaystackRedirect); 

/**
 * @swagger
 * /api/payments/verify/{reference}:
 *   get:
 *     summary: Verify payment status using Paystack reference
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         example: "PSK_ref_120039"
 *     responses:
 *       200:
 *         description: Booking & payment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 booking:
 *                   type: object
 *       404:
 *         description: Booking not found for this payment
 *       500:
 *         description: Server error
 */

router.get('/verify/:reference', paymentLimiter, verifyPaystackTransaction);

export default router;