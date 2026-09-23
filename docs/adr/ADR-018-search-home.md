# ADR-018: Home of the search index and query contract

**Status:** Accepted 2026-09-23. Gates Wave 14.

## Context and current evidence

There is no index, no index contract and no engine anywhere on the network (D37). Discovery works per product. A permission-aware query spans products, so building it into each product would mean reimplementing it several times.

## Decision

- **OpenVibe.Search** (repository created 2026-09-23; port 4710) owns:
  - the canonical index document contract (`search/index-document.v1`);
  - event-fed ingestion with an inbox;
  - the query API with ACL filtering;
  - deletion and visibility propagation.
- **Owners stay authoritative.** Search holds projections keyed by `(owner, type, id, revision)`. An older revision never overwrites a newer one, and a tombstone wins over older upserts.
- **Engine: measure first.** SQLite FTS5 runs in the service's own database behind an engine interface. PostgreSQL FTS comes when PostgreSQL exists (ADR-007). Meilisearch or OpenSearch are considered only with measured need.

## Alternatives considered

- A contract-only package with a per-product index: rejected, because ACL-correct cross-product search would be rebuilt many times.
- A module inside Network: rejected. Network is not a dumping ground, and search has its own scale profile.

## Migration consequences

Products publish index documents as they adopt Publishing (Wave 15). Community's forum and pastes are the first candidates.

## Rollback

Search is a projection. It can be dropped and rebuilt from the owners through the reconciliation listing.

## Acceptance tests

- A private or draft document never reaches an unauthorized query, including through counts, facets and snippets.
- A deletion or visibility change removes the document from results at once.
