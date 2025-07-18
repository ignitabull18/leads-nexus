'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

type SearchResult = {
  id: string;
  name: string;
  email: string;
  category: string;
  bio: string;
  sourceUrl: string;
  similarity?: number;
};

type RagSearchOptions = {
  includeMemoryContext?: boolean;
  pageSize?: number;
};

export function useRagSearch(options: RagSearchOptions = {}) {
  const [currentQuery, setCurrentQuery] = useState('');
  const [enhancedQuery, setEnhancedQuery] = useState('');
  
  // Use the existing searchLeads endpoint which already has RAG capabilities
  // (vector search + Mem-0 memory context)
  const searchQuery = useQuery({
    ...trpc.leads.searchLeads.queryOptions({
      query: enhancedQuery || currentQuery,
      page: 1,
      pageSize: options.pageSize || 10,
    }),
    enabled: !!currentQuery && currentQuery.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Enhance query with AI for better understanding
  const enhanceQueryMutation = useMutation({
    mutationFn: async (query: string) => {
      // Use the AI endpoint to enhance the query for better search
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a search query optimizer for a leads database. 
                       Convert natural language queries into optimized search terms.
                       Extract key information like: names, companies, skills, categories.
                       Return only the optimized search query, nothing else.
                       Keep it concise and relevant.`
            },
            {
              role: 'user',
              content: `Optimize this search query for finding leads: "${query}"`
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance query');
      }

      // Read the stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let enhancedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          enhancedText += decoder.decode(value);
        }
      }

      // Extract the actual text from the AI response
      // The response might contain data chunks, so we need to parse it
      const lines = enhancedText.split('\n');
      let finalQuery = '';
      
      for (const line of lines) {
        if (line.startsWith('0:')) {
          // This is a data chunk
          const content = line.substring(2).trim();
          if (content && content !== '"\\n"') {
            // Remove quotes and parse the content
            try {
              const parsed = JSON.parse(content);
              if (typeof parsed === 'string') {
                finalQuery += parsed;
              }
            } catch {
              // If parsing fails, just use the content as is
              finalQuery += content.replace(/^"|"$/g, '');
            }
          }
        }
      }

      return finalQuery.trim() || query; // Fallback to original query if enhancement fails
    },
    onSuccess: (enhanced) => {
      setEnhancedQuery(enhanced);
      console.log('Query enhanced:', { original: currentQuery, enhanced });
    },
    onError: (error) => {
      console.error('Failed to enhance query:', error);
      // Fallback to original query
      setEnhancedQuery(currentQuery);
    },
  });

  const searchLeads = async (query: string) => {
    if (!query.trim()) return;
    
    setCurrentQuery(query);
    
    // Try to enhance the query with AI
    try {
      await enhanceQueryMutation.mutateAsync(query);
    } catch {
      // If enhancement fails, proceed with original query
      setEnhancedQuery(query);
    }
  };

  const clearSearch = () => {
    setCurrentQuery('');
    setEnhancedQuery('');
  };

  return {
    // Search results
    results: searchQuery.data?.items || [],
    pagination: searchQuery.data?.pagination,
    memoryContext: searchQuery.data?.memoryContext,
    
    // Query states
    currentQuery,
    enhancedQuery,
    
    // Loading states
    isSearching: searchQuery.isLoading || searchQuery.isFetching,
    isEnhancing: enhanceQueryMutation.isPending,
    
    // Error states
    searchError: searchQuery.error?.message || null,
    
    // Actions
    searchLeads,
    clearSearch,
    refetch: searchQuery.refetch,
  };
}