'use client';

import { Suspense, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { SearchBar } from '../components/search-bar';
import { ResultsGrid } from '../components/results-grid';
import { AdminSection } from '../components/admin-section';
import { useAdminAccess } from '../hooks/use-admin-access';

export default function LeadsDemoPage() {
  const [searchResults, setSearchResults] = useState<any>(null);
  const { isAuthenticated, hasAdminAccess, user } = useAdminAccess();

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Leads Dashboard Demo</h1>
        
        {/* Demo info card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              Demo Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={isAuthenticated ? "default" : "secondary"}>
                {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </div>
            {user && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Role:</span>
                  <Badge variant={hasAdminAccess ? "default" : "outline"}>
                    {user.role || 'user'}
                  </Badge>
                </div>
                {user.permissions && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Permissions:</span>
                    <div className="flex gap-1">
                      {user.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Use the login/logout buttons in the Admin section below to test different user roles
            </p>
          </CardContent>
        </Card>
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
      
      {/* Admin section with permission-based rendering */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Admin Area</h2>
        <AdminSection />
      </div>
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