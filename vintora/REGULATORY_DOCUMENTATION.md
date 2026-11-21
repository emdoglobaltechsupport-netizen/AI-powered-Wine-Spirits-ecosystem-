# Vintora Regulatory Documentation Index — No Launch Clearance

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This document separates regulatory evidence boundaries from onboarding in [`README.md`](./README.md) and investor planning in [`INVESTOR_DOCUMENTATION.md`](./INVESTOR_DOCUMENTATION.md). It is a register of controls and gaps, not counsel advice, certification or approval.

## Owner and review

| Item | Value |
|---|---|
| Owner role | Legal / Compliance Lead |
| Review cadence | Quarterly external review; per-change review for regulated claims |
| Canonical versions | policies `v1`, API `v1` |
| Status | Design/Prototype controls only; no regulator, counsel or signed review attached |
| Change control | [`CLAIMS_CHANGE_MANAGEMENT.md`](./CLAIMS_CHANGE_MANAGEMENT.md) and [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) |

## Regulatory control register

| Domain | Authority | Boundary |
|---|---|---|
| Jurisdictions and licensing | [`JURISDICTION_COMPLIANCE.md`](./JURISDICTION_COMPLIANCE.md), [`config/jurisdiction-compliance.json`](./config/jurisdiction-compliance.json) | 17 blocked records, 3 phase-1 design records, 14 Africa `design_target` markets; no live transactions |
| Legal sign-off | [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md), [`config/high-risk-features.json`](./config/high-risk-features.json) | All 17 high-risk features blocked; no counsel opinion attached |
| Vault | [`VAULT_LEGAL_BOUNDARIES.md`](./VAULT_LEGAL_BOUNDARIES.md), [`config/vault-boundaries.json`](./config/vault-boundaries.json) | Non-live blueprint; no real USDC, custody, title, suitability or investment advice |
| Data and privacy | [`DATA_GOVERNANCE.md`](./DATA_GOVERNANCE.md), [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md) | Data inventory, lawful-basis gaps, export/deletion workflows, identity separation, retention boundaries |
| Retention architecture | [`DATA_RETENTION_ARCHITECTURE.md`](./DATA_RETENTION_ARCHITECTURE.md) | Retention and deletion behaviour by data class; no enforced production retention job |
| Marketing and responsible drinking | [`MARKETING_EXTERNAL_ACTIONS.md`](./MARKETING_EXTERNAL_ACTIONS.md), [`RESPONSIBLE_DRINKING_CONTROLS.md`](./RESPONSIBLE_DRINKING_CONTROLS.md) | Sandbox-only, human approval, limits, harmful-use targeting denial and support notices |
| Payments and financial controls | [`FINANCIAL_CONTROLS.md`](./FINANCIAL_CONTROLS.md), [`FINANCIAL_ASSUMPTIONS.md`](./FINANCIAL_ASSUMPTIONS.md) | Simulated payments, reconciliation design, illustrative assumptions and Low confidence |
| Security | [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md), [`SECURITY.md`](./SECURITY.md) | Threat model, private disclosure, no penetration test or breach drill evidence |
| Network isolation | [`NETWORK_ISOLATION.md`](./NETWORK_ISOLATION.md), [`config/network-isolation-policy.json`](./config/network-isolation-policy.json) | Prototype secrets/databases bound to local networks; no shared or production network evidence |
| Evidence | [`EVIDENCE_INDEX.md`](./EVIDENCE_INDEX.md), [`config/evidence-index.json`](./config/evidence-index.json) | Links to available reports and explicit null evidence references |
| Status and release | [`STATUS_DASHBOARD.md`](./STATUS_DASHBOARD.md), [`config/status-dashboard.json`](./config/status-dashboard.json) | Phase 1 gates only; NO-GO; no hosted release promotion |

## Evidence boundary

No jurisdiction activation, licensed provider, regulator acknowledgement, signed counsel review, DPIA, real processing record, production consent receipt, external immutable audit sink or cross-border transfer mechanism is attached. Green repository checks prove Phase 1 metadata and local controls only. They are not a compliance review or launch approval.
