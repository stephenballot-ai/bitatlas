# BitAtlas — Global Customers, EU‑Resident Data (Repo Plan & Actions)

**Goal:** Welcome users from anywhere while **guaranteeing all customer content and identifying metadata are stored and backed up only within the EEA**. This document replaces the earlier “EU‑only customers” framing.

> **Residency Guarantee (v0.1)**  
> - **P0 Content** (files/blobs) and **P1 Metadata** (keys, object metadata, user identifiers, access logs that can identify a user) **persist only in EEA regions**.  
> - **Backups/replicas** remain in the EEA.  
> - **In‑transit** bytes may cross borders but are end‑to‑end encrypted.  
> - **Caching/CDNs** outside the EEA are **disabled by default**. EU‑only edge caches are permitted.  
> - **Aggregated, fully anonymized telemetry** (P2) may be processed outside the EEA *only* if it is impossible to re‑identify a user.

---

## 1) Architecture Principles (customer‑anywhere, data‑in‑EU)
1. **Split planes:**  
   - **Control plane** (auth, orchestration, API, billing) may be globally deployed and stateless.  
   - **Data plane** (object storage, backups, audit logs w/ identifiers) runs in EEA regions only.  
2. **MCP‑modular adapters:** Each storage provider adapter implements the same CRUD/search contract; business logic lives in the gateway.  
3. **E2EE by default:** Client‑side encryption ensures even cross‑border transit is unreadable.  
4. **EU residency as code:** Every create/bucket/put path calls residency checks that assert EU regions and EU endpoints.  
5. **No silent cross‑border copies:** Disable transfer accelerators/CDN caches that may store bytes outside the EEA.

---

## 2) Monorepo Layout (Turborepo/Nx with PNPM)
```
/apps
  /gateway                 # MCP host/orchestrator (global control plane; talks to EU data plane)
  /web                     # optional admin UI
/packages
  /mcp-types               # shared TS types for CRUD/search + error taxonomy
  /policy-residency        # residency guardrails (EEA list, endpoint/region checks)
  /crypto                  # client-side E2EE helpers
  /audit                   # structured audit logging
  /adapters
    /scaleway-object
    /ovh-object
    /hetzner-object
    /exoscale-object
/docs
  /adr
/infra
  /terraform               # EU pins for data plane; global pins allowed only for stateless control plane
```

---

## 3) Residency as Code (allow global clients, enforce EU storage)
### 3.1 Region/endpoint whitelist
- Maintain a **canonical EEA region map** per provider (e.g., `fr-par`, `nl-ams`, `pl-waw`, `de-*`, `eu-*`).  
- Maintain a **hostname whitelist** for storage endpoints that are provably EU‑resident.

### 3.2 TypeScript guard (provider‑aware)
```ts
// packages/policy-residency/src/assert-residency.ts
export type Provider = 'scaleway' | 'ovh' | 'hetzner' | 'exoscale' | 'aws-eu-only' | 'ionos';

const EU_REGION_PREFIXES = new Set([
  'fr', 'nl', 'de', 'pl', 'eu', 'es', 'it', 'ie', 'be', 'fi', 'se', 'cz', 'at', 'pt', 'gr'
]);

const HOST_ALLOW = [
  /\.objects\.scw\.cloud$/,         // Scaleway
  /\.storage\.cloud\.ovh\.net$/,    // OVHcloud
  /\.hetzner\.cloud$/,              // Hetzner
  /\.exoscale\.com$/,               // Exoscale
  /\.ionos\./,                      // IONOS
  /\.eu(-\w+)?\.amazonaws\.com$/    // If you choose to support AWS EU regions
];

export function assertEndpointIsEU(url: string) {
  const host = new URL(url).host;
  if (!HOST_ALLOW.some(rx => rx.test(host))) {
    const e: any = new Error(`POLICY_NON_EU_ENDPOINT: ${host}`);
    e.code = 'POLICY_NON_EU_ENDPOINT';
    throw e;
  }
}

export function assertRegionIsEU(region: string) {
  const prefix = region.split(/[-_]/)[0];
  if (!EU_REGION_PREFIXES.has(prefix)) {
    const e: any = new Error(`POLICY_NON_EU_REGION: ${region}`);
    e.code = 'POLICY_NON_EU_REGION';
    throw e;
  }
}
```

### 3.3 Verify actual bucket/namespace location (not just host)
For S3‑compatible APIs, perform a bucket `HEAD`/`GetBucketLocation` at runtime and on startup health checks. Fail fast if the provider returns a non‑EEA location.

```ts
// Pseudo‑S3 example
async function ensureBucketInEEA(s3: S3Client, bucket: string) {
  const { LocationConstraint } = await s3.send(new GetBucketLocationCommand({ Bucket: bucket }));
  const region = LocationConstraint || 'eu-west-1'; // legacy default fallback
  assertRegionIsEU(region);
}
```

### 3.4 Backups & replication
- Replicate **only across EEA regions** (e.g., `fr-par` ↔ `nl-ams`).  
- Block any cross‑region replication targets that are non‑EEA in IaC policy tests.

---

## 4) Adapter Contract (stable, testable)
```ts
// packages/mcp-types/src/adapter.ts
export type Capability = 'put'|'get'|'delete'|'list'|'search'|'presign';

export interface AdapterInfo { id: string; vendor: string; region: string; capabilities: Capability[]; }

export interface PutInput {
  key: string;
  bytes?: Uint8Array;                 // optional if using presign + direct upload
  contentType?: string;
  metadata?: Record<string,string>;
}

export interface PutResult { etag?: string; versionId?: string; }

export interface StorageAdapter {
  info(): AdapterInfo;
  put(i: PutInput): Promise<PutResult>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  search(q: { prefix?: string; metadata?: Record<string,string> }): Promise<string[]>;
  presign?(key: string, opts?: { contentType?: string; expiresIn?: number }): Promise<{ url: string; fields?: Record<string,string> }>;
}
```

---

## 5) Upload/Download Flow for Global Users
- **Uploads:** Gateway returns **EU‑region presigned URLs**. Clients anywhere upload directly (multipart, concurrent parts).  
- **Downloads:** Serve from EU storage. Optional **EU‑only CDN** for performance; no non‑EU edge caching.  
- **Acceleration:** Do **not** enable transfer acceleration products that persist bytes outside the EEA.

---

## 6) E2EE by Default
`packages/crypto` exports simple primitives: `encrypt(bytes, key)`, `decrypt`, with authenticated encryption (AEAD). Keys live with the tenant (KMS/Passkeys). Adapters see ciphertext only.

---

## 7) Observability & Audit (EEA sinks)
- Structured JSON logs with request‑id, tenant, op, key prefix, size, latency, outcome, error code.  
- Logs with identifiers ship to **EEA log storage**.  
- Synthetic probe (staging EU): upload→list→get→delete every 5 minutes; alert on failures/latency.

---

## 8) CI/CD & Compliance Checks
- Required checks: lint, type‑check, tests, residency‑compliance, security scan, build, SBOM.  
- Enable: Dependabot, Secret scanning, Push protection, CodeQL, Branch protection.  

---

## 9) Docs You’ll Actually Maintain
- `README.md`: What/Why/How, quickstart, residency guarantee badge.  
- `SECURITY.md`: reporting + data‑handling.  
- `docs/adr/ADR-0001-mcp-modularity.md`: why MCP.  
- `docs/adr/ADR-0002-data-residency.md`: definitions (P0/P1/P2), provider list, EU region map.  
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CODEOWNERS`.

---

## 10) “Open 5 PRs” Plan
1. Hygiene & docs  
2. Monorepo & types  
3. Residency & CI  
4. First EU adapter  
5. E2EE default  

---

**Summary:** This plan **does not restrict who can use BitAtlas**. It **only enforces** that data at rest (and identifiable metadata) live in the EEA, with checks at code, CI, and IaC layers to make it provable.
