'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Upload, Plus, Trash2 } from 'lucide-react';

type IngestionFormValues = {
  urls: string[];
};

export function AdminIngestionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const form = useForm<IngestionFormValues>({
    defaultValues: {
      urls: [''],
    },
    onSubmit: async ({ value }) => {
      // Filter out empty URLs
      const validUrls = value.urls.filter(url => url.trim() !== '');
      
      if (validUrls.length === 0) {
        toast.error('Please enter at least one URL');
        return;
      }
      
      // Validate URLs
      const invalidUrls = validUrls.filter(url => {
        try {
          new URL(url);
          return false;
        } catch {
          return true;
        }
      });
      
      if (invalidUrls.length > 0) {
        toast.error('Please enter valid URLs');
        return;
      }
      
      setIsProcessing(true);
      ingestionMutation.mutate({ urls: validUrls });
    },
  });

  const ingestionMutation = useMutation({
    mutationFn: async ({ urls }: { urls: string[] }) => {
      const result = await trpc.leads.ingestLeads.mutate({ urls });
      return result;
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      form.reset();
      
      // Show results
      const successCount = data.results.length;
      const errorCount = data.errors.length;
      
      if (successCount > 0) {
        toast.success(`Successfully ingested ${successCount} lead${successCount > 1 ? 's' : ''}`);
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to ingest ${errorCount} URL${errorCount > 1 ? 's' : ''}`);
        console.error('Ingestion errors:', data.errors);
      }
      
      onSuccess?.();
    },
    onError: (error) => {
      setIsProcessing(false);
      toast.error(`Ingestion failed: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Lead Data Ingestion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-4">
            <Label>Source URLs</Label>
            <form.Field
              name="urls"
              mode="array"
              children={(field) => (
                <div className="space-y-2">
                  {field.state.value.map((_, index) => (
                    <form.Field
                      key={index}
                      name={`urls[${index}]`}
                      children={(urlField) => (
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://example.com/leads"
                            value={urlField.state.value}
                            onChange={(e) => urlField.handleChange(e.target.value)}
                            onBlur={urlField.handleBlur}
                            disabled={isProcessing}
                            aria-label={`URL ${index + 1}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newUrls = [...field.state.value];
                              newUrls.splice(index, 1);
                              field.handleChange(newUrls.length === 0 ? [''] : newUrls);
                            }}
                            disabled={isProcessing || field.state.value.length === 1}
                            aria-label={`Remove URL ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    />
                  ))}
                  
                  {field.state.value.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        field.handleChange([...field.state.value, '']);
                      }}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another URL
                    </Button>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Enter up to 10 URLs to scrape and ingest lead data from
                  </p>
                </div>
              )}
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Start Ingestion
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}