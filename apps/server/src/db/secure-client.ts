import { db } from "./index";
import { leads, leadMetadata } from "./schema";
import { eq, sql, and, SQL } from "drizzle-orm";
import type { Lead, NewLead, LeadMetadata, NewLeadMetadata } from "./schema";

// Custom error class for database operations
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// Centralized error handler
function handleDatabaseError(error: any): never {
  // Don't log in test environment
  if (process.env.NODE_ENV !== "test") {
    console.error("Database error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      cause: error.cause,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }

  // Check for nested PostgreSQL error (Drizzle wraps errors)
  const pgError = error.cause || error;
  const errorCode = pgError.code || error.code;
  const errorMessage = error.message || "";
  const errorDetail = pgError.detail || error.detail || "";
  
  // Map common database errors to user-friendly messages
  if (errorCode === "23505" || errorMessage.includes("duplicate key value")) {
    // Unique constraint violation
    if (errorDetail.includes("email") || errorMessage.includes("email")) {
      throw new DatabaseError(
        "This email address is already registered",
        "DUPLICATE_EMAIL",
        409
      );
    }
    throw new DatabaseError(
      "This record already exists",
      "DUPLICATE_RECORD",
      409
    );
  }

  if (errorCode === "23503" || errorMessage.includes("violates foreign key constraint")) {
    // Foreign key violation
    throw new DatabaseError(
      "Referenced record does not exist",
      "INVALID_REFERENCE",
      400
    );
  }

  if (errorCode === "23502" || errorMessage.includes("null value in column")) {
    // Not null violation
    throw new DatabaseError(
      "Required field is missing",
      "MISSING_FIELD",
      400
    );
  }

  if (errorCode === "42501" || errorMessage.includes("permission denied")) {
    // Insufficient privilege
    throw new DatabaseError(
      "You don't have permission to perform this action",
      "UNAUTHORIZED",
      403
    );
  }

  // Generic error
  throw new DatabaseError(
    "An error occurred while processing your request",
    "DATABASE_ERROR",
    500
  );
}

// Secure database client with parameterized queries and error handling
export const secureDb = {
  // Lead operations
  leads: {
    async findAll(userId?: string) {
      try {
        // Note: Supabase pooler doesn't support SET LOCAL
        // RLS should be configured via JWT auth in production
        return await db.select().from(leads);
      } catch (error) {
        handleDatabaseError(error);
      }
    },

    async findById(id: string, userId?: string) {
      try {
        // Note: userId would be used with JWT auth in production

        const result = await db
          .select()
          .from(leads)
          .where(eq(leads.id, id))
          .limit(1);

        if (result.length === 0) {
          throw new DatabaseError(
            "Lead not found",
            "NOT_FOUND",
            404
          );
        }

        return result[0];
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        handleDatabaseError(error);
      }
    },

    async create(data: NewLead, userId?: string) {
      try {
        // Note: userId would be used with JWT auth in production

        const result = await db
          .insert(leads)
          .values(data)
          .returning();

        return result[0];
      } catch (error) {
        handleDatabaseError(error);
      }
    },

    async update(id: string, data: Partial<NewLead>, userId?: string) {
      try {
        // Note: userId would be used with JWT auth in production

        const result = await db
          .update(leads)
          .set(data)
          .where(eq(leads.id, id))
          .returning();

        if (result.length === 0) {
          throw new DatabaseError(
            "Lead not found or you don't have permission to update it",
            "NOT_FOUND",
            404
          );
        }

        return result[0];
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        handleDatabaseError(error);
      }
    },

    async delete(id: string, userId?: string) {
      try {
        // Note: userId would be used with JWT auth in production

        const result = await db
          .delete(leads)
          .where(eq(leads.id, id))
          .returning();

        if (result.length === 0) {
          throw new DatabaseError(
            "Lead not found or you don't have permission to delete it",
            "NOT_FOUND",
            404
          );
        }

        return result[0];
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        handleDatabaseError(error);
      }
    },

    // Vector similarity search with proper parameterization
    async findSimilar(embedding: number[], limit: number = 10, userId?: string) {
      try {
        // Note: userId would be used with JWT auth in production

        // Safely parameterize the vector value
        const vectorString = `[${embedding.join(",")}]`;
        
        const result = await db.execute(sql`
          SELECT 
            id,
            name,
            category,
            email,
            bio,
            source_url,
            embedding <=> ${vectorString}::vector as distance
          FROM leads
          ORDER BY distance
          LIMIT ${limit}
        `);

        return result.rows;
      } catch (error) {
        handleDatabaseError(error);
      }
    },
  },

  // Lead metadata operations
  metadata: {
    async findByLeadId(leadId: string, userId?: string) {
      try {
        // Note: userId would be used with JWT auth in production

        return await db
          .select()
          .from(leadMetadata)
          .where(eq(leadMetadata.leadId, leadId));
      } catch (error) {
        handleDatabaseError(error);
      }
    },

    async create(data: NewLeadMetadata, userId?: string) {
      try {
        // Note: userId would be used with JWT auth in production

        const result = await db
          .insert(leadMetadata)
          .values(data)
          .returning();

        return result[0];
      } catch (error) {
        handleDatabaseError(error);
      }
    },

    async delete(id: string, userId?: string) {
      try {
        // Note: userId would be used with JWT auth in production

        const result = await db
          .delete(leadMetadata)
          .where(eq(leadMetadata.id, id))
          .returning();

        if (result.length === 0) {
          throw new DatabaseError(
            "Metadata not found",
            "NOT_FOUND",
            404
          );
        }

        return result[0];
      } catch (error) {
        if (error instanceof DatabaseError) throw error;
        handleDatabaseError(error);
      }
    },
  },

  // Audit log operations
  audit: {
    async getRecentLogs(limit: number = 100) {
      try {
        const result = await db.execute(sql`
          SELECT 
            id,
            table_name,
            operation,
            user_id,
            record_id,
            created_at
          FROM audit_logs
          ORDER BY created_at DESC
          LIMIT ${limit}
        `);

        return result.rows;
      } catch (error) {
        handleDatabaseError(error);
      }
    },
  },
};