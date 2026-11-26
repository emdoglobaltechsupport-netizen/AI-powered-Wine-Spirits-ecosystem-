# Vintora Evidence Index

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/evidence-index.json`](./config/evidence-index.json); checked by `npm run evidence:check`. This index links repository registers, workflow definitions, and where available hosted Phase 1 CI run URLs. Attached CI run URLs are **Phase 1 gate parity only**; they are not launch approval, security audit evidence, load/performance evidence, or compliance sign-off. The register is not externally audited.

## 1. Tests

| ID | Register | Definitions | Result | Status |
|---|---|---|---|---|
| EV-T01 | [`VALIDATION_STATUS.md`](./VALIDATION_STATUS.md) | [`config/test-counts.json`](./config/test-counts.json), [`smoke.mjs`](./services/api/scripts/smoke.mjs), [`selftest.js`](./apps/prototype/selftest.js) | [45814305700](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45814305700) | Hosted CI pass (Phase 1 gate parity only) |
| EV-T02 | [`DATABASE_OPERATIONS.md`](./DATABASE_OPERATIONS.md) | [`migration-mode-check.ts`](./services/api/scripts/migration-mode-check.ts), [`ci-migrations.yml`](./.github/workflows/ci-migrations.yml) | [45814306192](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45814306192) | Hosted CI pass (Phase 1 gate parity only) |
| EV-T03 | [`DATABASE_OPERATIONS.md`](./DATABASE_OPERATIONS.md) | [`scripts/local-dr-drill.mjs`](./scripts/local-dr-drill.mjs), [`config/database-operations.json`](./config/database-operations.json) | `null` (local prototype result: [`evidence/local-dr-drill.json`](./evidence/local-dr-drill.json)) | Local prototype drill only; external and production recovery refs remain `null` |
| EV-T04 | [`ADMIN_ACCESS_CONTROLS.md`](./ADMIN_ACCESS_CONTROLS.md) | [`services/api/scripts/admin-control-walkthrough.mjs`](./services/api/scripts/admin-control-walkthrough.mjs), [`config/admin-access-policy.json`](./config/admin-access-policy.json) | `null` (local prototype result: [`evidence/local-admin-control-walkthrough.json`](./evidence/local-admin-control-walkthrough.json)) | Local prototype control walkthrough only; external and production refs remain `null` |

Hosted run URLs are attached for Phase 1 CI parity on commit `b7bdf75`. They do not constitute coverage artefacts, load/performance evidence, security audit evidence, or launch approval. EV-T03 is a local prototype logical restore drill, not hosted or production recovery evidence; it does not close the backup, PITR, failover, RTO or RPO gap. EV-T04 exercises the generated local seeded admin identity against the prototype API; it is not production IdP/MFA proof, an immutable audit sink test, a break-glass incident drill or launch approval.

## 2. Performance

| ID | Register | Definitions | Result | Status |
|---|---|---|---|---|
| EV-P01 | [`CAPACITY_AND_RELIABILITY.md`](./CAPACITY_AND_RELIABILITY.md) | [`config/capacity-model.json`](./config/capacity-model.json), [`config/status-dashboard.json`](./config/status-dashboard.json) | `null` | Targets, not measurements |
| EV-P02 | [`CAPACITY_AND_RELIABILITY.md`](./CAPACITY_AND_RELIABILITY.md) | [`services/api/scripts/local-load-baseline.mjs`](./services/api/scripts/local-load-baseline.mjs), [`config/capacity-model.json`](./config/capacity-model.json) | `null` (local prototype result: [`evidence/local-load-baseline.json`](./evidence/local-load-baseline.json)) | Local sequential loopback baseline only; not an SLO or p95/p99-by-route result |

No load test, stress test, soak test, canary burn, p95/p99 by route or SLO error-budget measurement is attached. EV-P02 is a small sequential loopback baseline of the prototype API; the capacity targets, unrun test plans and SLO measurement status remain unchanged.

## 3. Threat models

| ID | Register | Definitions | Result | Status |
|---|---|---|---|---|
| EV-S01 | [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md) | [`config/security-architecture.json`](./config/security-architecture.json), [`SECURITY.md`](./SECURITY.md), [`config/security-reporting.json`](./config/security-reporting.json) | `null` | Design threat model only |

No penetration test, independent security audit, RLS cross-tenant run, KMS evidence or breach drill is attached.

## 4. Compliance reviews

| ID | Register | Definitions | Result | Status |
|---|---|---|---|---|
| EV-C01 | [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md) | [`config/high-risk-features.json`](./config/high-risk-features.json), [`REGULATORY_DOCUMENTATION.md`](./REGULATORY_DOCUMENTATION.md), [`config/claims-change-management.json`](./config/claims-change-management.json) | `null` | Blocked register only |

No signed counsel review, DPIA, regulator acknowledgement, compliance certificate or jurisdiction activation is attached.

## 5. Review

The Release Manager, Platform Security Lead and Legal / Compliance Lead review this index at each gate change and quarterly. A `null` result must remain null until the actual artefact is attached and reviewed; documentation-only changes cannot close an evidence gap.
