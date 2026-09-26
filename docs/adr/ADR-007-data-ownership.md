# ADR-007: Logical data ownership and database technology

**Status:** Accepted 2026-09-22. Amended 2026-09-24: PostgreSQL runtime posture (pooling, replicas, money-path isolation, Redis non-authoritative; roadmap §28.3 m10).

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

## Amendment 2026-09-24: PostgreSQL runtime posture

Roadmap §28.3 m10 and §28.4 item 15. No service runs on PostgreSQL today. Every service is SQLite on
one host (the Decision above still holds). These rules bind the first service that moves, and every
one after it.

1. **Canonical truth, pooled.** A service's PostgreSQL database is its canonical relational truth.
   Application processes connect through **PgBouncer in transaction-pooling mode**, never with one
   long-lived connection per process. Code that moves must therefore work without session state:
   no session-level `SET`, advisory locks held across transactions, `LISTEN`/`NOTIFY` or
   session-scoped prepared statements through the pooler. Migrations and those few session
   features use a direct connection with its own role.
2. **Read replicas serve reads.** Replicas may serve reads that tolerate lag: public pages, lists,
   search feeds and read models. A read that decides a write, checks a balance, an entitlement, a
   grant or a ban, or answers read-your-own-write goes to the primary. A service that routes reads
   to a replica says in `/ready` which reads may lag and by how much.
3. **Money paths are SERIALIZABLE with row locks.** Every transaction that moves money, credit or a
   payout (the ADR-012 MONEY and CREDIT classes: Billing's ledger, and anything Tips or VIP writes
   that changes a balance) runs at `SERIALIZABLE` isolation. It locks the account rows it debits
   (`SELECT … FOR UPDATE`, in a fixed order by account id so two transfers cannot deadlock), and it
   retries a serialization failure (SQLSTATE 40001) a bounded number of times with the same
   idempotency key. A balance check and the entry it guards are always in one transaction.
   Loyalty ledgers (OpenCoins, channel points) follow the same rule when they move.
4. **Redis is never authoritative** for money, credit, entitlements, account or identity state,
   grants or bans. It may hold caches, rate-limit counters, presence and fan-out that can be lost and
   rebuilt from the owner's database. Losing Redis must never lose a write or change an answer about
   money or accounts. No service uses Redis today; Chat's and Live's history stores keep a note that
   a ring buffer or Redis may replace the in-process cache later, under this rule.
5. **One write role per service**, as the Decision says. A shared cluster isolates ownership by
   database and role (roadmap §17.1). Cross-domain joins happen in read models or analytics.

While on SQLite, the equivalent money-path rule is already in force: Billing posts every journal
transaction inside one `better-sqlite3` transaction together with its funds check
(`server/ledger.js`). SQLite's single writer serializes those transactions.

### Tests (when the first service moves)

- The service's suite passes against PostgreSQL behind PgBouncer in transaction mode.
- A concurrent-debit test: two transfers race for the same balance, exactly one succeeds, and the
  journal still sums to zero.
- A lag test: a replica read is never used for a balance, entitlement or grant decision.
- Redis flushed mid-run changes no money or account answer.

## Amendment 2026-09-26: persistence reviewed per service (WS-S task 1)

Every service stays on SQLite (WAL mode, one process writing, one host). This is the reviewed state, not
a default nobody checked. The three candidates the roadmap names were measured on production on
2026-09-26:

| Service | Database | Load measured | Stance |
|---|---|---|---|
| Events | 17 MB, 11.9 k events | 6.5 k events on the busiest day (2026-09-25); the busiest minute 1,816 (a backfill burst, about 30 a second) | SQLite |
| Chat | 25 MB, 70.9 k messages | tens of messages a day this week; the busiest minute 6 | SQLite |
| Billing | 0.7 MB, 996 ledger entries | not yet the ledger (`BILLING_AUTHORITY=live`); every money path runs in one `BEGIN IMMEDIATE` transaction, serialised by SQLite's single writer | SQLite |

SQLite in WAL mode sustains thousands of small transactions a second on this host, two orders of
magnitude above the busiest minute, so no service has a load reason to move. A single writer also
makes Billing's money paths serialisable by construction, which PostgreSQL would have to reach with
SERIALIZABLE and row locks (Amendment 2026-09-24).

**What moves a service** (any one of these, measured, not forecast):
- a second host or a second writing process for the same data;
- sustained writes over 200 a second for ten minutes, or p99 write latency over 50 ms at the database;
- a database over 20 GB, or a nightly backup taking over 15 minutes;
- for Billing, becoming the ledger (`BILLING_AUTHORITY=billing`) with more than one writer.

The move then follows the Decision and Amendment 2026-09-24: rehearsed, expand/migrate/contract,
with `/ready` reporting the store the process actually uses, and never a PostgreSQL runtime
reported from a loader or a config value. The numbers are rechecked at every WS-S review, or when
a service's `/ready` or the release-health view shows write latency rising.
