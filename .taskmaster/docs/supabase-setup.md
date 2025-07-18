# Supabase Project Setup

This document outlines the setup process for the Supabase project used in the `leads-nexus` application.

## Project Details

- **Project Name:** leads-nexus
- **Project Ref:** iqjkzbdtixnxtmkqtvax
- **Organization:** Ignitabull (zlltyymqpifetmnslsvm)
- **Region:** US East 1 (North Virginia)
- **Dashboard URL:** [https://supabase.com/dashboard/project/iqjkzbdtixnxtmkqtvax](https://supabase.com/dashboard/project/iqjkzbdtixnxtmkqtvax)

## Environment Variables

The following environment variables have been configured in the `.env` files for each application (`server`, `web`, `native`).

### Server (`apps/server/.env.example`)

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
DATABASE_URL=
```

### Web (`apps/web/.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Native (`apps/native/.env.example`)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
``` 