# Governance

How the OpenVibe platform is run: who decides, how changes are proposed, what is promised about
compatibility, and how people are treated. The documents are published on openvibe.codes, where they
render from the repositories that own them. This index lists them in one place, next to the contracts
they govern (roadmap WS-U task 1).

**Draft — pending owner review.** Documents marked draft on openvibe.codes take effect only when the
owner of the OpenVibers organization approves them.

| Topic | Where | Source |
|---|---|---|
| Code of conduct | [openvibe.codes/policy/code-of-conduct](https://openvibe.codes/policy/code-of-conduct) | OpenVibe.Codes `CODE_OF_CONDUCT.md` |
| Contribution guide | [openvibe.codes/policy/contributing](https://openvibe.codes/policy/contributing) | OpenVibe.Codes `CONTRIBUTING.md` |
| Roles: participant, contributor, reviewer, maintainer, owner; escalation | [openvibe.codes/policy/contributor-ladder](https://openvibe.codes/policy/contributor-ladder) | OpenVibe.Codes `docs/governance/contributor-ladder.md` |
| Proposals and decisions (contracts, capabilities, events, policy) | [openvibe.codes/policy/rfc](https://openvibe.codes/policy/rfc) and [docs/adr/](../docs/adr/) | the ADRs in this repository |
| Compatibility and deprecation | [openvibe.codes/policy/compatibility](https://openvibe.codes/policy/compatibility); ADR-002, ADR-016; `node scripts/compat.js <latest tag>` before every release | this repository |
| Moderation, with appeals | [openvibe.codes/policy/moderation](https://openvibe.codes/policy/moderation); ADR-022 for the product moderation audit | OpenVibe.Codes `docs/governance/moderation.md` |
| Licensing and dependency review | [openvibe.codes/policy/licensing](https://openvibe.codes/policy/licensing) and the table below | each repository's `LICENSE` and `package.json` |
| Billing policy (prices, the creator split, fees, holds, cashouts) | [billing.openvibe.network/policy](https://billing.openvibe.network/policy), [openvibe.codes/docs/billing](https://openvibe.codes/docs/billing) | OpenVibe.Billing `/policy.json` |
| Limits and tiers | [openvibe.codes/docs/limits](https://openvibe.codes/docs/limits) | each service's `/limits.json` |
| Public roadmap | the Roadmap space on [openvibe.community](https://openvibe.community), synced from OpenVibe.Community `docs/roadmap/public.json` | the owner's plan, summarised each release |
| Security reports | `SECURITY.md` in every repository; `/.well-known/security.txt` on every site | |

## Licences on 2026-09-26

What each repository declares, for the owner's decision on licences and a DCO or CLA (roadmap WS-U task 2).
"Disagree" means the `license` field and the `LICENSE` file name different licences, which must be settled
before anyone relies on either.

| Repository | package.json | LICENSE file | Note |
|---|---|---|---|
| OpenVibe.AI | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Billing | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Blog | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Chat | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Codes | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Community | MIT | — | no LICENSE file |
| OpenVibe.Contracts | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Coupons | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Deals | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Events | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Examples | MIT | MIT | consistent |
| OpenVibe.Extensions | MIT | MIT | consistent |
| OpenVibe.Games | — | — | no LICENSE file |
| OpenVibe.Host | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Live | MIT | AGPL-3.0 | package.json and LICENSE disagree |
| OpenVibe.Media | MIT | — | no LICENSE file |
| OpenVibe.Network | MIT | — | no LICENSE file |
| OpenVibe.News | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Publishing | MIT | MIT | consistent |
| OpenVibe.Realtime | — | AGPL-3.0 | no license field in package.json |
| OpenVibe.Reviews | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.SDK | MIT | MIT | consistent |
| OpenVibe.Search | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Shared | MIT | MIT | consistent |
| OpenVibe.Sites | — | — | no LICENSE file |
| OpenVibe.Sources | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Tips | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Tools | MIT | — | no LICENSE file |
| OpenVibe.Trade | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.VIP | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenVibe.Wiki | AGPL-3.0-only | AGPL-3.0 | consistent |
| OpenRe.Stream | AGPL-3.0-only | AGPL-3.0 | consistent |

Dependency review: every repository pins its OpenVibe packages to release tags, CI runs the tests and the
pin-drift check, and gitleaks scans history. A licence review of third-party dependencies is part of WS-R
task 9, with this table.
