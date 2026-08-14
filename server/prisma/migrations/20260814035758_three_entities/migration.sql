/*
  Warnings:

  - You are about to drop the `report_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "report_events" DROP CONSTRAINT "report_events_report_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_city_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporter_id_fkey";

-- AlterTable
ALTER TABLE "acopio_centers" ADD COLUMN     "resolve_code" TEXT NOT NULL DEFAULT '0000';

-- DropTable
DROP TABLE "report_events";

-- DropTable
DROP TABLE "reports";

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "transport" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "city_id" INTEGER NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "resolve_code" TEXT NOT NULL DEFAULT '0000',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_events" (
    "id" BIGSERIAL NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "actor_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "transport" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "city_id" INTEGER NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "resolve_code" TEXT NOT NULL DEFAULT '0000',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avisos" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "city_id" INTEGER NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avisos_marks" (
    "id" BIGSERIAL NOT NULL,
    "aviso_id" TEXT NOT NULL,
    "marker_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_marks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requests_city_id_status_idx" ON "requests"("city_id", "status");

-- CreateIndex
CREATE INDEX "requests_type_idx" ON "requests"("type");

-- CreateIndex
CREATE INDEX "request_events_request_id_idx" ON "request_events"("request_id");

-- CreateIndex
CREATE INDEX "offers_city_id_status_idx" ON "offers"("city_id", "status");

-- CreateIndex
CREATE INDEX "offers_type_idx" ON "offers"("type");

-- CreateIndex
CREATE INDEX "avisos_city_id_status_idx" ON "avisos"("city_id", "status");

-- CreateIndex
CREATE INDEX "avisos_marks_aviso_id_marker_id_idx" ON "avisos_marks"("aviso_id", "marker_id");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "reporters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "reporters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "reporters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos_marks" ADD CONSTRAINT "avisos_marks_aviso_id_fkey" FOREIGN KEY ("aviso_id") REFERENCES "avisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
