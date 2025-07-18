import { Pool } from "pg";
import { config } from "dotenv";

config();

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Parse DATABASE_URL to extract components
const databaseUrl = new URL(process.env.DATABASE_URL!);

// Create connection pool with SSL configuration
// Supabase pooler requires specific SSL settings
export const connectionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase pooler
    // Supabase pooler uses self-signed certificates
  },
  // Connection pool settings for better performance and security
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout after 10 seconds if connection cannot be established
});

// Log connection info (without sensitive data)
console.log(`🔒 Database connection configured with SSL to ${databaseUrl.hostname}`);

// Handle pool errors
connectionPool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
  // Don't expose full error details in production
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing database pool...");
  await connectionPool.end();
});