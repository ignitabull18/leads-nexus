'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

type Lead = {
  id: string;
  name: string;
  email: string;
  category: string;
  bio: string;
  sourceUrl: string;
  similarity?: number;
};

export function ResultsGrid({ leads }: { leads: Lead[] }) {
  if (!leads.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No leads found. Try a different search query.</p>
      </div>
    );
  }

  const copyToClipboard = async (text: string, leadName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Email for ${leadName} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy email');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {leads.map((lead) => (
        <Card key={lead.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-start justify-between">
              <span className="line-clamp-1">{lead.name}</span>
              {lead.similarity && (
                <span className="text-xs text-muted-foreground ml-2">
                  {(lead.similarity * 100).toFixed(0)}%
                </span>
              )}
            </CardTitle>
            <p className="text-sm font-medium capitalize text-muted-foreground">
              {lead.category}
            </p>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground mb-2">{lead.email}</p>
            <p className="text-sm line-clamp-3">{lead.bio}</p>
            {lead.sourceUrl && (
              <a 
                href={lead.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-blue-500 hover:underline mt-2 inline-block"
              >
                View source
              </a>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => copyToClipboard(lead.email, lead.name)}
              className="w-full"
              aria-label={`Copy ${lead.name}'s email`}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Email
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}