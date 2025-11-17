import { RequestHandler } from "express";
import prisma from "../config/prisma.js";
import redis from "../utils/redis.js";
import logger from "../utils/logger.js";

export const getAvailableRooms: RequestHandler = async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut)
      return res.status(400).json({ error: "Start and end dates are required" });

    const start = new Date(checkIn as string);
    const end = new Date(checkOut as string);
    const now = new Date();

    if (start >= end)
      return res.status(400).json({ error: "End date must be after start date" });

    // if (start <= now || end <= now)
    //   return res.status(400).json({ error: "Date must be present or future" });

    const normalizeDate = (d: Date) => {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const today = normalizeDate(now);
const startDate = normalizeDate(start);
const endDate = normalizeDate(end);

if (startDate < today || endDate < today) {
  return res.status(400).json({ error: "Dates must be present or future" });
}


    const cacheKey = `availableRooms:${checkIn}:${checkOut}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info("Serving available rooms from cache", { cacheKey });
      return res.json(JSON.parse(cachedData));
    }

    const normalizeUTC = (date: Date) =>
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

    const requestedDates: number[] = [];
    let current = new Date(start);
    while (current < end) {
      requestedDates.push(normalizeUTC(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Fetch all rooms along with their room type/category info
const allRooms = await prisma.room.findMany({
  where: { isAvailable: true },
  include: {
    roomType: {
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
      },
    },
  },
});


    // Fetch only bookings that overlap with the requested range
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        AND: [
          { checkIn: { lt: end } }, // booking starts before user's checkout
          { checkOut: { gt: start } }, // booking ends after user's checkin
        ],
      },
      select: { roomId: true, checkIn: true, checkOut: true },
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
        while (normalizeUTC(d) < normalizeUTC(b.checkOut)) {
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

    await redis.set(cacheKey, JSON.stringify(responsePayload), "EX", 300);

    logger.info("Available rooms fetched", {
      checkIn,
      checkOut,
      fullyAvailableCount: fullyAvailable.length,
      partiallyAvailableCount: partiallyAvailable.length,
    });

    res.json(responsePayload);
  } catch (err) {
    logger.error("Error fetching available rooms", { error: (err as Error).stack });
    res.status(500).json({ error: (err as Error).message });
  }
};
