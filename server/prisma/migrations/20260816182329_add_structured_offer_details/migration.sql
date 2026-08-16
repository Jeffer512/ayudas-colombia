-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "items" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "items" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "volunteer_details" (
    "offer_id" TEXT NOT NULL,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,

    CONSTRAINT "volunteer_details_pkey" PRIMARY KEY ("offer_id")
);

-- CreateTable
CREATE TABLE "transport_details" (
    "offer_id" TEXT NOT NULL,
    "vehicleType" TEXT,
    "capacity" TEXT,

    CONSTRAINT "transport_details_pkey" PRIMARY KEY ("offer_id")
);

-- AddForeignKey
ALTER TABLE "volunteer_details" ADD CONSTRAINT "volunteer_details_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_details" ADD CONSTRAINT "transport_details_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
