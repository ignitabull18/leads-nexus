'use client';

import { Suspense, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff } from 'lucide-react';
import { SearchBar } from './components/search-bar';
import { ResultsGrid } from './components/results-grid';
import { AdminIngestionForm } from './components/admin-ingestion-form';
import { useAdminPermission } from './hooks/use-admin-permission';

export default function LeadsPageWithPermissions() {
  const [searchResults, setSearchResults] = useState<any>(null);
  const { isAdmin, isLoading: isLoadingPermission, toggleAdminMode } = useAdminPermission();

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leads Dashboard</h1>
        
        {/* Demo admin toggle - remove in production */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAdminMode}
          disabled={isLoadingPermission}
        >
          {isAdmin ? (
            <>
              <ShieldOff className="h-4 w-4 mr-2" />
              Exit Admin Mode
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Enter Admin Mode
            </>
          )}
        </Button>
      </div>
      
      {/* Search section */}
      <div className="search-container">
        <SearchBar onSearchResults={setSearchResults} />
      </div>
      
      {/* Results grid */}
      <div className="results-container">
        <Suspense fallback={<LeadsGridSkeleton />}>
          {searchResults && (
            <ResultsGrid leads={searchResults.items || []} />
          )}
        </Suspense>
      </div>
      
      {/* Admin section (permission-based) */}
      {!isLoadingPermission && isAdmin && (
        <div className="admin-section space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Admin Controls</span>
          </div>
          
          <AdminIngestionForm 
            onSuccess={() => {
              // Optionally refresh search results after successful ingestion
              console.log('Ingestion completed successfully');
            }}
          />
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