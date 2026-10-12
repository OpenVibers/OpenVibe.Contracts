# ADR-003: Service/app principal authentication and capability grants

**Status:** Accepted, implemented 2026-09-22. Amended 2026-09-24: delegated authorization semantics and approval UX (roadmap §28.3). Amended 2026-10-12: project delegation (`X-OV-Project`).

## Context and current evidence

First-party services authenticated to each other with one shared `X-Internal-Key` per deployment, with unrestricted reach.

## Decision

- Services obtain 5-minute RS256 tokens from Network's `/oauth/token` with `grant_type=client_credentials` and their existing OAuth client credentials. Claims follow `identity.service-token-claims@1`: `sub svc:<id>`, `aud`, `cap` (exact grants for that audience, optionally narrowed by `scope`), `ns`, `jti`.
- Grants live in Network's `principal_grants` (revocable). Receivers check one capability per route (`requireCapability` / `principals.guard` / `tenantAuth({ capability })`), plus namespace and ownership (`app_id` must be the caller's own).
- A request with a Bearer token is judged only on that token; a bad token is never rescued by a legacy key. New routes refuse the legacy key outright.
- `principal_usage` counts every decision by caller, route and auth method; the key is retired per route once legacy use reaches zero.

## Alternatives considered

- mTLS between services: deferred; one host today and tokens give per-action scope that mTLS alone would not.
- Long-lived per-service API keys: rejected, not scoped to actions and hard to rotate.

## Migration consequences

Guarded routes accept both during migration; callers fall back to the key only when no token can be had.

## Rollback

Remove a grant (new tokens stop carrying it) or stop sending tokens (callers fall back to the key).

## Acceptance tests

`OpenVibe.Network/test/principals.test.js`, `modules.test.js`, Contracts service-auth tests (forged, expired, wrong audience, alg none, tampered, ungranted, namespace, owner), Media `service-token.test.js`. Production smoke: tokens issued, cross-app and cross-namespace calls refused.

## Amendment 2026-09-24: delegated authorization

Roadmap §28.3 carries "delegated authorization semantics and approval UX" into this ADR. Delegation
already runs in production: Network issues app tokens with `on_behalf_of` (ADR-014,
`server/developer/tokens.js`), and Wiki, Blog, News, Reviews and Trade honour it
(`server/auth/viewer.js` in each, deployed 2026-09-23). This section records the rules they follow,
so every other receiver implements the same ones.

### Who can act for whom

| Principal | May name the acting person | How |
|---|---|---|
| First-party service (`svc:<id>`, `actor_type: service`) | any person | `X-OV-Subject: usr_…` on the request. The service vouches for its own signed-in user. |
| Developer app (`app:app_…`) | only the person who authorized it | `on_behalf_of` in the token. An `X-OV-Subject` naming anyone else gets 403 `subject.not_delegated`. |
| Mod (`mod:mod_…`, ADR-013) | only the person who installed or authorized it | the same rule as an app |
| Any principal, `client_credentials` token | nobody | no `on_behalf_of`. The call is the principal's own, never a person's. |

### What a delegated call may do

- **Intersection, never union.** The effective permission of a delegated call is the capabilities
  in the token (the app's approved grants ∩ its project allowance ∩ what is still grantable, for that
  audience), narrowed to the scopes the person approved, and then limited again by what that person
  may do on the receiver. A delegated call can never do more than the person could do, nor more than
  the app was granted.
- **Staff power is never delegated.** A receiver treats a delegated caller as a plain user: staff
  roles and staff capabilities (`manifests/policy/staff-roles.json`, v0.34.0) are never granted
  through an app or mod token. Moderation needs a first-party staff surface.
- **Money is not delegable by default.** A developer app can be granted only `active`
  capabilities whose manifest says `visibility: public` or `partner` (partner only when staff put it
  in one project's allowance by hand; Network `server/developer/policy.js`). The only public
  money-adjacent ones are the read-only
  `vip.plan.list` and `vip.perk.list`; no capability that moves money, credit or payouts is public,
  and making one public needs an ADR-012 amendment.
- **Short and unrefreshable.** App tokens last 5 minutes and have no refresh token. Revoking the
  app, its credential or a grant stops new tokens at once, and issued tokens end within 5 minutes.
- **Sandbox stays sandbox.** A receiver refuses `env: sandbox` tokens (401 `token.sandbox_refused`)
  unless it opted in. Only members of the app's project may authorize a sandbox app.
- **Audit names both.** A receiver's audit rows and events record the principal (`app:…`) as the
  actor and the person as `on_behalf_of`. They never record it as the person acting alone.

### Approval UX (Network)

In force today (Network `server/auth/oauth-routes.js`, `public/login.html`):

1. `/oauth/authorize` for an app requires an exact registered `redirect_uri` and PKCE S256.
   `prompt=none` is refused with `interaction_required`, so a third-party app never gets a code
   without the person choosing to continue.
2. The account chooser shows the app's registered name, marked "(third-party app)", and the host
   the code will be sent to (`/oauth/client-info`). The name is looked up by client id, never taken
   from the URL.
3. The code is single use, lasts 5 minutes, and records the approved scope. The token exchange may
   narrow that scope but never widen it (400 `invalid_scope`).

Required next, owned by Network (not built yet):

4. **The chooser lists the requested capabilities** in plain words (each capability manifest's
   `description`), before the person continues. A capability the app was not granted is not shown
   and not issued.
5. **A stored authorization** per (person, app), holding the approved scopes and a date. A
   repeated request within those scopes may skip the chooser. A request for more always shows it.
6. **"Connected apps" on my.openvibe.network**, listing each authorization with its scopes and last
   use, and a revoke action. Revoking stops new tokens for that person and app at once.
7. Revoking a person's authorization, and every Network ban, also ends `on_behalf_of` issuance for
   them (the ban check at exchange exists today).

### Tests

- Receivers: an app token naming another person in `X-OV-Subject` gets 403
  `subject.not_delegated`. A sandbox token gets 401. A first-party service may name the person.
  (Wiki, Blog, News, Reviews and Trade have these tests.)
- Network: `prompt=none` for an app returns `interaction_required`. A widened scope at exchange is
  `invalid_scope`. A reused or expired code is `invalid_grant`.
- Still to add, with items 4 to 6: the chooser lists exactly the issued capabilities, and a revoked
  authorization gets no new token.

## Amendment 2026-10-12: project delegation

Some work belongs to a project rather than to a person: OpenVibe.Run bills every job to a project and takes the
project only from a token (ADR-036), so a first-party service acting for a person (`X-OV-Subject`) could not start a
job for them. Watch's `run-job` action is the first case: a person's watch should start a Run job billed to a project
the person runs. This amendment lets a first-party service name that project, and says how the receiver checks it.

### The rule

- **Who may name a project.** Only a first-party service (`svc:<id>`, `actor_type: service`) that also names the
  person (`X-OV-Subject: usr_…`) may name a project, with `X-OV-Project: prj_…`. An app, mod or agent never may: its
  project is its token's own `project_id`, and a request from one carrying `X-OV-Project` is refused (403
  `project.not_delegated`). A client-credentials call with `X-OV-Project` but no `X-OV-Subject` is refused the same
  way: a service has no project of its own to name.
- **What the receiver checks, every time.** The receiver asks Network whether the person is a member of the project,
  `GET /internal/projects/:project_id/members/:subject` (capability `network.project.member.read`, first-party, never
  grantable to apps; answer `network.project-member-result@1`). The person must be an **admin or owner** (the roles
  that may create production apps and approve grants, `docs/developer-projects.md`), and the project must not be
  archived. Anything else is 403 `project.not_delegated`, with no detail that reveals whether the project exists. A
  receiver may cache a yes for at most 60 seconds, so a removed member or an archived project stops new work within a
  minute. The service checking at save time (Watch, when a watch names a project) does not replace the receiver's
  check at use time.
- **Intersection still holds.** The call is the person's, inside the project: the service's own grants (for example
  `run.job.submit` for audience `openvibe.run`), the project's allowance, tier caps and quotas, and what the person may
  do in that project all apply. Staff power is never delegated, as above.
- **Records name all three.** The job (or other resource) belongs to the project; its requester is the person; the
  service is recorded as `via`. Audit rows and events carry the same three.
- **The service sees only its own.** A delegated caller reads only what it started for that person in that project.
  Listing a project's work, or acting on someone else's, needs a token that names the project itself.

### First uses

- **Run** accepts a delegated `POST /api/v1/jobs` and `GET /api/v1/jobs/:id` (the job it started); list, cancel and
  stream stay with project tokens.
- **Watch** lets a watch name one of its owner's projects (`project_id` on `watch.watch-request@1`, checked at save
  with the same Network read), and its `run-job` action starts the job with `X-OV-Subject` + `X-OV-Project`.

### Tests

- Receivers: `X-OV-Project` from an app token, or without `X-OV-Subject`, is 403 `project.not_delegated`; a viewer
  or developer member, a non-member and an archived project are 403 `project.not_delegated`; an admin or owner
  member is accepted and the record names project, person and `via`.
- Network: the member read needs `network.project.member.read`; a non-member and an unknown project are both 404
  `project.member_not_found`.
