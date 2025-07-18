import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { connectionPool } from "./config";

// Use the secure connection pool
export const db = drizzle(connectionPool, { schema });

// Re-export schema for convenience
export * from "./schema";

