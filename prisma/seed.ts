// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with super admin, room types & rooms...');

  // 1️⃣ Create Super Admin
  const hashedPassword = await bcrypt.hash('Heaven@93.', 10); 

  await prisma.user.upsert({
    where: { email: 'attahjonah93@gmail.com' },
    update: {
      phone: '07064599840',
      role: 'SUPER_ADMIN', 
      password: hashedPassword,
    },
    create: {
      name: 'Super Admin',
      email: 'attahjonah93@gmail.com',
      phone: '07064599840',
      role: 'SUPER_ADMIN', 
      password: hashedPassword,
    },
  });

  console.log('✅ Super admin created/updated.');

  // 2️⃣ Seed Room Types & Rooms
  const roomTypes = [
    { name: 'King', capacity: 2, numberOfRooms: 9, price: 35000 },
    { name: 'Queen', capacity: 2, numberOfRooms: 8, price: 45000 },
    { name: 'Super Deluxe', capacity: 3, numberOfRooms: 8, price: 55000 },
    { name: 'Ambassadorial', capacity: 3, numberOfRooms: 8, price: 65000 },
    { name: '1-Bedroom Suite', capacity: 4, numberOfRooms: 6, price: 85000 },
    { name: 'Hall', capacity: 1500, numberOfRooms: 1, price: 1500000 },
    { name: 'Conference Room', capacity: 25, numberOfRooms: 1, price: 10000 },
    { name: 'Pool', capacity: 50, numberOfRooms: 1, price: 80000 },
  ];

  for (const type of roomTypes) {
    const roomType = await prisma.roomType.upsert({
      where: { name: type.name },
      update: {
        capacity: type.capacity,
        price: type.price,
        numberOfRooms: type.numberOfRooms,
      },
      create: {
        name: type.name,
        price: type.price,
        numberOfRooms: type.numberOfRooms,
        capacity: type.capacity,
      },
    });

    for (let i = 1; i <= type.numberOfRooms; i++) {
      await prisma.room.upsert({
        where: { roomNumber: `${type.name}-${i}` },
        update: {},
        create: {
          roomNumber: `${type.name}-${i}`,
          roomTypeId: roomType.id,
        },
      });
    }
  }

  console.log('✅ Room types & rooms seeded successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
