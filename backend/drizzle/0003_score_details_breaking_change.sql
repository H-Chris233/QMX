ALTER TABLE "students"
ADD COLUMN IF NOT EXISTS "score_details" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
UPDATE "students"
SET "score_details" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'score', score_item,
        'subject', "students"."subject",
        'recorded_at', COALESCE("students"."updated_at", "students"."created_at", now())
      )
    )
    FROM unnest(COALESCE("students"."rings", '{}'::real[])) AS score_item
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof("score_details") IS DISTINCT FROM 'array'
   OR jsonb_array_length("score_details") = 0;
