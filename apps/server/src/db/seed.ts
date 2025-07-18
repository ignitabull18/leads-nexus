#!/usr/bin/env bun
import { faker } from "@faker-js/faker";
import { google } from "@ai-sdk/google";
import { embed } from "ai";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { leads, leadMetadata, type NewLead, type LeadCategory } from "./schema";

// Load environment variables
config();

// Initialize database connection
const db = drizzle(process.env.DATABASE_URL!);

// Configuration
const LEADS_PER_CATEGORY = 5;
const CATEGORIES: LeadCategory[] = ["influencer", "journalist", "publisher"];

// Helper function to generate lead bio based on category
function generateBio(category: LeadCategory, name: string): string {
  switch (category) {
    case "influencer":
      return faker.helpers.fake(
        `{{person.firstName}} is a {{helpers.arrayElement(['lifestyle', 'tech', 'fashion', 'fitness', 'travel', 'food'])}} influencer with {{number.int({min: 10000, max: 1000000})}} followers. Known for {{helpers.arrayElement(['authentic content', 'engaging stories', 'viral trends', 'creative campaigns'])}}, they specialize in {{helpers.arrayElement(['product reviews', 'brand partnerships', 'sponsored content', 'educational posts'])}}. Based in {{location.city()}}, they've worked with {{helpers.arrayElement(['major brands', 'startups', 'Fortune 500 companies', 'emerging businesses'])}}.`
      );
    case "journalist":
      return faker.helpers.fake(
        `${name} is a {{helpers.arrayElement(['senior', 'investigative', 'freelance', 'staff'])}} journalist at {{company.name()}} covering {{helpers.arrayElement(['technology', 'business', 'politics', 'culture', 'science'])}}. With {{number.int({min: 5, max: 20})}} years of experience, they've written for {{helpers.arrayElement(['The New York Times', 'The Guardian', 'Reuters', 'Bloomberg', 'TechCrunch', 'The Wall Street Journal'])}}. Their work focuses on {{helpers.arrayElement(['breaking news', 'in-depth features', 'data journalism', 'investigative reports'])}}.`
      );
    case "publisher":
      return faker.helpers.fake(
        `${name} is the {{helpers.arrayElement(['Editor-in-Chief', 'Managing Editor', 'Publisher', 'Content Director'])}} of {{company.name()}} Media. They oversee {{helpers.arrayElement(['digital content strategy', 'editorial operations', 'content partnerships', 'publication growth'])}} for a platform reaching {{number.int({min: 100000, max: 10000000})}} monthly readers. Their expertise includes {{helpers.arrayElement(['content curation', 'audience development', 'monetization strategies', 'editorial planning'])}}.`
      );
  }
}

// Helper function to generate source URL based on category
function generateSourceUrl(category: LeadCategory): string {
  const domains = {
    influencer: ["instagram.com", "tiktok.com", "youtube.com", "twitter.com"],
    journalist: ["linkedin.com", "muckrack.com", "twitter.com", "medium.com"],
    publisher: ["linkedin.com", "crunchbase.com", "twitter.com"],
  };
  
  const domain = faker.helpers.arrayElement(domains[category]);
  const username = faker.internet.username().toLowerCase();
  return `https://${domain}/${username}`;
}

// Function to generate embedding for text
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: google("text-embedding-004"),
      value: text,
    });
    
    // Ensure we have exactly 1536 dimensions
    if (embedding.length !== 1536) {
      // If the model returns a different dimension, we'll pad or truncate
      const result = new Array(1536).fill(0);
      for (let i = 0; i < Math.min(embedding.length, 1536); i++) {
        result[i] = embedding[i];
      }
      return result;
    }
    
    return embedding;
  } catch (error) {
    console.warn("Failed to generate real embedding, using mock data:", error);
    // Return mock embedding if API fails
    return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  }
}

// Main seeding function
async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Check if data already exists
    const existingLeads = await db.select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .limit(1);
    
    if (existingLeads[0].count > 0) {
      console.log("⚠️  Database already contains data. Skipping seed to maintain idempotency.");
      console.log(`   Found ${existingLeads[0].count} existing leads.`);
      return;
    }

    const createdLeads: Array<{ id: string; category: LeadCategory }> = [];

    // Generate leads for each category
    for (const category of CATEGORIES) {
      console.log(`\n📝 Creating ${category}s...`);

      for (let i = 0; i < LEADS_PER_CATEGORY; i++) {
        const name = faker.person.fullName();
        const bio = generateBio(category, name);
        
        // Generate embedding from bio
        const embedding = await generateEmbedding(bio);

        const newLead: NewLead = {
          category,
          name,
          email: faker.internet.email({ firstName: name.split(" ")[0], lastName: name.split(" ")[1] }).toLowerCase(),
          bio,
          sourceUrl: generateSourceUrl(category),
          embedding,
        };

        const [insertedLead] = await db.insert(leads).values(newLead).returning({ id: leads.id });
        createdLeads.push({ id: insertedLead.id, category });
        
        console.log(`   ✓ Created ${category}: ${name}`);
      }
    }

    // Create relationships between leads
    console.log("\n🔗 Creating lead relationships...");
    
    // Create some meaningful relationships
    const relationshipTypes = [
      "collaborated_with",
      "mentioned_by",
      "partnered_with",
      "interviewed_by",
      "featured_in",
    ];

    // Create relationships between different categories
    for (let i = 0; i < 10; i++) {
      const lead1 = faker.helpers.arrayElement(createdLeads);
      let lead2 = faker.helpers.arrayElement(createdLeads);
      
      // Ensure we don't create self-relationships
      while (lead2.id === lead1.id) {
        lead2 = faker.helpers.arrayElement(createdLeads);
      }

      const relationshipType = faker.helpers.arrayElement(relationshipTypes);

      await db.insert(leadMetadata).values({
        leadId: lead1.id,
        relatedLeadId: lead2.id,
        relationshipType,
      });

      console.log(`   ✓ ${lead1.category} ${relationshipType} ${lead2.category}`);
    }

    // Final statistics
    const finalCount = await db.select({ 
      leads: sql<number>`count(*)::int`,
    }).from(leads);
    
    const metadataCount = await db.select({ 
      metadata: sql<number>`count(*)::int`,
    }).from(leadMetadata);

    console.log("\n✅ Seeding completed successfully!");
    console.log(`   - ${finalCount[0].leads} leads created`);
    console.log(`   - ${metadataCount[0].metadata} relationships created`);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run the seed function
if (import.meta.main) {
  seed().then(() => process.exit(0));
}