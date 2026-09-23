# ADR-019: Home of the shared publishing packages

**Status:** Accepted 2026-09-23. Gates Wave 15.

## Context and current evidence

Seven publication products need drafts, revisions, scheduling, citations, media attachments, discussion references, an SEO/indexability gate, feeds and structured data. The plan forbids a generic `OpenVibe.Content` authority.

## Decision

- **OpenVibe.Publishing** (repository created 2026-09-23) is a **package repository** with no domain, no runtime and no database.
- Its packages run inside each product and write to that product's own database, using that product's own table prefix.
- Publication state is always owned by the product.
- **The indexability gate is deterministic.** It returns explainable `noindex` reasons (thin, unsourced, duplicate, private, draft, unreviewed-sensitive, unreviewed AI output).
- **Structured data is built only from provided fields.** A missing rating, price, date or author is left out, never defaulted.

## Alternatives considered

- A content service: rejected. It would turn into a second authority for every product's data.
- Copying the code per product: rejected. Seven copies of the SEO gate would drift.

## Migration consequences

Wiki and Blog (Wave 16) are the first consumers.

## Rollback

A product can pin an older package version or inline the code; no data lives in Publishing.

## Acceptance tests

- Two products share the revision, citation, SEO-gate and feed code without sharing a database or an authority.
- Generated content defaults to draft and noindex.
