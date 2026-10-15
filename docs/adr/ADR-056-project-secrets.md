# ADR-056: Project secrets — written once, used by name, never read back

**Status:** Accepted 2026-10-15 (plan T13/T17: the "project secret store" that `secret_ref` waits on). Amends ADR-014
(Network owns projects and credentials) with one more thing a project holds, and ADR-044 §7 (Actor webhooks name a
project secret by `secret_ref`).

## Context

- Services that act for a project need secrets the project's people choose: the key that signs Actor's webhook
  deliveries to their server (ADR-044 names `secret_ref` for it), a token Watch sends when it checks their private API,
  the password of their ONVIF camera (ADR-043).
- Today each of these is an operator's environment variable with a hand-written grant (Watch's `WATCH_SECRET_GRANTS`,
  Bot's `BOT_ONVIF_CAMERAS` references) or a value the service makes and shows once (Actor's per-task
  `webhook_secret`). A project cannot bring its own, and nothing is managed in one place.
- Network already owns what a project is, who its members are, its credentials and its audit (ADR-014).

## Decision

1. **Network keeps project secrets**, per project and environment (`sandbox`, `production`), each under a name
   (`^[a-z][a-z0-9_-]{0,63}$`). A value is 1 to 8192 bytes of UTF-8, at most 50 secrets per project environment.
2. **Write-only.** A project admin or owner sets a value (`PUT /api/v1/projects/:project/secrets/:env/:name`); setting it
   again replaces it and adds one to its `version`. No API returns a value to a person, staff included. Members
   (viewer and up) and staff read the metadata only: name, environment, version, a fingerprint, the grants, who set it
   and when (`network.project-secret@1`). The fingerprint is a keyed hash, so it tells two values apart without
   revealing either.
3. **Encrypted at rest** with AES-256-GCM under a key held only in Network's environment (`NETWORK_SECRETS_KEY`, 32 random
   bytes). Each row carries its key id, so the key can be rotated. Without the key the feature is off (503
   `secrets.unavailable`), never plaintext.
4. **A name is not a capability.** A service uses a secret only when the project granted that secret to that service:
   `PUT …/:name/grants/:service { purposes, origins }`, admin or owner. There are two purposes:
   - `sign`: Network computes HMAC-SHA256 of a message under the secret and answers the signature. The value never
     leaves Network. This is how webhook deliveries are signed.
   - `reveal`: Network answers the value, only to the granted service and only for an `origin` the grant lists (an
     https origin the service will send it to). This is for credentials another system must receive as they are.
5. **One first-party capability, `network.secret.use`**, on `POST /internal/secrets/use`
   (`network.secret-use-request@1` → `network.secret-use-result@1`). The caller is the service in its token
   (`svc:<id>`). A missing secret, a missing grant, a purpose or origin the grant does not list, and an archived project
   all answer 404 `secret.not_found`, so a guess learns nothing.
6. **Audit.** Every value set, deletion and grant change is a `dev_audit` row, and so is the first use of each secret per
   service, purpose and UTC day. A grant records when it was last used. Values and messages are never written anywhere
   but the encrypted column.
7. **A project archived is crypto-shredded:** its secrets' ciphertexts are deleted when it is archived, and its metadata
   stays in its audit.

## Consequences

- Actor's `secret_ref` names a secret in the task's project, granted to `actor` for `sign`. Watch, Bot and others follow
  the same rule, and their operator-held grants become unnecessary for project resources.
- The Services console shows and edits secrets through these routes with the person's own token, as it does apps and
  grants. Services stores nothing.
- A person without a project has no secret store. Personal resources keep their service's own secrets (Actor's per-task
  webhook secret).
