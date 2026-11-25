# EMDO Medical — backup and disaster recovery

> **Maturity: Design/Prototype.** The procedure below is specified for local PostgreSQL. A scheduled, monitored backup service is not provisioned and no restore drill has been recorded for a hosted environment.

## 1. Data classes

| Class | Examples | Protection |
|---|---|---|
| Clinical records | Encrypted FHIR JSON in `clinical_records` | AES-GCM ciphertext; integrity hash; tenant-derived key |
| Identity and consent | `users`, `user_roles`, `consent_grants` | Hashed identifiers; encrypted contact fields; RLS |
| Verification and approvals | `provider_profiles`, `provider_credentials`, `verification_events`, `approval_requests` | Hashed licence/credential references; append-only verification events; named human decisions; RLS |
| Appointments | `provider_slots`, `appointments` | Ownership checks; no reason/free-text field; RLS |
| Audit | `audit_events` | Append-only triggers; no PHI in metadata |
| AI telemetry and escalations | `ai_interactions`, `ai_escalations` | Append-only interaction log; RLS; coded reasons only; no prompts, generated text or PHI |
| Configuration | `country_profiles`, `schema_migrations` | Versioned; reviewed changes |

Backups must be encrypted at rest and stored in a jurisdiction approved by the country profile. Encryption keys must not be stored with the backup.

## 2. Local backup procedure (tested pattern)

```powershell
# Set PGPASSWORD from the secret store, never in source control
$env:PGPASSWORD='<from-secret-store>'
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
& 'C:\Program Files\PostgreSQL\16\bin\pg_dump.exe' -w -U emdo_app -h 127.0.0.1 -p 5432 -d emdo_dev -Fc -f "backups/emdo-dev-$ts.dump"
```

For Linux containers:

```bash
pg_dump -Fc -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f "backups/emdo-$PGDATABASE-$(date +%Y%m%d-%H%M%S).dump"
```

## 3. Restore procedure

```powershell
$env:PGPASSWORD='<from-secret-store>'
& 'C:\Program Files\PostgreSQL\16\bin\pg_restore.exe' -w -U emdo_app -h 127.0.0.1 -p 5432 -d emdo_restore -Fc backups/emdo-dev-YYYYMMDD-HHMMSS.dump
npm run migrate
```

Restore into a new database first. Verify record counts, consent grants, provider verification states, approval decisions, appointment integrity, AI interaction/approval/escalation correlation and audit tail before switching any traffic. Never restore over a live database without an approved incident record.

M10 reports are generated on demand and are not persisted. No Insight aggregate table exists to restore; only the append-only `insight_report_generated` audit event is included in the audit backup class. The Super Admin portal keeps no server-side session store or generated-report store; it holds only a signed HTTP-only cookie until expiry. Losing or rotating `ADMIN_SESSION_SECRET` invalidates all portal sessions, which must be treated as a deliberate security action and recorded.

Verification events and approval decisions must remain correlated with the provider state after restore; a restore that loses these records must not be used to re-enable a provider. Manual-only verification in restored sandbox data is not evidence for production use.

## 4. Planning targets (unvalidated planning assumptions)

| Metric | Target |
|---|---|
| RPO for clinical records | To be set per country profile; most stringent tier proposed |
| RTO for clinical records | To be set per country profile; most stringent tier proposed |
| Backup retention | Aligned to `AUDIT_RETENTION_DAYS` where legally required |
| Restore drill frequency | Before pilot, then per release train |

These are not measured values and no SLA is claimed.

## 5. Required before pilot

1. Automated encrypted backups with monitoring and failure alerts.
2. At least one documented, successful restore drill with evidence.
3. Cross-residency rules: no backup copy may leave the country data zone without an approved transfer record.
4. Key-rotation and backup-key separation procedure.
5. Incident runbook linking backup restore to breach/availability response.

## 6. Known gap

No automated backup job, off-site copy, retention enforcement, or restore evidence exists in this repository.
