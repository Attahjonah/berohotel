import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    res.status(201).json(roomType);
  } catch (error) {
    console.error("Error creating room type:", error);
    res.status(500).json({ message: "Error creating room type" });
  }
};

// Get all RoomTypes
export const getRoomTypes = async (_req: Request, res: Response) => {
  try {
    const roomTypes = await prisma.roomType.findMany({
      include: { rooms: true }
    });
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
    const roomType = await prisma.roomType.findUnique({
      where: { id },
      include: { rooms: true }
    });

    if (!roomType) {
      return res.status(404).json({ message: "Room type not found" });
    }

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

    res.json({ message: "Room type deleted successfully" });
  } catch (error) {
    console.error("Error deleting room type:", error);
    res.status(500).json({ message: "Error deleting room type" });
  }
};
