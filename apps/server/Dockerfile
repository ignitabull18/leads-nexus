FROM oven/bun:1 as base
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY apps/server/package.json ./apps/server/
COPY packages/*/package.json ./packages/*/

# Install dependencies including SQLite build tools
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN cd apps/server && bun run build

# Production stage
FROM oven/bun:1 as runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies for SQLite
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 server

# Copy built application
COPY --from=base --chown=server:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=base --chown=server:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=base --chown=server:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=server:nodejs /app/package.json ./package.json

# Create data directory for Mem0
RUN mkdir -p /app/data && chown -R server:nodejs /app/data

USER server

EXPOSE 4000

CMD ["bun", "run", "--cwd", "apps/server", "start"]