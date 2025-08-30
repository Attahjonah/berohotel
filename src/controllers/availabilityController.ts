import { Request, Response, RequestHandler } from "express";
import prisma from "../config/prisma.js";


export const getAvailableRooms: RequestHandler = async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const start = new Date(checkIn as string);
    const end = new Date(checkOut as string);

    if (start >= end) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Normalize date to midnight
    const normalizeUTC = (date: Date) =>
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

    // Build requested date range
    const requestedDates: number[] = [];
    let current = new Date(start);
    while (current < end) {
      requestedDates.push(normalizeUTC(current));
      current.setDate(current.getUTCDate() + 1);
    }

    // Get all rooms
    const allRooms = await prisma.room.findMany({
      where: { isAvailable: true },
    });

    // Get all bookings that overlap with the range
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        OR: [
          {
            checkIn: { lte: end },
            checkOut: { gte: start },
          },
        ],
      },
      select: {
        roomId: true,
        checkIn: true,
        checkOut: true,
      },
    });

    const fullyAvailable: typeof allRooms = [];
    const partiallyAvailable: {
      room: typeof allRooms[0];
      bookedDates: string[];
      freeDates: string[];
    }[] = [];

    for (const room of allRooms) {
      const bookings = overlappingBookings.filter(b => b.roomId === room.id);

      const bookedDatesSet = new Set<number>();
      for (const b of bookings) {
        let d = new Date(b.checkIn);
        while (normalizeUTC(d) < normalizeUTC(new Date(b.checkOut))) {
          bookedDatesSet.add(normalizeUTC(d));
          d.setUTCDate(d.getUTCDate() + 1);
        }
      }

      const bookedDates: string[] = [];
      const freeDates: string[] = [];

      for (const d of requestedDates) {
        const dateStr = new Date(d).toISOString().split('T')[0];
        if (bookedDatesSet.has(d)) {
          bookedDates.push(dateStr);
        } else {
          freeDates.push(dateStr);
        }
      }

      if (bookedDates.length === 0) {
        fullyAvailable.push(room);
      } else if (freeDates.length > 0) {
        partiallyAvailable.push({ room, bookedDates, freeDates });
      }
    }

    res.json({
      checkIn,
      checkOut,
      fullyAvailable,
      partiallyAvailable,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};


// export const getAvailableRooms = async (req: Request, res: Response) => {
//   try {
//     const { checkIn, checkOut } = req.query;
//     const start = new Date(checkIn as string);
//     const end = new Date(checkOut as string);

//     const availableRooms = await prisma.room.findMany({
//       where: {
//         bookings: {
//           none: {
//             status: { not: "CANCELLED" },
//             OR: [
//               { checkIn: { lte: end }, checkOut: { gte: start } }
//             ]
//           }
//         }
//       },
//       include: { roomType: true }
//     });

//     res.json(availableRooms);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching availability", error });
//   }
// };
