-- AlterTable
ALTER TABLE "public"."RoomType" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
