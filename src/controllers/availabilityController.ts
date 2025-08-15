import { Request, Response } from "express";
import prisma from "../config/prisma.js";

export const getAvailableRooms = async (req: Request, res: Response) => {
  try {
    const { checkIn, checkOut } = req.query;
    const start = new Date(checkIn as string);
    const end = new Date(checkOut as string);

    const availableRooms = await prisma.room.findMany({
      where: {
        bookings: {
          none: {
            status: { not: "CANCELLED" },
            OR: [
              { checkIn: { lte: end }, checkOut: { gte: start } }
            ]
          }
        }
      },
      include: { roomType: true }
    });

    res.json(availableRooms);
  } catch (error) {
    res.status(500).json({ message: "Error fetching availability", error });
  }
};
