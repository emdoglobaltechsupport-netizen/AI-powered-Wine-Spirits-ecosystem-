# ADR-0001 — Database, Tenancy, Audit and Scale-Out Path

## Status

**Accepted for prototype scope.** PostgreSQL 16 with `tenant_id` row-level security (RLS), append-only audit tables and numbered migrations is the system of record for the Express + TypeScript API in this repository. **Proposed** for the production scale-out (Citus sharding, dedicated search, vector store). This ADR does not authorise live data, live orders or production startup; see [`../DISCLAIMER.md`](../DISCLAIMER.md) and [`../FEATURE_STATUS.md`](../FEATURE_STATUS.md).

---

## Context

- The scaffold serves the ten locked market-facing modules — Market, Trade, Sommelier, Assist, Studio, Seller, Flow, Club, Vault, Rewards — plus internal Admin, Global Payments, AI Marketing Automation and Ultimate AI TechOps layers. The Admin console simulates 19 workspaces; it is not an eleventh module.
- Persistence today is a local PostgreSQL 16 instance reached by an Express + TypeScript API. The catalogue is demo seed data; source-gated pipelines for beverages, Wine Accessories and an Africa Marketplace registry write staging tables with provenance metadata.
- Multi-tenancy is mandatory from the first migration: a seller must never read another seller's orders or inventory, and platform staff access must be break-glass, time-boxed, approved and audited.
- Governance requires append-only audit for approvals, catalogue writes and financial events; no raw card data, CVV, government ID or secrets in logs; SHA-256 hashed session tokens; scrypt password hashes; and request correlation via `requestId`.
- The canonical scale targets (100M users, 10M SKU target, 4.5B embeddings, 1.2M orders/day) are **projections**, not current capacity. The design must not pretend they are achieved, but must not foreclose them.
- Cross-context reads are a known risk: direct SQL joins between module schemas would couple bounded contexts and bypass tenancy policy.

### Canon snapshot

VINTORA — *The World's Cellar, Intelligent.* Ten market-facing modules only. Prototype mode — no real orders are placed. All figures are projections. NO-GO for production. This ADR governs data shape and access control only.

---

## Decision

### 1. PostgreSQL 16 is the single relational system of record

- OLTP state lives in PostgreSQL 16. Migrations are numbered SQL files under `packages/db/migrations` (currently `0001_initial` through `0013_product_content`) plus `packages/db/seed` and domain SQL under `packages/db/sql`.
- Migrations must be idempotent and are applied twice in the migrations CI workflow to prove repeatability. Future schema changes follow expand/contract: additive migration, dual-write/backfill, switchover, later cleanup.
- Conventions: UUID primary keys, `timestamptz` timestamps, `numeric(19,4)` for money (minor units where the financial contract requires it), `deleted_at` soft deletes, and `tenant_id` on every multi-tenant table.
- No document database replaces PostgreSQL in this scope.

### 2. Tenant isolation is enforced in the database, not only in application code

- Every multi-tenant table carries `tenant_id` with a demo sentinel default for local seeds. User-owned tables also carry `user_id`.
- RLS is enabled and policies compare `tenant_id` to `current_setting('app.tenant_id', true)::uuid`, and `user_id` to `current_setting('app.user_id', true)::uuid` where user scoping applies. Policies use both `USING` and `WITH CHECK` so reads *and* writes are constrained.
- The application connects as a role **without** `BYPASSRLS` and sets the tenant/user context per request. A missing `app.tenant_id` yields no rows rather than all rows.
- **No cross-tenant reads.** Platform staff access is a time-boxed, approved break-glass elevation with a reason and an append-only audit record; it is design-ready in the Admin simulation, not a production privilege.
- Reference data (countries, currencies, FX quote table, carriers, club plans, feature flags) is treated as replicated reference data for the future Citus topology.

### 3. Append-only audit where it matters

- Admin mutations and catalogue/Africa Marketplace writes produce append-only audit rows. Triggers reject `UPDATE` and `DELETE` on audit tables (for example `wine_accessory_audit` and `am_audit`), and write before/after snapshots with actor, source and reason.
- Source-gated staging (`catalogue_import`) is RLS-enabled with no public policies; verified read views expose only rows meeting confidence, source and moderation thresholds.
- General API audit is currently a structured stdout baseline with `requestId`, actor, method, path, status and duration. Production requires an append-only store with the full field set in [`../API_POLICY.md`](../API_POLICY.md), including SHA-256 of redacted JSON snapshots and retention classes. This migration is **deferred**.
- No audit record may contain secrets, raw PAN/CVV, session tokens or unnecessary personal data.

### 4. Read models and search are staged, not the source of truth

- Prototype browse/search uses indexes on domain tables (full-text, GIN on tags/provenance, btree on tenant and status keys). PostgreSQL remains authoritative.
- Dedicated read models and OpenSearch for multilingual faceted search are **deferred**. Cross-context reads must use federated composition or precomputed read models; direct cross-context SQL joins are prohibited.
- Read models are rebuildable projections: a stale or corrupt index must never become a reason to write to the source through a different path.

### 5. Vector search has a staged fallback

- No embeddings are produced in prototype mode. Design direction: pgvector for tenant-local, modest embedding sets; Milvus for the projected 4.5B-embedding scale. The fallback is a capability boundary, not a shipped index.
- Migrations now select an explicit embedding mode: `auto` detects pgvector, `pgvector` fails closed without the extension, and `jsonb` forces the portable fallback. The chosen mode is recorded in `schema_migration_metadata`, stamped on `schema_migrations` rows, and reported by startup output and `/health`. Physical mode is verified from the prototype `skus.embedding` column, not from the design-target `product_embeddings` table. The jsonb path replaces `vector(1536)` with JSON arrays and has no vector index or cosine operators; it preserves local schema compatibility only and must not be treated as equivalent retrieval quality or performance.
- Any future embedding row inherits `tenant_id` and RLS; similarity queries must be tenant-filtered before vector ranking. CI exercises fresh, idempotent, rollback and upgrade paths in both modes on disposable schemas; this is a Phase 1 migration contract check, not launch approval.

### 6. Citus is a future path, not a current deployment

- Distribution-column strategy is recorded for `tenant_id`, `user_id` and `product_id`, with reference tables replicated to workers. The projected 32 shards / 4 workers in Phase 0 and later re-sharding are **targets**, not provisioned infrastructure.
- Sharding is introduced only after the tenancy policy, audit guarantees and query patterns are evidenced under load; a restore/failover drill is a prerequisite.
- The local `docker compose` stack is a single-node development environment only.

### 7. Admin coverage reporting stays count-only

- `/v1/admin/coverage` reports counts and demo labels per domain. It returns no PII and no cross-tenant record bodies. This is the implemented coverage model; detailed drill-through is deferred pending privacy review.

---

## Consequences

### Positive

- Tenancy mistakes fail closed: a forgotten filter returns no rows instead of another tenant's data.
- Append-only audit triggers make silent tampering with approval and catalogue history a database error.
- Numbered, idempotent migrations and CI double-apply reduce the risk of drift between environments.
- Staging the Citus/search/vector decisions avoids operating distributed infrastructure before there is a real workload.
- Count-only Admin coverage gives governance visibility without exposing personal or cross-tenant records.

### Negative

- RLS and `current_setting` context add latency and require disciplined per-request setup; a missing context silently produces empty results that must be distinguished from "not found".
- Append-only audit grows monotonically and needs a retention/archival design before any real volume.
- Deferred read models mean complex cross-module queries will need explicit projection work later.
- Break-glass access needs careful operational design; a poorly scoped elevation could undermine the isolation model.
- Single-node PostgreSQL will not meet the projected scale targets; the Citus migration is non-trivial and must be rehearsed.

---

## Alternatives considered

| Alternative | Why not adopted now |
|---|---|
| MongoDB / document store | Weaker fit for relational commerce, double-entry accounting and SQL-level RLS; would duplicate integrity logic in application code. |
| Separate database per tenant | Strong isolation but expensive to operate, complicates reference data and cross-tenant analytics, and is premature for a prototype. |
| Shared schema with application-only tenancy | A single missed `WHERE tenant_id = ?` leaks data; rejected in favour of database-enforced RLS. |
| MySQL / SQLite | SQLite is fine for local caches but not the shared transactional/audit model; MySQL lacks the native RLS and extension path selected here. |
| OpenSearch or ClickHouse as source of truth | Search/analytics stores are projections; they are not substitutes for transactional constraints and audit. |
| Immediate Citus cluster | Would add operational cost and failure modes before real load or tenancy evidence exists. |
| Storing embeddings only in a dedicated vector database at launch | Forecloses tenant-local simplicity and adds a new access-control surface; pgvector-first is the recorded fallback. |

---

## Compliance/guardrail implications

- **Age/KYC/licence before order:** compliance assertions remain application-level preconditions in the order state machine; the database stores the resulting assertions and audit rows. No feature flag may bypass them.
- **Human approval before publish:** publishing state changes are admin mutations with reason, elevation and distinct approver where tiered; audit rows are append-only.
- **No cross-tenant reads:** enforced by RLS `USING`/`WITH CHECK` plus non-bypass role; break-glass is time-boxed and audited.
- **Four-eyes / T3/T4:** reason codes, distinct approver and expiry are stored in the Admin domain; the database rejects mutation of audit history.
- **Financial controls:** money columns are numeric and tenant-scoped; ledger, settlement and reconciliation tables are specified in [`../FINANCIAL_CONTROLS.md`](../FINANCIAL_CONTROLS.md) but not implemented by this ADR.
- **Privacy:** no PII in coverage counts; hashed session tokens; scrypt password hashes; redaction rules apply to all audit writes.
- **Production safeguard:** `NODE_ENV=production` remains rejected at startup per [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md).

---

## Verification/evidence

| Claim | Evidence available in the prototype | Gap / future evidence |
|---|---|---|
| Migrations are repeatable | `ci-migrations.yml` applies the PostgreSQL 16 setup twice; `packages/db/migrations/0001…0013` | Rehearse expand/contract switchover on a restored copy. |
| RLS is enabled on multi-tenant tables | `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and `CREATE POLICY tenant_isolation` in Seller, Flow, Club, Rewards, AI pricing, Vault and Admin migrations | Automated negative tests asserting zero rows for wrong `app.tenant_id`, including concurrent requests. |
| Append-only audit | Triggers raise `… is append-only` on audit-table `UPDATE`/`DELETE` in catalogue/Africa SQL | Extend to all financial and approval audit tables; WORM retention drill. |
| Catalogue source gating | `catalogue_import_verified` / `wine_accessories_verified` views with confidence, source and moderation filters | Re-run against a licensed supplier feed with real provenance evidence. |
| Count-only Admin coverage | `/v1/admin/coverage` returns counts and demo labels; 34 API checks via `npm run test:smoke` | Privacy review before any record-level drill-through. |
| API typecheck and domain tests | `npm run verify` | Load test and restore/failover drill required before launch. |

No verification here demonstrates production readiness. Green CI means the documented Phase 1 gates passed.

---

## Review triggers

Reopen this ADR when any of the following occurs:

1. A cross-tenant read or write is observed, suspected, or reported by a customer or auditor.
2. A fourteenth migration changes a distribution column, `tenant_id` default, or RLS policy definition.
3. Real personal data, real payment data or a licensed catalogue feed is proposed for import.
4. Query volume, storage growth or p95 latency approaches a point where single-node PostgreSQL is no longer sufficient.
5. A decision is taken to provision Citus, OpenSearch, pgvector/Milvus or a distributed audit store.
6. Break-glass access is used, expanded, or proposed for a non-Admin surface.
7. Admin coverage is expanded beyond counts, or a twentieth workspace / eleventh module is proposed.
8. Retention, backup, PITR or restore-drill evidence changes the audit or migration design.
9. Any change to hashing, redaction or secret handling in audit records.
10. A launch gate in [`../LAUNCH_READINESS.md`](../LAUNCH_READINESS.md) is claimed complete.
