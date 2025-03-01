/*
  Warnings:

  - You are about to drop the column `insuranceInterval` on the `VehicleType` table. All the data in the column will be lost.
  - You are about to drop the column `revisionInterval` on the `VehicleType` table. All the data in the column will be lost.
  - You are about to drop the column `taxInterval` on the `VehicleType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "insurance_interval" INTEGER,
ADD COLUMN     "revision_interval" INTEGER,
ADD COLUMN     "tax_interval" INTEGER;

-- AlterTable
ALTER TABLE "VehicleType" DROP COLUMN "insuranceInterval",
DROP COLUMN "revisionInterval",
DROP COLUMN "taxInterval";
