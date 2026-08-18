-- AlterTable
ALTER TABLE "offer_claims" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "destination_org_id" TEXT,
ADD COLUMN     "request_id" TEXT;

-- AlterTable
ALTER TABLE "request_helpers" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "offer_id" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'offered',
ADD COLUMN     "transport" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateIndex
CREATE INDEX "offers_request_id_idx" ON "offers"("request_id");

-- CreateIndex
CREATE INDEX "offers_destination_org_id_idx" ON "offers"("destination_org_id");

-- CreateIndex
CREATE INDEX "request_helpers_offer_id_idx" ON "request_helpers"("offer_id");

-- AddForeignKey
ALTER TABLE "request_helpers" ADD CONSTRAINT "request_helpers_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_destination_org_id_fkey" FOREIGN KEY ("destination_org_id") REFERENCES "help_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
