// Import necessary modules
import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import roomTypeRoutes from "./routes/roomType.routes.js";
import roomRoutes from "./routes/roomRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import receiptRoutes from "./routes/receiptRoute.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import { globalRateLimiter } from "./middlewares/rateLimiter.js";

// Load environment variables
dotenv.config();

const { API_VERSION } = process.env;

// Initialize the Express app
const app: Application = express();

// ✅ Apply rate limiter globally
app.use(globalRateLimiter);

// --- Middleware ---
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));

// --- Routes ---
app.use(`/api/v${API_VERSION}/auth`, authRoutes);
app.use("/api/room-types", roomTypeRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/available", availabilityRoutes);

// --- Health Check ---
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to BeroHotel Booking API 🚀");
});

export default app;



// import express, { Application, Request, Response } from 'express';
// import cors from 'cors';
// import morgan from 'morgan';
// import helmet from 'helmet';
// import dotenv from 'dotenv';
// import authRoutes from './routes/auth.routes.js';
// import roomTypeRoutes from './routes/roomType.routes.js'
// import roomRoutes from './routes/roomRoutes.js'
// import bookingRoutes from './routes/bookingRoutes.js';
// import paymentRoutes from './routes/paymentRoutes.js';
// import receiptRoutes from './routes/receiptRoute.js'

// const { API_VERSION, SESSION_SECRET } = process.env;
// dotenv.config();

// const app: Application = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(helmet());
// app.use(morgan('dev'));

// // Routes
// app.use(`/api/v${API_VERSION}/auth`, authRoutes);
// app.use('/api/room-types', roomTypeRoutes);
// app.use('/api/room', roomRoutes);
// app.use('/api/booking', bookingRoutes);
// app.use('/api/payments', paymentRoutes)
// app.use('/api/receipts', receiptRoutes)

// // Health check route
// app.get('/', (req: Request, res: Response) => {
//   res.send('Welcome to BeroHotel Booking API 🚀'); 
// });

// export default app;
