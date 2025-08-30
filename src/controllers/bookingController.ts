import { RequestHandler } from 'express';
import prisma from '../prisma/client.js';
import { v4 as uuidv4 } from 'uuid';

export const createBooking: RequestHandler = async (req, res) => {
  try {
    const {
      roomId,
      checkIn,
      checkOut,
      guestName,
      guestEmail,
      guestPhone,
      notes,
    } = req.body;

    const userId = req.user?.id || null;

    if (!roomId || !checkIn || !checkOut || !guestName || !guestEmail || !guestPhone) {
      return res.status(400).json({ error: 'Missing required booking details' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(guestEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const now = new Date();

    // Validate future dates
    if (checkInDate <= now || checkOutDate <= now) {
      return res.status(400).json({ error: 'Check-in and check-out dates must be in the future' });
    }

    // Validate logical date order
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check for conflicting bookings
    const conflict = await prisma.booking.findFirst({
      where: {
        roomId,
        status: 'CONFIRMED',
        OR: [
          {
            checkIn: { lte: checkOutDate },
            checkOut: { gte: checkInDate },
          },
        ],
      },
    });

    if (conflict) {
      return res.status(400).json({ error: 'Room is already booked for selected dates' });
    }

    // Generate unique booking reference
    const bookingReference = `BR-${uuidv4().split('-')[0].toUpperCase()}`;

    const booking = await prisma.booking.create({
      data: {
        userId,
        roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guestName,
        guestEmail,
        guestPhone,
        bookingReference,
        notes,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const cancelBooking: RequestHandler = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    const cancelled = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Booking cancelled', booking: cancelled });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};