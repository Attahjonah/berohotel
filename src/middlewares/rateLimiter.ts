import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ⏱️ 15 minutes
  max: 100, // 🚫 limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // ✅ Return rate limit info in headers
  legacyHeaders: false,  // ❌ Disable the `X-RateLimit-*` headers
});

export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // ⏱️ 5 minutes
  max: 10, // 🚫 limit each IP to 10 requests per window
  message: {
    error: 'Too many login/signup attempts. Please try again later.',
  },
});


export const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // ⏱️ 10 minutes
  max: 20, // 🚫 limit each IP to 20 booking actions per window
  message: {
    error: 'Too many booking requests. Please try again later.',
  },
});


export const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // ⏱️ 10 minutes
  max: 30, // 🚫 limit each IP to 30 payment-related requests
  message: {
    error: 'Too many payment requests. Please try again later.',
  },
});