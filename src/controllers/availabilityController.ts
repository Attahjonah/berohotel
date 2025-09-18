import { Request, Response, RequestHandler } from "express";
import prisma from "../config/prisma.js";
import redis from "../utils/redis.js";

export const getAvailableRooms: RequestHandler = async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: "Start and end dates are required" });
    }

    const start = new Date(checkIn as string);
    const end = new Date(checkOut as string);

    if (start >= end) {
      return res
        .status(400)
        .json({ error: "End date must be after start date" });
    }

    // --- CACHE KEY (unique for this checkIn/checkOut range) ---
    const cacheKey = `availableRooms:${checkIn}:${checkOut}`;

    // --- CHECK CACHE FIRST ---
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log("✅ Serving available rooms from cache...");
      return res.json(JSON.parse(cachedData));
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
        status: "CONFIRMED",
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
      const bookings = overlappingBookings.filter((b) => b.roomId === room.id);

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
        const dateStr = new Date(d).toISOString().split("T")[0];
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

    const responsePayload = {
      checkIn,
      checkOut,
      fullyAvailable,
      partiallyAvailable,
    };

    // --- STORE IN CACHE FOR 5 MINUTES ---
    await redis.set(cacheKey, JSON.stringify(responsePayload), "EX", 300);

    res.json(responsePayload);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

