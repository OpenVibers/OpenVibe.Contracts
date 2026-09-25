# ADR-028: Expand, migrate, contract — schema changes that survive a rollback

**Status:** Accepted 2026-09-25; enforced first in OpenVibe.Live (`test/destructive-migrations.test.js`,
`test/rollback-newer-writes.test.js`). Roadmap WS-P tasks 12 and 13.

## Context and current evidence

Every service keeps its state in SQLite and changes its schema at boot (`CREATE … IF NOT EXISTS`,
`ADD COLUMN`, and ledgered data migrations such as Live's `server/db/migrations.js`). Production rolls
back by switching the release (Live's release layout, `ovhost deploy`), never by restoring the database:
the older release starts on the database the newer one migrated and wrote to. A change that removes or
renames a table or column, or rewrites a value into a shape the older code cannot read, therefore makes
the rollback fail exactly when it is needed. Live's history has five one-time table rebuilds (copy every
column into `<table>_new`, drop, rename) that were safe because they kept every column, but nothing
checked that.

## Decision

A schema change is made in up to three releases, each deployable and each rollback-safe on its own:

1. **Expand** — add only: new tables, new nullable or defaulted columns, new indexes. Old and new code
   both work on the result.
2. **Migrate** — write both shapes and backfill (a ledgered migration: transactional, idempotent,
   `adopt`/`DEFER` where needed). Reads move to the new shape. Still nothing is removed.
3. **Contract** — remove or rename (DROP TABLE, DROP COLUMN, RENAME COLUMN, RENAME TO), and stop writing
   the old shape, only after a release in which nothing reads it, with a backup taken first. A contract
   step is a dated entry in the plan's calendar (section 10), and it is listed with that entry where the
   service's check requires it.

The supported rollback window is **7 days**: any release of the last week must boot and work on today's
database.

**Checks.** Each service with a schema adds, as it adopts this ADR:

- a **destructive-statement check**: a `DROP TABLE`, `DROP COLUMN`, `RENAME COLUMN` or `RENAME TO` of a
  real table (temporary `_x`, `x_new`, `x_old`, `x_tmp` excluded) fails the suite unless an allowlist
  names it with its contract step (Live: `test/fixtures/destructive-migrations.json`);
- a **rollback-with-newer-writes test**: the release of 7 days ago, checked out into a temporary
  worktree, initialises on a database the current code migrated and wrote to, reads and writes, and the
  current code reads what it wrote (Live: `test/rollback-newer-writes.test.js`). A shallow CI clone has no
  history, so the test skips there and runs in full wherever history exists (locally, and in deploy
  checks).

## Alternatives considered

- **Down migrations.** Rejected: a rollback that rewrites the database loses what the newer release
  wrote, and SQLite schema changes are not cheaply reversible. The older code must simply tolerate the
  newer schema.
- **Restore the database on rollback.** Rejected for the same reason: it throws away newer writes (money,
  chat, uploads).

## Migration consequences

Existing destructive statements are recorded, not rewritten. Upcoming contract steps already in the
calendar (Live's `users.email`/`password_hash` columns in WS-B task 2, C-73's table drop, C-75's boot
backfill) follow this ADR: each runs after a release with no reads, with a backup.

## Rollback

The checks are tests; removing a test file reverts them. The rule itself costs one extra release per
destructive change.

## Acceptance tests

- Live: `test/destructive-migrations.test.js` fails on a new unlisted `DROP COLUMN` (probed 2026-09-25);
  `test/rollback-newer-writes.test.js` passes with the release of 2026-09-18 on a database migrated by
  2026-09-25's code.
