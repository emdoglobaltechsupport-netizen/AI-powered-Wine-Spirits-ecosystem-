# EMDO Medical — staging configuration

> **Configuration only. No staging environment is provisioned, deployed or claimed.** The platform and Super Admin portal remain **Prototype — NO-GO FOR PUBLIC LAUNCH**. These manifests prepare a repeatable local/container topology for a future, separately authorised staging decision. They are not evidence of hosting readiness, MFA, rate limiting, de-identification sign-off or clinical safety.

## 1. What is provided

| File | Purpose |
|---|---|
| `docker-compose.staging.yml` | Provider-neutral PostgreSQL + API + migration + Super Admin container topology |
| `.env.staging.example` | Secret placeholders and non-clinical defaults; copy to gitignored `.env.staging` |
| `Dockerfile` | API runtime image; built JavaScript only, non-root user |
| `apps/admin/Dockerfile` | Super Admin runtime image; built `.next` output only, non-root user |
| `.dockerignore` | Keeps `.env*`, `.next`, `dist`, caches and Git metadata out of image contexts |
| `.github/workflows/emdo-medical-staging.yml` | Manual build/validation workflow that saves image artefacts; **no deploy step** |

The compose file binds ports to `127.0.0.1` only. A remote staging exposure requires a reviewed HTTPS ingress, authentication, MFA, rate limiting, secret delivery and monitoring. None of that is implemented here.

## 2. Required secrets

Never commit `.env.staging`. Populate it from a managed secret store. Placeholders are deliberately rejected by `validateEnvironment` and the portal session code.

| Variable | Generation / rule |
|---|---|
| `POSTGRES_PASSWORD` | Generated staging-only password; never reuse development or production values |
| `DATA_ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Each: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `ADMIN_SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Owner-approved staging identity only; **not seeded automatically** |

`COUNTRY_PROFILE_MODE=sandbox` and `AI_MODEL_BACKEND=offline` are mandatory. No country is activated and no model provider is called.

## 3. Local staging-like validation

From `emdo-medical/platform`:

```powershell
cp .env.staging.example .env.staging
# Replace every REPLACE_WITH_* value in .env.staging from your secret store.
docker compose --env-file .env.staging -f docker-compose.staging.yml config --quiet
docker compose --env-file .env.staging -f docker-compose.staging.yml up --build -d
```

The `migrate` service applies the ordered SQL migrations once before the API starts. No patient, clinician, medicine, billing or incident data is seeded. API docs are at `http://127.0.0.1:3000/api/docs`; the portal is at `http://127.0.0.1:3001`.

To create the non-clinical `SANDBOX` profile and an administrative identity, run an explicit, audited one-off command after setting the bootstrap variables in `.env.staging`:

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml run --rm --no-deps api node apps/api/dist/bootstrap.js
```

Do not run bootstrap automatically in a hosted environment. Do not use production credentials, real patient data or vendor metrics in staging.

## 4. Manual artefact workflow

The GitHub Actions workflow `emdo-medical-staging.yml` is `workflow_dispatch` only. It:

1. installs locked dependencies;
2. runs typecheck and unit tests;
3. builds the monorepo and both container images;
4. validates the compose configuration with a non-secret validation password;
5. uploads image archives for seven days.

It does **not** log in to a registry, push an image, create a service, open a port or deploy anything.

## 5. Still required before any real staging decision

- Owner-approved hosting provider, region, domain and data-residency position.
- HTTPS ingress with HSTS/CSP, authenticated access, MFA and rate limiting.
- Managed secret delivery and rotation; no `.env.staging` file on a hosted host.
- Hosted PostgreSQL with backup/restore drill and audit retention configuration.
- Signed M10 de-identification review and privacy sign-off before exposing aggregate views.
- Monitoring/PHI-safe alerting and an incident path.
- Explicit statement that the environment is non-clinical synthetic-only.

Passing this build workflow or starting the compose stack does not satisfy any of those gates and does not promote a module beyond Prototype.
