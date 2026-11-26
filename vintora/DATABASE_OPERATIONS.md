# Vintora Database Operations — Prototype Quick Start Safeguards

> **Prototype mode — no real orders are placed. NO-GO for public launch.** This document separates schema migration, reference seeding and local identity seeding so a quick start cannot silently create identities or mutate an unintended database. Machine authority: [`config/database-operations.json`](./config/database-operations.json); checked by `npm run db:ops:check`.

## 1. Command separation

| Command | Migrations | Reference/demo catalogue rows | Demo identities | Permitted context |
|---|---|---|---|---|
| [`db:migrate`](./package.json) | Yes | No | No | `local` / `test`; staging only with manual evidence; production blocked |
| [`db:setup`](./package.json) | Yes | Yes | No | `local` / `test`; idempotent |
| [`db:seed:dev`](./package.json) | Yes | Yes | Yes, generated credentials | Explicit `local` / `test` opt-in only |
| `db:reset` | Not implemented | — | — | No destructive reset automation exists |
| [`db:dr:drill`](./package.json) | No | No | No | `local` / `test` only against a loopback host; production blocked |

`db:migrate` is the safe default for a database-only change. `db:setup` applies migrations plus the labelled demo catalogue and remains idempotent. `db:seed:dev` is the only path that creates the local admin/collector/distributor/seller identities, requires `ALLOW_DEMO_SEED=true` and generated seed passwords, and fails closed outside `local`/`test`. See [`SETUP.md`](./SETUP.md#3-database-bootstrap-behaviour) for the environment matrix and connection setup.

db:reset is intentionally refused by [`scripts/refuse-destructive-db-reset.mjs`](./scripts/refuse-destructive-db-reset.mjs). Recreate a disposable local database with `npm run db:configure`, then run only the commands you need. No automatic down migration, cascading truncate or blind schema drop is provided.

## 2. Profile and role guards

- `NODE_ENV=production` and `RUNTIME_PROFILE=production` are rejected before migrations run. Staging is not enabled by default and requires a reviewed manual record; none is attached.
- A dedicated migration role is required before any non-local environment. The generated `VINTORA_PG_ADMIN_URL` is a transient shell-only DSN for `npm run db:configure`; it is never a `.env` key, commit value or reusable credential.
- The application role must not own the schema in a promoted environment. No production role separation evidence is attached; this is a control definition, not a completed deployment.
- Every migration and its tracking-table insert commit in one transaction. A failed migration rolls back; the runner refuses to record a file that did not apply.

## 3. Checksum and state protection

The runner stores `content_sha256` and source byte length with each applied migration in `schema_migrations`. It uses SHA-256 over the raw migration file, independent of the pgvector/jsonb portability rewrite. Behaviour:

1. Existing legacy rows with a null checksum are backfilled from the current source once.
2. An applied file whose recorded checksum differs from the current source fails closed with `Migration checksum mismatch`.
3. A checksum failure is never auto-repaired. Review a new forward migration or recreate the disposable database; never edit an already-applied file in place.
4. The recorded embedding mode must remain consistent with the physical `skus.embedding` column; a mismatch is a setup error, not a silent conversion.
5. Only `.sql` files in `packages/db/migrations/` are tracked, sorted by filename.

This protects against accidental edits to applied files. It is not a cryptographic release attestation and does not replace review or backup/restore evidence.

## 4. Backup, restore and representative-data checks

- Take a backup before any destructive or potentially destructive operation. In Phase 1 the preferred recovery is to discard the throwaway local database, recreate it with `npm run db:configure`, and reapply `db:migrate` or `db:setup`.
- A **local prototype restore drill** was executed with `npm run db:dr:drill`. [`scripts/local-dr-drill.mjs`](./scripts/local-dr-drill.mjs) fails closed outside `local`/`test`, requires a loopback host and the generated `POSTGRES_DB`, dumps the `public` schema, restores it into a throwaway schema in the same disposable database, compares SHA-256 fingerprints of table row counts and applied migration rows, then drops the schema and dump. The passing result is recorded in [`evidence/local-dr-drill.json`](./evidence/local-dr-drill.json) with `productionEvidenceRef: null` and `verdict: NO-GO`.
- The drill temporarily suspends `FORCE ROW LEVEL SECURITY` on the disposable source so the logical dump can include those tables, and restores it before the result is written. The clone omits RLS enforcement solely to verify row counts; it is not a tenant-isolation test.
- No production restore drill, point-in-time recovery test or production backup is attached. Recovery language here is a procedure definition only.
- After a schema change, run `npm run catalogue:selftest && npm run accessories:selftest && npm run africa:selftest` for representative offline data, then `npm run ci:verify`. These suites use seeded/demo fixtures; they do not validate licensed supplier data.
- `npm run db:health` and `npm run api:health` confirm connectivity and embedding-mode health. They do not grant launch permission.

## 5. Rollback procedure

1. Stop the API and record the applied migration filenames, checksums, embedding mode and database role.
2. For an unapplied failing migration, confirm there is no `schema_migrations` row for that file; the transaction rollback should already have removed any partial DDL.
3. Correct the forward migration only in a reviewed change, then rerun `npm run db:migrate`. Never rewrite a file that already has a recorded checksum.
4. For an embedding-mode mismatch, use a fresh disposable database or align `EMBEDDING_MODE` with the recorded physical column type.
5. For severe state corruption, discard the disposable database and recreate it; do not improvise a down migration.
6. Re-run representative-data checks, `npm run ci:verify` and the API/browser smoke paths before resuming local verification.

CI covers fresh apply, second-pass idempotency, a deliberately failing upgrade that must roll back, a later valid upgrade and embedding-mode health in both jsonb and pgvector modes. See [`.github/workflows/ci-migrations.yml`](./.github/workflows/ci-migrations.yml) and [`services/api/scripts/migration-mode-check.ts`](./services/api/scripts/migration-mode-check.ts).

## 6. Evidence gaps

No dedicated production migration role, production backup, production restore drill, staging run or licensed-data validation is attached. The attached local prototype restore drill proves only that a logical dump of the disposable database can be restored and fingerprint-matched locally. Green local or CI checks prove the Phase 1 migration contract only; they are not production approval.
