#!/usr/bin/env node
/**
 * Destructive database reset guard.
 *
 * There is no safe generic `db:reset` in this prototype. A reset would erase
 * data and could mask an embedding-mode or migration-state error. Recreate a
 * disposable database explicitly instead.
 */
console.error(
  [
    'db:reset is intentionally unavailable.',
    'Recreate a disposable local database with `npm run db:configure`, then run',
    '`npm run db:migrate` or `npm run db:setup` and the explicit seed command.',
    'See DATABASE_OPERATIONS.md for the backup, rollback and representative-data procedure.',
  ].join('\n'),
);
process.exit(1);
