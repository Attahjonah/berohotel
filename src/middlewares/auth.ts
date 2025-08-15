import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client.js";

interface AuthRequest extends Request {
  user?: any;
}

// Middleware to check authentication
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Middleware to check admin or super admin
export const authorizeAdminOrSuper = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== "SUPER_ADMIN" && req.user.role !== "ADMIN")) {
    return res.status(403).json({ message: "Access denied: Admin or Super admin only" });
  }
  next();
};


// Middleware to ensure the user is logged in (any role)
export const authorizeLoggedIn = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "You must be logged in to perform this action" });
  }
  next();
};
