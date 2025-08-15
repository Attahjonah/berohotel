import { RequestHandler } from 'express';
import prisma from '../prisma/client.js';

export const getBookingSummary: RequestHandler = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
        user: true,
        payments: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const summary = {
      bookingId: booking.id,
      guestName: booking.user.name,
      guestEmail: booking.user.email,
      roomName: booking.room.roomName,
      roomType: booking.room.roomType.name,
      description: booking.room.roomType.description,
      capacity: booking.room.roomType.capacity,
      price: booking.room.roomType.price,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status,
      paymentStatus: booking.payments[0]?.status || 'UNPAID',
      paymentMethod: booking.payments[0]?.method || 'N/A',
    };

    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};