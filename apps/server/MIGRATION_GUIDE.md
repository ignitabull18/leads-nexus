# Database Migration Guide

## Overview

This project uses Drizzle ORM for database schema management and Supabase for the PostgreSQL database with pgvector extension.

## Migration Workflow

### 1. Schema Definition
- Database schema is defined in `src/db/schema.ts`
- Uses Drizzle ORM with PostgreSQL dialect
- Includes custom vector type for pgvector support

### 2. Generate Migrations
```bash
bun run db:generate
```
This command generates SQL migration files in `src/db/migrations/`

### 3. Apply Migrations

For production migrations, use the Supabase MCP server:
```typescript
// Using Supabase MCP
mcp__supabase__apply_migration({
  project_id: "your-project-id",
  name: "migration_name",
  query: "SQL migration content"
})
```

For local development:
```bash
bun run db:migrate
```

### 4. Verify Migrations
- Check table structure in Supabase dashboard
- Run the pgvector check script: `bun run db:check-pgvector`
- Test constraints and indexes with sample data

## Database Structure

### Tables
1. **leads**
   - id (uuid, primary key)
   - category (enum: influencer, journalist, publisher)
   - name (text)
   - email (text, unique)
   - bio (text)
   - source_url (text)
   - embedding (vector 1536)

2. **lead_metadata**
   - id (uuid, primary key)
   - lead_id (uuid, FK to leads.id)
   - related_lead_id (uuid, FK to leads.id)
   - relationship_type (text)

### Indexes
- `idx_leads_category` - B-tree index on category
- `idx_leads_embedding` - HNSW index for vector similarity search
- `leads_email_unique` - Unique constraint on email

### Key Features
- pgvector extension for AI embeddings
- Cascade delete on foreign keys
- Enum type for lead categories
- HNSW index for efficient vector search

## Best Practices
1. Always review generated migrations before applying
2. Test migrations on a development database first
3. Use Supabase MCP for production migrations
4. Keep migration files in version control
5. Document any manual SQL changes