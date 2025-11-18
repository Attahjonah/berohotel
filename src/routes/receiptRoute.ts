import { Router } from "express";
import { downloadReceiptPDF } from "../controllers/receipt.controller.js"

const router = Router(); 


/**
 * @swagger
 * /api/bookings/{bookingId}/receipt:
 *   get:
 *     summary: Download booking receipt as PDF
 *     description: |
 *       Generates and downloads a receipt PDF for a booking **only if a successful payment exists**.
 *       The receipt includes guest details, room info, stay duration, payment reference, and total amount.
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         description: The ID of the booking
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF receipt generated successfully.
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Booking ID missing in request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Booking ID is required."
 *       404:
 *         description: Booking not found OR no successful payment exists for receipt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     bookingMissing: "Booking not found."
 *                     noPayment: "No successful payment found for this booking to generate a receipt."
 *       503:
 *         description: PDF generation failed (Puppeteer error).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to generate receipt due to a server error."
 *       500:
 *         description: Internal server error during processing.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to generate receipt due to a server error."
 */

router.get('/download/:bookingId', downloadReceiptPDF);

export default router