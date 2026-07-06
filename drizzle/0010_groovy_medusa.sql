CREATE TABLE "choice_card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"bac_type" text NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "choice_card" ADD CONSTRAINT "choice_card_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "choice_card_user_rank_unique" ON "choice_card" USING btree ("user_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "choice_card_user_code_bac_unique" ON "choice_card" USING btree ("user_id","code","bac_type");