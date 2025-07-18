# Gemini Project Analysis: leads-nexus

This document provides a high-level overview of the `leads-nexus` monorepo, its constituent applications, and the technologies used.

## Project Overview

This is a full-stack, type-safe monorepo managed by **Turborepo** and **Bun**. The project is structured with separate applications for the web frontend, native mobile app, backend server, and documentation. It leverages **tRPC** for end-to-end type-safe API communication between the server and the clients.

**Core Technologies:**
- **Monorepo:** Turborepo, Bun Workspaces
- **Package Manager:** Bun
- **Language:** TypeScript
- **Code Quality:** Biome (linting/formatting), Husky (pre-commit hooks)

## Applications

The `apps` directory contains four distinct applications:

### 1. `apps/server`

The backend API server.

- **Framework:** Hono on Bun
- **API:** tRPC is used to create a type-safe API, with the main router defined in `src/routers/index.ts`.
- **Database:** Drizzle ORM with a PostgreSQL dialect. Drizzle Kit is used for schema migrations.
- **AI:** Includes the Vercel AI SDK for Google (`@ai-sdk/google`) for server-side AI functionality.
- **Key Scripts (run from root):**
  - `bun dev:server`: Starts the server in development mode.
  - `bun db:push`: Pushes schema changes to the database.
  - `bun db:studio`: Opens the Drizzle Studio.

### 2. `apps/web`

The primary web application.

- **Framework:** Next.js 15 (with Turbopack) and React 19
- **Styling:** Tailwind CSS v4, shadcn/ui components (implied by structure), and `lucide-react` for icons.
- **API Communication:** Uses a tRPC client (`@trpc/client`) to communicate with the `server` app, providing type-safe data fetching.
- **State Management:** TanStack Query (`@tanstack/react-query`) for server state management.
- **AI:** Includes the Vercel AI SDK for React (`@ai-sdk/react`).
- **Key Scripts (run from root):**
  - `bun dev:web`: Starts the web application in development mode (defaults to port 3001).

### 3. `apps/native`

A cross-platform mobile application.

- **Framework:** React Native with Expo
- **Routing:** Expo Router for file-based navigation.
- **Styling:** NativeWind v4 (Tailwind CSS for React Native).
- **API Communication:** Also uses a tRPC client to connect to the `server` app.
- **Key Scripts (run from root):**
  - `bun dev:native`: Starts the Expo development server.
  - `bun run:android` / `bun run:ios`: Builds and runs the app on a specific platform.

### 4. `apps/docs`

A static documentation site.

- **Framework:** Astro with the Starlight theme.
- **Purpose:** To house project documentation.
- **Key Scripts:**
  - `cd apps/docs && bun dev`: Starts the documentation site in development mode.

## Global Commands

These commands should be run from the project root directory.

- `bun dev`: Run all applications in development mode.
- `bun build`: Build all applications.
- `bun check`: Run Biome to check and format the entire codebase.
- `bun check-types`: Run TypeScript compiler to check for type errors across the monorepo.
