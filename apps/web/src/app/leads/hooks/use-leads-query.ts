'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { useQuery } from '@tanstack/react-query';

type LeadQueryParams = {
  query: string;
  page?: number;
  pageSize?: number;
  category?: string;
};

export function useLeadsQuery(initialParams: LeadQueryParams = { query: '', page: 1, pageSize: 10 }) {
  const [queryParams, setQueryParams] = useState<LeadQueryParams>(initialParams);
  
  // Only run query if we have a search query
  const enabled = !!queryParams.query && queryParams.query.trim().length > 0;
  
  const leadsQuery = useQuery({
    ...trpc.leads.searchLeads.queryOptions({
      query: queryParams.query,
      page: queryParams.page || 1,
      pageSize: queryParams.pageSize || 10,
      ...(queryParams.category && { category: queryParams.category as any })
    }),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const refreshLeads = () => {
    if (enabled) {
      leadsQuery.refetch();
    }
  };

  const updateQueryParams = (newParams: Partial<LeadQueryParams>) => {
    setQueryParams(prev => ({
      ...prev,
      ...newParams
    }));
  };

  return {
    leads: leadsQuery.data?.items || [],
    pagination: leadsQuery.data?.pagination,
    memoryContext: leadsQuery.data?.memoryContext,
    isLoading: leadsQuery.isLoading,
    isFetching: leadsQuery.isFetching,
    isError: leadsQuery.isError,
    error: leadsQuery.error,
    refreshLeads,
    updateQueryParams,
    queryParams,
  };
}