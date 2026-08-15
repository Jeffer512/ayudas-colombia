-- AlterTable
ALTER TABLE "avisos" ADD COLUMN     "contact_visibility" TEXT NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'public',
ADD COLUMN     "contact_visibility" TEXT NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "contact_visibility" TEXT NOT NULL DEFAULT 'public';

-- Backfill: volunteer offers start hidden from anonymous viewers
UPDATE "offers" SET "audience" = 'users' WHERE "type" = 'volunteers_offered';
