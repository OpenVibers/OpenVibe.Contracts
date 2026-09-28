# ADR-035: PostgreSQL and Valkey as the data tier

**Status:** Accepted 2026-09-28, the owner's decision ("we should just get it over with now … so we don't waste time later"). Supersedes the "a service moves only on a measured trigger" rule of ADR-007's 2026-09-26 amendment. ADR-007's ownership rule and its 2026-09-24 runtime posture stay in force and bind every step below. Roadmap workstream WS-X2, requirement D48.

## Context and current evidence

- Every service runs one SQLite database (better-sqlite3, synchronous) on one host. Load is far below SQLite's limits (ADR-007 amendment 2026-09-26). The owner has decided that the platform should be built for many hosts and much larger scale now (ADR-034; roadmap section 4B, decisions 1 and 2), not migrated later under pressure.
- Several things need a shared, networked store before a second host exists, because today they only work in one process:
  - per-actor limits;
  - realtime fan-out;
  - session caches;
  - job queues.
- The host runs Ubuntu 26.04 with 4 vCPUs and 15 GB RAM. Its distribution provides PostgreSQL 18, PgBouncer 1.25, pgBackRest 2.58 and Valkey 9.0.
- Two projects joining the network already use PostgreSQL and Redis-compatible stores: OpenVibe: Source (PostgreSQL and Redis) and GameServerLists (TimescaleDB and Redis).

## Decision

1. **PostgreSQL is the system of record for every service.** One cluster serves the "data" role (ADR-034 section 12; roadmap WS-X1). It runs on the current host until a data server is bought, when the role moves by inventory.
   - **Per service:** a database, an owner role (migrations, direct connections), and an application role that connects through PgBouncer in transaction-pooling mode (ADR-007, 2026-09-24, rule 1). No service connects to another's database.
   - **Access:** listening only on loopback and the private network; `scram-sha-256` authentication; TLS on the private network. Passwords go into each service's env file, never into logs.
   - **Money paths** stay `SERIALIZABLE` with row locks and retries (rule 3). Reads that may lag go to replicas when replicas exist (rule 2).
2. **Valkey is the shared, non-authoritative store** (rule 4 applies; Valkey replaces the "Redis" of rule 4):
   - uses: caches, per-actor limit counters, job queues (streams), pub/sub fan-out, presence and session caches;
   - one ACL user per service, restricted to its key prefix `ov:<service>:*`;
   - `maxmemory-policy volatile-lru`, so only keys with a TTL (caches) are evicted, never queues or counters without a TTL; append-only persistence every second;
   - losing Valkey loses no write and changes no answer about money, accounts, grants or bans.
   - Valkey (BSD-licensed, Linux Foundation) is chosen over Redis because of its licence.
3. **Backups.**
   - pgBackRest archives WAL continuously and takes a full backup weekly and a differential daily to an encrypted repository in B2, keeping 14 days of point-in-time recovery. `ovhost backup` and `ovhost drill` cover it, and a monthly drill restores a service's database to a point in time.
   - Valkey needs no disaster recovery, because nothing in it is authoritative.
4. **One async data layer in the SDK** (`openvibe-sdk/db`), with PostgreSQL and SQLite adapters behind the same interface:
   - tagged-template queries with parameters;
   - transactions, with bounded retry on serialization failure;
   - statement timeouts and tracing (`traceparent`);
   - versioned migrations, each labelled expand, migrate or contract (ADR-028);
   - a readiness check that reports the store in use.

   **`openvibe-sdk/cache`, `/queue` and `/pubsub`** wrap Valkey the same way.
5. **New services start on PostgreSQL and Valkey.** Every product in roadmap section 4B does.
6. **Existing services migrate one at a time, smallest first**, following expand/migrate/contract:
   1. Move the service's data access onto `openvibe-sdk/db` while it still runs on SQLite. The suite must pass unchanged.
   2. Create the PostgreSQL schema, then copy with verification: row counts and per-table checksums, under a short write freeze or dual writes.
   3. Switch reads and writes to PostgreSQL, keeping the SQLite file read-only for the N-1 window (ADR-016, 7 days) as the rollback.
   4. Then delete the SQLite file after a final backup.

   Order: Wiki, Blog, News, Reviews, Deals, Coupons, Trade, Tips, VIP, Search, Sources, Codes, Host, AI, Events, Chat, Community, Billing, Media, Tools, Games, OpenRe, Network, Live. Each migration is its own change, with its own rehearsal on a copy of the production data.
7. **Sizing on the shared host**, until the data role has its own machine:
   - PostgreSQL: `shared_buffers` 1 GB, `effective_cache_size` 4 GB, `work_mem` 16 MB, `max_connections` 120, pooled behind PgBouncer;
   - Valkey: `maxmemory` 768 MB.

   These are revisited when the role moves.
8. **Observability.** Exporters for PostgreSQL, PgBouncer and Valkey feed Prometheus. Alerts cover:
   - connections near the limit;
   - WAL archive failure;
   - backup age over 26 hours;
   - replication lag, once replicas exist;
   - Valkey memory over 90%.

## Alternatives considered

- **Stay on SQLite until a trigger** (ADR-007, 2026-09-26): rejected by the owner, to avoid a larger migration later.
- **Redis:** its licence moved from BSD to RSAL/SSPL in 7.4, and to AGPL in 8. Valkey stays BSD and is compatible.
- **Managed databases:** cost and lock-in against an "open, affordable" platform. They are possible later for the control plane.
- **Distributed SQL (CockroachDB, YugabyteDB):** more operational weight than the workload needs. The cell design (ADR-034) scales out with ordinary PostgreSQL clusters.
- **One shared schema:** rejected by ADR-007 (one writer per dataset).

## Migration consequences

- Synchronous `better-sqlite3` call sites become async. That is the bulk of each service's migration, and step 1 of item 6 isolates it from the storage change.
- Session-level PostgreSQL features cannot be used through the pooler (ADR-007 2026-09-24 rule 1).
- Per-process state (limits, fan-out, caches) moves to Valkey. That is also what makes services able to run more than one process.

## Rollback

- **Per service, within its N-1 window:** point it back at its read-only SQLite file after replaying writes made since the switch. The migration keeps a change log for that window.
- **The data tier itself:** each service keeps working on SQLite until its own migration switches, so the tier can be removed before any switch without effect.

## Acceptance tests

- **ADR-007's first-move tests:**
  - the suite passes on PostgreSQL behind PgBouncer in transaction mode;
  - a concurrent-debit race lets exactly one debit through;
  - a lagging read is never used for a decision;
  - flushing Valkey mid-run changes no money or account answer.
- **A point-in-time restore drill** from pgBackRest reproduces a service's database at a chosen time.
- **Truthful readiness:** each migrated service's `/ready` reports `postgresql` and its pool state, and a service not yet migrated reports `sqlite`.

## Amendment 2026-09-28 (same day): one dialect, async-first, every service

The owner confirmed after the costs were laid out: "everything should be async focused and highly optimized/efficient in the first place … migrate all of it". So:

1. **One SQL dialect.** Services write PostgreSQL SQL only. The data layer has no SQLite adapter.
   - Tests run real PostgreSQL in-process through **PGlite** (PostgreSQL compiled to WASM). What is tested is what runs, and there is no dual-dialect drift.
   - CI also runs each migrated suite against a real PostgreSQL 18 + PgBouncer (transaction mode) + Valkey container set, which catches what only the pooler forbids.
   - Item 4's "PostgreSQL and SQLite adapters" becomes "PostgreSQL (`pg`, through PgBouncer) and PGlite (tests, embedded)".
2. **A one-time import from SQLite.** `openvibe-sdk/db` ships a verified importer from a service's SQLite file into its PostgreSQL schema:
   - batched `COPY`;
   - type mapping: 0/1 to boolean, text timestamps to `timestamptz`, JSON text to `jsonb`;
   - per-table row counts and content checksums.

   Item 6's per-service steps become:
   1. the PostgreSQL schema;
   2. data access async on the layer;
   3. per-process state to Valkey;
   4. suites on PGlite and CI PostgreSQL;
   5. a rehearsal on a production copy;
   6. a short write freeze, the import and the switch;
   7. the SQLite file kept read-only for the N-1 window as the rollback, then archived and deleted.
3. **Every service migrates,** in item 6's order. The roadmap's engineering standards (section 4B.7) bind each one:
   - async request paths;
   - bounded pools;
   - Valkey for shared state;
   - indexes for every query shape;
   - keyset pagination;
   - no N+1 queries;
   - measured budgets.
