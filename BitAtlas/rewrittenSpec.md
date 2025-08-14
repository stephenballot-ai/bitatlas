Here’s your spec rewritten into a structured RFC-style document that’s clear, implementation-ready, and reduces ambiguity.

⸻

BitAtlas – MCP Modular Interface Specification

1. Overview

BitAtlas is a modular, European-sovereign cloud file storage platform built on the Model Context Protocol (MCP).
This document specifies the functional, security, and integration requirements for MCP modules, backend orchestration, and frontend interactions.

⸻

2. Goals
	•	Full European data sovereignty: All compute, storage, and authentication providers must be EU-based.
	•	MCP-first architecture: Each core operation (CRUD, search, auth, storage) is isolated into its own MCP-compliant module.
	•	Security by design: Strong authentication, encryption, and compliance with GDPR.
	•	Extensibility: Modules can be replaced or extended without changing the entire stack.

⸻

3. Architecture
	•	Backend:
	•	Orchestrates MCP module calls
	•	Handles authentication/session lifecycle
	•	Provides unified API to frontend
	•	MCP Modules:
	•	CRUD (Create, Read, Update, Delete)
	•	Search
	•	Cloud storage integration
	•	GDPR compliance tools
	•	Frontend:
	•	React-based UI
	•	Directly aware of MCP capabilities for real-time interaction

⸻

4. MCP Modules

4.1 Standardization
	•	All MCP modules must follow a versioned request/response schema:

{
  "version": "1.0",
  "request": { "operation": "createFile", "params": { "name": "example.txt" } },
  "response": { "status": "success", "data": { "fileId": "abc123" } },
  "error": { "code": "ERR_NOT_FOUND", "message": "File not found" }
}

	•	Error codes and status values must be consistent across modules.

⸻

4.2 File Operations
	1.	Create Module
	•	Upload files (resumable uploads)
	•	Create folders
	•	Store metadata
	•	Validate permissions before write
	2.	Read Module
	•	Retrieve file metadata & content
	•	Generate previews (via CDN)
	•	Enforce access control rules
	3.	Update Module
	•	Rename/move files
	•	Update metadata atomically
	•	Transaction-safe operations
	4.	Delete Module
	•	Soft delete with recovery window
	•	Permanent delete after expiry
	•	Log deletion actions for audit

⸻

4.3 Search Module
	•	PostgreSQL full-text search with tsvector indexing
	•	Support metadata-based filtering
	•	Advanced query syntax (AND/OR/NOT, ranges, tags)
	•	Pagination and sorting

⸻

4.4 Cloud Storage Integration Module
	•	Support OVH, Scaleway, Hetzner
	•	Data encrypted at rest & in transit
	•	Redundancy across availability zones
	•	Secure, expirable signed URLs for CDN access

⸻

4.5 GDPR Compliance Module
	•	User-triggered data export in machine-readable format
	•	Permanent data deletion with verification
	•	Full audit trail generation

⸻

5. Authentication & Security
	1.	Password Auth
	•	bcrypt hashing with per-user salt
	•	Password strength validation
	•	Account lockout on repeated failures
	2.	Multi-Factor Authentication (MFA)
	•	TOTP (Google Authenticator, Authy, etc.)
	•	SMS via MessageBird or Vonage EU
	•	Backup codes (rotatable, one-time use)
	3.	OAuth-like Integration
	•	Support European identity providers only (e.g., ID Austria, FranceConnect)
	•	No U.S.-based OAuth services
	4.	Session Management
	•	Secure JWT for active sessions
	•	Refresh token rotation
	•	Device tracking & revocation
	•	Auto-expiry & idle timeouts
	5.	Rate Limiting & Anti-Brute-Force
	•	Redis-based IP throttling
	•	Progressive backoff delays
	•	Account-specific lockouts

⸻

6. Observability
	•	Structured logging for all MCP calls
	•	Metrics for latency, throughput, and error rates
	•	Distributed tracing for inter-module calls
	•	EU-hosted monitoring (self-hosted Prometheus/Grafana or EU SaaS)

⸻

7. Frontend Requirements
	•	React with modular components mapped to MCP operations
	•	Real-time upload progress and error feedback
	•	File organization features:
	•	Favorites
	•	Recents
	•	Bulk actions
	•	Search interface with advanced filtering

⸻

8. Deployment
	•	Containerized MCP modules
	•	Deployed on OVH, Scaleway, or Hetzner
	•	Network segmentation for MCP module security
	•	Security hardening & penetration testing before release

⸻

9. Testing Strategy
	•	Unit tests for each MCP module
	•	Integration tests for backend orchestration
	•	Load testing for concurrent uploads/search
	•	Security penetration tests
	•	GDPR compliance verification

⸻

10. Future Extensions
	•	AI-powered file recommendations (EU-hosted models)
	•	Real-time collaboration features
	•	Additional European storage providers

⸻
