import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import roomTypeRoutes from './routes/roomType.routes.js'
import roomRoutes from './routes/roomRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js'

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/room-types', roomTypeRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/payments', paymentRoutes)

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to BeroHotel Booking API 🚀'); 
});

export default app;
