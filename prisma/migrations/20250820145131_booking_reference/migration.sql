/*
  Warnings:

  - A unique constraint covering the columns `[bookingReference]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "bookingReference" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingReference_key" ON "public"."Booking"("bookingReference");
