# ADR-015: AI workflow and publication ownership boundary

**Status:** Accepted 2026-09-23. OpenVibe.AI deployed the same day (loopback, port 4700); Live's switch
`AI_SERVICE=remote` moves its AI calls onto it.

## Context and current evidence

Live held the whole AI subsystem: provider calls (`server/ai/llm.js`, OpenAI-compatible and Anthropic), vision,
whisper transcription, chat AI, AI viewers, moments, slogans, overviews, recaps and translation. Its prompts,
models and spend limits lived in Live's `site_settings`. Network's generated footer copy called a Live internal
endpoint. The publication products built in Waves 16-19 (Wiki, Blog, News, Reviews, Deals, Coupons, Trade) each
need AI drafts. None of them may publish machine output as fact.

## Decision

- **OpenVibe.AI owns the machinery:**
  - the provider, model and route registry, with fallbacks and a circuit breaker;
  - versioned prompt templates and workflow definitions, with input and output schemas;
  - runs, request metadata (hashes, not raw prompts, unless debug is enabled explicitly), citations and the
    cache (private, service or public, never crossing actor scope);
  - quotas and usage per caller, and an audit log.
- **Products own publication.** A workflow returns a draft or evidence package with citations and explicit
  gaps. It never writes into a product. The product stores the draft with `ai` or `ai_assisted` authorship.
  The draft stays `noindex` and is never published as fact until a person reviews it. This is enforced by the
  products and openvibe-publishing, not by AI.
- **No fabrication.** A failed or empty source is an explicit state. Workflows have no field that invents
  ratings, prices, dates or authors. Reviews has no rating output, and a Deals price stays null unless a
  source states it.
- **Fallbacks are recorded.** When the primary provider is degraded, AI falls back and records that on the
  run. The stub provider never serves production callers.
- **Callers use service tokens** with `ai.run.create` / `ai.run.read`. Each workflow belongs to a namespace
  (`live.*`, `wiki.*`, …), and callers are limited to theirs.
- **Streamer-specific keys and local transcription stay in Live** until a per-tenant key model exists.

## Alternatives considered

- Keeping AI inside Live, with products calling Live: rejected, because every product would depend on the
  streaming app.
- An AI service that also publishes: rejected, because publication truth and review belong to the owning
  product.

## Migration consequences

- Live runs its AI features as workflows when `AI_SERVICE=remote`. With the flag unset, nothing changes.
- The Network footer copy moves to `network.site_copy`. Until Network calls AI directly, Live's endpoint
  forwards to it.
- Live's `translations` table cannot be imported, because it lacks the source text. It is recorded as a hold.

## Rollback

Unset `AI_SERVICE` in `live.env` and restart Live, which puts it back on its in-process providers. Stopping
OpenVibe.AI touches no product data.

## Acceptance tests

- Every workflow has versioned input and output schemas and produces citations or explicit gaps.
- A degraded primary provider falls back, and the run records that.
- A private cache entry never crosses actors.
- A quota is refused before any provider call.
- Products keep AI output as noindex drafts until a person reviews them. Wiki, Blog, News, Reviews, Deals,
  Coupons and Trade each have tests for this.
