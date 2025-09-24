import { Request, Response } from "express";
import prisma from "../prisma/client.js";
import crypto from "crypto";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import { transporter } from "../utils/email.js";
import { UserRole } from "@prisma/client";
import logger from "../utils/logger.js"; // ✅ logger

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      logger.warn("Signup validation failed - missing fields", { body: req.body });
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      logger.warn("Invalid email format during signup", { email });
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      logger.info("Signup attempt with existing email", { email });
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashed = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: { name, email: normalizedEmail, phone, password: hashed, role: UserRole.GUEST },
    });

    const token = generateToken({ id: newUser.id, role: newUser.role });
    logger.info("User registered successfully", { userId: newUser.id, email: newUser.email });

    res.status(201).json({
      message: "User registered successfully",
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      token,
    });
  } catch (error: any) {
    logger.error("Signup error", { error: error.message });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn("Login validation failed - missing credentials", { body: req.body });
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.warn("Login failed - user not found", { email });
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      logger.warn("Login failed - wrong password", { email });
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken({ id: user.id, role: user.role });
    logger.info("User logged in successfully", { userId: user.id, email });

    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error: any) {
    logger.error("Login error", { error: error.message });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      logger.warn("Forgot password attempt with missing email");
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.warn("Forgot password - user not found", { email });
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetTokenExpiry = new Date(Date.now() + (parseInt(process.env.RESET_TOKEN_EXPIRY || "3600000")));

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExpiry },
    });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset.</p><a href="${resetURL}">${resetURL}</a>`,
    });

    logger.info("Password reset email sent", { email: user.email });
    return res.json({ success: true, message: "Password reset email sent" });
  } catch (error: any) {
    logger.error("Forgot password error", { error: error.message });
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      logger.warn("Reset password validation failed", { body: req.body });
      return res.status(400).json({ success: false, message: "Reset token and new password are required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findFirst({
      where: { resetToken: hashedToken, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) {
      logger.warn("Reset password failed - invalid/expired token");
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    const hashedPassword = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    logger.info("Password reset successful", { userId: user.id, email: user.email });
    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error: any) {
    logger.error("Reset password error", { error: error.message });
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      logger.warn("Change password validation failed", { body: req.body });
      return res.status(400).json({ message: "Current and new passwords are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      logger.warn("Change password - user not found", { userId });
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      logger.warn("Change password failed - wrong current password", { userId });
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedNewPassword = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedNewPassword } });

    logger.info("Password changed successfully", { userId });
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error: any) {
    logger.error("Change password error", { error: error.message });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;

    if (!Object.values(UserRole).includes(role)) {
      logger.warn("Update role failed - invalid role", { userId, role });
      return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await prisma.user.update({ where: { id: userId }, data: { role } });

    logger.info("User role updated successfully", { userId, newRole: updatedUser.role });
    res.status(200).json({
      message: "User role updated successfully",
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role },
    });
  } catch (error: any) {
    logger.error("Update role error", { error: error.message });
    res.status(500).json({ message: "Internal server error" });
  }
};






// import { Request, Response } from 'express';
// import prisma from '../prisma/client.js';
// import crypto from 'crypto';
// import { hashPassword, comparePassword } from '../utils/password.js';
// import { generateToken } from '../utils/jwt.js';
// import { transporter } from '../utils/email.js';
// import { UserRole } from '@prisma/client';

// export const signup = async (req: Request, res: Response) => {
//   try {
//     const { name, email, password, phone } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({ message: 'Name, email, and password are required' });
//     }

//     const normalizedEmail = email.toLowerCase().trim();

//     // ✅ Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(normalizedEmail)) {
//       return res.status(400).json({ message: 'Invalid email format' });
//     }

//     const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Email already in use' });
//     }

//     const hashed = await hashPassword(password);

//     const newUser = await prisma.user.create({
//       data: {
//         name,
//         email: normalizedEmail,
//         phone,
//         password: hashed,
//         role: UserRole.GUEST,
//       },
//     });

//     const token = generateToken({ id: newUser.id, role: newUser.role });

//     res.status(201).json({
//       message: 'User registered successfully',
//       user: {
//         id: newUser.id,
//         name: newUser.name,
//         email: newUser.email,
//         role: newUser.role,
//       },
//       token,
//     });
//   } catch (error) {
//     console.error('Signup Error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };


// export const login = async (req: Request, res: Response) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }

//     const isMatch = await comparePassword(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }

//     const token = generateToken({ id: user.id, role: user.role });

//     res.status(200).json({
//       message: 'Login successful',
//       user: { 
//         id: user.id, 
//         name: user.name, 
//         email: user.email, 
//         role: user.role 
//     },
//       token,
//     });
//   } catch (error) {
//     console.error('Login Error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };


// // Forgot Password Controller
// export const forgotPassword = async (req: Request, res: Response) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ success: false, message: "Email is required" });
//     }

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     const resetToken = crypto.randomBytes(32).toString("hex");
//     const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
//     const resetTokenExpiry = new Date(Date.now() + (parseInt(process.env.RESET_TOKEN_EXPIRY || "3600000"))); // default 1h

//     await prisma.user.update({
//       where: { id: user.id },
//       data: { resetToken: hashedToken, resetTokenExpiry },
//     });

//     const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

//     await transporter.sendMail({
//       from: process.env.GMAIL_USER,
//       to: user.email,
//       subject: "Password Reset Request",
//       text: `You requested a password reset. Please use the following link: ${resetURL}`,
//       html: `<p>You requested a password reset.</p>
//              <p>Click the link below to reset your password:</p>
//              <a href="${resetURL}">${resetURL}</a>
//              <p>This link will expire in 1 hour.</p>`,
//     });

//     return res.json({ success: true, message: "Password reset email sent" });
//   } catch (error) {
//     console.error("Forgot Password Error:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

// // Reset Password Controller
// export const resetPassword = async (req: Request, res: Response) => {
//   try {
//     const { token } = req.params;
//     const { password } = req.body;

//     if (!token) {
//       return res.status(400).json({ success: false, message: "Reset token is required" });
//     }
//     if (!password) {
//       return res.status(400).json({ success: false, message: "New password is required" });
//     }

//     const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

//     const user = await prisma.user.findFirst({
//       where: {
//         resetToken: hashedToken,
//         resetTokenExpiry: { gt: new Date() },
//       },
//     });

//     if (!user) {
//       return res.status(400).json({ success: false, message: "Invalid or expired token" });
//     }

//     const hashedPassword = await hashPassword(password);

//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         password: hashedPassword,
//         resetToken: null,
//         resetTokenExpiry: null,
//       },
//     });

//     res.status(200).json({ success: true, message: "Password reset successful" });
//   } catch (error) {
//     console.error("Reset Password Error:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

// export const changePassword = async (req: Request, res: Response) => {
//   try {
//     const { currentPassword, newPassword } = req.body;
//     const userId = req.user?.id;

//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({ message: 'Current and new passwords are required' });
//     }

//     const user = await prisma.user.findUnique({ where: { id: userId } });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const isMatch = await comparePassword(currentPassword, user.password);
//     if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

//     const hashedNewPassword = await hashPassword(newPassword);

//     await prisma.user.update({
//       where: { id: user.id },
//       data: { password: hashedNewPassword },
//     });

//     res.status(200).json({ message: 'Password changed successfully' });
//   } catch (error) {
//     console.error('Change Password Error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };


// export const updateUserRole = async (req: Request, res: Response) => {
//   try {
//     const { userId, role } = req.body;

//     if (!Object.values(UserRole).includes(role)) {
//       return res.status(400).json({ message: 'Invalid role' });
//     }

//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: { role },
//     });

//     res.status(200).json({
//       message: 'User role updated successfully',
//       user: {
//         id: updatedUser.id,
//         name: updatedUser.name,
//         email: updatedUser.email,
//         role: updatedUser.role,
//       },
//     });
//   } catch (error) {
//     console.error('Update Role Error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };
