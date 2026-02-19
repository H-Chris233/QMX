ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "valid_subject";
--> statement-breakpoint
ALTER TABLE "students"
ADD CONSTRAINT "valid_subject"
CHECK ("students"."subject" IN ('SHOOTING', 'ARCHERY', 'SHOOTING_ARCHERY', 'OTHERS'));
