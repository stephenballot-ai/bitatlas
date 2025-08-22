# BitAtlas ☁️🔐

> **EU-Only Cloud Storage with AI Assistant Integration**  
> Your files stay in Europe. Guaranteed.

## The Problem
Existing cloud storage providers like Dropbox, Google Drive, and OneDrive route your sensitive data through US servers, violating GDPR and compromising European data sovereignty.

## The Solution  
BitAtlas is a **EU-only cloud storage platform** that:
- 🇪🇺 **Guarantees EU data residency** - Files never leave European borders
- 🤖 **AI Assistant Integration** - MCP protocol enables Claude/ChatGPT to access your files securely  
- 🏗️ **Multi-Provider Backend** - Scaleway, OVH, Hetzner object storage adapters
- 🔐 **Client-Side Encryption** - Your data is encrypted before it leaves your device

## Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │────│  Express API     │────│  EU Providers   │
│  (Frontend)     │    │  (Backend)       │    │  (Scaleway/OVH) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────────────────┐
                       │   MCP Gateway    │
                       │  (AI Assistant)  │
                       └──────────────────┘
```

## Project Structure

```
BitAtlas/
├── package.json                 # Root workspace configuration
├── frontend/                    # React/TypeScript frontend
│   ├── package.json
│   └── src/
├── backend/                     # Node.js/Express backend
│   ├── package.json
│   └── src/
└── mcp-modules/                 # Shared MCP protocol definitions
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── types/               # TypeScript type definitions
        ├── schemas/             # Zod validation schemas
        ├── interfaces/          # Protocol interfaces
        └── index.ts            # Main export file
```

## MCP Protocol Features

The MCP modules provide standardized interfaces and schemas for:

### File Operations
- Create, read, update, delete files and directories
- File metadata management
- Permission handling
- File system operations (copy, move, chmod, chown)

### Search Functionality
- Full-text content search
- File name pattern matching
- Tag-based search
- Date range filtering
- Advanced search with filters and sorting

### Authentication & Authorization
- Multiple authentication providers (username/password, OAuth)
- JWT token management with refresh tokens
- Role-based access control
- Session management

### WebSocket Communication
- Real-time bidirectional communication
- Connection management
- Message broadcasting
- Event handling

### Error Handling
- Standardized error codes following JSON-RPC 2.0
- Structured error responses
- Retry logic for transient failures

## 🚀 Run Locally in 2 Minutes

### Prerequisites
- **Docker** (with Docker Compose)
- **Node.js** 18+

### One-Command Start
```bash
# Navigate to project
cd BitAtlas

# Install dependencies  
cd backend && npm install && cd ../frontend && npm install && cd ..

# Start full stack
docker-compose -f docker-compose.local.yml up -d
```

### Access Points
- **Frontend:** http://localhost:5173 (File management UI)
- **Backend API:** http://localhost:3000 (REST + MCP endpoints)
- **OAuth Flow:** http://localhost:3000/oauth/authorize (AI assistant access)

### Development Mode (Hot Reload)
```bash
# Backend (in-memory storage)
cd backend && npm run dev:simple

# Frontend (new terminal)
cd frontend && npm run dev
```

### Individual Module Commands

```bash
# Frontend development
npm run dev --workspace=frontend

# Backend development
npm run dev --workspace=backend

# Build MCP modules
npm run build --workspace=mcp-modules

# Run tests
npm run test --workspace=backend
npm run test --workspace=mcp-modules
```

## Development

### Adding New MCP Methods

1. Define types in `mcp-modules/src/types/`
2. Create Zod schemas in `mcp-modules/src/schemas/`
3. Define interfaces in `mcp-modules/src/interfaces/`
4. Add method constants to `mcp-modules/src/index.ts`
5. Implement handlers in backend
6. Use in frontend components

### Code Style

- TypeScript strict mode enabled
- ESLint configuration for consistent code style
- Prettier for code formatting
- Zod for runtime validation
- Follow existing patterns and conventions

## 🔐 EU Data Sovereignty Features

### Current Implementation
- ✅ **In-Memory Demo** - Fast local development
- ✅ **File Management** - Upload, organize, preview files  
- ✅ **OAuth Integration** - AI assistant access with MCP protocol
- ✅ **Classic File UI** - Professional Windows/macOS style interface

### Production Roadmap  
- 🚧 **EU Provider Integration** - Scaleway, OVH, Hetzner adapters
- 🚧 **Client-Side Encryption** - E2EE before upload
- 🚧 **Policy Enforcement** - Automated EU-only guarantees
- 🚧 **Audit Logging** - Compliance and monitoring

## Contributing

This project prioritizes **EU data sovereignty** and **privacy by design**. All contributions must maintain these core principles.

## License

MIT - European Data Sovereignty Focused