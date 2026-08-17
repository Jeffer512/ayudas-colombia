-- AlterTable
ALTER TABLE "post_reports" DROP CONSTRAINT IF EXISTS "post_reports_kind_check";
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_kind_check"
  CHECK ("kind" IN ('request','offer','aviso','org','message'));