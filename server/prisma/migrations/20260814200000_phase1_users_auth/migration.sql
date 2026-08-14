-- CreateTable users (unified accounts
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "verify_token_hash" TEXT,
    "verify_token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Backfill: existing staff become verified users (same id keeps references intact)
INSERT INTO "users" ("id", "email", "name", "password_hash", "email_verified_at", "created_at", "updated_at")
SELECT "id", "email", "name", "password_hash", "created_at", "created_at", "updated_at"
FROM "help_org_staff";

-- AlterTable help_org_staff -> membership row (userId, status, approvedAt)
ALTER TABLE "help_org_staff" ADD COLUMN "user_id" TEXT;
ALTER TABLE "help_org_staff" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "help_org_staff" ADD COLUMN "approved_at" TIMESTAMP(3);

UPDATE "help_org_staff" SET "user_id" = "id", "approved_at" = "created_at" WHERE "user_id" IS NULL;

ALTER TABLE "help_org_staff" ALTER COLUMN "user_id" SET NOT NULL;

-- Drop duplicated credentials now living in users
ALTER TABLE "help_org_staff" DROP COLUMN "email";
ALTER TABLE "help_org_staff" DROP COLUMN "name";
ALTER TABLE "help_org_staff" DROP COLUMN "password_hash";

-- CreateIndex
CREATE UNIQUE INDEX "help_org_staff_user_id_key" ON "help_org_staff"("user_id");

-- AddForeignKey
ALTER TABLE "help_org_staff" ADD CONSTRAINT "help_org_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;