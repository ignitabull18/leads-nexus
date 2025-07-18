import { publicProcedure, router } from '../lib/trpc';
import { z } from 'zod';
import { db } from '../db';
import { leads, leadCategorySchema } from '../db/schema';
import type { NewLead } from '../db/schema';
import { embeddingsService } from '../lib/embeddings';
import { firecrawlService } from '../lib/firecrawl';
import { entityExtractionService } from '../lib/entity-extraction';
import { mem0Service } from '../lib/mem0';
import { sql, eq, and, SQL } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const leadsRouter = router({
  searchLeads: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(1000),
      category: leadCategorySchema.optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(10)
    }))
    .query(async ({ input }) => {
      try {
        const { query, category, page, pageSize } = input;
        
        // Generate embedding for the search query
        const embedding = await embeddingsService.generateEmbedding(query);
        
        // Build WHERE conditions
        const conditions: SQL[] = [];
        if (category) {
          conditions.push(eq(leads.category, category));
        }
        
        // Build the main query with vector similarity search
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        
        // Create vector similarity expression
        const vectorSimilarity = sql`1 - (${leads.embedding} <=> ${JSON.stringify(embedding)}::vector)`;
        
        // Execute search query with pagination
        const searchResults = await db
          .select({
            id: leads.id,
            category: leads.category,
            name: leads.name,
            email: leads.email,
            bio: leads.bio,
            sourceUrl: leads.sourceUrl,
            similarity: vectorSimilarity,
          })
          .from(leads)
          .where(whereClause)
          .orderBy(sql`${leads.embedding} <=> ${JSON.stringify(embedding)}::vector`)
          .limit(pageSize)
          .offset((page - 1) * pageSize);
        
        // Enhance results with memory context
        const leadIds = searchResults.map(lead => lead.id);
        let memoryContext = '';
        
        if (leadIds.length > 0) {
          try {
            memoryContext = await mem0Service.getEnhancedSearchContext(query, leadIds);
          } catch (error) {
            console.error('Failed to get memory context:', error);
            // Continue without memory enhancement
          }
        }
        
        // Get total count for pagination
        const countResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(leads)
          .where(whereClause);
        
        const totalItems = countResult[0]?.count || 0;
        const totalPages = Math.ceil(totalItems / pageSize);
        
        return {
          items: searchResults,
          pagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
          memoryContext: memoryContext || undefined,
        };
      } catch (error) {
        console.error('Search leads error:', error);
        
        if (error instanceof Error && error.message.includes('GOOGLE_GENERATIVE_AI_API_KEY')) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Embedding service is not properly configured. Please set GOOGLE_GENERATIVE_AI_API_KEY environment variable.',
          });
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search leads',
        });
      }
    }),

  ingestLeads: publicProcedure
    .input(z.object({
      urls: z.array(z.string().url()).min(1).max(10),
    }))
    .mutation(async ({ input }) => {
      const { urls } = input;
      const results: any[] = [];
      const errors: Array<{ url: string; error: string }> = [];

      try {
        // Process each URL
        for (const url of urls) {
          try {
            console.log(`Processing URL: ${url}`);
            
            // Step 1: Scrape the URL using FireCrawl
            const scrapedContent = await firecrawlService.scrapeUrl(url);
            
            // Step 2: Extract lead information using AI
            const extractedLead = await entityExtractionService.extractLeadFromContent(
              scrapedContent.content,
              url
            );
            
            if (!extractedLead) {
              errors.push({ url, error: 'No lead information found on this page' });
              continue;
            }
            
            // Step 3: Check if lead already exists by email
            if (extractedLead.email) {
              const existingLead = await db
                .select()
                .from(leads)
                .where(eq(leads.email, extractedLead.email))
                .limit(1);
              
              if (existingLead.length > 0) {
                errors.push({ url, error: `Lead with email ${extractedLead.email} already exists` });
                continue;
              }
            }
            
            // Step 4: Generate embedding for the lead
            const embeddingText = entityExtractionService.generateEmbeddingText(extractedLead);
            const embedding = await embeddingsService.generateEmbedding(embeddingText);
            
            // Step 5: Prepare lead data for insertion
            const leadData: NewLead = {
              name: extractedLead.name,
              email: extractedLead.email || `${extractedLead.name.toLowerCase().replace(/\s+/g, '.')}@unknown.com`,
              bio: extractedLead.bio,
              category: extractedLead.category,
              sourceUrl: url,
              embedding: embedding,
            };
            
            // Step 6: Insert into database
            const [insertedLead] = await db
              .insert(leads)
              .values(leadData)
              .returning();
            
            results.push({
              ...insertedLead,
              extractedData: {
                organization: extractedLead.organization,
                location: extractedLead.location,
                expertise: extractedLead.expertise,
                socialLinks: extractedLead.socialLinks,
              },
            });
            
            // Store in Mem0 for enhanced memory capabilities
            try {
              const additionalContext = [
                extractedLead.organization && `Organization: ${extractedLead.organization}`,
                extractedLead.location && `Location: ${extractedLead.location}`,
                extractedLead.expertise && extractedLead.expertise.length > 0 && `Expertise: ${extractedLead.expertise.join(', ')}`,
                extractedLead.socialLinks && extractedLead.socialLinks.length > 0 && `Social profiles: ${extractedLead.socialLinks.map(link => link.platform).join(', ')}`,
              ].filter(Boolean).join('\n');
              
              await mem0Service.addLeadMemory(insertedLead, additionalContext);
              console.log(`Stored memory for lead: ${extractedLead.name}`);
            } catch (memError) {
              console.error(`Failed to store memory for lead ${extractedLead.name}:`, memError);
              // Continue even if memory storage fails
            }
            
            console.log(`Successfully ingested lead: ${extractedLead.name}`);
            
          } catch (error) {
            console.error(`Error processing URL ${url}:`, error);
            errors.push({ 
              url, 
              error: error instanceof Error ? error.message : 'Unknown error occurred' 
            });
          }
        }
        
        return {
          success: results.length > 0,
          processed: urls.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors,
        };
        
      } catch (error) {
        console.error('Ingest leads error:', error);
        
        if (error instanceof Error && error.message.includes('FIRECRAWL_API_KEY')) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'FireCrawl service is not properly configured. Please set FIRECRAWL_API_KEY environment variable.',
          });
        }
        
        if (error instanceof Error && error.message.includes('GOOGLE_GENERATIVE_AI_API_KEY')) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service is not properly configured. Please set GOOGLE_GENERATIVE_AI_API_KEY environment variable.',
          });
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to ingest leads',
        });
      }
    }),

  queryKnowledgeGraph: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(1000),
      maxDepth: z.number().int().positive().max(5).optional(),
      leadCategory: leadCategorySchema.optional(),
    }))
    .query(async ({ input }) => {
      const { query, maxDepth, leadCategory } = input;

      try {
        // Query the knowledge graph using Mem0
        const graphData = await mem0Service.queryKnowledgeGraph(query, {
          maxDepth,
          leadCategory,
        });

        return {
          nodes: graphData.nodes,
          edges: graphData.edges,
          query,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Knowledge graph query error:', error);
        
        if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Memory service is not properly configured. Please set OPENAI_API_KEY environment variable.',
          });
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to query knowledge graph',
        });
      }
    }),

  addLeadRelationship: publicProcedure
    .input(z.object({
      leadId1: z.string().uuid(),
      leadId2: z.string().uuid(),
      relationshipType: z.string().min(1).max(100),
    }))
    .mutation(async ({ input }) => {
      const { leadId1, leadId2, relationshipType } = input;

      try {
        // Verify both leads exist
        const [lead1, lead2] = await Promise.all([
          db.select().from(leads).where(eq(leads.id, leadId1)).limit(1),
          db.select().from(leads).where(eq(leads.id, leadId2)).limit(1),
        ]);

        if (lead1.length === 0 || lead2.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'One or both leads not found',
          });
        }

        // Store the relationship in Mem0
        await mem0Service.addLeadRelationship(leadId1, leadId2, relationshipType);

        return {
          success: true,
          leadId1,
          leadId2,
          relationshipType,
          message: `Relationship '${relationshipType}' established between leads`,
        };
      } catch (error) {
        console.error('Add relationship error:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add lead relationship',
        });
      }
    }),

  getLead: publicProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .query(async ({ input }) => {
      const { id } = input;
      
      try {
        const lead = await db.select()
          .from(leads)
          .where(eq(leads.id, id))
          .limit(1);
        
        if (!lead.length) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Lead with ID ${id} not found`
          });
        }
        
        // Optionally enhance with memory context
        let memoryContext: any[] = [];
        try {
          memoryContext = await mem0Service.getLeadMemories(id);
        } catch (error) {
          console.error('Failed to fetch lead memories:', error);
          // Continue without memory context
        }
        
        return {
          ...lead[0],
          memories: memoryContext
        };
      } catch (error) {
        // Log the error
        console.error('Error fetching lead:', error);
        
        // Rethrow as TRPCError if not already
        if (!(error instanceof TRPCError)) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch lead details'
          });
        }
        throw error;
      }
    }),
});