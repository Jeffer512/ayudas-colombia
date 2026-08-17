-- Enforce allowed domain values at the DB level.
ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_status_check";
ALTER TABLE "requests" ADD CONSTRAINT "requests_status_check"
  CHECK ("status" IN ('open','resolved','duplicate','invalid'));

ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_type_check";
ALTER TABLE "requests" ADD CONSTRAINT "requests_type_check"
  CHECK ("type" IN ('missing_person','missing_pet','supplies_request','volunteers_request','shelter_request','medical_request','transport_request'));

ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_urgency_check";
ALTER TABLE "requests" ADD CONSTRAINT "requests_urgency_check"
  CHECK ("urgency" IN ('critical','high','medium','low'));

ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_transport_check";
ALTER TABLE "requests" ADD CONSTRAINT "requests_transport_check"
  CHECK ("transport" IS NULL OR "transport" IN ('can_transport','needs_transport'));

ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_contact_visibility_check";
ALTER TABLE "requests" ADD CONSTRAINT "requests_contact_visibility_check"
  CHECK ("contact_visibility" IN ('public','users'));

ALTER TABLE "request_events" DROP CONSTRAINT IF EXISTS "request_events_status_check";
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_status_check"
  CHECK ("status" IN ('open','resolved','duplicate','invalid'));

ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_status_check";
ALTER TABLE "offers" ADD CONSTRAINT "offers_status_check"
  CHECK ("status" IN ('open','in_transit','fulfilled','unavailable'));

ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_type_check";
ALTER TABLE "offers" ADD CONSTRAINT "offers_type_check"
  CHECK ("type" IN ('supplies_offered','volunteers_offered','shelter_offered','transport_offered'));

ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_transport_check";
ALTER TABLE "offers" ADD CONSTRAINT "offers_transport_check"
  CHECK ("transport" IS NULL OR "transport" IN ('can_transport','needs_transport'));

ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_contact_visibility_check";
ALTER TABLE "offers" ADD CONSTRAINT "offers_contact_visibility_check"
  CHECK ("contact_visibility" IN ('public','users'));

ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_audience_check";
ALTER TABLE "offers" ADD CONSTRAINT "offers_audience_check"
  CHECK ("audience" IN ('public','users','orgs'));

ALTER TABLE "offer_claims" DROP CONSTRAINT IF EXISTS "offer_claims_status_check";
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_status_check"
  CHECK ("status" IN ('committed','cancelled','delivered'));

ALTER TABLE "avisos" DROP CONSTRAINT IF EXISTS "avisos_status_check";
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_status_check"
  CHECK ("status" IN ('open','closed'));

ALTER TABLE "avisos" DROP CONSTRAINT IF EXISTS "avisos_type_check";
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_type_check"
  CHECK ("type" IN ('info'));

ALTER TABLE "avisos" DROP CONSTRAINT IF EXISTS "avisos_urgency_check";
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_urgency_check"
  CHECK ("urgency" IN ('critical','high','medium','low'));

ALTER TABLE "avisos" DROP CONSTRAINT IF EXISTS "avisos_contact_visibility_check";
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_contact_visibility_check"
  CHECK ("contact_visibility" IN ('public','users'));

ALTER TABLE "help_orgs" DROP CONSTRAINT IF EXISTS "help_orgs_type_check";
ALTER TABLE "help_orgs" ADD CONSTRAINT "help_orgs_type_check"
  CHECK ("type" IN ('ciudadano','oficial'));

ALTER TABLE "help_orgs" DROP CONSTRAINT IF EXISTS "help_orgs_category_check";
ALTER TABLE "help_orgs" ADD CONSTRAINT "help_orgs_category_check"
  CHECK ("category" IN ('acopio','psicologia','voluntarios','albergue','other'));

ALTER TABLE "help_orgs" DROP CONSTRAINT IF EXISTS "help_orgs_status_check";
ALTER TABLE "help_orgs" ADD CONSTRAINT "help_orgs_status_check"
  CHECK ("status" IN ('open','closed'));

ALTER TABLE "help_org_items" DROP CONSTRAINT IF EXISTS "help_org_items_kind_check";
ALTER TABLE "help_org_items" ADD CONSTRAINT "help_org_items_kind_check"
  CHECK ("kind" IN ('available','needed'));

ALTER TABLE "help_org_staff" DROP CONSTRAINT IF EXISTS "help_org_staff_role_check";
ALTER TABLE "help_org_staff" ADD CONSTRAINT "help_org_staff_role_check"
  CHECK ("role" IN ('manager','member'));

ALTER TABLE "help_org_staff" DROP CONSTRAINT IF EXISTS "help_org_staff_status_check";
ALTER TABLE "help_org_staff" ADD CONSTRAINT "help_org_staff_status_check"
  CHECK ("status" IN ('active','pending'));

ALTER TABLE "post_reports" DROP CONSTRAINT IF EXISTS "post_reports_kind_check";
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_kind_check"
  CHECK ("kind" IN ('request','offer','aviso','org','message'));

ALTER TABLE "post_reports" DROP CONSTRAINT IF EXISTS "post_reports_reason_check";
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reason_check"
  CHECK ("reason" IN ('fake','unreachable','spam','wrong','other'));

ALTER TABLE "post_reports" DROP CONSTRAINT IF EXISTS "post_reports_status_check";
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_status_check"
  CHECK ("status" IN ('open','reviewed'));