import { RequestHandler } from "express";
import prisma from "../prisma/client.js";
import { v4 as uuidv4 } from "uuid";
import redis from "../utils/redis.js";

// CREATE BOOKING
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
      return res.status(400).json({ error: "Missing required booking details" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const now = new Date();

    if (checkInDate <= now || checkOutDate <= now) {
      return res.status(400).json({ error: "Check-in and check-out dates must be in the future" });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ error: "Check-out date must be after check-in date" });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const conflict = await prisma.booking.findFirst({
      where: {
        roomId,
        status: "CONFIRMED",
        OR: [
          {
            checkIn: { lte: checkOutDate },
            checkOut: { gte: checkInDate },
          },
        ],
      },
    });

    if (conflict) {
      return res.status(400).json({ error: "Room is already booked for selected dates" });
    }

    const bookingReference = `BR-${uuidv4().split("-")[0].toUpperCase()}`;

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
        status: "PENDING",
      },
    });

    // ❌ clear relevant caches
    await redis.del(`booking:${booking.id}`);
    await redis.del(`userBookings:${userId}`);

    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// CANCEL BOOKING
export const cancelBooking: RequestHandler = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status === "CANCELLED") {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    const cancelled = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    // ❌ Invalidate cache for this booking & user’s bookings
    await redis.del(`booking:${bookingId}`);
    if (cancelled.userId) await redis.del(`userBookings:${cancelled.userId}`);

    res.json({ message: "Booking cancelled", booking: cancelled });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// GET BOOKING BY ID
export const getBookingById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Check cache first
    const cached = await redis.get(`booking:${id}`);
    if (cached) {
      console.log("Serving booking from cache...");
      return res.json(JSON.parse(cached));
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { room: true, user: true },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // ✅ Save to cache (5 min TTL)
    await redis.setex(`booking:${id}`, 300, JSON.stringify(booking));

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// GET USER BOOKINGS
export const getUserBookings: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 👇 pagination params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `userBookings:${userId}:page:${page}:limit:${limit}`;

    // ✅ check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("📌 Serving paginated bookings from cache...");
      return res.json(JSON.parse(cached));
    }

    // ✅ count total
    const total = await prisma.booking.count({
      where: { userId },
    });

    // ✅ fetch paginated data
    const bookings = await prisma.booking.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { room: true },
    });

    const response = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      bookings,
    };

    // ✅ cache result for 5 minutes
    await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

    res.json(response);
  } catch (err) {
    console.error("GetUserBookings Error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};