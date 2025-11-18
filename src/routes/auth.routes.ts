import { Router } from 'express';
import { signup, login, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { authenticate } from '../middlewares/auth.js';
const router = Router();


/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (GUEST role by default)
 *     description: Creates a new user account and returns a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: johndoe@gmail.com
 *               password:
 *                 type: string
 *                 example: Pass1234
 *               phone:
 *                 type: string
 *                 example: +2347030001111
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing or invalid inputs
 *       500:
 *         description: Internal server error
 */

router.post('/signup', authLimiter, signup);


/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     description: Logs in a registered user and returns a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: johndoe@gmail.com
 *               password:
 *                 type: string
 *                 example: Pass1234
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */

router.post('/login', authLimiter, login);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     description: Sends a password reset link to the user's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: johndoe@gmail.com
 *     responses:
 *       200:
 *         description: Reset email sent
 *       404:
 *         description: User not found
 *       400:
 *         description: Email is required
 *       500:
 *         description: Internal server error
 */

router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Reset user password
 *     description: Resets user password using a valid reset token.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal server error
 */

router.post("/reset-password/:token", resetPassword);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change current password
 *     security:
 *       - bearerAuth: []
 *     description: Authenticated users can change their password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPass123
 *               newPassword:
 *                 type: string
 *                 example: NewPass456
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password incorrect
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

router.post("/change-password", authenticate, changePassword);

/**
 * @swagger
 * /api/v1/auth/update-role:
 *   patch:
 *     tags: [Auth]
 *     summary: Update user role (Admin Only)
 *     security:
 *       - bearerAuth: []
 *     description: Allows admins to promote/demote a user role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, role]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "c89f8d0a-22d1-4d43-bbd5-2a37e27b9fb9"
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, STAFF, GUEST]
 *                 example: ADMIN
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Invalid role
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */


export default router;
