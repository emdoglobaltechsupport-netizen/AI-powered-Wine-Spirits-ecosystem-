# EMDO Medical platform

> **Maturity: Prototype — NO-GO FOR PUBLIC LAUNCH.** The foundation, EMDO Record, EMDO Care (doctor verification, verified-only directory and appointments), EMDO Assist (offline AI foundation), the M10 EMDO Insight aggregate API and the Next.js Super Admin prototype are implemented and locally tested. No country is activated, no external model is called, no hosted client exists, and no real patient data may be used here.

This is the implementation repository for the approved scope recorded in [`../DECISION_LOG.md`](../DECISION_LOG.md). It contains a NestJS/TypeScript API, a local Next.js Super Admin client, PostgreSQL schema with row-level security, automated tests, and documentation. Flutter apps and all clinical/commercial portals remain Design.

## Quick start

```powershell
cp .env.example .env
# generate and insert secrets (see docs/DEPLOYMENT.md)
npm install
npm run migrate
npm run bootstrap
npm run dev
```

API docs: `http://127.0.0.1:3000/api/docs`

For the optional local Super Admin client, set the two portal variables described in [`docs/SUPER_ADMIN_PORTAL.md`](docs/SUPER_ADMIN_PORTAL.md), then run `npm run dev:admin` and open `http://127.0.0.1:3001`. The portal is not hosted and does not replace API authorisation.

## Commands

| Command | Purpose |
|---|---|
| `npm run typecheck` | TypeScript checks for all workspaces |
| `npm run build` | Compile shared package, API and Next.js portal |
| `npm test` | Unit tests for shared, API and portal (no database) |
| `npm run dev:admin` | Start the local Super Admin prototype on port 3001 |
| `npm run test:e2e` | Integration tests against `TEST_DATABASE_URL` |
| `npm run migrate` | Apply ordered SQL migrations |
| `npm run bootstrap` | Create `SANDBOX` profile and optional admin account |

The `SANDBOX` profile permits manual verification for non-clinical testing only. Verification to `verified` requires a separate named approver and fails closed in production or an approved country until an authoritative source is configured and tested. `AI_MODEL_BACKEND=offline` is the only accepted AI backend; production and all non-offline backends fail closed. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Documentation

| Document | Contents |
|---|---|
| [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Endpoints, auth, error codes, known limitations |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Controls, key management, threat model, gaps |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Environments, local/Docker setup, operations |
| [`docs/STAGING.md`](docs/STAGING.md) | Prepared staging manifests, secret placeholders and deployment gaps |
| [`docs/BACKUP_AND_DR.md`](docs/BACKUP_AND_DR.md) | Backup/restore procedure and gaps |
| [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) | What is implemented, tested, and still blocked |
| [`docs/EXECUTIVE_DASHBOARD_DESIGN.md`](docs/EXECUTIVE_DASHBOARD_DESIGN.md) | M10 Insight / Super Admin architecture and decision history |
| [`docs/SUPER_ADMIN_PORTAL.md`](docs/SUPER_ADMIN_PORTAL.md) | Portal scope, session boundary, routes, evidence and non-claims |

## Non-negotiable rules

1. No invented credentials, partnerships, testimonials or metrics.
2. No unverified doctor may practise; clinical roles are blocked until verification exists.
3. No unlicensed pharmacy or laboratory operations.
4. AI may not diagnose, prescribe, sign or approve clinical/financial actions.
5. Patient information is protected by encryption, consent, least privilege and immutable audit.
6. Human approval is required for sensitive operations.
7. No integration is claimed functional until tested.
8. Every module must be tested before being marked complete.
9. No synthetic or mock data may be used as production data.

See [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for the current evidence and gap register.
