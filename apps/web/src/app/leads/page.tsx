'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Sparkles, 
  Users, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { SearchModeToggle } from './components/search-mode-toggle';
import { ResultsGrid } from './components/results-grid';
import { AdminSection } from './components/admin-section';
import { useLeadsQuery } from './hooks/use-leads-query';

type FilterCategory = 'all' | 'founder' | 'developer' | 'designer' | 'marketer' | 'other';

export default function LeadsPage() {
  // State management
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [displayLeads, setDisplayLeads] = useState<any[]>([]);
  
  // Use the leads query hook
  const {
    leads,
    pagination,
    memoryContext,
    isLoading,
    isFetching,
    updateQueryParams,
    queryParams,
  } = useLeadsQuery();

  // Update display leads when search results come in
  const handleSearchResults = useCallback((results: any) => {
    if (results?.items) {
      setDisplayLeads(results.items);
    }
  }, []);

  // Filter leads based on category
  const filteredLeads = activeFilter === 'all' 
    ? (displayLeads.length > 0 ? displayLeads : leads)
    : (displayLeads.length > 0 ? displayLeads : leads).filter((lead: any) => lead.category === activeFilter);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    updateQueryParams({ page: newPage });
    document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (pagination && pagination.page > 1) {
            handlePageChange(pagination.page - 1);
          }
          break;
        case 'ArrowRight':
          if (pagination && pagination.page < pagination.totalPages) {
            handlePageChange(pagination.page + 1);
          }
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[aria-label="Search query"]')?.focus();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pagination]);

  const filters: { value: FilterCategory; label: string; count?: number }[] = [
    { value: 'all', label: 'All Categories', count: filteredLeads.length },
    { value: 'founder', label: 'Founders' },
    { value: 'developer', label: 'Developers' },
    { value: 'designer', label: 'Designers' },
    { value: 'marketer', label: 'Marketers' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Leads Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Discover and manage your network of potential leads
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {filteredLeads.length} leads
              </Badge>
            </div>
          </div>
        </header>

        {/* Search Section */}
        <section 
          className="space-y-4"
          role="search"
          aria-label="Lead search"
        >
          <SearchModeToggle onSearchResults={handleSearchResults} />
          
          {/* Memory Context Display */}
          {memoryContext && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-sm flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                  <span>{memoryContext}</span>
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Filters */}
        <section aria-label="Category filters">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Button
                key={filter.value}
                variant={activeFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter.value)}
                aria-pressed={activeFilter === filter.value}
                className="gap-1"
              >
                <Filter className="h-3 w-3" />
                {filter.label}
                {filter.count !== undefined && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    {filter.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </section>

        {/* Results Section */}
        <section 
          id="results-section"
          className="space-y-4"
          aria-label="Search results"
          aria-live="polite"
          aria-busy={isLoading || isFetching}
        >
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {queryParams.query ? 'Search Results' : 'All Leads'}
            </h2>
            {pagination && pagination.totalItems > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1}-
                {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} results
              </p>
            )}
          </div>

          {/* Results Grid */}
          {isLoading ? (
            <LeadsGridSkeleton />
          ) : filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No leads found</h3>
                <p className="text-muted-foreground">
                  {queryParams.query 
                    ? 'Try adjusting your search query or filters'
                    : 'Start by searching for leads or adding new ones'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ResultsGrid leads={filteredLeads} />
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <nav 
              className="flex justify-center items-center gap-4"
              aria-label="Pagination"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || isFetching}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || isFetching}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </nav>
          )}
        </section>

        {/* Admin Section */}
        <section 
          className="pt-8 border-t"
          aria-label="Administration"
        >
          <AdminSection />
        </section>

        {/* Loading Overlay */}
        {isFetching && (
          <div 
            className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50"
            role="status"
            aria-label="Loading results"
          >
            <div className="bg-background border rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading results...</span>
            </div>
          </div>
        )}
      </div>

      {/* Skip to content link for accessibility */}
      <a 
        href="#results-section"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-background px-4 py-2 rounded-md border"
      >
        Skip to results
      </a>
    </div>
  );
}

function LeadsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array(6).fill(0).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}