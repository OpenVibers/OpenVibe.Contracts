# ADR-058: Skills — a skill is a document, the registry vouches, the scan travels

- **Status:** Accepted 2026-11-07 (plan track HO, wave 2: HO2, the skeleton).
- **Owner:** OpenVibe.Actor (the registry's first home; every site installs through it).
- **Contracts:** `actor.skill@1`, `actor.skill-listing@1`.

## Evidence

- The study of Hermes and OpenClaw (`plan-state-2026-10-22/hermes-openclaw-2026-11-07.md`) found the same "magic
  moment" in every user story: *the agent learned how to do something and used it later*. Both projects make that a
  skill, a Markdown document with frontmatter (Hermes follows agentskills.io; OpenClaw's `SKILL.md`).
- Both also show the failure modes:
  - OpenClaw's ClawHub needed a trust envelope (`clawhub.skill.verify.v1`) and a scan shown before install, because a
    skill that steals credentials is what users fear;
  - Hermes needed a Curator, because agent-written skills piled up into near-duplicates.
- OpenVibe already has the trust spine for acts (HO1: every consequential act has a kind and asks by level) and
  the integrity-not-signature rule for documents people hand around (`actor.voice@1`).

## Decision

1. **A skill is a document** (`actor.skill@1`): a slug, a name, a one-line description (the only part an agent
   reads before it loads the skill: progressive disclosure), a version, Markdown instructions, up to ten text
   resources, and what it may ask an agent to do (`requires`: HO1 kinds, connected apps, hosts).
2. **v1 skills run as a prompt and nothing else** (`runs: "prompt"`):
   - no code, no binaries, no install recipes;
   - a skill that runs code waits for a sandbox (plan HO8) and a new major.
3. **A skill grants nothing.** `requires` declares; the agent's level and approvals decide every step, as for any
   other step. A step of a kind the skill did not declare is a scan finding.
4. **The integrity hash is not a signature**, as for voices:
   - the author in a document is a claim;
   - the registry's listing (`actor.skill-listing@1`) is the only place a publisher is vouched for.
5. **The scan travels with the listing:**
   - the state (`pending`, `passed`, `flagged`, `failed`) and its findings are part of the listing every site shows;
   - a card installs only a `passed` skill in one tap;
   - a `flagged` one needs the person to read the findings and confirm;
   - a `failed` one never installs.
6. **The curator ships with the catalogue.** A listing carries its curator state (`active`, `stale`, `archived`), when
   it was last used, and the listing it nearly duplicates. A stale or archived skill is not offered.

## Alternatives

- **Exchange as the registry.** Rejected: Exchange v1's listings are retired (every `/api/v1/*` answers 410).
- **Skills inside Codes only.** Rejected: the study's point is that a skill must be installable by any agent from
  any site.
- **Signed skills.** Deferred: a signature needs keys the network does not issue yet. The listing's vouched
  publisher covers v1.

## Migration and rollback

Both contracts are new. Nothing consumes them until Actor's registry ships. Rollback is retiring the contracts;
there is no data to move.

## Tests

`test/run.js`:
- the fixtures carry the hash of their own canonical content, and an edited one does not;
- `runs` is `prompt` only;
- no field names code, a script, a binary or a secret;
- `requires.kinds` is exactly HO1's kinds;
- a listing's scan states and curator states are the ones above.
