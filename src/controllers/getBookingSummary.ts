import { RequestHandler } from "express";
import prisma from "../prisma/client.js";
import redis from "../utils/redis.js";
import logger from "../utils/logger.js";

export const getBookingSummary: RequestHandler = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const cacheKey = `booking:summary:${bookingId}`;

    logger.info("🔍 Fetching booking summary", { bookingId });

    // ✅ Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info("📌 Serving booking summary from cache", { bookingId });
      return res.json({ summary: JSON.parse(cached), cached: true });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: { include: { roomType: true } },
        payments: true, // keep payment info
      },
    });

    if (!booking) {
      logger.warn("⚠️ Booking not found", { bookingId });
      return res.status(404).json({ error: "Booking not found" });
    }

    const summary = {
      bookingId: booking.id,
      guestName: booking.guestName || "N/A",
      guestEmail: booking.guestEmail || "N/A",
      roomName: booking.room?.roomName || "N/A",
      roomType: booking.room?.roomType?.name || "N/A",
      description: booking.room?.roomType?.description || "N/A",
      capacity: booking.room?.roomType?.capacity || 0,
      price: booking.room?.roomType?.price || 0,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status,
      paymentStatus: booking.payments[0]?.status || "UNPAID",
      paymentMethod: booking.payments[0]?.method || "N/A",
    };

    // ✅ Cache summary for 10 minutes
    await redis.set(cacheKey, JSON.stringify(summary), "EX", 600);

    logger.info("✅ Booking summary fetched and cached", { bookingId });

    res.json({ summary, cached: false });
  } catch (err) {
    logger.error("❌ GetBookingSummary Error", { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
};
