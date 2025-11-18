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

// Swagger
import { swaggerServe, swaggerSetup, specs } from "./config/swagger.js";


// Initialize the Express app
const app: Application = express();

// ✅ Apply rate limiter globally
app.use(globalRateLimiter);

// --- Middleware ---
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "https://c159521c1b69.ngrok-free.app"
  ],
  credentials: true
}));

app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

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

// Swagger Docs
app.use("/api-docs", swaggerServe, swaggerSetup(specs));

// --- Health Check ---
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to BeroHotel Booking API 🚀");
});

export default app;


