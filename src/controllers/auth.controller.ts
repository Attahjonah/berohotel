import { Request, Response } from 'express';
import prisma from '../prisma/client.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { UserRole } from '@prisma/client';

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashed = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        password: hashed,
        role: UserRole.GUEST,
      },
    });

    const token = generateToken({ id: newUser.id, role: newUser.role });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      token,
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.status(200).json({
      message: 'Login successful',
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
    },
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;

    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    res.status(200).json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
