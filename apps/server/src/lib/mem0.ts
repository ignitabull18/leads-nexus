import { Memory } from 'mem0ai/oss';
import type { Lead } from '../db/schema';

// Initialize Memory with configuration
const memory = new Memory({
  version: 'v1.1',
  embedder: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'text-embedding-3-small',
    },
  },
  vectorStore: {
    provider: 'memory',
    config: {
      collectionName: 'lead_memories',
      dimension: 1536,
    },
  },
  llm: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo-preview',
    },
  },
  historyDbPath: './data/memory.db',
});

export interface MemoryMetadata {
  leadId: string;
  category: string;
  sourceUrl?: string;
  timestamp: string;
}

export interface LeadMemory {
  id: string;
  memory: string;
  metadata: MemoryMetadata;
  createdAt: string;
}

class Mem0Service {
  /**
   * Store a memory about a lead
   */
  async addLeadMemory(lead: Lead, additionalContext?: string): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `Lead Information:
Name: ${lead.name}
Category: ${lead.category}
Bio: ${lead.bio}
Source: ${lead.sourceUrl}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}`
      }
    ];

    const result = await memory.add(messages, { 
      userId: lead.id,
      metadata: {
        leadId: lead.id,
        category: lead.category,
        sourceUrl: lead.sourceUrl,
        timestamp: new Date().toISOString(),
      } as MemoryMetadata
    });

    return (result as any).memory || 'Memory stored successfully';
  }

  /**
   * Add relationship between leads
   */
  async addLeadRelationship(leadId1: string, leadId2: string, relationshipType: string): Promise<void> {
    const messages = [
      {
        role: 'system' as const,
        content: `Relationship established: Lead ${leadId1} is connected to Lead ${leadId2} via ${relationshipType}`
      }
    ];

    await memory.add(messages, {
      userId: leadId1,
      metadata: {
        leadId: leadId1,
        relatedLeadId: leadId2,
        relationshipType,
        category: 'relationship',
        timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * Search memories related to a query
   */
  async searchMemories(query: string, options?: { 
    userId?: string; 
    limit?: number;
    category?: string;
  }): Promise<LeadMemory[]> {
    const searchOptions: any = {
      userId: options?.userId,
      limit: options?.limit || 10,
    };

    // Add metadata filter if category is specified
    if (options?.category) {
      searchOptions.filters = {
        metadata: {
          category: options.category
        }
      };
    }

    const results = await memory.search(query, searchOptions);
    
    // Handle the response as an array
    const resultsArray = Array.isArray(results) ? results : (results as any).results || [];
    
    return resultsArray.map((result: any) => ({
      id: result.id,
      memory: result.memory,
      metadata: result.metadata as MemoryMetadata,
      createdAt: result.created_at,
    }));
  }

  /**
   * Get all memories for a specific lead
   */
  async getLeadMemories(leadId: string): Promise<LeadMemory[]> {
    const results = await memory.getAll({ userId: leadId });
    
    // Handle the response as an array
    const resultsArray = Array.isArray(results) ? results : (results as any).results || [];
    
    return resultsArray.map((result: any) => ({
      id: result.id,
      memory: result.memory,
      metadata: result.metadata as MemoryMetadata,
      createdAt: result.created_at,
    }));
  }

  /**
   * Update a memory
   */
  async updateMemory(memoryId: string, newContent: string): Promise<void> {
    await memory.update(memoryId, newContent);
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(memoryId: string): Promise<void> {
    await memory.delete(memoryId);
  }

  /**
   * Delete all memories for a lead
   */
  async deleteLeadMemories(leadId: string): Promise<void> {
    await memory.deleteAll({ userId: leadId });
  }

  /**
   * Get memory-enhanced context for a lead search
   */
  async getEnhancedSearchContext(query: string, leadIds: string[]): Promise<string> {
    const relevantMemories: LeadMemory[] = [];
    
    // Search for relevant memories across provided leads
    for (const leadId of leadIds) {
      const memories = await this.searchMemories(query, { 
        userId: leadId, 
        limit: 3 
      });
      relevantMemories.push(...memories);
    }

    if (relevantMemories.length === 0) {
      return '';
    }

    // Format memories into context
    const context = relevantMemories
      .map(mem => `- ${mem.memory} (Lead: ${mem.metadata.leadId})`)
      .join('\n');

    return `Related context from memory:\n${context}`;
  }

  /**
   * Build a knowledge graph query
   */
  async queryKnowledgeGraph(query: string, options?: {
    maxDepth?: number;
    leadCategory?: string;
  }): Promise<any> {
    // This would integrate with a graph database in a full implementation
    // For now, we'll use memory search with relationship filtering
    const searchOptions: any = {
      limit: 20,
    };

    if (options?.leadCategory) {
      searchOptions.filters = {
        metadata: {
          category: options.leadCategory
        }
      };
    }

    const results = await memory.search(query, searchOptions);
    
    // Handle the response as an array
    const resultsArray = Array.isArray(results) ? results : (results as any).results || [];
    
    // Process results to build graph-like structure
    const graph = {
      nodes: new Map<string, any>(),
      edges: [] as any[],
    };

    for (const result of resultsArray) {
      const metadata = (result as any).metadata as any;
      
      // Add node
      if (!graph.nodes.has(metadata.leadId)) {
        graph.nodes.set(metadata.leadId, {
          id: metadata.leadId,
          category: metadata.category,
          memories: []
        });
      }
      
      graph.nodes.get(metadata.leadId).memories.push((result as any).memory);
      
      // Add edge if it's a relationship
      if (metadata.relationshipType && metadata.relatedLeadId) {
        graph.edges.push({
          source: metadata.leadId,
          target: metadata.relatedLeadId,
          type: metadata.relationshipType,
        });
      }
    }

    return {
      nodes: Array.from(graph.nodes.values()),
      edges: graph.edges,
    };
  }
}

export const mem0Service = new Mem0Service();