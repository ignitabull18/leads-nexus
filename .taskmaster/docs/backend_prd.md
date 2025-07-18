### **4. Backend Implementation (tRPC Server)**
Build on existing setup in `apps/server/src/routers/index.ts` and `apps/server/src/index.ts`. Use public procedures for MVP (add auth later).

- **New tRPC Endpoints** (in `apps/server/src/routers/leads.ts`):
  - `searchLeads`: Input (query: string, category?: enum). Use Mem-0 Graph RAG to query Supabase vectors (e.g., cosine similarity search). Return paginated leads (follow "database-api" pagination rule).
  - `ingestLeads`: Protected procedure. Input (urls: string[]). Call FireCrawl to scrape, extract info (use AI for entity recognition), generate embeddings (via OpenAI/Google API in `package.json`), store in Supabase via Drizzle.
  - `getLead`: Input (id: uuid). Fetch single lead details.

- **Integrations**:
  - **FireCrawl**: Use MCP tools like `mcp_firecrawl_crawl` (if available; otherwise, integrate via SDK). Crawl sources like influencer directories or news sites.
  - **Mem-0 Graph RAG**: Install Mem-0 SDK (open-source). On ingestion, build graph (nodes: leads, edges: relationships). Query via natural language (e.g., integrate with existing AI stream in `apps/server/src/index.ts`).
  - Validation: Use Zod schemas (per rules). Error handling: Structured responses with logging.

- **Steps**: Extend `appRouter` to include new router. Test with `bun dev`. 