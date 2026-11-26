# Vintora Launch Ownership Intake Template

> **Prototype mode — no real orders are placed. NO-GO for public production launch.** This is a blank human intake template, not a signed record and not launch approval. The machine authority remains [`config/launch-readiness-owners.json`](./config/launch-readiness-owners.json), checked by `npm run launch-readiness-owners:check`. Every field below is `null` until a real human completes it.

Use this template to collect the real values for `M-PL-01`. Do not copy it into the machine config with placeholder names. Do not commit secrets or private personal data; use a resolving reference (an `http(s)` URL or a repository file path) for each sign-off. This template does not close a gap, accept the audit baseline or change the verdict.

## 1. Role owners

| Role | Named individual | Effective date | Sign-off ref | Status |
|---|---|---|---|---|
| Release Manager | `null` | `null` | `null` | `pending` |
| Platform Security Lead | `null` | `null` | `null` | `pending` |
| Platform SRE Lead | `null` | `null` | `null` | `pending` |
| Staff Data Engineer | `null` | `null` | `null` | `pending` |
| Legal / Compliance Lead | `null` | `null` | `null` | `pending` |
| Vault / Investment Product Lead | `null` | `null` | `null` | `pending` |
| Data Protection Lead | `null` | `null` | `null` | `pending` |
| Developer Experience / Platform Lead | `null` | `null` | `null` | `pending` |
| Principal Architect | `null` | `null` | `null` | `pending` |
| Chief AI Officer | `null` | `null` | `null` | `pending` |
| Payments Lead | `null` | `null` | `null` | `pending` |
| Compliance Lead | `null` | `null` | `null` | `pending` |
| Beverage Data / Catalog Lead | `null` | `null` | `null` | `pending` |
| CMO / Growth lead | `null` | `null` | `null` | `pending` |
| Chief AI Officer / Pricing Lead | `null` | `null` | `null` | `pending` |

## 2. Four-eyes review

| Field | Value |
|---|---|
| Release owner role | `Release Manager` |
| Release owner named individual | `null` |
| Release owner effective date | `null` |
| Distinct reviewer role | `Principal Architect` |
| Distinct reviewer named individual | `null` |
| Distinct reviewer effective date | `null` |
| Acceptance reference | `null` |
| Reviewed at | `null` |

The release owner and distinct reviewer must be different named individuals. Each owner must have an ISO `YYYY-MM-DD` effective date and a resolving sign-off reference. A partial record fails closed.

## 3. Completion procedure

1. Collect one named individual per role from the accountable humans, not from role labels or git committer identity.
2. Record each effective date as `YYYY-MM-DD` and each sign-off as a resolving reference.
3. Confirm the release owner and reviewer are distinct people and record the review date.
4. Update `config/launch-readiness-owners.json` only after the values above are real and reviewed.
5. Run `npm run launch-readiness-owners:check`; a partial or claimed acceptance must fail.
6. Re-run `npm run ci:verify` and `npm run ci:build` before committing with DCO sign-off.

Even a fully populated record records ownership only. `M-PL-01` stays `planned`, every gap evidence ref stays `null`, promotion stays disabled and the verdict remains `NO-GO`. This template is not launch approval.
