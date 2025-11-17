import { RequestHandler } from "express";
import prisma from "../prisma/client.js";
import { v4 as uuidv4 } from "uuid";
import redis from "../utils/redis.js";
import logger from "../utils/logger.js";

// CREATE ONLINE BOOKING
export const createOnlineBooking: RequestHandler = async (req, res) => {
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

    logger.info("🟢 Creating online booking", { body: req.body });

    if (!roomId || !checkIn || !checkOut || !guestName || !guestEmail || !guestPhone) {
      logger.warn("⚠️ Missing required booking details", { body: req.body });
      return res.status(400).json({ error: "Missing required booking details" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      logger.warn("⚠️ Invalid email format", { email: guestEmail });
      return res.status(400).json({ error: "Invalid email format" });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const now = new Date();

    if ( checkOutDate <= now) {
      logger.warn("⚠️ Invalid booking dates", { checkOutDate });
      return res.status(400).json({ error: "Check-out date must be in the future" });
    }

    if (checkOutDate <= checkInDate) {
      logger.warn("⚠️ Check-out before check-in", { checkInDate, checkOutDate });
      return res.status(400).json({ error: "Check-out date must be after check-in date" });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      logger.error("❌ Room not found", { roomId });
      return res.status(404).json({ error: "Room not found" });
    }

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
      logger.warn("⚠️ Room already booked", { roomId, checkInDate, checkOutDate });
      return res.status(400).json({ error: "Room is already booked for selected dates" });
    }

    const bookingReference = `BR-${uuidv4().split("-")[0].toUpperCase()}`;

    const booking = await prisma.booking.create({
      data: {
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

    await redis.del(`booking:${booking.id}`);

    logger.info("✅ Booking created successfully", { bookingId: booking.id });

    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (err) {
    logger.error("❌ CreateOnlineBooking Error", { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
};

// CREATE MANUAL BOOKING
export const createManualBooking: RequestHandler = async (req, res) => {
  try {
    const {
      roomId,
      checkIn,
      checkOut,
      guestName,
      guestEmail,
      guestPhone,
    } = req.body;

    const userId = req.user?.id;
    logger.info("🟢 Creating manual booking", { body: req.body, userId });

    if (!roomId || !checkIn || !checkOut || !guestName || !guestEmail || !guestPhone) {
      logger.warn("⚠️ Missing required booking details", { body: req.body });
      return res.status(400).json({ error: "Missing required booking details" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      logger.warn("⚠️ Invalid email format", { email: guestEmail });
      return res.status(400).json({ error: "Invalid email format" });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const now = new Date();

    if (checkInDate <= now || checkOutDate <= now) {
      logger.warn("⚠️ Invalid booking dates", { checkInDate, checkOutDate });
      return res.status(400).json({ error: "Check-in and check-out dates must be in the future" });
    }

    if (checkOutDate <= checkInDate) {
      logger.warn("⚠️ Check-out before check-in", { checkInDate, checkOutDate });
      return res.status(400).json({ error: "Check-out date must be after check-in date" });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      logger.error("❌ Room not found", { roomId });
      return res.status(404).json({ error: "Room not found" });
    }

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
      logger.warn("⚠️ Room already booked", { roomId, checkInDate, checkOutDate });
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
        status: "PENDING",
      },
    });

    await redis.del(`booking:${booking.id}`);
    await redis.del(`userBookings:${userId}`);

    logger.info("✅ Manual booking created successfully", { bookingId: booking.id });

    res.status(201).json({ message: "Manual Booking created successfully", booking });
  } catch (err) {
    logger.error("❌ CreateManualBooking Error", { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
};

// CANCEL BOOKING
export const cancelBooking: RequestHandler = async (req, res) => {
  try {
    const bookingId = req.params.id;
    logger.info("🟠 Cancelling booking", { bookingId });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      logger.warn("⚠️ Booking not found", { bookingId });
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status === "CANCELLED") {
      logger.warn("⚠️ Booking already cancelled", { bookingId });
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    const cancelled = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    await redis.del(`booking:${bookingId}`);
    if (cancelled.userId) await redis.del(`userBookings:${cancelled.userId}`);

    logger.info("✅ Booking cancelled", { bookingId });

    res.json({ message: "Booking cancelled", booking: cancelled });
  } catch (err) {
    logger.error("❌ CancelBooking Error", { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
};

// GET BOOKING BY ID
export const getBookingById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info("🔍 Fetching booking by ID", { bookingId: id });

    const cached = await redis.get(`booking:${id}`);
    if (cached) {
      logger.info("📌 Serving booking from cache", { bookingId: id });
      return res.json(JSON.parse(cached));
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { room: true, user: true },
    });

    if (!booking) {
      logger.warn("⚠️ Booking not found", { bookingId: id });
      return res.status(404).json({ error: "Booking not found" });
    }

    await redis.setex(`booking:${id}`, 300, JSON.stringify(booking));
    logger.info("✅ Booking fetched from DB and cached", { bookingId: id });

    res.json(booking);
  } catch (err) {
    logger.error("❌ GetBookingById Error", { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
};

// GET ALL BOOKINGS (Admin/Staff)
export const getAllBookings: RequestHandler = async (req, res) => {
  try {
    const role = req.user?.role;

    if (!role || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await prisma.booking.count();

    const bookings = await prisma.booking.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        room: {
          select: {
            id: true,
            roomName: true,
          }
        },
        user: true,
      },
    });

    const response = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      bookings,
    };

    res.json(response);
  } catch (err) {
    logger.error("❌ getAllBookings Error", { error: (err as Error).message });
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};




// // GET USER BOOKINGS
// export const getUserBookings: RequestHandler = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       logger.warn("⚠️ Unauthorized user tried to fetch bookings");
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;
//     const skip = (page - 1) * limit;

//     const cacheKey = `userBookings:${userId}:page:${page}:limit:${limit}`;

//     const cached = await redis.get(cacheKey);
//     if (cached) {
//       logger.info("📌 Serving user bookings from cache", { userId, page, limit });
//       return res.json(JSON.parse(cached));
//     }

//     const total = await prisma.booking.count({ where: { userId } });

//     const bookings = await prisma.booking.findMany({
//       where: { userId },
//       skip,
//       take: limit,
//       orderBy: { createdAt: "desc" },
//       include: { room: true },
//     });
 
//     const response = {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//       bookings,
//     };

//     await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

//     logger.info("✅ User bookings fetched and cached", { userId, page, limit });

//     res.json(response);
//   } catch (err) {
//     logger.error("❌ GetUserBookings Error", { error: (err as Error).message });
//     res.status(500).json({ error: (err as Error).message });
//   }
// };



