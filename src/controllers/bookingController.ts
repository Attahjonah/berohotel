import { RequestHandler } from 'express';
import  prisma  from '../prisma/client.js';

export const createBooking: RequestHandler = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;
    const userId = req.user?.id;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || !room.isAvailable) {
      return res.status(400).json({ error: 'Room not available' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        roomId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        status: 'PENDING',
      },
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const cancelBooking: RequestHandler = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};