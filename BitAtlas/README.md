# BitAtlas ☁️🔐

> **Global Customers, EEA-Resident Data**  
> Welcome users from anywhere - data stays in Europe. Guaranteed.

## The Problem
Existing cloud storage providers route your sensitive data through non-European servers, violating GDPR and compromising data sovereignty for European businesses and privacy-conscious users worldwide.

## The Solution  
BitAtlas is a **global cloud storage platform with EEA data residency guarantee** that:
- 🌍 **Global Access** - Welcome customers from anywhere in the world
- 🇪🇺 **EEA Data Residency** - All customer content and metadata stored only within EEA regions
- 🤖 **AI Assistant Integration** - MCP protocol enables Claude/ChatGPT to access your files securely  
- 🏗️ **European-Only Providers** - Scaleway, OVH, Hetzner, Exoscale, IONOS (European companies only)
- 🔐 **E2EE by Default** - Client-side encryption ensures even cross-border transit is unreadable

## Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │────│  Control Plane   │────│  EEA Data Plane │
│ (Global Access) │    │ (Global/Stateless)│    │ (EEA Regions)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                       ┌──────────────────┐    ┌─────────────────┐
                       │   MCP Gateway    │    │ Scaleway/OVH/   │
                       │  (AI Assistant)  │    │ Hetzner/Exoscale│
                       └──────────────────┘    └─────────────────┘
```

**Philosophy**: Global customers welcome - data stays in EEA

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

## 🔐 EEA Data Residency Features

### Current Implementation
- ✅ **In-Memory Demo** - Fast local development
- ✅ **File Management** - Upload, organize, preview files  
- ✅ **OAuth Integration** - AI assistant access with MCP protocol
- ✅ **Classic File UI** - Professional Windows/macOS style interface
- ✅ **Data Residency Policy** - Automated EEA-only enforcement
- ✅ **Multi-Provider Support** - Scaleway, OVH, Hetzner, Exoscale, IONOS

### Production Roadmap  
- 🚧 **Runtime Bucket Verification** - Real-time location validation
- 🚧 **E2EE by Default** - Client-side encryption before upload
- 🚧 **EEA-Only CDN** - Performance without data leakage
- 🚧 **Enhanced Audit Logging** - Comprehensive compliance monitoring

### **Residency Guarantee (v0.1)**
> - **P0 Content** (files/blobs) and **P1 Metadata** (keys, identifiers, access logs) **persist only in EEA regions**
> - **European Companies Only** - No American tech giants (AWS, Google, Microsoft), even in EU regions
> - **Backups/replicas** remain in the EEA with European providers
> - **In-transit** bytes may cross borders but are end-to-end encrypted
> - **Caching/CDNs** outside the EEA are disabled by default
> - **Aggregated, anonymized telemetry** (P2) may be processed outside EEA only if impossible to re-identify users

## Contributing

This project prioritizes **EEA data residency** and **privacy by design** while welcoming global users. All contributions must maintain these core principles.

## License

MIT - Global Access, European Data Residency