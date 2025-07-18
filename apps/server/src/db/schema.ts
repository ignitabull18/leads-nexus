import { pgTable, pgEnum, text, uuid, customType, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod";

// Custom vector type for pgvector
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return typeof value === "string" ? JSON.parse(value) : value;
  },
});

// Lead category enum
export const leadCategoryEnum = pgEnum("lead_category", [
  "influencer",
  "journalist",
  "publisher",
]);

// Leads table
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: leadCategoryEnum("category").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    bio: text("bio").notNull(),
    sourceUrl: text("source_url").notNull(),
    embedding: vector("embedding").notNull(),
  },
  (table) => ({
    categoryIdx: index("idx_leads_category").on(table.category),
    embeddingIdx: index("idx_leads_embedding").using(
      "hnsw",
      table.embedding.asc().op("vector_cosine_ops")
    ),
  })
);

// Lead metadata table
export const leadMetadata = pgTable("lead_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  relatedLeadId: uuid("related_lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(),
});

// Zod schemas for validation
export const leadCategorySchema = z.enum(["influencer", "journalist", "publisher"]);

export const createLeadSchema = z.object({
  category: leadCategorySchema,
  name: z.string().min(1).max(255),
  email: z.string().email(),
  bio: z.string().min(1),
  sourceUrl: z.string().url(),
  embedding: z.array(z.number()).length(1536),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  id: z.string().uuid(),
});

export const leadMetadataSchema = z.object({
  leadId: z.string().uuid(),
  relatedLeadId: z.string().uuid(),
  relationshipType: z.string().min(1).max(255),
});

// Type exports
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadMetadata = typeof leadMetadata.$inferSelect;
export type NewLeadMetadata = typeof leadMetadata.$inferInsert;
export type LeadCategory = z.infer<typeof leadCategorySchema>;