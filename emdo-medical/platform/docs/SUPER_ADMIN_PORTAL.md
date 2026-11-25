# EMDO Medical — Super Admin portal

> **Maturity: Prototype — NO-GO FOR PUBLIC LAUNCH.** This Next.js client was implemented under D-026 against the tested M10 aggregate API. It is not a clinical system, not a hosted deployment, and not evidence of production readiness. No patient data may be used in this environment.

## 1. Scope

Implemented:

- Authenticated sign-in for canonical Insight administrative roles.
- Server-held, signed, HTTP-only session cookie.
- Role-filtered navigation and report catalogue.
- Versioned metric catalogue and aggregate metric detail views.
- Daily, weekly and monthly decision-support report generation.
- Explicit `UNAVAILABLE_NO_SOURCE`, governance-blocked and suppressed-cell rendering.
- Prototype and final-authority labelling on every dashboard view.

Not implemented by D-026:

- Patient-record, clinical-approval or sensitive-operation pages.
- Export execution, report persistence or report approval.
- New business source modules, billing ledgers, incident registers or market data.
- External model, voice, translation or analytics provider integration.
- MFA, rate limiting, hosted deployment, monitoring or privacy sign-off.

## 2. Local operation

The API remains authoritative. Run it first, then the portal:

```powershell
# Terminal 1 — API on http://127.0.0.1:3000
npm.cmd run dev

# Terminal 2 — portal on http://127.0.0.1:3001
npm.cmd run dev:admin
```

Next.js reads its environment from `apps/admin/.env.local` (gitignored) or the process environment. Set:

```dotenv
INSIGHT_API_BASE_URL=http://127.0.0.1:3000
ADMIN_SESSION_SECRET=<generated 32-byte base64url value>
```

Generate the session secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

The portal refuses to create sessions when the secret is missing, is a placeholder or is under 32 characters. `ADMIN_SESSION_SECRET` is separate from all API secrets. Never commit it.

## 3. Routes

| Route | Purpose |
|---|---|
| `/login` | Credential form; posts only to the internal session route |
| `/` | Role-filtered overview and prototype status |
| `/metrics` | Versioned metric definitions visible to the caller role |
| `/metrics/[metricId]` | De-identified aggregate values with evidence and suppression labels |
| `/reports` | Role-filtered report templates |
| `/reports/[reportId]` | Generate a daily/weekly/monthly decision-support report |
| `POST /api/session/login` | Exchanges API credentials for a signed HTTP-only cookie |
| `POST /api/session/logout` | Clears the session cookie |
| `POST /api/reports/generate` | Server-side proxy to the tested M10 aggregate endpoint |

The browser never holds the Insight access token. The discarded API refresh token is never stored by the portal.

## 4. Security controls

| Control | Implementation |
|---|---|
| Session integrity | HMAC-SHA256 signed cookie with expiry and constant-time signature comparison; tampered cookies are rejected |
| Session transport | `HttpOnly`, `SameSite=Lax`, `Secure` in production and staging, path-scoped; no token in JSON bodies or client components |
| Least privilege | Canonical shared report-group matrix; navigation is filtered locally but every API call is re-authorised server-side |
| PHI boundary | No patient-record page or query; only fixed aggregate API responses are rendered |
| Response sanitation | Allowlisted field copier rejects unknown keys and refuses unavailable/suppressed cells that contain numbers |
| Country scope | Derived from the signed token claims; non-super-admin roles cannot select another country |
| Evidence rendering | `metricId`, `metricVersion`, `evidenceStatus`, `sourceStatus`, `generatedAt` and suppression state are displayed with every value |
| Decision authority | Reports are labelled decision support only; no approve, sign, export or execute control exists |
| Prototype labelling | Global no-go banner and per-view evidence notices |

## 5. Test evidence

From `emdo-medical/platform`:

- `npm.cmd run typecheck` — passed, including the Next.js app.
- `npm.cmd run build` — passed, including `next build` production compilation.
- `npm.cmd test` — 21 suites / 78 tests passed (shared 4, API 48, portal 26).
- `npm.cmd run test:e2e` — 4 suites / 13 tests passed against local PostgreSQL.

Portal tests cover:

- Signed-cookie round trip, tamper rejection, expiry and missing-secret fail-closed behaviour.
- Unknown-role filtering and patient-only session denial at login.
- Rendered navigation shows only the canonical groups assigned to the caller, with no patient-record links.
- HTTP-only cookie attributes and absence of token material in login responses.
- Server-side bearer forwarding and safe error-code mapping.
- Unavailable and suppressed value rendering with no zero fallback.
- PHI and prompt sentinels dropped by response sanitizers.
- Report route session requirement, input validation and sanitized output.

These checks prove prototype gates only. They do not establish production security, hosting readiness, de-identification sign-off or clinical safety.

## 6. Explicit non-claims

No portal view presents a measured revenue, expense, clinic, pharmacy, laboratory, incident, retention or expansion result. No verified-doctor figure is represented as regulatory confirmation. No AI output, report or dashboard statistic is a clinical or financial decision. No vendor benchmark, testimonial, partnership or certification is claimed by this client.
