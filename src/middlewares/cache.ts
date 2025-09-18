import { Request, Response, NextFunction } from "express";
import redis from "../utils/redis.js";

export const cache = (key: string) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      console.log("Serving from cache...");
      return res.json(JSON.parse(cachedData));
    }
    next();
  } catch (error) {
    console.error("Cache middleware error:", error);
    next();
  }
};
