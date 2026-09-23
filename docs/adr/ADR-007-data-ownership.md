# ADR-007: Logical data ownership and database technology

**Status:** Accepted 2026-09-22

## Context and current evidence

Every service uses its own SQLite database on one host. The roadmap targets PostgreSQL as canonical relational truth, but forbids a big-bang migration.

## Decision

- **Ownership is the rule, the engine is not:** one authoritative writer per dataset; no service reads or writes another service's database; cross-domain joins happen in read models or analytics.
- SQLite remains the documented store per service while the platform is single-host; each service's `/ready` reports its actual store.
- A service moves to PostgreSQL individually when it needs concurrent writers across processes, a second host, or sizes SQLite handles poorly; the migration follows the rehearsal pipeline (snapshot, idempotent import, parity, runtime verification) and money paths use SERIALIZABLE transactions and row locks when they move.

## Alternatives considered

- Migrate everything to PostgreSQL now: rejected, no measured need and highest risk.
- Shared database with schemas per service: rejected until PostgreSQL arrives; even then write roles are per service.

## Migration consequences

None immediately; each future migration carries its own plan.

## Rollback

n/a

## Acceptance tests

Wave 0 baseline shows no service reading another's database; `/ready` truthfulness checked per service in Wave 22.
