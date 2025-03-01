-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "damage_description" TEXT,
ADD COLUMN     "damage_status" TEXT DEFAULT 'NONE';
