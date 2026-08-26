-- Remove discontinued post types. Delete existing rows first (the old CHECK still
-- permits them until it is dropped below), then redefine the type CHECK without
-- the removed values.
DELETE FROM "requests" WHERE "type" IN ('shelter_request', 'transport_request');
DELETE FROM "offers" WHERE "type" = 'shelter_offered';

ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_type_check";
ALTER TABLE "requests" ADD CONSTRAINT "requests_type_check" CHECK ("type" IN ('missing_person', 'missing_pet', 'supplies_request', 'volunteers_request', 'medical_request'));

ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_type_check";
ALTER TABLE "offers" ADD CONSTRAINT "offers_type_check" CHECK ("type" IN ('supplies_offered', 'volunteers_offered', 'transport_offered'));
