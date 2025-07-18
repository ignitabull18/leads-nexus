'use client';

import { useState } from 'react';
import { SearchBar } from './search-bar';
import { RagSearchBar } from './rag-search-bar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, Sparkles } from 'lucide-react';

type SearchMode = 'standard' | 'ai-enhanced';

export function SearchModeToggle({ onSearchResults }: { onSearchResults: (results: any) => void }) {
  const [mode, setMode] = useState<SearchMode>('standard');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Search Leads</h2>
        <ToggleGroup 
          type="single" 
          value={mode} 
          onValueChange={(value) => value && setMode(value as SearchMode)}
        >
          <ToggleGroupItem value="standard" aria-label="Standard search">
            <Search className="h-4 w-4 mr-2" />
            Standard
          </ToggleGroupItem>
          <ToggleGroupItem value="ai-enhanced" aria-label="AI-enhanced search">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Enhanced
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {mode === 'standard' ? (
        <SearchBar onSearchResults={onSearchResults} />
      ) : (
        <RagSearchBar onSearchResults={onSearchResults} />
      )}
    </div>
  );
}