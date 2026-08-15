-- DropForeignKey
ALTER TABLE "offers" DROP CONSTRAINT "offers_reporter_id_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_reporter_id_fkey";

-- AlterTable
ALTER TABLE "reporters" ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "reporters_user_id_idx" ON "reporters"("user_id");

-- AddForeignKey
ALTER TABLE "reporters" ADD CONSTRAINT "reporters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "reporters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "reporters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
