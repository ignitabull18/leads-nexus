# Database Security Best Practices

## Overview

This document outlines the security measures implemented in the leads-nexus database layer to protect against common vulnerabilities and ensure data integrity.

## Implemented Security Measures

### 1. SSL/TLS Encryption
- **Location**: `src/db/config.ts`
- **Features**:
  - Enforced SSL connections with certificate validation
  - Connection pool with security timeouts
  - Graceful shutdown handling
  - Error messages sanitized in production

### 2. Row Level Security (RLS)
- **Location**: `src/db/migrations/0001_add_rls_policies.sql`
- **Policies**:
  - Enabled on `leads` and `lead_metadata` tables
  - Read/write policies for authenticated users
  - Foreign key validation in policies
  - User context tracking via `app.current_user_id`

### 3. Parameterized Queries
- **Location**: `src/db/secure-client.ts`
- **Protection Against**:
  - SQL injection attacks
  - Query manipulation
  - Data exfiltration
- **Implementation**:
  - All queries use Drizzle ORM's parameterized queries
  - Vector search uses safe parameterization
  - No string concatenation in queries

### 4. Centralized Error Handling
- **Location**: `src/db/secure-client.ts`
- **Features**:
  - User-friendly error messages
  - Sensitive information hidden
  - Proper HTTP status codes
  - Development vs production error detail levels

### 5. Audit Logging
- **Location**: `audit_logs` table and triggers
- **Tracked Operations**:
  - INSERT, UPDATE, DELETE on leads
  - All operations on lead_metadata
  - User ID and timestamp tracking
  - Old and new data comparison
  - Query logging for forensics

### 6. Input Validation
- **Location**: `src/db/schema.ts`
- **Validations**:
  - Zod schemas for all inputs
  - Email format validation
  - Vector dimension checking (1536)
  - Enum validation for categories
  - UUID format validation

## Security Testing

Run security tests with:
```bash
bun run db:security-test
```

Tests include:
- SQL injection prevention
- Constraint violation handling
- RLS policy verification
- SSL connection validation
- Audit log verification

## Best Practices for Development

### 1. Never Trust User Input
```typescript
// Bad
const query = `SELECT * FROM leads WHERE id = '${userId}'`;

// Good
await secureDb.leads.findById(userId);
```

### 2. Use the Secure Client
```typescript
// Always use secureDb instead of raw db
import { secureDb } from "@/db/secure-client";

const leads = await secureDb.leads.findAll(userId);
```

### 3. Set User Context for RLS
```typescript
// Pass userId to enable RLS policies
const result = await secureDb.leads.create(data, userId);
```

### 4. Handle Errors Properly
```typescript
try {
  await secureDb.leads.create(data);
} catch (error) {
  if (error instanceof DatabaseError) {
    // Handle specific error codes
    if (error.code === "DUPLICATE_EMAIL") {
      // Show user-friendly message
    }
  }
}
```

### 5. Validate Vector Dimensions
```typescript
// Ensure embeddings are exactly 1536 dimensions
if (embedding.length !== 1536) {
  throw new Error("Invalid embedding dimension");
}
```

## Environment Variables

Required for security:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
NODE_ENV=production  # Enables production error handling
```

## Monitoring and Alerts

### Audit Log Queries
```sql
-- Recent security events
SELECT * FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Failed operations by user
SELECT user_id, COUNT(*) as failures
FROM audit_logs
WHERE operation = 'DELETE' 
  AND old_data IS NOT NULL 
  AND new_data IS NULL
GROUP BY user_id;
```

## Incident Response

1. **Suspected SQL Injection**:
   - Check audit_logs for suspicious queries
   - Review application logs for error patterns
   - Temporarily revoke access if needed

2. **Data Breach**:
   - Use audit_logs to identify affected records
   - Check SSL certificate validity
   - Review RLS policies for gaps

3. **Authentication Issues**:
   - Verify user context is properly set
   - Check RLS policy definitions
   - Review recent policy changes

## Regular Security Tasks

- [ ] Weekly: Review audit logs for anomalies
- [ ] Monthly: Run security test suite
- [ ] Quarterly: Update dependencies
- [ ] Annually: Security audit and penetration testing

## Future Enhancements

1. **API Rate Limiting**: Implement per-user query limits
2. **Field-Level Encryption**: Encrypt sensitive fields at rest
3. **2FA Integration**: Add two-factor authentication
4. **IP Allowlisting**: Restrict database access by IP
5. **Query Performance Monitoring**: Detect and prevent expensive queries