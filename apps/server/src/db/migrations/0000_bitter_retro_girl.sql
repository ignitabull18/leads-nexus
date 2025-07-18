CREATE TYPE "public"."lead_category" AS ENUM('influencer', 'journalist', 'publisher');--> statement-breakpoint
CREATE TABLE "lead_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"related_lead_id" uuid NOT NULL,
	"relationship_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "lead_category" NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"bio" text NOT NULL,
	"source_url" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	CONSTRAINT "leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "lead_metadata" ADD CONSTRAINT "lead_metadata_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_metadata" ADD CONSTRAINT "lead_metadata_related_lead_id_leads_id_fk" FOREIGN KEY ("related_lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_leads_category" ON "leads" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_leads_embedding" ON "leads" USING hnsw ("embedding" vector_cosine_ops);