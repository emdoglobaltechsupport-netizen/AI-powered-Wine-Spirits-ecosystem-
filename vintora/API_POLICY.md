# Vintora API Versioning, Compatibility and Control Requirements

Applies to every HTTP endpoint under `/v1`. This document is normative for future implementation; where a control is only partly implemented, the gap is stated explicitly.

---

## 1. Versioning

### 1.1 Version scheme

- The public version is carried in the URL path: `/v1/...`.
- Every `/v1` response includes `X-Vintora-Api-Version: v1`, including errors and 404s.
- Clients may send `Accept-Version: v1` (or `Accept-Version: 1`). An unsupported value returns `400 invalid_request` with `supported: ["v1"]`.
- A new major version is introduced only for breaking changes, at `/v2/...`.
- Minor behaviour changes must be additive and backwards compatible.

### 1.2 Compatibility rules

Within `v1`, the following are prohibited:

- Removing or renaming an existing response field.
- Changing the meaning, unit or currency of an existing field.
- Adding a new required request field without a default.
- Narrowing an existing enum or validation rule.
- Changing a stable error `code`.
- Changing authentication semantics for an existing endpoint.

Allowed within `v1`:

- Adding optional request fields.
- Adding response fields.
- Adding new endpoints.
- Adding new enum members that are strictly additive.
- Fixing security defects that cannot be worked around; such changes require a documented notice.

### 1.3 Deprecation and sunset

A field or endpoint being removed must:

1. Be marked deprecated for at least **180 days**.
2. Return `Deprecation: true` and `Sunset: <RFC 7231 date>` on affected responses where technically possible.
3. Be announced in `CHANGELOG.md` and the API reference.
4. Have a migration guide and a contact channel.
5. Be removed only in a new major version.

---

## 2. Authentication requirements

### 2.1 Current implementation

- Browser sessions use a random 32-byte token, stored clientside in an `httpOnly`, `SameSite=Lax` cookie.
- Only the SHA-256 hash of the session token is persisted.
- Sessions expire after a configured TTL and are resolved against `app_sessions` and `users`.
- One primary commerce role, tenant, jurisdiction scope, business account, server-owned credit and investor status are resolved from the authenticated session into `AuthContext`.
- Roles are resolved from active `admin_staff_roles` / `admin_roles` rows; live `admin_sessions` elevation state is derived for the shared authorization policy.
- Commerce routes require a verified age assertion stored in the database and use the verified age country as the transaction jurisdiction.
- Deny-by-default `requireAccess()` guards call the shared `authorizeAccess()` policy and append allow/deny decisions to `authorization_decisions`.
- Admin routes require an active Admin role, live time-boxed elevation and the shared `admin:*:internal` decision; T3/T4 operations also require a reason and distinct named approver. Production must replace local elevation records with IdP/MFA-backed, centrally retained evidence.
- Internal ADM-19 agent routes reuse those Admin guards. They expose advisory evaluation only: the shared evaluator applies a tool allowlist, credential/network isolation, prompt-injection rejection and distinct human approval; the server derives tenant, actor and kill-switch state. See [`AGENT_AUTONOMY_CONTROLS.md`](./AGENT_AUTONOMY_CONTROLS.md).
- Commerce checkout routes call the fail-closed evaluator in [`COMMERCE_SAFEGUARDS.md`](./COMMERCE_SAFEGUARDS.md) before quote or order effects. `GET /v1/commerce/safeguards/controls` and `POST /v1/commerce/safeguards/evaluate` expose the authenticated prototype control plane; no real screening or PSP is contacted.

### 2.2 Production requirements

| Requirement | Status | Notes |
|---|---|---|
| Production identity provider with MFA | Required, not implemented | Replace seeded demo identities |
| Short-lived access tokens + rotating refresh tokens | Required, not implemented | For native/mobile clients |
| Service-to-service mTLS or signed JWT | Required, not implemented | For internal adapters |
| Session revocation and device list | Required, not implemented | Must be audited |
| Secure cookie flags in production | Required, configured but startup blocked | `COOKIE_SECURE=true`, HTTPS only |
| No secrets in logs, URLs or error bodies | Implemented | Central error handler returns safe messages |

Authentication failures return `401 unauthorized`; authorisation failures return `403 forbidden`. Neither response may reveal whether an account exists.

---

## 3. Rate limiting requirements

### 3.1 Implemented baseline

- A CodeQL-recognised `express-rate-limit` in-memory fixed-window limiter is installed before every prototype route, including the static SPA fallback.
- Default: 1,000 requests per 15 minutes per client IP; configurable with `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.
- Responses include `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` (seconds until reset).
- Exceeded limits return `429 rate_limited` with `Retry-After`.

### 3.2 Production requirements

- Replace the in-memory store with Redis or an equivalent distributed store.
- Scope limits by authenticated user, API key, IP and route class.
- Apply stricter limits to `auth`, `age`, `checkout`, `sommelier` and admin mutation routes.
- Add burst control, bot detection and fraud scoring.
- Emit `429` and abuse events to the audit/monitoring pipeline.
- Never store raw tokens or personal data in rate-limit keys.

---

## 4. Idempotency requirements

### 4.1 Current implementation

`POST /v1/checkout/orders` requires an idempotency UUID either as `idempotencyKey` in the request body or as an `Idempotency-Key` header. It is stored as a unique key on `orders` and `payments`, and replay lookup is scoped to the authenticated user. Replaying the same key returns the original `orderNumber` with `idempotentReplay: true`.

### 4.2 Required for all mutating endpoints

Current coverage is checkout only. The following are requirements for the remaining mutating endpoints:

- Clients should send `Idempotency-Key: <UUID>` on every `POST`, `PUT`, `PATCH` and `DELETE`.
- Scope: `(authenticated principal, route, idempotency key)`.
- Include a hash of the request body so the same key cannot be reused with different payloads.
- Retain idempotency records for at least 24 hours; financial mutations for at least 7 years where required.
- Replays must return the original status, body and headers.
- Concurrent replays must either wait for the original result or return `409 conflict`; never create two effects.
- Idempotency is an API concern, not a substitute for database unique constraints.

---

## 5. Audit logging requirements

### 5.1 Current implementation

- Every request has a `requestId`.
- Mutating `/v1` requests emit a structured stdout audit record with timestamp, request ID, method, path, actor, status and duration.
- Admin mutations write append-only database audit rows with actor, reason, before/after snapshots and source.
- Catalogue and Africa Marketplace tables use append-only audit triggers.
- Agent decisions and tool calls append to `agent_decision_audit` with correlation ID, tenant, actor, agent, tool, intent, mode, tier, decision, reason code, reason and timestamp; update/delete triggers reject mutation and RLS is forced. The independent agent kill switch is separate from per-model controls and cannot be reset in the prototype.

### 5.2 Production requirements

Every audit record must include:

| Field | Requirement |
|---|---|
| `id` | Monotonically increasing or ULID |
| `at` | UTC timestamp |
| `requestId` | Correlates to logs and traces |
| `actor` | User/service ID, never credentials |
| `action` | Stable verb such as `order.create`, `price.approve` |
| `entityType` / `entityId` | Target of the action |
| `source` | API, job, adapter or operator console |
| `reason` | Required for T3/T4, pricing, compliance and refunds |
| `beforeHash` / `afterHash` | SHA-256 of redacted JSON snapshots |
| `result` | `success`, `failure`, `denied` |
| `retentionClass` | Operational, financial, privacy-sensitive |

Rules:

- Audit storage is append-only; updates and deletes are rejected at the database layer.
- Redact secrets, raw PAN/CVV, tokens, government IDs and unnecessary personal data.
- Financial and approval events are retained according to jurisdictional requirements.
- Audit export requires role-based access and is itself audited.
- Privacy consent/DSAR and campaign release decisions are advisory, tenant-scoped and append-only; consumers reach only their own privacy records, while campaign evaluation requires Admin role plus live elevation. See [`PRIVACY_AI_CONTROLS.md`](./PRIVACY_AI_CONTROLS.md), [`MARKETING_RELEASE_CONTROLS.md`](./MARKETING_RELEASE_CONTROLS.md), `npm run privacy:check` and `npm run marketing:check`.

---

## 6. Error contract

All errors use the central shape:

```json
{
  "error": "stable_machine_code",
  "message": "Safe, user-facing message",
  "details": {},
  "requestId": "req_..."
}
```

| Status | Code | Use |
|---|---|---|
| 400 | `invalid_request` | Validation failure |
| 401 | `unauthorized` | Missing/invalid session |
| 403 | `forbidden` | Insufficient role or approval |
| 404 | `route_not_found` / `not_found` | Unknown route/resource |
| 409 | `conflict` | Duplicate or concurrent write |
| 413 | `payload_too_large` | Body limit exceeded |
| 428 | `precondition_required` | Age/KYC/elevation missing |
| 429 | `rate_limited` | Limit exceeded |
| 500 | `internal_error` | Unexpected failure; no internals exposed |

---

## 7. Verification

- `npm run verify` — API typecheck and shared domain tests.
- `npm run test:smoke` — 34 API checks, including the version header, catalogue source labels, core flow, fail-closed commerce safeguards, privacy consent/DSAR and draft-only marketing controls.
- `npm run safeguards:check` — machine-checked age/KYC/AML/sanctions/payment control register; all decisions are simulated.
- CI runs the same checks on every push and pull request. A green run proves Phase 1 gates only.

No API version may be declared production-compatible until the authentication, rate limiting, idempotency and audit requirements marked above as not implemented are closed and independently tested.
