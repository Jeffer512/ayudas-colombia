-- Enforce allowed domain values for request helpers at the DB level.
ALTER TABLE "request_helpers" DROP CONSTRAINT IF EXISTS "request_helpers_transport_check";
ALTER TABLE "request_helpers" ADD CONSTRAINT "request_helpers_transport_check"
  CHECK ("transport" IS NULL OR "transport" IN ('can_transport','needs_transport'));

ALTER TABLE "request_helpers" DROP CONSTRAINT IF EXISTS "request_helpers_status_check";
ALTER TABLE "request_helpers" ADD CONSTRAINT "request_helpers_status_check"
  CHECK ("status" IN ('offered','accepted','delivered','cancelled'));
