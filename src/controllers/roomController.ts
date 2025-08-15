import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create Room
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { roomName, roomTypeId, isAvailable } = req.body;

    if (!roomName || !roomTypeId) {
      return res.status(400).json({ message: "roomName and roomTypeId are required" });
    }

    // Ensure roomType exists
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) {
      return res.status(404).json({ message: "RoomType not found" });
    }

    const room = await prisma.room.create({
      data: {
        roomName,
        roomTypeId,
        isAvailable: isAvailable ?? true,
      },
    });

    // Increment numberOfRooms in RoomType
    await prisma.roomType.update({
      where: { id: roomTypeId },
      data: { numberOfRooms: roomType.numberOfRooms + 1 },
    });

    res.status(201).json(room);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Rooms
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const { isAvailable, roomTypeId } = req.query;

    const rooms = await prisma.room.findMany({
      where: {
        ...(isAvailable !== undefined && { isAvailable: isAvailable === "true" }),
        ...(roomTypeId && { roomTypeId: String(roomTypeId) }),
      },
      include: { roomType: true },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(rooms);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get Room by ID
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: { roomType: true },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

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
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    let updates: any = {};
    if (roomName) updates.roomName = roomName;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;
    if (roomTypeId) updates.roomTypeId = roomTypeId;

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: updates,
    });

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
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    await prisma.room.delete({ where: { id } });

    // Decrement numberOfRooms in RoomType
    const roomType = await prisma.roomType.findUnique({
      where: { id: room.roomTypeId },
    });

    if (roomType) {
      await prisma.roomType.update({
        where: { id: room.roomTypeId },
        data: { numberOfRooms: Math.max(roomType.numberOfRooms - 1, 0) },
      });
    }

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
