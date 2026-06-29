CREATE TABLE "student_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bac_type" text NOT NULL,
	"general_average" double precision NOT NULL,
	"grades" jsonb NOT NULL,
	"fg" double precision NOT NULL,
	"fg_regional" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_score" ADD CONSTRAINT "student_score_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_score_user_id_unique" ON "student_score" USING btree ("user_id");