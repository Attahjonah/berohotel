import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import redis from "../utils/redis.js";
import logger from "../utils/logger.js"; // ✅ Import logger

const prisma = new PrismaClient();

// Create Room
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { roomName, roomTypeId, isAvailable } = req.body;

    if (!roomName || !roomTypeId) {
      logger.warn("❌ Missing required fields when creating room", { body: req.body });
      return res.status(400).json({ message: "roomName and roomTypeId are required" });
    }

    const roomType = await prisma.roomType.findUnique({ where: { id: roomTypeId } });
    if (!roomType) {
      logger.warn(`❌ RoomType not found for ID: ${roomTypeId}`);
      return res.status(404).json({ message: "RoomType not found" });
    }

    const room = await prisma.room.create({
      data: { roomName, roomTypeId, isAvailable: isAvailable ?? true },
    });

    await prisma.roomType.update({
      where: { id: roomTypeId },
      data: { numberOfRooms: roomType.numberOfRooms + 1 },
    });

    await redis.del("rooms:all"); // Invalidate cache
    logger.info(`✅ Room created: ${room.id}`, { room });

    res.status(201).json(room);
  } catch (error: any) {
    logger.error("❌ Error creating room", { error: error.message, stack: error.stack });
    res.status(500).json({ message: error.message });
  }
};

// Get All Rooms (with caching)
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const cacheKey = "rooms:all";
    const cached = await redis.get(cacheKey);

    if (cached) {
      logger.info("✅ Serving rooms from cache");
      return res.json(JSON.parse(cached));
    }

    const { isAvailable, roomTypeId } = req.query;
    const rooms = await prisma.room.findMany({
      where: {
        ...(isAvailable !== undefined && { isAvailable: isAvailable === "true" }),
        ...(roomTypeId && { roomTypeId: String(roomTypeId) }),
      },
      include: { roomType: true },
      orderBy: { createdAt: "desc" },
    });

    await redis.set(cacheKey, JSON.stringify(rooms), "EX", 60);
    logger.info(`✅ Rooms fetched from DB, count: ${rooms.length}`);

    res.status(200).json(rooms);
  } catch (error: any) {
    logger.error("❌ Error fetching all rooms", { error: error.message, stack: error.stack });
    res.status(500).json({ message: error.message });
  }
};

// Get Room by ID (with caching)
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cacheKey = `room:${id}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info(`✅ Serving room ${id} from cache`);
      return res.json(JSON.parse(cached));
    }

    const room = await prisma.room.findUnique({
      where: { id },
      include: { roomType: true },
    });

    if (!room) {
      logger.warn(`❌ Room not found: ${id}`);
      return res.status(404).json({ message: "Room not found" });
    }

    await redis.set(cacheKey, JSON.stringify(room), "EX", 60);
    logger.info(`✅ Room fetched from DB: ${id}`);

    res.status(200).json(room);
  } catch (error: any) {
    logger.error("❌ Error fetching room by ID", { error: error.message, stack: error.stack });
    res.status(500).json({ message: error.message });
  }
};

// Update Room
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roomName, roomTypeId, isAvailable } = req.body;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      logger.warn(`❌ Room not found for update: ${id}`);
      return res.status(404).json({ message: "Room not found" });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: { roomName, roomTypeId, isAvailable },
    });

    await redis.del("rooms:all");
    await redis.del(`room:${id}`);
    logger.info(`✅ Room updated: ${id}`, { updatedRoom });

    res.status(200).json(updatedRoom);
  } catch (error: any) {
    logger.error("❌ Error updating room", { error: error.message, stack: error.stack });
    res.status(500).json({ message: error.message });
  }
};

// Delete Room
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      logger.warn(`❌ Room not found for delete: ${id}`);
      return res.status(404).json({ message: "Room not found" });
    }

    await prisma.room.delete({ where: { id } });

    const roomType = await prisma.roomType.findUnique({ where: { id: room.roomTypeId } });
    if (roomType) {
      await prisma.roomType.update({
        where: { id: room.roomTypeId },
        data: { numberOfRooms: Math.max(roomType.numberOfRooms - 1, 0) },
      });
    }

    await redis.del("rooms:all");
    await redis.del(`room:${id}`);
    logger.info(`✅ Room deleted: ${id}`);

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error: any) {
    logger.error("❌ Error deleting room", { error: error.message, stack: error.stack });
    res.status(500).json({ message: error.message });
  }
};
