# BitAtlas

BitAtlas is a comprehensive MCP (Model Context Protocol) enabled development platform that provides a unified interface for file operations, search functionality, and real-time collaboration features.

## Architecture

This is a monorepo containing three main modules:

- **frontend**: React/TypeScript web application
- **backend**: Node.js/Express/TypeScript API server  
- **mcp-modules**: Shared MCP protocol types, interfaces, and schemas

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

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
cd BitAtlas

# Install all dependencies
npm run install:all

# Build shared modules
npm run build

# Start development servers
npm run dev
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

## License

[License details to be added]