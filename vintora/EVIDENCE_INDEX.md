# Vintora Evidence Index

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/evidence-index.json`](./config/evidence-index.json); checked by `npm run evidence:check`. This index links repository registers, workflow definitions, and where available hosted Phase 1 CI run URLs. Attached CI run URLs are **Phase 1 gate parity only**; they are not launch approval, security audit evidence, load/performance evidence, or compliance sign-off. The register is not externally audited.

## 1. Tests

| ID | Register | Definitions | Result | Status |
|---|---|---|---|---|
| EV-T01 | [`VALIDATION_STATUS.md`](./VALIDATION_STATUS.md) | [`config/test-counts.json`](./config/test-counts.json), [`smoke.mjs`](./services/api/scripts/smoke.mjs), [`selftest.js`](./apps/prototype/selftest.js) | [45657006563](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45657006563) | Hosted CI pass (Phase 1 gate parity only) |
| EV-T02 | [`DATABASE_OPERATIONS.md`](./DATABASE_OPERATIONS.md) | [`migration-mode-check.ts`](./services/api/scripts/migration-mode-check.ts), [`ci-migrations.yml`](./.github/workflows/ci-migrations.yml) | [45657006702](https://github.com/emdoglobaltechsupport-netizen/AI-powered-Wine-Spirits-ecosystem-/actions/runs/45657006702) | Hosted CI pass (Phase 1 gate parity only) |

Hosted run URLs are attached for Phase 1 CI parity on commit `7185294`. They do not constitute coverage artefacts, load/performance evidence, security audit evidence, or launch approval.

## 2. Performance

| ID | Register | Definitions | Result | Status |
|---|---|---|---|---|
| EV-P01 | [`CAPACITY_AND_RELIABILITY.md`](./CAPACITY_AND_RELIABILITY.md) | [`config/capacity-model.json`](./config/capacity-model.json), [`config/status-dashboard.json`](./config/status-dashboard.json) | `null` | Targets, not measurements |

No load test, stress test, soak test, canary burn, p95/p99 by route or SLO error-budget measurement is attached.

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
