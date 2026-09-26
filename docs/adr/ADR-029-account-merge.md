# ADR-029: Merging two accounts into one

**Status:** Accepted 2026-09-26 (roadmap WS-B task 5). Implementation follows in OpenVibe.Network.

## Context and current evidence

- People end up with two accounts: one from Google, another from Discord or an old Live sign-up. Today they can link a provider to an account, but they cannot fold a second account into the first.
- Subjects (`usr_…`) are the network-wide identity (ADR-001). Services key their own rows by subject, some still alongside integer ids.
- ADR-001 forbids repointing `identity_legacy_map`: a mapping, once written, stays.
- Network's user-module events already carry `reason: subject_merged` with `merged_into` and `merged_from` (`server/identity/module-events.js`), so consumers have a place for a merge, but nothing performs one.
- Balances are loyalty, never money (ADR-012). The OpenCoins transfer grant is revoked (rule 5): services cannot move coins between people.

## Decision

- **Only the person merges, and only two accounts they both control.** Both must be signed in within 10 minutes: the survivor, plus a fresh proof for the account being folded in. Staff can start a merge for account recovery only with `staff.identity.merge`, a written reason and an audit row. They never do it silently.
- **The survivor keeps its subject, username, profile and settings.** The folded-in subject becomes an **alias**: a new `subject_aliases (alias_id → subject_id, merged_at, merged_by)` row. `identity_legacy_map` is not repointed: resolving an old legacy id returns the folded-in subject, and alias resolution then returns the survivor. `/internal/identity/resolve` answers the survivor with `merged_from`.
- **Network moves what it owns, in one transaction:**
  - linked providers, sessions and devices (both sets stay valid until they expire);
  - OAuth grants and developer projects (still owned, now by the survivor);
  - OpenCoins: one ledger entry per side, `reason: account_merge`, idempotent by merge id. This is a Network-internal operation, not the revoked transfer grant.
  - user modules: per namespace, the survivor's record wins field by field. The folded-in values survive only where the survivor has none, and each changed record emits `network.module.updated` with `reason: subject_merged`.
- **Everything else follows one event.** Network emits `network.subject.merged { from, into, merged_at }` (visibility internal). Each owning service repoints its own rows from `from` to `into` in its own transaction and keeps no copy under `from`:
  - Live: follows, channel points and streams;
  - Chat: messages, DMs and room members;
  - Community: posts;
  - Media: owner_subject;
  - Games: players;
  - Billing: accounts.
  A service that cannot merge a row (a unique conflict such as two follows of the same channel) keeps the survivor's row and drops the other, as a counted, logged outcome.
- **A merge is not undone automatically.** The merge record keeps the folded-in account's pre-merge state for 30 days so staff can split it by hand if a merge was a mistake. After that the record is reduced to the alias.

## Alternatives considered

- **Delete the second account and let the person re-link:** rejected, because it loses history, follows, balances and content.
- **Rewrite every subject reference network-wide in one distributed transaction:** rejected, because no service owns another's rows (principle 4).
- **Repoint `identity_legacy_map`:** rejected by ADR-001; aliases give the same answer without rewriting history.

## Migration consequences

New table `subject_aliases` and a merge record in Network. Contracts gain `network.subject.merged@1` and the capability `staff.identity.merge`. Every service that stores subjects consumes the event; until one does, its rows stay under the old subject, which still resolves (alias), so nothing breaks while consumers land.

## Rollback

Stop offering merges. Aliases already written keep resolving. A mistaken merge is split by hand from the 30-day record.

## Acceptance tests

- A merge needs both sign-ins and refuses otherwise.
- Resolving either subject, or any old legacy id, answers the survivor.
- Balances sum, with one ledger entry per side, and a retried merge applies once.
- Module conflicts keep the survivor's fields.
- Each consuming service's test repoints its rows on `network.subject.merged` and counts conflicts.
- A staff merge without a reason is refused.
