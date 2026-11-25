# Vintora Security and Dependency Policy

## 1. Supported state

> **Prototype mode — no real orders are placed. NO-GO for public launch.**

This repository is a Phase 1 prototype with Design-state security policy and workflow definitions. It is **not** a supported production deployment. See [`DISCLAIMER.md`](./DISCLAIMER.md) and [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md).

## 2. Reporting a vulnerability

Do not open a public issue for a security vulnerability. Use one private path:

1. **GitHub Security Advisories private vulnerability reporting** on the hosted repository, when enabled.
2. **`security@vintora.invalid`** — a reserved placeholder address, not a live mailbox. Replace it with a monitored private mailbox before any public release; until then, the repository owner's private GitHub contact is the fallback.

Machine authority: [`config/security-reporting.json`](./config/security-reporting.json). Include:

- affected component and version;
- reproduction steps or proof of concept;
- impact and affected environments;
- suggested remediation, if known.

The maintainer will acknowledge within 5 business days, triage severity within 5 business days, assign an owner and agree a coordinated disclosure timeline (default 90 days). Do not test against systems you do not own or have written permission to test. No hosted advisory inbox or on-call rota is attached to this workspace; this is a process definition, not an attestation.

## 3. Dependency policy

### 3.1 Sources and pinning

- npm is the verified package manager for the monorepo.
- `package-lock.json` is authoritative; CI uses `npm ci --legacy-peer-deps`.
- Dependencies must come from the public npm registry or an approved mirror.
- New production dependencies require a documented purpose, maintainer review and licence check.
- Secrets are environment variables only; never source, JSON fixtures or lockfile metadata.
- [`.env.example`](./.env.example) is credential-free: every secret key is an empty placeholder. `npm run setup` / `npm run setup:env` fills a gitignored `.env` with random local values; existing non-empty values are preserved unless `--force` is used. All seeded identities are local/test development material, never shared or production credentials. Known fixed legacy values are rejected by the setup doctor, API startup self-test and development-only seed. See [`config/credential-policy.json`](./config/credential-policy.json) and [`SETUP.md`](./SETUP.md#5-credential-rotation-and-access-revocation).
- Container credentials come from the generated `.env` through Compose interpolation and are never baked into the Dockerfile or image.

### 3.2 Update cadence

| Severity | Triage | Mitigation / patch target |
|---|---|---|
| Critical | Within 4 business hours | Mitigate or disable within 24 hours; patch within 72 hours; never exempt |
| High | Within 1 business day | Patch within 7 calendar days; time-boxed exception requires Platform Security and a compensating control |
| Moderate | Within 5 business days | Patch within 30 calendar days or documented, time-boxed exception |
| Low | Next maintenance cycle | Remediate within 90 calendar days where practical |
| Unscored / disputed | Within 5 business days | Treat as the highest plausible severity until scored |

Routine dependency, GitHub Action and container-image updates are proposed by weekly Dependabot PRs. SBOM regeneration is required in the same PR as any dependency change. Full detail is in [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md).

### 3.3 Severity gates

The release audit gate blocks:

- any critical advisory in the production workspace set;
- any unapproved high or moderate advisory;
- any expired exception;
- an SBOM that does not match `package-lock.json`.

The production workspace set is `@vintora/api`, `@vintora/shared`, `@vintora/prototype` and `@vintora/db`. The `apps/web` and `apps/mobile` shells are non-production scaffolding; their advisories are reported in the full audit report but do not gate this Phase 1 release. They must remain clear before those surfaces are promoted.

### 3.4 Exceptions

A temporary exception must be recorded in [`security/audit-exceptions.json`](./security/audit-exceptions.json) with:

- package and severity;
- named owner;
- business reason;
- remediation plan;
- expiry date no more than 90 days out;
- link to a tracking issue or ADR.

Exceptions never apply to critical advisories. CI rejects expired entries.

### 3.5 Resolved exception

The former `zod@3.25.76` high-severity exception was owned by Platform Security and expired 2026-12-31. It has been closed by migrating API validation to `zod@4.6.7`, rerunning typechecks, shared tests, API build and smoke, and removing the entry from [`security/audit-exceptions.json`](./security/audit-exceptions.json). The exception remains recorded only as baseline history in [`security/dependabot-triage.json`](./security/dependabot-triage.json).

### 3.6 Dependency remediation and triage

The hosted alerts were triaged on 2026-11-25 and remediated in the same register: 39 baseline alerts (1 critical, 28 high, 10 medium), 22 baseline npm package records and one baseline scoped `zod` record. The current local full audit and blocking scoped production audit both report **0 vulnerabilities**, and the post-remediation hosted Dependabot rescan reports **0 open alerts** with evidence recorded in [`security/dependabot-triage.json`](./security/dependabot-triage.json). Remediation upgraded `zod` to 4.6.7, `next` to 16.4.6, `expo` to 58.0.26 and `react-native` to 0.88.1 (aligned with Expo 58), and added a scoped `@expo/fingerprint` `minimatch@11.0.9` override. The former critical `tar` finding disappeared with the older Expo tree. Hosted gate parity and zero dependency alerts do not change the NO-GO verdict or supply production security evidence.

### 3.7 Licence policy

[`config/license-policy.json`](./config/license-policy.json) is the machine-readable licence register. `npm run licenses:check` scans every third-party package in `package-lock.json`, skips first-party workspaces and enforces three classes: allowed permissive licences, review-required licences with named package-family approvals, and denied copyleft/network licences. A missing or expired approval blocks the build. Licence values are retained in the SBOM so evidence can be rechecked after installation.

## 4. Software bill of materials

- Format: CycloneDX 1.5 JSON.
- Location: [`sbom/vintora.cdx.json`](./sbom/vintora.cdx.json).
- Source of truth: `package-lock.json`.
- Generated by `npm run sbom:generate`.
- CI verifies freshness with `npm run sbom:generate -- --check`.
- Dev-only components are included with `scope: "excluded"`; optional components use `scope: "optional"`.
- Component hashes are derived from lockfile integrity values where available.
- Licences are read from installed package manifests; missing licences are reported as `NOASSERTION`.
- When a package is not installed locally, the licence recorded in `package-lock.json` (captured from its manifest at lock time) is used so local and CI checks stay deterministic; `NOASSERTION` is used if neither source has one.
- The SBOM contains no secrets or personal data.
- The committed SBOM is retained as release evidence with checksums and signatures; release evidence is retained for 365 days.

## 5. Security scanning in CI

| Workflow | Check |
|---|---|
| `ci-typecheck-tests.yml` | API/shared typechecks, shared tests, domain selftests and `npm run secrets:scan` via `ci:verify` |
| `ci-migrations.yml` | PostgreSQL 16 setup with throwaway generated test secrets; idempotency proof |
| `ci-security.yml` | Deterministic secret scan, optional gitleaks, full audit report, scoped release gate, SBOM freshness, licence and artifact-pin checks, CodeQL |
| `ci-supply-chain.yml` | Trivy container and IaC scans, SARIF reporting, licence/pin/SBOM policy checks |
| `ci-build.yml` | Scoped builds, JS syntax checks, SBOM check |
| `release.yml` | Build once, block on High/Critical image findings, cosign sign and verify, retain evidence |

Dependabot monitors npm and GitHub Actions weekly.

### 5.1 Secret scanning

`npm run secrets:scan` is a deterministic, offline repository scan. It checks high-entropy credential assignments, known provider token formats, private-key headers, fixed database/session placeholders, database password literals and legacy demo-password patterns. It excludes the gitignored `.env` by design and separately enforces that `.env.example` contains empty placeholders only. Any finding blocks `ci:verify`, `npm run setup` and the release. `npm run credentials:check` adds profile, seed-path and generated-credential assertions.

`ci-security.yml` also runs gitleaks with [`config/gitleaks.toml`](./config/gitleaks.toml), which adds Vintora-specific denylist rules. When `GITLEAKS_LICENSE` is not configured, gitleaks is advisory and the deterministic scanner remains the blocking gate. Never add a real credential to a fixture, document, workflow or test simply to satisfy a scanner.

### 5.2 Licence, container and IaC scanning

`npm run licenses:check` is an offline licence gate driven by [`config/license-policy.json`](./config/license-policy.json). `ci-supply-chain.yml` builds the local image from the pinned Dockerfile, runs Trivy against the image and the repository IaC/configuration, publishes both SARIF reports to GitHub Code Scanning (upload failures block the job) and retains them as artifacts. PR container/IaC findings are advisory until triaged; the release workflow blocks on untriaged High/Critical findings.

### 5.3 Code-scanning triage

Hosted CodeQL and Trivy findings are recorded in [`security/code-scanning-triage.json`](./security/code-scanning-triage.json) and checked by `npm run code-scanning-triage:check`. The 2026-11-25 baseline was 143 open alerts: 105 Trivy (104 image, 1 IaC) and 38 CodeQL, including five critical image advisories. The critical findings were removed by moving the Dockerfile from the unsupported Node 20 Bookworm base to the supported, digest-pinned Node 24 Trixie base; a container `HEALTHCHECK` was added for the Trivy IaC finding. Startup logs were reduced to fixed mode labels, Windows argument quoting was hardened, and the static prototype server now verifies realpath containment. The 22 `js/missing-rate-limiting` findings were then addressed by replacing the custom middleware with the CodeQL-recognised `express-rate-limit` package, installed before all prototype routes including the SPA fallback; distributed limiting remains a production gap. Remaining CodeQL findings have named owners, rationales and follow-up work in the register; none is waived as launch approval. The first hosted rescan reported 55 open alerts (0 critical, 42 high, 12 medium, 1 low), down from 143, with the five critical image advisories and the IaC healthcheck finding closed; a further rescan for the rate-limit change is pending. No critical advisory is excepted and the verdict remains **NO-GO**.

### 5.4 Immutable artifacts and release signing

[`config/artifact-policy.json`](./config/artifact-policy.json) declares the approved digest for every base image and requires digest-only promotion, SHA-pinned actions, checksums, signatures and 365-day evidence retention. `npm run artifacts:check` verifies the Dockerfile, Compose file and all workflow action references. [`release.yml`](./.github/workflows/release.yml) builds one image, signs it and the SBOM/checksums with cosign keyless OIDC, then verifies both before the release is considered valid. No signing key is stored in the repository. See [`DEPENDENCY_MANAGEMENT.md`](./DEPENDENCY_MANAGEMENT.md).

**Signed-release caveat:** digest pinning, cosign signing and release promotion are configured but not executed in this local workspace; no release artifact is signed. The `npm run sbom:check`, `npm run licenses:check`, `npm run artifacts:check` and `npm run secrets:scan` gates have local evidence only for Phase 1 repository checks.

## 6. Secure development requirements

- Input validation at every HTTP boundary with Zod schemas.
- Central error handler; no stack traces or internal details in production responses.
- Password hashing with scrypt and per-user salt.
- Session tokens hashed with SHA-256 before persistence.
- No raw card data, CVV, government ID or secrets in logs.
- Append-only audit for approvals, catalogue writes and financial events.
- Human approval for publish, pricing, refunds, disputes and agent escalation.
- Internal agents use a deny-by-default tool allowlist, distinct human approval for high-impact advice, credential/network isolation, prompt-injection rejection and an append-only decision/tool-call audit; see [`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md) and `npm run agents:check`.
- Agent execution is disabled and the independent agent kill switch cannot be reset in the prototype.
- Optional personal-data use is off until explicit, versioned, purpose-limited consent; sensitive/health-adjacent data is never profiled, and tenant and subject RLS are enforced together. See [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md) and `npm run privacy:check`.
- AI-generated marketing is draft-only: distinct human approval, geography/age deny lists, alcohol-ad claim validation, blocked budget increases and immutable decision audit are enforced before any advisory output. See [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md) and `npm run marketing:check`.
- Local demo credentials are generated first-run, rejected outside `local`/`test`, and rotated with session revocation as documented in [`SETUP.md`](./SETUP.md#5-credential-rotation-and-access-revocation); no fixed password is published or reusable.
- Production startup is disabled until the launch gates are complete.

## 7. Known scope limitations

- Production IdP, MFA and secret manager are not implemented.
- Distributed rate limiting and centralised audit retention are not implemented.
- Penetration test, restore drill, DR failover and load test are outstanding.
- Web and mobile shells were remediated to zero local npm advisories but remain non-production scaffolding, not promoted surfaces.
- GitHub-hosted Trivy and release-signing workflows are configured but no local container build or signed release artifact exists; hosted scans remain Phase 1 gate evidence only.
- No timed agent kill-switch drill, live agent egress policy, WORM audit retention or high-impact tool review record exists; all agent operation remains advisory simulation.
- GitHub branch protection is enabled on `main` with 15 required Phase 1 check contexts, and code scanning is enabled through Vintora-managed advanced CodeQL/Trivy workflows with blocking SARIF uploads; GitHub default setup is disabled to avoid conflicting analyses. Settings metadata and a hosted evidence reference are recorded in [`config/repository-policy.json`](./config/repository-policy.json). `enforce_admins` is false and no GitHub DCO app or independent reviewer is configured, so direct admin maintenance can bypass reviews; DCO sign-off and distinct-review approval remain CI policy checks only.

Do not infer from a green CI run that the project is production-secure. Green CI means the documented Phase 1 gates passed.
