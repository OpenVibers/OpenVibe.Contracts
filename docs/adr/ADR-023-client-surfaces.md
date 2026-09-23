# ADR-023: First-party client surfaces and their home

**Status:** Accepted 2026-09-23. Needed by Wave 18.

## Context and current evidence

Live carries `browser-extension/` and `hardware/` (Raspberry Pi kiosk companion). Both are clients, not streaming. The coupon helper (Wave 18) needs a home. Source.OpenVibe.Games is a separate simulation runtime.

## Decision

- **OpenVibe.Extensions** will hold first-party client surfaces:
  - the browser extension (the coupons and merchant helper, built against Coupons' public API with scoped, revocable credentials and no first-party cookie);
  - the kiosk and hardware companions;
  - any future desktop client.
- The repository is created when Wave 18 starts; Live's two directories move there then.
- **Source.OpenVibe.Games stays its own runtime.** It integrates with identity, Media and Events at the service boundary and shares no simulation code with the browser game.

## Alternatives considered

- Keep the clients in their product repositories: rejected, because client release cadence and store review differ from server deploys.

## Migration consequences

The moves happen at Wave 18, with a redirect README left in Live.

## Rollback

Not applicable. This ADR only decides where the code lives.

## Acceptance tests

- The extension holds no first-party credential.
- A malicious merchant page cannot read another user's data.
