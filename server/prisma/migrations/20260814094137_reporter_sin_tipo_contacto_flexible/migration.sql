/*
  Warnings:

  - You are about to drop the column `contact_type` on the `reporters` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "reporters" DROP COLUMN "contact_type",
ADD COLUMN     "whatsapp" TEXT;
