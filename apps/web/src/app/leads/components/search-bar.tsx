'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

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

export function SearchBar({ onSearchResults }: { onSearchResults: (results: SearchResults) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const form = useForm<SearchFormValues>({
    defaultValues: {
      query: '',
    },
    onSubmit: async ({ value }) => {
      if (!value.query.trim()) return;
      setSearchQuery(value.query);
    },
  });

  // Use TanStack Query with tRPC
  const searchQuery$ = useQuery({
    ...trpc.leads.searchLeads.queryOptions({
      query: searchQuery,
      page: 1,
      pageSize: 10,
    }),
    enabled: !!searchQuery && searchQuery.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      onSearchResults(data);
      
      if (data.memoryContext) {
        console.log('Memory context:', data.memoryContext);
      }
    },
    onError: (error) => {
      console.error('Search error:', error);
      toast.error('Failed to search leads. Please try again.');
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="query"
        children={(field) => (
          <div className="flex gap-2">
            <Input 
              placeholder="Search leads using natural language..." 
              className="flex-1"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-label="Search query"
            />
            <Button 
              type="submit" 
              disabled={searchQuery$.isFetching}
              aria-label="Search"
            >
              {searchQuery$.isFetching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        )}
      />
    </form>
  );
}