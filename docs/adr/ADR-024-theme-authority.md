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

## Amendment 1 (2026-09-26): the preference, community themes, and what a theme may contain

**Status:** Accepted (roadmap WS-E task 2).

- **The preference stays Network's own data**, in its `user_preferences` table (`theme_id`, custom overrides, display preferences), read at `GET /api/themes/me/active` by every site's loader. It is not a user module: Network owns both the catalog and the module store, and a module would copy the same row with nothing gained. This replaces "as a user module" in the decision above.
- **Community themes are reviewed.** A submission, or an imported file, is pending and private to its author, who can use it at once, until an admin approves it (`/api/admin/themes`, a reason is required to reject). The public catalog and theme pages show approved themes only. At most five submissions wait per person.
- **What a theme may contain is allow-listed**, because every site applies it as CSS custom properties. Names: only the token vocabulary OpenVibe.Shared ships. Values: colours, numbers, lengths and shadows only — no `url()`, `var()`, `expression()`, quotes, semicolons or braces. The same rule applies to a person's custom overrides.
- **Import and export:** `GET /api/themes/:id/export` writes an `openvibe-theme@1` file (name, slug, description, mode, variables, tags); `POST /api/themes/import` takes one back as a new submission.

**Acceptance.** Network `test/themes-review.test.js`: pending themes are hidden from others and the catalog; approval publishes; rejection needs a note; `url()`, break-outs, `var()` and unknown tokens are refused; export and import round-trip; the pending limit holds.
