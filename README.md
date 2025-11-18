#berohotel
BeroHotel – Backend API
BeroHotel is a hotel booking backend system built with Node.js, TypeScript, Express, Prisma, PostgreSQL, Redis, and JWT Authentication.
It enables guests to browse available rooms, book rooms, make online payments via Paystack, and automatically receive a PDF receipt after successful payment.
________________________________________
🚀 Features
🔐 User & Authentication
•	JWT-based authentication
•	Secure session management
•	Role-based access:
o	Admin / Manager: Manage rooms, room types, and view all bookings
o	Guest/User: View room types, check availability, book rooms, make payments
🏨 Room & Room-Type Management
•	CRUD for Room Types (with Cloudinary image upload)
•	Room creation & management
•	Users can:
o	See available rooms
o	View room details
o	Book a room immediately if available
💳 Payment Integration (Paystack)
•	Payment initialized once user clicks “Make Payment”
•	Webhook/Callback confirmation handled
•	Booking automatically confirmed after successful payment
🧾 PDF Receipt Generation
•	Auto-generated PDF receipt using Puppeteer
•	Downloadable via /booking/:id/receipt
⚡ Performance
•	Redis caching for room availability & room-type data
•	Optimized database queries with Prisma ORM
📄 API Documentation
•	Fully documented Swagger API
•	URL → http://localhost:5000/api-docs

📁 Project Structure
src/
 ├── config/
 │     ├── swagger.ts
 │     └── prisma.ts
 │     
 ├── controllers/
 │     ├── auth.controller.ts
 │     ├── roomController.ts
│     ├── availabilityController.ts
 │     ├── roomType.controller.ts
 │     ├── bookingController.ts
│     ├── receipt.controller.ts
 │     └── payment.controller.ts
 ├── middlewares/
 │     ├── auth.ts
│     ├── cache.ts
 │     └── rateLimiter.ts
 ├── prisma/
 │     └── schema.prisma
 ├── routes/
 │     ├── auth.routes.ts
 │     ├── roomRoutes.ts
│     ├── availability.routes.ts
 │     ├── roomType.routes.ts
 │     ├── bookingRoutes.ts
│     ├── receiptRoutes.ts
 │     └── paymentRoutes.ts
 ├── utils/
 │     ├── logger.ts
 │     ├── email.ts
│     ├── jwt.ts
│     ├── logger.ts
│     ├── password.ts
│     ├── paystack.ts
│     ├── receipt.ts
 │     └── redis.ts
 ├── app.ts
 └── server.ts

⚙️ Environment Variables
Create a .env file:
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
PAYSTACK_SECRET_KEY=
BASE_URL=
PORT=
SESSION_SECRET=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
GMAIL_USER=
GMAIL_PASS=
📦 Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/your-username/berohotel.git
cd berohotel
2️⃣ Install Dependencies
npm install
3️⃣ Setup the Database
Run Prisma migrations:
npx prisma migrate dev
4️⃣ Start Redis
•	If using Redis locally:
redis-server
5️⃣ Start Development Server
npm run dev
6️⃣ Start Production Build
npm run build
npm run start
📚 API Documentation (Swagger)
Open in browser:
👉 http://localhost:5000/api-docs
🔑 Authentication & User Roles
Roles:
•	admin
•	manager
•	guest/user
Authorization:
Feature	Admin	Manager	User
View rooms	✔️	✔️	✔️
Book rooms	✔️	✔️	✔️
Manage rooms	✔️	✔️	❌
Manage room types	✔️	✔️	❌
View bookings (all)	✔️	✔️	❌
Make payment	✔️	✔️	✔️
🌐 Deployment
Backend API Base URL:
http://localhost:5000
📝 Special Instructions
✔ Run npx prisma migrate dev before starting
✔ Redis must be running
✔ Cloudinary required for room-type images
✔ Swagger auto-loads routes under /src/docs/swagger/*
________________________________________

