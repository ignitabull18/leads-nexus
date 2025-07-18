'use client';

import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { useRagSearch } from '../hooks/use-rag-search';

type SearchFormValues = {
  query: string;
};

type SearchResults = {
  items: any[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  memoryContext?: string;
};

export function RagSearchBar({ onSearchResults }: { onSearchResults: (results: SearchResults) => void }) {
  const {
    results,
    pagination,
    memoryContext,
    currentQuery,
    enhancedQuery,
    isSearching,
    isEnhancing,
    searchError,
    searchLeads,
  } = useRagSearch();

  const form = useForm<SearchFormValues>({
    defaultValues: {
      query: '',
    },
    onSubmit: async ({ value }) => {
      if (!value.query.trim()) return;
      await searchLeads(value.query);
    },
  });

  // Update parent component when results change
  if (results.length > 0 && pagination) {
    onSearchResults({
      items: results,
      pagination,
      memoryContext,
    });
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-2"
      >
        <form.Field
          name="query"
          children={(field) => (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  placeholder="Search leads using natural language..." 
                  className="pr-10"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-label="Search query"
                  disabled={isSearching || isEnhancing}
                />
                {isEnhancing && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                  </div>
                )}
              </div>
              <Button 
                type="submit" 
                disabled={isSearching || isEnhancing}
                aria-label="Search"
              >
                {isSearching || isEnhancing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEnhancing ? 'Enhancing...' : 'Searching...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Search
                  </>
                )}
              </Button>
            </div>
          )}
        />
      </form>

      {/* Show query enhancement */}
      {currentQuery && enhancedQuery && currentQuery !== enhancedQuery && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Enhanced to:</span>
          <Badge variant="secondary" className="font-mono">
            {enhancedQuery}
          </Badge>
        </div>
      )}

      {/* Show memory context if available */}
      {memoryContext && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground">
            <Sparkles className="inline h-3 w-3 mr-1" />
            {memoryContext}
          </p>
        </div>
      )}

      {/* Show error if any */}
      {searchError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {searchError}
        </div>
      )}
    </div>
  );
}