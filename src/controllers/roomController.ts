import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import redis from "../utils/redis.js";

const prisma = new PrismaClient();

// Create Room
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { roomName, roomTypeId, isAvailable } = req.body;

    if (!roomName || !roomTypeId) {
      return res.status(400).json({ message: "roomName and roomTypeId are required" });
    }

    const roomType = await prisma.roomType.findUnique({ where: { id: roomTypeId } });
    if (!roomType) return res.status(404).json({ message: "RoomType not found" });

    const room = await prisma.room.create({
      data: { roomName, roomTypeId, isAvailable: isAvailable ?? true },
    });

    await prisma.roomType.update({
      where: { id: roomTypeId },
      data: { numberOfRooms: roomType.numberOfRooms + 1 },
    });

    // ❌ Invalidate cache after creation
    await redis.del("rooms:all");

    res.status(201).json(room);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Rooms (with caching)
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const cacheKey = "rooms:all";

    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("✅ Serving rooms from cache");
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

    await redis.set(cacheKey, JSON.stringify(rooms), "EX", 60); // cache for 1 min
    res.status(200).json(rooms);
  } catch (error: any) {
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
      console.log(`✅ Serving room ${id} from cache`);
      return res.json(JSON.parse(cached));
    }

    const room = await prisma.room.findUnique({
      where: { id },
      include: { roomType: true },
    });

    if (!room) return res.status(404).json({ message: "Room not found" });

    await redis.set(cacheKey, JSON.stringify(room), "EX", 60);
    res.status(200).json(room);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update Room
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roomName, roomTypeId, isAvailable } = req.body;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: { roomName, roomTypeId, isAvailable },
    });

    // ❌ Invalidate cache
    await redis.del("rooms:all");
    await redis.del(`room:${id}`);

    res.status(200).json(updatedRoom);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Room
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ message: "Room not found" });

    await prisma.room.delete({ where: { id } });

    const roomType = await prisma.roomType.findUnique({ where: { id: room.roomTypeId } });
    if (roomType) {
      await prisma.roomType.update({
        where: { id: room.roomTypeId },
        data: { numberOfRooms: Math.max(roomType.numberOfRooms - 1, 0) },
      });
    }

    // ❌ Invalidate cache
    await redis.del("rooms:all");
    await redis.del(`room:${id}`);

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
