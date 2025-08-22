# BitAtlas GitHub Repository Audit & Recommendations

This document captures a prioritized set of recommendations for the BitAtlas repository (https://github.com/stephenballot-ai/bitatlas).  
Focus areas: MCP modular architecture, EU-only data residency guarantees, repo hygiene, CI/CD, and security.

---

## Repo Audit Findings
- Early repo (~18 commits), no releases yet.
- Languages: TypeScript (~85%), plus JS/Shell/PLpgSQL/CSS/Dockerfile/HTML.
- README is a stub; no clear run instructions.
- No visible CI, no releases, no security settings evident.

---

## Top 10 Recommended Actions

### 1. Ship a Crisp README and One‑Command Run
Add a 1‑page README with:
- Problem → Solution → Architecture sketch
- “Run locally in 2 minutes” instructions (`docker compose up` or `pnpm dev`).

### 2. Formalize Repo Structure as a Monorepo
Proposed structure:
```
/apps
  /gateway             # MCP host/orchestrator
  /web                 # optional admin UI
/packages
  /mcp-types           # shared TS types for CRUD/search + error taxonomy
  /policy-eu           # region/sovereignty guardrails
  /crypto              # client-side E2EE helpers
  /audit               # structured audit logging
  /adapters
    /hetzner-object
    /ovh-object
    /scaleway-object
/docs
  /adr
/infra
  /terraform
```

### 3. Lock in EU‑Only Guarantees (Policy as Code)
`packages/policy-eu/src/assert-eu.ts` with endpoint checks.

### 4. Define the Adapter Contract Once
Standard `StorageAdapter` interface with contract tests for each adapter.

### 5. Minimal MCP Server/Gateway
Router that injects `assertEndpointIsEU`, wraps errors, and emits audit logs.

### 6. CI/CD with GitHub Actions
- Required checks: lint, type‑check, tests, security, build.
- Generate SBOM and scan.

### 7. Repo Protections & Security
- Enable Dependabot (npm + Actions).
- Secret scanning + push protection.
- CodeQL scanning.
- Branch protection with required checks.

### 8. Client‑Side Encryption First
Implement `packages/crypto` with encrypt/decrypt helpers.

### 9. Observability and Audit
- `packages/audit` with structured JSON logs.
- Request ID, op type, latency, outcome, error code.

### 10. Docs You’ll Actually Maintain
- `docs/adr/ADR-0001-mcp-modularity.md`
- `docs/adr/ADR-0002-eu-providers-criteria.md`
- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CODEOWNERS`.

---

## “Open 5 PRs” Plan

**PR #1 — Repo hygiene & docs**
```
README.md
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md
CODEOWNERS
.editorconfig
.github/ISSUE_TEMPLATE/{bug.md,feature.md}
.github/PULL_REQUEST_TEMPLATE.md
```

**PR #2 — Monorepo & types**
```
pnpm-workspace.yaml
packages/{mcp-types,policy-eu,crypto,audit}/...
apps/gateway/...
```

**PR #3 — CI + protections**
```
.github/workflows/ci.yml
.github/dependabot.yml
```

**PR #4 — First adapter (pick 1 EU provider)**
```
packages/adapters/scaleway-object/...
```

**PR #5 — E2EE default**
```
packages/crypto/...
apps/gateway/src/middleware/encrypt-before-put.ts
```

---

## Testing & QA from Day One
- Coverage gate: 75% line + function (raise over time).
- Golden tests for search/list per adapter.
- Synthetic probe (staging): upload→list→get→delete every 5 min.

---

## Release & Supply Chain
- Tag `v0.1.0` → build artifacts → attach SBOM.
- Commit lockfiles, pin base image digests, verify SBOM in CI.

---

## Notes
- No releases/packages yet.
- Consider publishing gateway as an npm package once stable.

---
