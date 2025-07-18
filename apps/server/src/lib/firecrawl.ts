import FirecrawlApp from '@mendable/firecrawl-js';

// Initialize Firecrawl client
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY || '',
});

export interface ScrapedContent {
  url: string;
  title?: string;
  content: string;
  markdown?: string;
  metadata?: Record<string, any>;
}

export const firecrawlService = {
  /**
   * Scrape a single URL and extract its content
   */
  async scrapeUrl(url: string): Promise<ScrapedContent> {
    if (!process.env.FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }

    try {
      const result = await firecrawl.scrapeUrl(url, {
        formats: ['markdown', 'html'],
      });

      if (!result.success) {
        throw new Error(`Failed to scrape URL: ${result.error || 'Unknown error'}`);
      }

      return {
        url,
        title: result.metadata?.title,
        content: result.markdown || '',
        markdown: result.markdown,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error('FireCrawl scraping error:', error);
      throw new Error(`Failed to scrape URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Scrape multiple URLs in batch
   */
  async scrapeUrls(urls: string[]): Promise<ScrapedContent[]> {
    if (!process.env.FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set');
    }

    const results: ScrapedContent[] = [];
    
    // Process URLs in parallel with a concurrency limit
    const concurrencyLimit = 3;
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
      const batch = urls.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.allSettled(
        batch.map(url => this.scrapeUrl(url))
      );
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to scrape ${batch[j]}:`, result.reason);
          // Continue processing other URLs even if one fails
        }
      }
    }
    
    return results;
  },
};