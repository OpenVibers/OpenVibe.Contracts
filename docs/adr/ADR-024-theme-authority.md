# ADR-024: Theme authority boundary between Network and OpenVibe.Shared

**Status:** Accepted 2026-09-23.

## Context and current evidence

- Network serves the theme catalog and user theme preferences (`server/themes/routes.js`, table `themes`).
- OpenVibe.Shared ships the built-in theme tokens (`builtin-themes.js`) and the loader that applies a theme before first paint (`theme-loader.js`).
- Since 2026-09-17 the default theme has been blue (`vibe`).

## Decision

- **Network owns data.** It holds the theme catalog (built-in and user-made), ratings, and each user's preference (as a user module).
- **Shared owns rendering:**
  - the token vocabulary (CSS custom properties, including the derived `--on-accent` family);
  - the built-in theme definitions;
  - the first-paint loader;
  - the rule that every site renders a usable page when Network is unreachable (inline critical canvas, deferred loader).
- **Adding a token** is a Shared minor release. Removing or renaming one is a major release.
- **No site-local themes.** Products never define their own themes; they consume tokens.

## Alternatives considered

- Themes wholly in Shared: rejected, because user-made themes and preferences are data.
- Wholly in Network: rejected, because first paint must not depend on a Network request.

## Migration consequences

None. This is how it already works; the ADR records the boundary.

## Rollback

Not applicable.

## Acceptance tests

- With Network down, every site paints with the default theme.
- A user's preference follows them across sites.
