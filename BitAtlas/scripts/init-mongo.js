// MongoDB initialization script for BitAtlas
db = db.getSiblingDB('bitatlas');

// Create collections
db.createCollection('users');
db.createCollection('files');
db.createCollection('sessions');
db.createCollection('oauthClients');
db.createCollection('authorizationCodes');
db.createCollection('mcpSessions');
db.createCollection('securityEvents');

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.files.createIndex({ userId: 1, path: 1 });
db.files.createIndex({ userId: 1, name: "text", path: "text" });
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.oauthClients.createIndex({ clientId: 1 }, { unique: true });
db.authorizationCodes.createIndex({ code: 1 }, { unique: true });
db.authorizationCodes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.mcpSessions.createIndex({ userId: 1, clientId: 1 });
db.securityEvents.createIndex({ userId: 1, timestamp: -1 });

// Insert sample OAuth client for testing
db.oauthClients.insertOne({
  clientId: 'test-ai-assistant',
  name: 'Test AI Assistant',
  description: 'Development AI assistant for testing MCP integration',
  redirectUris: ['http://localhost:8080/oauth/callback'],
  allowedScopes: ['read', 'search', 'files:read', 'files:search', 'profile'],
  isActive: true,
  createdAt: new Date()
});

print('BitAtlas database initialized successfully!');