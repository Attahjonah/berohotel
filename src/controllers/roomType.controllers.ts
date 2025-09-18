import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import redis from "../utils/redis.js";

const prisma = new PrismaClient();
const ROOM_TYPES_CACHE_KEY = "roomTypes";

// Create RoomType
export const createRoomType = async (req: Request, res: Response) => {
  try {
    const { name, description, capacity, price, numberOfRooms, imageUrl } = req.body;

    const roomType = await prisma.roomType.create({
      data: {
        name,
        description,
        capacity,
        price,
        numberOfRooms,
        imageUrl
      }
    });

    // Invalidate cache
    await redis.del(ROOM_TYPES_CACHE_KEY);

    res.status(201).json(roomType);
  } catch (error) {
    console.error("Error creating room type:", error);
    res.status(500).json({ message: "Error creating room type" });
  }
};

// Get all RoomTypes
export const getRoomTypes = async (_req: Request, res: Response) => {
  try {
    // Check cache
    const cached = await redis.get(ROOM_TYPES_CACHE_KEY);
    if (cached) {
      console.log("Serving room types from cache...");
      return res.json(JSON.parse(cached));
    }

    const roomTypes = await prisma.roomType.findMany({
      include: { rooms: true }
    });

    // Save to cache for 1 hour
    await redis.set(ROOM_TYPES_CACHE_KEY, JSON.stringify(roomTypes), "EX", 3600);

    res.json(roomTypes);
  } catch (error) {
    console.error("Error fetching room types:", error);
    res.status(500).json({ message: "Error fetching room types" });
  }
};

// Get RoomType by ID
export const getRoomTypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cacheKey = `roomType:${id}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Serving room type ${id} from cache...`);
      return res.json(JSON.parse(cached));
    }

    const roomType = await prisma.roomType.findUnique({
      where: { id },
      include: { rooms: true }
    });

    if (!roomType) {
      return res.status(404).json({ message: "Room type not found" });
    }

    // Save to cache
    await redis.set(cacheKey, JSON.stringify(roomType), "EX", 3600);

    res.json(roomType);
  } catch (error) {
    console.error("Error fetching room type:", error);
    res.status(500).json({ message: "Error fetching room type" });
  }
};

// Update RoomType
export const updateRoomType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, capacity, price, numberOfRooms, imageUrl } = req.body;

    const updatedRoomType = await prisma.roomType.update({
      where: { id },
      data: {
        name,
        description,
        capacity,
        price,
        numberOfRooms,
        imageUrl
      }
    });

    // Invalidate cache for all + single
    await redis.del(ROOM_TYPES_CACHE_KEY);
    await redis.del(`roomType:${id}`);

    res.json(updatedRoomType);
  } catch (error) {
    console.error("Error updating room type:", error);
    res.status(500).json({ message: "Error updating room type" });
  }
};

// Delete RoomType
export const deleteRoomType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.roomType.delete({
      where: { id }
    });

    // Invalidate cache
    await redis.del(ROOM_TYPES_CACHE_KEY);
    await redis.del(`roomType:${id}`);

    res.json({ message: "Room type deleted successfully" });
  } catch (error) {
    console.error("Error deleting room type:", error);
    res.status(500).json({ message: "Error deleting room type" });
  }
};
