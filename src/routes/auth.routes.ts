import { Router } from 'express';
import { signup, login, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { authenticate } from '../middlewares/auth.js';
const router = Router();

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/change-password", authenticate, changePassword);

export default router;
