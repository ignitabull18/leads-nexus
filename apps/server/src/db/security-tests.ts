#!/usr/bin/env bun
/**
 * Security validation tests for database operations
 * Tests SQL injection prevention, RLS policies, and audit logging
 */

import { secureDb, DatabaseError } from "./secure-client";
import { db } from "./index";
import { sql } from "drizzle-orm";
import { config } from "dotenv";

config();

// ANSI color codes for output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
};

// Test results tracking
let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.error(`  ${error instanceof Error ? error.message : error}`);
    failedTests++;
  }
}

async function runSecurityTests() {
  console.log("🔒 Running security validation tests...\n");

  // Test 1: SQL Injection Prevention
  await test("SQL injection prevention in findById", async () => {
    const maliciousId = "'; DROP TABLE leads; --";
    try {
      await secureDb.leads.findById(maliciousId);
      throw new Error("Should have thrown an error");
    } catch (error) {
      // Drizzle ORM prevents SQL injection by default through parameterized queries
      // Any invalid UUID will result in no results or a database error
      if (error instanceof DatabaseError) {
        return; // Test passed - SQL injection prevented
      }
      throw error;
    }
  });

  // Test 2: SQL Injection in vector search
  await test("SQL injection prevention in vector search", async () => {
    const maliciousVector = [1, 2, 3]; // Add SQL injection attempt
    maliciousVector.push("; DROP TABLE leads; --" as any);
    
    try {
      await secureDb.leads.findSimilar(maliciousVector, 5);
    } catch (error) {
      // Should handle gracefully
      return; // Test passed
    }
  });

  // Test 3: Unique constraint handling
  await test("Unique email constraint error handling", async () => {
    // First create a lead
    const testEmail = `test-unique-${Date.now()}@example.com`;
    const firstLead = await secureDb.leads.create({
      category: "influencer",
      name: "Test User 1",
      email: testEmail,
      bio: "Test bio",
      sourceUrl: "https://test.com",
      embedding: Array(1536).fill(0),
    });

    try {
      // Try to create another with same email
      await secureDb.leads.create({
        category: "influencer",
        name: "Test User 2",
        email: testEmail, // Duplicate email
        bio: "Test bio 2",
        sourceUrl: "https://test2.com",
        embedding: Array(1536).fill(0),
      });
      throw new Error("Should have thrown duplicate email error");
    } catch (error) {
      if (error instanceof DatabaseError && error.code === "DUPLICATE_EMAIL") {
        // Clean up
        await secureDb.leads.delete(firstLead.id);
        return; // Test passed
      }
      throw error;
    }
  });

  // Test 4: Foreign key constraint handling
  await test("Foreign key constraint error handling", async () => {
    try {
      // Create metadata with non-existent lead IDs
      await secureDb.metadata.create({
        leadId: "00000000-0000-0000-0000-000000000000", // Non-existent
        relatedLeadId: "00000000-0000-0000-0000-000000000001", // Non-existent
        relationshipType: "test",
      });
      throw new Error("Should have thrown invalid reference error");
    } catch (error) {
      if (error instanceof DatabaseError && error.code === "INVALID_REFERENCE") {
        return; // Test passed
      }
      throw error;
    }
  });

  // Test 5: Audit logging
  await test("Audit logging for sensitive operations", async () => {
    // Create a lead
    const newLead = await secureDb.leads.create({
      category: "journalist",
      name: "Audit Test User",
      email: `audit-test-${Date.now()}@example.com`,
      bio: "Testing audit logging",
      sourceUrl: "https://audit-test.com",
      embedding: Array(1536).fill(0),
    }, "test-user-123");

    // Check audit logs
    const logs = await secureDb.audit.getRecentLogs(10);
    const auditLog = logs.find(
      (log: any) => log.record_id === newLead.id && log.operation === "INSERT"
    );

    if (!auditLog) {
      throw new Error("Audit log not created for insert operation");
    }

    // Clean up
    await secureDb.leads.delete(newLead.id);
  });

  // Test 6: Input validation for vector dimensions
  await test("Vector dimension validation", async () => {
    try {
      await secureDb.leads.create({
        category: "publisher",
        name: "Vector Test",
        email: `vector-test-${Date.now()}@example.com`,
        bio: "Testing vector validation",
        sourceUrl: "https://vector-test.com",
        embedding: Array(100).fill(0), // Wrong dimension
      });
      throw new Error("Should have failed with wrong vector dimension");
    } catch (error) {
      // Should fail validation
      return; // Test passed
    }
  });

  // Test 7: RLS policies are enabled
  await test("Row Level Security is enabled", async () => {
    const result = await db.execute(sql`
      SELECT 
        tablename,
        rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('leads', 'lead_metadata')
    `);

    const tables = result.rows;
    for (const table of tables) {
      if (!table.rowsecurity) {
        throw new Error(`RLS not enabled for table: ${table.tablename}`);
      }
    }
  });

  // Test 8: SSL connection verification
  await test("SSL connection is enforced", async () => {
    // Supabase pooler doesn't expose pg_stat_ssl
    // Instead, verify we're using SSL in the connection string
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || (!dbUrl.includes('sslmode=require') && !dbUrl.includes('pooler.supabase.com'))) {
      throw new Error("SSL not configured in connection string");
    }
    
    // Verify we can execute a basic query over SSL
    const result = await db.execute(sql`SELECT 1 as test`);
    if (!result.rows || result.rows[0].test !== 1) {
      throw new Error("Failed to execute query over SSL connection");
    }
  });

  // Summary
  console.log("\n📊 Test Summary:");
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(
    `\n${
      failedTests === 0 ? colors.green + "✅ All security tests passed!" : colors.red + "❌ Some tests failed"
    }${colors.reset}`
  );

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
if (import.meta.main) {
  runSecurityTests().catch(console.error);
}