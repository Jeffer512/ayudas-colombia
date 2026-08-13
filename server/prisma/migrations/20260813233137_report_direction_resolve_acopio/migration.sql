/*
  Warnings:

  - You are about to drop the column `phone_verify` on the `reports` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "reports" DROP COLUMN "phone_verify",
ADD COLUMN     "direction" TEXT NOT NULL DEFAULT 'need',
ADD COLUMN     "resolve_code" TEXT NOT NULL DEFAULT '0000';

-- Backfill direction for existing reports based on their type
UPDATE "reports" SET "direction" = CASE "type"
  WHEN 'missing_person' THEN 'need'
  WHEN 'missing_pet' THEN 'need'
  WHEN 'supplies_request' THEN 'need'
  WHEN 'volunteers_request' THEN 'need'
  WHEN 'shelter_request' THEN 'need'
  WHEN 'medical_request' THEN 'need'
  WHEN 'transport_request' THEN 'need'
  WHEN 'supplies_offered' THEN 'offer'
  WHEN 'volunteers_offered' THEN 'offer'
  WHEN 'shelter_offered' THEN 'offer'
  WHEN 'transport_offered' THEN 'offer'
  WHEN 'damage_report' THEN 'info'
  WHEN 'info' THEN 'info'
  ELSE 'info'
END;

-- Give existing reports a random 4-digit resolve code
UPDATE "reports" SET "resolve_code" = LPAD(CAST(FLOOR(random() * 10000) AS TEXT), 4, '0')
WHERE "resolve_code" = '0000' OR "resolve_code" IS NULL;

-- CreateTable
CREATE TABLE "acopio_centers" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ciudadano',
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acopio_centers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acopio_centers_city_id_status_idx" ON "acopio_centers"("city_id", "status");

-- AddForeignKey
ALTER TABLE "acopio_centers" ADD CONSTRAINT "acopio_centers_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
