# Vintora Dependency, Vulnerability and Supply-Chain Management

> **MATURITY: PHASE 1 PROTOTYPE + DESIGN-STATE DOCUMENTATION. NO-GO for public production launch.**
> **Prototype mode — no real orders are placed.** The controls below are implemented for the local prototype and CI scaffold; they are not evidence that the project is production-secure.

This document is the authoritative answer to how npm packages, container images, CI actions and release artifacts are maintained. It complements [`SECURITY.md`](./SECURITY.md), which defines the dependency policy and vulnerability reporting route.

## 1. Control summary

| Control | Implementation | Evidence / status |
|---|---|---|
| Automated dependency updates | [`dependabot.yml`](./.github/dependabot.yml) opens weekly grouped PRs for npm, GitHub Actions and Docker base images | Configured |
| Vulnerability reporting | Private disclosure route in [`SECURITY.md`](./SECURITY.md) §2 | Documented |
| Dependency vulnerability scanning | `npm audit` full report plus scoped production release gate in `ci-security.yml` | Configured; scoped gate enforces documented exceptions |
| SBOM generation and retention | CycloneDX 1.5 at [`sbom/vintora.cdx.json`](./sbom/vintora.cdx.json); `npm run sbom:generate` / `sbom:check` | Passing; 991 components |
| Secret scanning | Deterministic offline `npm run secrets:scan`; advisory gitleaks in CI | Passing locally; gitleaks requires `GITLEAKS_LICENSE` to become blocking |
| Licence scanning | Offline `npm run licenses:check` with [`config/license-policy.json`](./config/license-policy.json) | Passing; 873 third-party packages checked |
| Container and IaC scanning | Trivy config/image scans in [`ci-supply-chain.yml`](./.github/workflows/ci-supply-chain.yml); release scan blocks High/Critical | Workflow configured; GitHub-hosted scans not executed locally |
| Immutable artifact pinning | Digest-pinned base images, SHA-pinned actions and `npm run artifacts:check` | Passing locally |
| Artifact signing and verification | Cosign keyless signing in [`release.yml`](./.github/workflows/release.yml), with image and blob verification | Workflow configured; no local release has been signed |
| Evidence retention | Audit reports, SARIF, SBOM, checksums, signatures and certificates retained for 365 days | Release workflow configured |

## 2. Ownership

| Role | Responsibility |
|---|---|
| Maintainer / repository owner | Receives private vulnerability reports, assigns severity and owner, approves dependency PRs |
| Platform Security | Owns this policy, severity rubric, exceptions, licence approvals and release verification |
| Platform Engineering | Owns Dockerfile, Compose, image digest refreshes and CI action updates |
| Domain owners (@vintora/api, @vintora/shared, @vintora/db, @vintora/prototype) | Triage advisories in their workspace and implement patches |
| Release manager | Confirms scans, signatures and checksums before promoting a digest |

## 3. Sources, pinning and update cadence

- npm is the verified package manager. `package-lock.json` is authoritative; CI installs with `npm ci --legacy-peer-deps`.
- Production npm scopes are `@vintora/api`, `@vintora/shared`, `@vintora/prototype` and `@vintora/db`. `apps/web` and `apps/mobile` are non-production shells; their advisories are reported but do not gate Phase 1.
- Base images are pinned by registry digest in [`config/artifact-policy.json`](./config/artifact-policy.json) and referenced from `Dockerfile` and `docker-compose.yml`.
- GitHub Actions are pinned to commit SHAs with a trailing version comment. Dependabot may update them; `npm run artifacts:check` rejects mutable tags.
- Dependabot opens grouped updates weekly. A Docker update PR must also refresh the corresponding digest in `config/artifact-policy.json` before CI can pass.
- Refresh a digest from the registry, then commit the value in both places:

```bash
docker buildx imagetools inspect node:20-bookworm-slim --format "{{.Manifest.Digest}}"
docker buildx imagetools inspect pgvector/pgvector:pg16 --format "{{.Manifest.Digest}}"
docker buildx imagetools inspect redis:7-alpine --format "{{.Manifest.Digest}}"
```

## 4. Severity and patch timelines

Timelines run from triage confirmation. A fix may be a patch, a safe configuration change or a temporary feature disable behind an existing gate.

| Severity | Triage | Mitigation / patch target | Exception policy |
|---|---|---|---|
| Critical | Within 4 business hours | Mitigate or disable within 24 hours; patch within 72 hours | Never exempt; blocks all promotion |
| High | Within 1 business day | Patch within 7 calendar days | Only with Platform Security approval and a compensating control |
| Moderate | Within 5 business days | Patch within 30 calendar days | Documented, time-boxed exception allowed |
| Low | Next planned maintenance cycle | Remediate within 90 calendar days where practical | Track to closure; no silent waiver |
| Unscored / disputed | Within 5 business days | Treat as the highest plausible severity until scored | Owner must record the scoring rationale |

Exceptions are recorded in [`security/audit-exceptions.json`](./security/audit-exceptions.json) for npm advisories and in the release approval record for scan findings. Every exception needs a package/finding, named owner, reason, remediation plan, tracking link and expiry no more than 90 days out. Expired entries fail CI. Critical advisories are never excepted.

Current exception: `zod@3.25.76`, owner Platform Security, expires `2026-12-31`. See [`SECURITY.md`](./SECURITY.md) §3.5.

## 5. Automated scanning

| Stage | Command / workflow | Blocking behaviour |
|---|---|---|
| Local and PR verification | `npm run ci:verify` | Typechecks, domain tests, secret scan, licence scan, pin check, gates and forecasts all block |
| Build verification | `npm run ci:build` | Scoped builds and SBOM freshness block |
| Security PR checks | [`ci-security.yml`](./.github/workflows/ci-security.yml) | Deterministic secret scan, scoped audit gate, licence check, pin check, SBOM and CodeQL block; gitleaks is advisory without a license |
| Supply-chain PR checks | [`ci-supply-chain.yml`](./.github/workflows/ci-supply-chain.yml) | Policy checks block; Trivy SARIF is reported to GitHub Security and retained |
| Release promotion | [`release.yml`](./.github/workflows/release.yml) | Trivy High/Critical findings block; signature verification must pass |

Full `npm audit` output is retained as `audit-full.json` but is informational because it includes non-production shells. The scoped gate writes `audit-scoped.json` and applies only matching, unexpired exceptions.

## 6. Licence policy

[`config/license-policy.json`](./config/license-policy.json) defines three classes:

- **Allowed** — permissive/public-domain licences such as MIT, ISC, Apache-2.0 and BSD variants.
- **Review-required** — MPL-2.0, LGPL-3.0-or-later, CC-BY-4.0, NOASSERTION and dual-licence expressions containing a non-allowed alternative. Each affected package family needs an approval with an owner, review date, reason and conditions.
- **Denied** — copyleft/network/server-side licences such as AGPL, GPL-only, SSPL, BUSL, CC-BY-SA and CC-BY-NC variants. These block the build.

The scanner reads `package-lock.json`, deduplicates third-party packages, skips first-party workspaces and includes dev/optional dependencies. Run `npm run licenses:check` locally. The generated SBOM retains the same licence values so retained evidence can be rechecked later.

## 7. Build once, sign once, promote by digest

Release flow in [`release.yml`](./.github/workflows/release.yml):

1. Check out the published release tag or the supplied `workflow_dispatch` tag.
2. Run `ci:verify`, `ci:build`, `licenses:check` and `artifacts:check`.
3. Build and push **one** image built from the digest-pinned `Dockerfile`. The immutable image reference is `REGISTRY/IMAGE@sha256:...`; the tag is only a human-friendly alias.
4. Scan that exact image with Trivy. High/Critical findings stop the release.
5. Generate `dist/SHA256SUMS` for `package-lock.json` and the SBOM.
6. Sign the image, the SBOM and the checksum file with cosign keyless OIDC signing. No private signing key is stored in the repository.
7. Verify the image and both blobs against the GitHub Actions OIDC issuer and identity before the release is considered valid.
8. Retain the SBOM, SARIF reports, checksums, signatures, certificates and the digest summary for 365 days.

Consumers should deploy only the reported digest and verify before use:

```bash
cosign verify \
  --certificate-identity-regexp '^https://github.com/<owner>/<repo>/.github/workflows/release.yml@refs/tags/.+$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/<owner>/<repo>/vintora@sha256:<digest>

sha256sum --check dist/SHA256SUMS
```

Replace `<owner>`, `<repo>` and `<digest>` with the values from the release summary. Do not promote a tag by rebuilding from source.

## 8. Local verification commands

```bash
npm run licenses:check     # licence policy gate
npm run artifacts:check    # image digest and action SHA pin gate
npm run secrets:scan       # credential/secret scan
npm run sbom:check         # SBOM freshness
npm run ci:verify          # full offline gate used by PRs
npm run ci:build           # scoped build gate
npm run setup:verify       # full local setup verification without containers
```

## 9. Residual gaps and honesty statement

- GitHub-hosted Trivy and release workflows are configured but were not executed locally; no repository release, GHCR push or cosign signature exists yet.
- The Docker daemon was unavailable during local authoring. Compose configuration and digest-pinned image references were validated, but `npm run setup` container startup remains locally unverified.
- The time-boxed Zod exception expires `2026-12-31`; critical advisories are never exempt.
- Production IdP/MFA, a managed secret store, distributed rate limiting and centralised retained audit storage are specified but not implemented.
- Green CI means the documented Phase 1 gates passed. It is not a production security attestation and does not change the NO-GO launch posture.
