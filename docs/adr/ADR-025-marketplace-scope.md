# ADR-025: Marketplace and commerce scope

**Status:** Accepted 2026-09-23. Binding on Wave 19 (Trade).

## Context and current evidence

The design corpus contains a historical branch in which Trade was a marketplace (listings, orders, custody). Nothing of it was built. Money now lives only in Billing (ADR-012), and game items are game state that never bridges to money.

## Decision

- **OpenVibe.Trade is informational.** It covers instruments, watchlists, market observations with source timestamps, alert rules and context.
- **Excluded:**
  - no custody;
  - no order execution;
  - no escrow;
  - no listings between users;
  - no personalised financial advice.
- **The historical marketplace branch stays open as an unresolved question.** Reopening it needs a new ADR covering the legal basis, Billing flows, fraud and dispute handling, and the ADR-012 classification of anything traded.

## Alternatives considered

- Build a minimal marketplace: rejected, because it would bring money movement, disputes and regulatory exposure with no owner or review.

## Migration consequences

None.

## Rollback

Not applicable.

## Acceptance tests

- No Trade endpoint accepts an order, holds value or gives personalised advice (a route-inventory test in Trade's CI).
- Stale feeds show as stale, never as invented values.
