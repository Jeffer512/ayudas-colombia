-- CreateIndex
-- Hand-authored partial unique index: at most one committed claim per offer.
-- NOT expressible in schema.prisma (Prisma < 7.4); keep in sync with
-- tests/globalSetup.ts which recreates it on the test DB after `db push`.
CREATE UNIQUE INDEX "offer_claims_single_committed_idx" ON "offer_claims" ("offer_id") WHERE "status" = 'committed';
