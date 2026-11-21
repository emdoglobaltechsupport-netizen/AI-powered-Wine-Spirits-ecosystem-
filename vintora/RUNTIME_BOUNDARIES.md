# Vintora runtime, adapter and privileged-action boundaries

> **MATURITY: PHASE 1 PROTOTYPE. NO-GO for public launch.**
> **Prototype mode — no real orders are placed.** A green boundary check proves Phase 1 gates only.

This document is the human-readable companion to [`config/runtime-boundaries.json`](./config/runtime-boundaries.json). The register is enforced by `scripts/check-runtime-boundaries.mjs` (`npm run boundaries:check`) and by an API startup self-test in `services/api/src/config.ts`. It does not grant launch permission.

## 1. Runtime profiles

`RUNTIME_PROFILE` selects `local`, `test`, `staging` or `production`. If it is unset, the profile is derived from `NODE_ENV`: `development` → `local`, `test` → `test`, `staging` → `staging`, `production` → `production`. An unset `NODE_ENV` is treated as `development`, matching the API configuration default. `NODE_ENV` and the resolved profile must agree or startup fails.

| Profile | `NODE_ENV` | Lifecycle state | Demo identities | Simulated adapters | Real adapters | Status |
|---|---|---|---|---|---|---|
| `local` | `development` | **Prototype** | allowed for throwaway data only | default | blocked | Supported local prototype |
| `test` | `test` | **Prototype** | allowed for throwaway data only | default | blocked | Supported deterministic checks |
| `staging` | `staging` | **Design** | blocked | requires `ALLOW_SIMULATED_PROVIDERS=true` | blocked | Configuration target only; no hosted run is attached |
| `production` | `production` | **Design** | blocked | blocked | blocked | Blocked at startup; launch, licence and provider evidence gates are unsatisfied |

Lifecycle states follow [`config/implementation-status.json`](./config/implementation-status.json) and [`README.md`](./README.md): no runtime profile is Pilot or Production. Demo seeding also requires `ALLOW_DEMO_SEED=true`. That flag is valid only in `local` and `test`; `staging` and `production` fail closed. The API rejects `NODE_ENV=production` before route registration.

## 2. Adapter defaults and opt-ins

Every provider defaults to a simulated adapter in non-production. A real adapter requires **all** of the following, and this repository currently satisfies none of them:

1. `REAL_PROVIDER_OPT_IN=true`.
2. The provider-specific opt-in below set to `true`.
3. A distinct credential for the selected adapter and profile, named by `REAL_{PROVIDER}_KEY_{PROFILE}` (for example, `REAL_PAYMENT_KEY_STAGING`). Generic keys and keys reused across profiles are rejected.
4. Distinct Legal and Compliance launch approvals, an approved guard-removal record, a satisfied high-risk feature record and obtained commercial licence evidence with references.

| Adapter | Provider variable | Real opt-in variable | Default |
|---|---|---|---|
| Age assurance | `AGE_VERIFICATION_PROVIDER` | `REAL_AGE_PROVIDER_OPT_IN` | `local` |
| Identity/KYC | `KYC_PROVIDER` | `REAL_KYC_PROVIDER_OPT_IN` | `local` |
| Payment authorisation | `PAYMENT_PROVIDER` | `REAL_PAYMENT_PROVIDER_OPT_IN` | `simulated` |
| Marketing automation | `MARKETING_PROVIDER` | `REAL_MARKETING_PROVIDER_OPT_IN` | `simulated` |
| Custody / investment settlement | `CUSTODY_PROVIDER` | `REAL_CUSTODY_PROVIDER_OPT_IN` | `simulated` |
| AI inference | `AI_PROVIDER` | `REAL_AI_PROVIDER_OPT_IN` | `deterministic` |

`ALLOW_SIMULATED_PROVIDERS` is `true` by default for local/test and must be explicitly set for `staging`. Unknown adapter labels, unlabelled provider values and `real` values without full evidence fail closed. `STRIPE_SECRET_KEY`, `ADYEN_API_KEY`, `OPENAI_API_KEY` and the Africa gateway placeholders remain empty, unused examples; they are not credentials and must never be populated in this prototype.

Payment has an additional runtime fail-closed adapter: only the exact `simulated` value can produce `simulated_clear`; any other value returns `unknown` and checkout blocks. Age, KYC, AML, sanctions and payment evidence must still satisfy the separate [commerce safeguards](./COMMERCE_SAFEGUARDS.md) evaluator before quote or order.

## 3. Privileged-action audit registry

Every privileged action in `config/runtime-boundaries.json` has a unique audit event. The event names must appear in this document and in the machine register; the checker fails on duplicates or omissions.

| Privileged action | Audit event | Approval mode |
|---|---|---|
| `admin.elevation.grant` | `admin_elevation_granted` | Distinct human approver |
| `admin.elevation.revoke` | `admin_elevation_revoked` | Session owner or admin |
| `commerce.age.assertion.write` | `age_assertion_written` | System evidence |
| `commerce.safeguard.decision.write` | `commerce_safeguard_decision_written` | Fail-closed evaluator |
| `commerce.age.reverification.required` | `age_reverification_required` | Policy trigger |
| `commerce.age.fulfilment.check` | `fulfilment_age_check_required` | Carrier evidence |
| `marketing.campaign.release` | `marketing_campaign_released` | Distinct human approver |
| `marketing.budget.increase` | `marketing_budget_increase_blocked` | Distinct human approver |
| `agent.tool.execute` | `agent_tool_call_evaluated` | Advisory only |
| `privacy.dsar.export` | `privacy_export_requested` | Data-subject confirmation |
| `privacy.dsar.delete` | `privacy_deletion_requested` | Data-subject confirmation |
| `catalogue.verified.import` | `catalogue_verified_import` | Rights evidence |

Current audit storage is local: stdout request audit plus append-only domain tables for identity, agents, privacy, marketing and commerce decisions. Admin actions now have a database-enforced append-only trigger (`0019_admin_action_audit_append_only.sql`). No centralised retained/WORM sink exists. `staging` and `production` transitions require that retained sink, retention policy and drill evidence; none is present.

## 4. Startup self-test and CI gate

At API startup, `config.ts` resolves the profile, loads the boundary/launch/licence/high-risk registers and calls `evaluateRuntimeBoundaries()`. Startup throws with a list of violations when any boundary is crossed. The same contract is checked offline by:

- `npm run boundaries:check` — profile, adapter, opt-in, credential-pattern, licence, high-risk, age-policy and audit-registry assertions.
- `npm run setup:doctor -- --offline` — environment contract and profile/flag checks without a database.
- `npm run ci:verify` — includes both checks on every push and pull request.

These are Phase 1 gates only. They prove the prototype cannot accidentally cross a boundary in this repository; they do not prove provider readiness, regulatory approval or launch permission.

## 5. Evidence gaps

- No licensed age, KYC, AML, sanctions or PSP provider is integrated or credentialled.
- No staging or production credential set exists; `REAL_{PROVIDER}_KEY_{PROFILE}` is a contract only.
- No centralised retained audit store, retention job or WORM export exists.
- The production guard is intentionally still present; replacing it requires distinct legal/compliance sign-offs and recorded guard-removal approval.
