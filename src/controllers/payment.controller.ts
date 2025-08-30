import { RequestHandler } from 'express';
import prisma from '../prisma/client.js';
import axios from 'axios';
import crypto from 'crypto';
import { transporter } from '../utils/email.js';
import { generateReceiptHTML } from '../utils/receipt.js';
import puppeteer from 'puppeteer';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

export const initiatePayment: RequestHandler = async (req, res) => {
  try {
    const { bookingId, bookingReference, method } = req.body;

    if (!method || (!bookingId && !bookingReference)) {
      return res.status(400).json({ error: 'Missing payment method or booking identifier' });
    }

    // 🔍 Lookup booking by ID or reference
    const booking = await prisma.booking.findFirst({
      where: bookingId
        ? { id: bookingId }
        : { bookingReference: bookingReference },
      include: {
        room: { include: { roomType: true } },
      },
    });

    if (!booking || !booking.room || !booking.room.roomType) {
      return res.status(404).json({ error: 'Booking or room type not found' });
    }

    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return res.status(400).json({ error: 'Invalid booking dates' });
    }

    const amount = booking.room.roomType.price * nights;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // ⏳ 30 mins from now

    const paymentData = {
      bookingId: booking.id,
      amount,
      method,
      status: 'PENDING',
      guestEmail: booking.guestEmail,
      expiresAt,
    };

    if (method === 'PAYSTACK') {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: booking.guestEmail || req.user?.email,
          amount: amount * 100,
          metadata: {
            bookingId: booking.id,
            bookingReference: booking.bookingReference,
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            roomId: booking.room.id,
            roomType: booking.room.roomType.name,
            nights,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
          },
          callback_url: `${BASE_URL}/api/payments/redirect`,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
          },
        }
      );

      await prisma.payment.create({
        data: {
          ...paymentData,
          reference: response.data.data.reference,
        },
      });

      return res.json({ authorization_url: response.data.data.authorization_url });
    }

    const payment = await prisma.payment.create({ data: paymentData });
    res.json({ message: 'Manual payment initiated', payment });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};


// 🟢 Confirm Manual Payment
export const confirmManualPayment: RequestHandler = async (req, res) => {
  try {
    const paymentId = req.params.id;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment || !payment.booking) {
      return res.status(404).json({ error: 'Payment or booking not found' });
    }

    if (payment.expiresAt && new Date() > payment.expiresAt) {
      return res.status(400).json({ error: 'Payment has expired and cannot be confirmed' });
    }

    const booking = payment.booking;

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        roomId: booking.roomId,
        status: 'CONFIRMED',
        OR: [
          {
            checkIn: { lte: booking.checkOut },
            checkOut: { gte: booking.checkIn },
          },
        ],
      },
    });

    if (conflictingBooking) {
      return res.status(400).json({ error: 'Room is already booked for selected dates' });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCESS', paymentDate: new Date() },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED' },
    });

    res.json({ message: 'Manual payment confirmed and booking updated', payment: updatedPayment });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// 🟢 Handle Paystack Webhook
export const handlePaystackWebhook: RequestHandler = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { bookingId, roomId, checkIn, checkOut, reference } = event.data.metadata;

      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          roomId,
          status: 'CONFIRMED',
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) },
            },
          ],
        },
      });

      if (conflictingBooking) {
        return res.status(400).json({ error: 'Room is already booked for selected dates' });
      }

      await prisma.payment.updateMany({
        where: { bookingId, method: 'PAYSTACK' },
        data: { status: 'SUCCESS', paymentDate: new Date() },
      });

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      await prisma.payment.update({
        where: { id: reference },
        data: { status: 'SUCCESS', paymentDate: new Date() },
      });

    }

    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// 🟢 Handle Paystack Redirect
export const handlePaystackRedirect: RequestHandler = async (req, res) => {
  try {
    const reference = req.query.reference as string;

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
    });

    const { status, metadata, amount, paid_at } = response.data.data;

    if (status === 'success') {
      const bookingId = metadata.bookingId;

      // ✅ Update payment record
      await prisma.payment.update({
        where: { reference },
        data: {
          status: 'SUCCESS',
          paymentDate: new Date(paid_at),
          amount: amount / 100, // Convert from kobo to naira
        },
      });

      // ✅ Confirm booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      res.send(`
        <h2>✅ Payment Successful!</h2>
        <p>Reference: ${reference}</p>
        <p>Booking ID: ${bookingId}</p>
        <p>Amount Paid: ₦${amount / 100}</p>
      `);


      const payment = await prisma.payment.findUnique({
          where: { reference },
          include: {
            booking: {
              include: {
                room: {
                  include: { roomType: true },
                },
              },
            },
          },
      });

      if (!payment || !payment.booking) {
        console.error('❌ Failed to fetch payment or booking for receipt');
        return;
      }

    const receiptData = {
      guestName: payment.booking.guestName,
      roomType: payment.booking.room.roomType.name,
      room: payment.booking.room.roomName,
      checkInDate: payment.booking.checkIn,
      checkOutDate: payment.booking.checkOut,
      amount: payment.amount,
      status: payment.status,
      reference: payment.reference!,
      paymentDate: payment.paymentDate!,
      guestEmail: payment.guestEmail!,
    };
      const html = generateReceiptHTML(receiptData);

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4' });
      await browser.close();

      await transporter.sendMail({
        from: `"Bennyrose Hotel" <${process.env.GMAIL_USER}>`,
        to: receiptData.guestEmail,
        subject: 'Your Booking Receipt – Bennyrose Hotel',
        html,
        attachments: [
          {
            filename: `receipt-${receiptData.reference}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });


    } else {
      res.send(`
        <h2>❌ Payment Failed or Incomplete</h2>
        <p>Reference: ${reference}</p>
      `);
    }
  } catch (err) {
    res.status(500).send(`<h2>Error verifying payment</h2><p>${(err as Error).message}</p>`);
  }
};


export const verifyPaystackTransaction: RequestHandler = async (req, res) => {
  const { reference } = req.params;

  try {
    // 🔍 Call Paystack's verify endpoint
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
    });

    const data = response.data;

    if (data.status && data.data.status === 'success') {
      const { metadata, amount, paid_at } = data.data;
      const { bookingId } = metadata;

      // ✅ Update payment record
      await prisma.payment.updateMany({
        where: { bookingId, method: 'PAYSTACK' },
        data: {
          status: 'SUCCESS',
          paymentDate: new Date(paid_at),
          amount: amount / 100, // Convert from kobo to naira
        },
      });

      // ✅ Confirm booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      return res.json({ message: 'Payment verified and booking confirmed' });
    }

    res.status(400).json({ error: 'Transaction not successful' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};


// export const adminConfirmPayment: RequestHandler = async (req, res) => {
//   try {
//     const { bookingId } = req.params;

//     const booking = await prisma.booking.findUnique({
//       where: { id: bookingId },
//       include: { room: true },
//     });

//     if (!booking) {
//       return res.status(404).json({ error: 'Booking not found' });
//     }

//     // Check for conflicting confirmed bookings
//     const conflict = await prisma.booking.findFirst({
//       where: {
//         roomId: booking.roomId,
//         status: 'CONFIRMED',
//         OR: [
//           {
//             checkIn: { lte: booking.checkOut },
//             checkOut: { gte: booking.checkIn },
//           },
//         ],
//       },
//     });

//     if (conflict) {
//       return res.status(400).json({ error: 'Room already booked for selected dates' });
//     }

//     // Update payment and booking
//     await prisma.payment.updateMany({
//       where: { bookingId },
//       data: { status: 'SUCCESS', paymentDate: new Date() },
//     });

//     await prisma.booking.update({
//       where: { id: bookingId },
//       data: { status: 'CONFIRMED' },
//     });

//     res.json({ message: 'Payment manually confirmed and booking updated' });
//   } catch (err) {
//     res.status(500).json({ error: (err as Error).message });
//   }
// };