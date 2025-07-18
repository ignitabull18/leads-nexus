'use client';

import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadsQuery } from './hooks/use-leads-query';
import { ResultsGrid } from './components/results-grid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Example implementation using the custom hook
export default function LeadsPageWithHook() {
  const {
    leads,
    pagination,
    memoryContext,
    isLoading,
    isFetching,
    isError,
    error,
    refreshLeads,
    updateQueryParams,
    queryParams,
  } = useLeadsQuery();

  const handleSearch = (query: string) => {
    updateQueryParams({ query });
  };

  const handlePageChange = (page: number) => {
    updateQueryParams({ page });
  };

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold">Leads Dashboard (Hook Example)</h1>
      
      {/* Search section */}
      <div className="search-container">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const query = formData.get('query') as string;
            handleSearch(query);
          }}
          className="flex gap-2"
        >
          <Input
            name="query"
            placeholder="Search leads using natural language..."
            className="flex-1"
            defaultValue={queryParams.query}
          />
          <Button type="submit" disabled={isFetching}>
            {isFetching ? 'Searching...' : 'Search'}
          </Button>
          <Button type="button" variant="outline" onClick={refreshLeads}>
            Refresh
          </Button>
        </form>
      </div>
      
      {/* Memory context display */}
      {memoryContext && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{memoryContext}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Results section */}
      <div className="results-container">
        {isError && (
          <div className="text-red-500">
            Error: {error?.message || 'Failed to fetch leads'}
          </div>
        )}
        
        {isLoading ? (
          <LeadsGridSkeleton />
        ) : (
          <ResultsGrid leads={leads} />
        )}
      </div>
      
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1 || isFetching}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages || isFetching}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function LeadsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array(6).fill(0).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}