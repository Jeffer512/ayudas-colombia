-- AlterTable
ALTER TABLE "users" ADD COLUMN     "verify_code_attempts" INTEGER NOT NULL DEFAULT 0;
