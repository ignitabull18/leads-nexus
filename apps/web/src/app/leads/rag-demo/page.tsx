'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RagSearchBar } from '../components/rag-search-bar';
import { ResultsGrid } from '../components/results-grid';
import { Sparkles } from 'lucide-react';

export default function RagDemoPage() {
  const [searchResults, setSearchResults] = useState<any>(null);

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI-Enhanced Leads Search
        </h1>
        <p className="text-muted-foreground">
          Search for leads using natural language. Our AI will enhance your query for better results.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Try these example searches:</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• "Find me AI experts in San Francisco"</li>
            <li>• "Show founders working on climate tech"</li>
            <li>• "I need developers with React and TypeScript experience"</li>
            <li>• "Marketing professionals who worked at startups"</li>
            <li>• "People interested in sustainable technology"</li>
          </ul>
        </CardContent>
      </Card>
      
      {/* RAG-enhanced search */}
      <div className="search-container">
        <RagSearchBar onSearchResults={setSearchResults} />
      </div>
      
      {/* Results */}
      {searchResults && (
        <div className="results-container space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Search Results</h2>
            {searchResults.pagination && (
              <span className="text-sm text-muted-foreground">
                Found {searchResults.pagination.totalItems} leads
              </span>
            )}
          </div>
          
          <ResultsGrid leads={searchResults.items || []} />
          
          {/* Pagination could be added here */}
        </div>
      )}
    </div>
  );
}