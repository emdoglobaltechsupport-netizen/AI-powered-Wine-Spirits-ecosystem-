# Vintora Launch Readiness

**Status: NO-GO for a public production launch.** This repository is a Phase 1 prototype with a Design-state launch checklist. It is safe to run locally for demonstrations and development; it must not process live orders or be presented as a live alcohol marketplace.

A green verification run proves **Phase 1 gates only**. Lifecycle state is governed by [`config/implementation-status.json`](./config/implementation-status.json); no documentation-only change can close a launch gate or promote a module or environment from Design or Prototype to Pilot or Production.

## What is verified here

- The offline catalogue pipelines passed their bundled checks: catalogue **18**, accessories **36**, and Africa Marketplace **45** assertions.
- The API TypeScript project type-checks with the installed dependencies.
- Development data, identities and provider integrations are explicitly labelled as simulated or deterministic.
- Internal ADM-19 agents are advisory-only: `npm run agents:check` verifies the 24-agent register, least-privilege tools, distinct approval, injection defence, append-only audit and independent safe-stop; `executionEnabled` is false and no timed kill-switch drill has been performed.

## Required before a public launch

- Implement and independently test live payment, age-assurance/KYC and AI provider adapters; retain deterministic adapters only for test environments.
- Obtain jurisdiction-specific alcohol marketplace, fulfilment, tax, marketing and privacy approvals for each enabled country and state/region.
- Replace every local-only demo identity and generated seed credential with a production identity provider; keep `db:seed:dev` incapable of running outside `local`/`test` and never carry these credentials into a shared environment. See [`SETUP.md`](./SETUP.md#5-credential-rotation-and-access-revocation).
- Use a production identity provider with MFA, account recovery, rate limiting and abuse/fraud controls. Enforce one primary role per tenant, deny-by-default authorization, live time-boxed elevation on every privileged route, and real KYB/licence/contract/investor checks before replacing the simulated boundary policy; complete an external security review and penetration test.
- Load a licensed, reviewed catalogue with verified inventory, pricing, tax, imagery, provenance and supplier contracts. Do not use the bundled demo catalogue as live inventory.
- Configure HTTPS, secret management, backups, disaster recovery, monitoring, alerting, incident response and on-call ownership; prove them with a restore and failover drill.
- CI now covers type checks, shared/API tests, offline domain selftests, migration idempotency, dependency/security/licence/secret scanning, container/IaC scanning, SBOM freshness and scoped builds. Browser-flow CI, load testing and an external penetration test remain outstanding.
- Build the production image once from digest-pinned inputs, retain its SBOM and scan reports, and sign/verify the image and checksums before promotion. The release workflow is configured but has not produced a signed artifact in this workspace.
- For any agent autonomy proposal, produce a real worker kill-switch drill under 60 seconds, sandbox/canary/replay evidence, prompt-injection red-team results, high-impact tool review records and distinct Legal/Compliance sign-off; none is claimed today.
- For AI personalization, complete a DPIA, signed data inventory, lawful-basis record, enforced retention/DSAR workflows and withdrawal propagation; optional purposes are off and closed-loop profiling is disabled today.
- For AI-generated marketing, produce jurisdiction-specific alcohol-advertising validation, recorded human approvals with prompt/model/payload hashes, rendered-preview and audience verification, budget-owner validation, immutable audit retention, rollback execution, kill-switch drill results and anomaly alerting; only sandbox drafts and simulated pause/rollback exist today.
- Complete the data-inventory, lawful-basis, retention, deletion, withdrawal-propagation and cross-border transfer evidence described in [`DATA_GOVERNANCE.md`](./DATA_GOVERNANCE.md); no production consent receipt, DPIA or transfer mechanism exists today.
- Complete the responsible-drinking policy review covering minors, addiction and health-sensitive contexts, plus measured velocity outcomes and immutable screening events; the deterministic limits in [`RESPONSIBLE_DRINKING_CONTROLS.md`](./RESPONSIBLE_DRINKING_CONTROLS.md) are prototype guardrails only.
- Complete PCI, privacy, accessibility and responsible-drinking reviews appropriate to the launch markets.
- Record executive, compliance and operations go/no-go approval, plus a rollback and customer-support plan.

## Governance references

- [`DISCLAIMER.md`](./DISCLAIMER.md) — maturity and compliance boundary.
- [`FEATURE_STATUS.md`](./FEATURE_STATUS.md) — implementation, regulation and production-readiness matrix.
- [`API_POLICY.md`](./API_POLICY.md) — versioning, compatibility, auth, rate limiting, idempotency and audit requirements.
- [`IDENTITY_ACCESS_BOUNDARIES.md`](./IDENTITY_ACCESS_BOUNDARIES.md) and [`config/identity-access-policy.json`](./config/identity-access-policy.json) — consumer, merchant, distributor, investor and Admin boundaries; `npm run identity:check`.
- [`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md), [`adr/ADR-0005-agent-boundaries.md`](./adr/ADR-0005-agent-boundaries.md) and [`config/agent-autonomy-policy.json`](./config/agent-autonomy-policy.json) — advisory-only internal agents; `npm run agents:check`.
- [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md) and [`config/privacy-consent-policy.json`](./config/privacy-consent-policy.json) — purpose-limited consent, data minimization, simulated DSAR and DPIA gate; `npm run privacy:check`.
- [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md) and [`config/marketing-release-policy.json`](./config/marketing-release-policy.json) — draft-only campaign release, human approval, deny lists, spend cap and audit; `npm run marketing:check`.
- [`DATA_GOVERNANCE.md`](./DATA_GOVERNANCE.md) and [`config/data-governance-policy.json`](./config/data-governance-policy.json) — inventory, lawful bases, identity separation, lifecycle, retention and transfer gates; `npm run data-governance:check`.
- [`MARKETING_EXTERNAL_ACTIONS.md`](./MARKETING_EXTERNAL_ACTIONS.md) and [`config/marketing-external-actions.json`](./config/marketing-external-actions.json) — sandbox-only external actions, approval, preview, budget owner, legal review and kill switch; `npm run external-actions:check`.
- [`RESPONSIBLE_DRINKING_CONTROLS.md`](./RESPONSIBLE_DRINKING_CONTROLS.md) and [`config/responsible-drinking-policy.json`](./config/responsible-drinking-policy.json) — limits, harmful-use targeting denial, support notices, re-verification and review gaps; `npm run responsible-drinking:check`.
- [`FINANCIAL_CONTROLS.md`](./FINANCIAL_CONTROLS.md) — reconciliation and dispute workflows.
- [`PRIVACY_ACCESSIBILITY_INCLUSIVITY.md`](./PRIVACY_ACCESSIBILITY_INCLUSIVITY.md) — privacy-by-design, WCAG 2.2 AA and inclusivity requirements; no audit has been completed.
- [`MARKET_FORECAST_PROVENANCE.md`](./MARKET_FORECAST_PROVENANCE.md) and [`config/market-forecasts.json`](./config/market-forecasts.json) — sources, confidence and evidence status for all figures.
- [`CANON_GOVERNANCE.md`](./CANON_GOVERNANCE.md) — canon ownership and four-eyes change control.
- [`ROADMAP.md`](./ROADMAP.md) — design targets separated from runnable functionality and blocked work.
- [`LEGAL_COMPLIANCE_SIGNOFF.md`](./LEGAL_COMPLIANCE_SIGNOFF.md) and [`config/high-risk-features.json`](./config/high-risk-features.json) — legal/compliance activation gate; all features blocked.
- [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md), [`config/license-policy.json`](./config/license-policy.json) and [`config/artifact-policy.json`](./config/artifact-policy.json) — dependency/container maintenance, licence and digest-pin policy, patch timelines and release signing.
- [`SECURITY.md`](./SECURITY.md), [`security/audit-exceptions.json`](./security/audit-exceptions.json), [`sbom/vintora.cdx.json`](./sbom/vintora.cdx.json) and `npm run secrets:scan` — dependency policy, exceptions, SBOM and credential scanning.
- [`adr/`](./adr/README.md) — architecture decision records.
- [`.github/workflows/`](./.github/workflows/) — Phase 1 CI gates.

## Deployment safeguard

`NODE_ENV=production` is deliberately rejected at startup. This prevents a configuration change from exposing simulated commerce controls as a live service. Enable production only after every item above is complete and the guard is replaced by explicit, audited launch controls.
