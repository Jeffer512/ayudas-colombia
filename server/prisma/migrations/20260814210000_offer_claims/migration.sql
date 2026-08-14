-- CreateTable
CREATE TABLE "offer_claims" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "claimer_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'committed',
    "note" TEXT,
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offer_claims_offer_id_idx" ON "offer_claims"("offer_id");

-- CreateIndex
CREATE INDEX "offer_claims_claimer_id_idx" ON "offer_claims"("claimer_id");

-- AddForeignKey
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_claimer_id_fkey" FOREIGN KEY ("claimer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
