import { RequestHandler } from 'express';
import prisma from '../prisma/client.js';
import axios from 'axios';
import crypto from 'crypto';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

export const initiatePayment: RequestHandler = async (req, res) => {
  try {
    const { bookingId, method } = req.body;

    if (!bookingId || !method) {
      return res.status(400).json({ error: 'Missing bookingId or payment method' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
      },
    });

    if (!booking || !booking.room || !booking.room.roomType) {
      return res.status(404).json({ error: 'Booking or room type not found' });
    }

    const amount = booking.room.roomType.price;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid room price' });
    }

    const paymentData = {
      bookingId,
      amount,
      method,
      status: 'PENDING',
    };

    if (method === 'PAYSTACK') {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: req.user?.email,
          amount: amount * 100,
          metadata: {
            bookingId,
            roomId: booking.room.id,
            roomType: booking.room.roomType.name,
          },
          callback_url: `${BASE_URL}/api/payments/redirect`,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
          },
        }
      );

      await prisma.payment.create({ data: paymentData });

      return res.json({ authorization_url: response.data.data.authorization_url });
    }

    const payment = await prisma.payment.create({ data: paymentData });
    res.json({ message: 'Manual payment initiated', payment });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const confirmManualPayment: RequestHandler = async (req, res) => {
  try {
    const paymentId = req.params.id;

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCESS', paymentDate: new Date() },
      include: { booking: true },
    });

    await prisma.booking.update({
      where: { id: payment.booking.id },
      data: { status: 'CONFIRMED' },
    });

    await prisma.room.update({
      where: { id: payment.booking.roomId },
      data: { isAvailable: false },
    });

    res.json({ message: 'Payment confirmed and booking updated', payment });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

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
      const bookingId = event.data.metadata.bookingId;
      const roomId = event.data.metadata.roomId;

      await prisma.payment.updateMany({
        where: { bookingId, method: 'PAYSTACK' },
        data: { status: 'SUCCESS', paymentDate: new Date() },
      });

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      await prisma.room.update({
        where: { id: roomId },
        data: { isAvailable: false },
      });
    }

    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const handlePaystackRedirect: RequestHandler = async (req, res) => {
  try {
    const reference = req.query.reference as string;

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
    });

    const status = response.data.data.status;

    if (status === 'success') {
      res.send(`<h2>Payment successful!</h2><p>Reference: ${reference}</p>`);
    } else {
      res.send(`<h2>Payment failed or incomplete.</h2><p>Reference: ${reference}</p>`);
    }
  } catch (err) {
    res.status(500).send(`<h2>Error verifying payment</h2><p>${(err as Error).message}</p>`);
  }
};