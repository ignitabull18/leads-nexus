# Leads Nexus MVP Plan

Below is a detailed plan for building the MVP of "Leads Nexus" – a lead finder tool focused on discovering and managing contact information (e.g., emails, profiles) for influencers, journalists, and publishers. This plan is based on your specified tech stack (Supabase with pgvector, Mem-0 Graph RAG, FireCrawl MCP, deployment on Coolify via Hostinger VPS) and aligns with the project's existing monorepo structure (Next.js web app, tRPC server with Drizzle ORM, etc.). I've incorporated insights from the fetched rules (e.g., always use Supabase MCP for database operations, follow tRPC patterns for APIs, use Drizzle for schema management) and codebase searches (e.g., existing tRPC setup in `apps/server/src/routers/index.ts`, Supabase config in `apps/server/supabase/config.toml`, dashboard-like components in `apps/web/src/app/page.tsx`).

The MVP will focus on core functionality: a dashboard to search for leads by category (influencers, journalists, publishers), view details, and copy info (e.g., emails). We'll keep it simple – no advanced auth or payments yet – and expand later. Estimated timeline: 1-2 weeks for a basic MVP, assuming 20-30 hours of dev time.

---

### **1. MVP Overview**
- **Goal**: A web dashboard where users can search for and export basic lead info (name, email, bio, category, source URL). Data will be populated via web crawling and stored in a vectorized database for intelligent search (e.g., "find journalists covering tech in NYC").
- **Key Features**:
  - Search leads by category, keywords, or natural language (powered by RAG).
  - Display lead details in a card-based UI with copy buttons for emails/URLs.
  - Basic data export (e.g., CSV copy to clipboard).
  - Admin-only data ingestion (crawl and populate leads via FireCrawl).
- **Scope Limitations**:
  - Start with 3 categories: influencers, journalists, publishers.
  - No user auth (use Supabase anon key for now; add later).
  - Manual data refresh (no real-time crawling in MVP).
  - Deploy to Coolify for testing; no mobile/native support yet (focus on web).
- **Success Metrics**: Dashboard loads leads quickly (<2s), accurate search results, basic data population from 100+ sample sources.

---

### **2. High-Level Architecture**
- **Frontend**: Next.js web app (`apps/web/`) with shadcn/ui components. Build on existing pages (e.g., extend `apps/web/src/app/page.tsx` for dashboard, reuse chat UI from `apps/web/src/app/ai/page.tsx` for RAG queries).
- **Backend**: tRPC server (`apps/server/`) with Hono. Use existing routers (`apps/server/src/routers/index.ts`) to add endpoints for search and ingestion.
- **Database**: Supabase (local dev via `apps/server/supabase/config.toml`) with pgvector extension for embeddings. Use Drizzle ORM for schemas/migrations.
- **Data Ingestion**: FireCrawl MCP to scrape websites (e.g., LinkedIn, Twitter, news sites) and extract lead info.
- **RAG/Search**: Mem-0 Graph RAG for querying leads (store graph in Supabase vectors; query via natural language).
- **Deployment**: Coolify on Hostinger VPS to host the web app, server, and Supabase instance.
- **Integrations**:
  - Use Vercel AI SDK (already in `package.json`) for any AI-assisted extraction during crawling.
  - Follow rules: Always use Supabase MCP tools for DB ops; review code structure before/after changes.

Data Flow:
1. Admin triggers crawl → FireCrawl scrapes data → Extract embeddings → Store in Supabase.
2. User searches on dashboard → tRPC queries RAG → Display results.

---

### **3. Database Setup (Using Supabase MCP)**
We'll use Supabase for a scalable, vector-enabled DB. Follow the "database-api" rule: Use Drizzle for schemas, Zod for validation, and transactions for ops.

- **Steps**:
  1. Use `mcp_supabase_create_project` to create a new Supabase project (ask for organization ID; confirm costs via `mcp_supabase_confirm_cost`).
  2. Enable pgvector extension via `mcp_supabase_execute_sql` (e.g., `CREATE EXTENSION IF NOT EXISTS vector;`).
  3. Define schema in `apps/server/src/db/schema.ts` (extend existing if any) using Drizzle:
     - Table: `leads` (id: uuid, category: enum['influencer', 'journalist', 'publisher'], name: text, email: text, bio: text, source_url: text, embedding: vector(1536) – for OpenAI embeddings).
     - Table: `lead_metadata` (for graph edges in RAG, e.g., relationships like "publisher owns journalist").
  4. Generate/migrate via `bun db:generate` and `bun db:migrate` (rules require test DB for integration tests).
  5. Use `mcp_supabase_apply_migration` for any Supabase-specific migrations.
  6. Seed initial data via `mcp_supabase_execute_sql` or Drizzle (e.g., sample leads).

- **Performance/Security**: Add indexes on `category` and `embedding` (use pgvector's HNSW index). Follow rules: Parameterized queries, least privilege.

---

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

---

### **5. Data Ingestion Pipeline**
- **Sources**: Start with public directories (e.g., influencers via Instagram/Twitter APIs, journalists via Muck Rack, publishers via Google News).
- **Process**:
  1. Admin provides seed URLs (e.g., via dashboard form).
  2. Use FireCrawl MCP to scrape content.
  3. Extract entities (name, email, etc.) using AI (Vercel SDK).
  4. Generate embeddings and store in Supabase.
  5. Build Mem-0 graph for RAG (e.g., link journalists to publishers).
- **MVP Scale**: Aim for 500-1000 leads initially. Run ingestion as a one-off script (later automate via cron).

---

### **6. Frontend Dashboard (Next.js Web App)**
Build in `apps/web/src/app/leads/` (new page). Reuse existing components (e.g., from `apps/web/src/components/ui/`).

- **UI Components**:
  - Search bar (natural language input, integrated with RAG via tRPC).
  - Results grid: Cards with lead info (name, category, email copy button using `sonner` for toasts).
  - Admin section: Form to trigger ingestion (conditional render).
- **State Management**: Use TanStack Query (already in `package.json`) for tRPC calls. Build on existing AI chat in `apps/web/src/app/ai/page.tsx` for RAG queries.
- **Steps**:
  1. Create `leads/page.tsx` with search form and results.
  2. Use `useQuery` for fetching (e.g., from `apps/web/src/app/page.tsx`).
  3. Add copy functionality (navigator.clipboard).

- **Design**: Keep it simple with shadcn/ui. Follow rules: React 19 patterns, accessibility.

---

### **7. Deployment (Coolify on Hostinger VPS)**
- **Steps** (using Coolify MCP tools):
  1. Use `mcp_coolify_create_server` to add your Hostinger VPS (provide IP, SSH key UUID from `mcp_coolify_list_private_keys`).
  2. Validate with `mcp_coolify_validate_server`.
  3. Create project/environment via `mcp_coolify_create_application` (point to repo, expose ports 3000/3001).
  4. Deploy Supabase instance as a service (`mcp_coolify_create_service`).
  5. Set up domains/SSL via `mcp_coolify_get_server_domains`.
  6. Monitor with `mcp_coolify_get_server_resources`.

- **Config**: Use env vars for Supabase URL, FireCrawl API key. Disable gzip if SSE issues (per memories).

---

### **8. Testing & Quality Assurance**
- **Unit/Integration**: Test tRPC endpoints (mock Supabase). Use test DB per rules.
- **E2E**: Manual dashboard tests; add Puppeteer later.
- **Rules Compliance**: Use Biome for linting, review structure pre/post-changes. Limit files to <200 lines.
- **Edge Cases**: Empty search, invalid queries, crawling failures.

---

### **9. Risks & Mitigations**
- **Data Privacy**: Scraping may violate terms (e.g., LinkedIn). Mitigate: Use ethical sources, add disclaimers.
- **Costs**: Supabase/pgvector usage; confirm via MCP tools.
- **Dependencies**: If Mem-0/FireCrawl integration issues, fallback to basic PG search.
- **Scalability**: MVP is small; monitor VPS resources via Coolify.

---

### **10. Next Steps & Timeline**
- **Week 1**: Set up Supabase (1 day), define schema/backend (2 days), ingestion pipeline (2 days).
- **Week 2**: Build frontend (2 days), integrate RAG (1 day), deploy/test (2 days).
- **Immediate Actions**: Run `mcp_supabase_list_projects` to check existing setups. If needed, fetch more codebase details (e.g., via `codebase_search` for AI integration).
- **Expansion Ideas**: Add auth (Supabase MCP), mobile support (`apps/native/`), auto-crawling schedules.

This plan is actionable and follows your stack/preferences. If you want to adjust (e.g., add details or start implementing a part), let me know! 