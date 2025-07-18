# Section 1: MVP Overview

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