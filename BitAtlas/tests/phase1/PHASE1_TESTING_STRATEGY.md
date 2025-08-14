# Phase 1 Testing Strategy

Looking at Phase 1 in the IMPLEMENTATION_PLAN.md, here are the **testable success criteria** for each component:

## 🧪 **Phase 1 Testing Strategy**

### **1.1 Database Setup Testing**

**Manual Tests:**
```bash
# Test PostgreSQL connection & schema
psql -h localhost -U bitatlas -d bitatlas -c "\dt"
# Should show: users, files, sessions, oauth_tokens tables

# Test sample data insertion
INSERT INTO users (email, password_hash, salt) 
VALUES ('test@example.com', 'hash123', 'salt123');
# Should succeed without errors
```

**Automated Tests:**
```typescript
// tests/database/schema.test.ts
describe('Database Schema', () => {
  test('all tables exist with correct structure', async () => {
    const tables = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    expect(tables.rows.map(r => r.tablename)).toContain('users');
    expect(tables.rows.map(r => r.tablename)).toContain('files');
  });

  test('user creation works with constraints', async () => {
    const user = await db('users').insert({
      email: 'test@test.com',
      password_hash: 'hash',
      salt: 'salt'
    }).returning('*');
    expect(user[0].id).toBeDefined();
  });
});
```

### **1.2 MCP Protocol Testing**

**Unit Tests for Core Types:**
```typescript
// tests/mcp/protocol.test.ts
import { McpRequest, McpResponse, McpErrorCode } from '../src/types/mcpProtocol';

describe('MCP Protocol', () => {
  test('McpRequest validates correctly', () => {
    const request: McpRequest = {
      version: '1.0',
      id: 'test-123',
      method: 'searchFiles',
      params: { query: 'test' }
    };
    expect(request.version).toBe('1.0');
  });

  test('McpError codes are defined', () => {
    expect(McpErrorCode.UNAUTHORIZED).toBe('ERR_UNAUTHORIZED');
    expect(McpErrorCode.NOT_FOUND).toBe('ERR_NOT_FOUND');
  });
});
```

**Schema Validation Tests:**
```typescript
// tests/mcp/schemas.test.ts  
import Ajv from 'ajv';
import createFileRequest from '../schemas/crud/createFileRequest.json';

describe('MCP Schemas', () => {
  const ajv = new Ajv();

  test('createFileRequest schema validates valid request', () => {
    const validRequest = {
      operation: 'createFile',
      params: { name: 'test.txt' }
    };
    const validate = ajv.compile(createFileRequest);
    expect(validate(validRequest)).toBe(true);
  });

  test('createFileRequest rejects invalid request', () => {
    const invalidRequest = {
      operation: 'createFile',
      // Missing required 'name' param
      params: {}
    };
    const validate = ajv.compile(createFileRequest);
    expect(validate(invalidRequest)).toBe(false);
  });
});
```

### **1.3 Authentication Service Testing**

**Password Hashing Tests:**
```typescript
// tests/auth/authService.test.ts
describe('AuthService', () => {
  test('password hashing generates unique salt and hash', async () => {
    const auth = new AuthService();
    const result1 = await auth.hashPassword('password123');
    const result2 = await auth.hashPassword('password123');
    
    expect(result1.hash).not.toBe(result2.hash);
    expect(result1.salt).not.toBe(result2.salt);
  });

  test('password validation works correctly', async () => {
    const auth = new AuthService();
    const { hash, salt } = await auth.hashPassword('password123');
    
    const valid = await auth.validatePassword('password123', hash);
    const invalid = await auth.validatePassword('wrongpassword', hash);
    
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });

  test('JWT generation includes userId and scopes', () => {
    const auth = new AuthService();
    const token = auth.generateJWT('user-123', ['files:read']);
    const decoded = jwt.decode(token);
    
    expect(decoded.userId).toBe('user-123');
    expect(decoded.scopes).toContain('files:read');
  });
});
```

### **1.4 Backend API Structure Testing**

**MCP Orchestrator Tests:**
```typescript
// tests/backend/mcpOrchestrator.test.ts
describe('MCP Orchestrator', () => {
  test('can call file.create operation', async () => {
    const orchestrator = new McpOrchestrator();
    
    const mockCall = jest.spyOn(orchestrator, 'call');
    mockCall.mockResolvedValue({ fileId: 'test-123' });

    const result = await orchestrator.call('file.create', {
      userId: 'user-123',
      name: 'test.txt',
      content: 'Hello World'
    });

    expect(result.fileId).toBe('test-123');
    expect(mockCall).toHaveBeenCalledWith('file.create', expect.any(Object));
  });

  test('handles MCP errors correctly', async () => {
    const orchestrator = new McpOrchestrator();
    
    const mockCall = jest.spyOn(orchestrator, 'call');
    mockCall.mockRejected<(new Error('File not found');

    await expect(
      orchestrator.call('file.read', { fileId: 'nonexistent' })
    ).rejects.toThrow('File not found');
  });
});
```

**File Controller Integration Tests:**
```typescript
// tests/integration/fileController.test.ts
describe('File Controller Integration', () => {
  test('POST /files creates file via MCP', async () => {
    const response = await request(app)
      .post('/api/v1/files')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send({ name: 'test.txt', content: 'Hello' })
      .expect(200);

    expect(response.body.fileId).toBeDefined();
  });

  test('GET /files/:id reads file via MCP', async () => {
    // First create a file
    const createResponse = await request(app)
      .post('/api/v1/files')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send({ name: 'test.txt', content: 'Hello' });

    // Then read it
    const response = await request(app)
      .get(`/api/v1/files/${createResponse.body.fileId}`)
      .set('Authorization', 'Bearer valid-jwt-token')
      .expect(200);

    expect(response.body.name).toBe('test.txt');
  });
});
```

## ✅ **Phase 1 Success Checklist**

**Database Layer:**
- [ ] All tables created with correct schema
- [ ] Foreign key constraints work
- [ ] Sample data can be inserted/queried
- [ ] Migrations run without errors

**MCP Protocol:**
- [ ] All schema files validate with AJV
- [ ] TypeScript types compile correctly
- [ ] Error codes are consistently defined
- [ ] Request/response structures match schemas

**Authentication:**
- [ ] Password hashing produces unique results
- [ ] Password validation works correctly
- [ ] JWT generation includes required claims
- [ ] Refresh token generation is secure

**Backend API:**
- [ ] File CRUD endpoints respond correctly
- [ ] Authentication middleware works
- [ ] MCP orchestrator calls succeed
- [ ] Error handling returns proper MCP errors
- [ ] Rate limiting activates correctly

**Integration:**
- [ ] Full request flow works (API → MCP → Database)
- [ ] Authentication flow completes
- [ ] File operations persist to database
- [ ] Search operations return results

## 🚀 **Ready to Execute Tests:**

```bash
# Run all Phase 1 tests
npm test -- --testPathPattern=phase1
npm run test:integration
npm run test:db

# Manual verification
curl -X POST http://localhost:3000/api/v1/auth/register
curl -X GET http://localhost:3000/health
curl -X POST http://localhost:3000/api/v1/files -H "Authorization: Bearer token"
```

## 📋 **Test File Structure**

```
tests/
├── phase1/
│   ├── database/
│   │   └── schema.test.ts
│   ├── mcp/
│   │   ├── protocol.test.ts
│   │   └── schemas.test.ts
│   ├── auth/
│   │   └── authService.test.ts
│   ├── backend/
│   │   └── mcpOrchestrator.test.ts
│   ├── integration/
│   │   └── fileController.test.ts
│   └── manual/
│       └── health-check.sh
├── setup/
│   ├── testDb.ts
│   └── testHelpers.ts
└── jest.config.js
```

This testing approach ensures each Phase 1 component works in isolation AND integrates properly with the full system.