# ADR-017: Home of the source registry and ingestion runtime

**Status:** Accepted 2026-09-23. Gates Wave 14.

## Context and current evidence

AI, News, Reviews, Deals, Coupons and Trade all ingest outside content, and none of them owns a source contract (D36). The AI charter says adapters are "registered here". Ingestion, however, is a scheduled, rate-limited, robots-respecting runtime with health and staleness, which does not fit a model-routing service.

## Decision

- **OpenVibe.Sources** (repository created 2026-09-23; port 4720) owns the source registry and the ingestion workers.
- **The registry** records:
  - key, name, type, category and endpoints;
  - the auth mode, by environment variable *name* only;
  - robots and terms notes, the rate limit and the enabled state;
  - review and sensitivity flags, and the default indexability.
- **Every item** carries its source identity, retrieval time, content hash, terms note and parser version.
- **Every fetch** writes a run with an explicit state. A failed fetch never creates or changes an item.
- **AI** invokes the adapters Sources defines; it does not host ingestion.

## Alternatives considered

- Adapters inside OpenVibe.AI: rejected, for the reason above.
- An ingestion copy per product: rejected, because six copies of robots, rate-limit and provenance handling would drift.

## Migration consequences

None of today's code migrates. Live's AI jobs read Live's own data, not outside sources.

## Rollback

Products fall back to no ingestion. Sources never writes into another service.

## Acceptance tests

- A failed source shows as failed, and no synthesized item appears.
- robots.txt and the rate limit are respected.
- Every item's provenance is complete.
