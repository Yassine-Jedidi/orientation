ALTER TABLE "student_score" ALTER COLUMN "general_average" SET DATA TYPE numeric(4, 2);--> statement-breakpoint
UPDATE "student_score" AS score
SET "grades" = (
  SELECT jsonb_object_agg(entry.key, to_jsonb(round((entry.value #>> '{}')::numeric, 2)))
  FROM jsonb_each(score."grades") AS entry
);
