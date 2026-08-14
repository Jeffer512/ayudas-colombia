/*
  Warnings:

  - You are about to drop the `acopio_centers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `acopio_staff` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "acopio_centers" DROP CONSTRAINT "acopio_centers_city_id_fkey";

-- DropForeignKey
ALTER TABLE "acopio_staff" DROP CONSTRAINT "acopio_staff_org_id_fkey";

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "help_org_id" TEXT;

-- DropTable
DROP TABLE "acopio_centers";

-- DropTable
DROP TABLE "acopio_staff";

-- CreateTable
CREATE TABLE "help_orgs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ciudadano',
    "category" TEXT NOT NULL DEFAULT 'acopio',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "city_id" INTEGER NOT NULL,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "hours" TEXT,
    "accepts" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolve_code" TEXT NOT NULL DEFAULT '0000',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_org_staff" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'manager',
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_org_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "help_orgs_city_id_status_idx" ON "help_orgs"("city_id", "status");

-- CreateIndex
CREATE INDEX "help_orgs_category_idx" ON "help_orgs"("category");

-- CreateIndex
CREATE UNIQUE INDEX "help_org_staff_email_key" ON "help_org_staff"("email");

-- CreateIndex
CREATE INDEX "help_org_staff_org_id_idx" ON "help_org_staff"("org_id");

-- CreateIndex
CREATE INDEX "requests_help_org_id_idx" ON "requests"("help_org_id");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_help_org_id_fkey" FOREIGN KEY ("help_org_id") REFERENCES "help_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_orgs" ADD CONSTRAINT "help_orgs_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_org_staff" ADD CONSTRAINT "help_org_staff_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "help_orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
