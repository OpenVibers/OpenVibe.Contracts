# ADR-049: The Website/Host boundary — OpenVibe.Website authors, OpenVibe.Host serves

**Status:** Proposed 2026-10-05 (plan track T19, step 1), for the owner's review. Builds on ADR-014 (developer
projects and tenancy), ADR-006 (Media object, location and namespace model), ADR-036 (Run is an execution authority,
not a Host detail) and ADR-048 (one authority per resource; a control operation is a call to the owning authority).
Records the boundary T19 step 1 needs; the plan lists no Website ADR.

## Evidence

- **Host is built and is the site, deploy, domain and serving authority today.** Its own surface, `OpenVibe.Host`
  `origin/main` `server/http/api.js:2-21`, states it: sites (`GET/POST /projects/:id/sites`, `GET/DELETE /sites/:id`,
  `host.site.manage`), config (`GET/PUT/DELETE /sites/:id/config`, `host.site.config`), source
  (`GET/PUT/DELETE /sites/:id/source`, `host.site.manage`), deploys (`GET/POST /sites/:id/deploys`, `GET /deploys/:id`,
  `GET /deploys/:id/log`, `POST /deploys/:id/activate`, `POST /sites/:id/rollback`, `DELETE /deploys/:id`,
  `host.deploy.create` / `host.site.manage`), domains (`GET/POST /sites/:id/domains`, `POST /domains/:id/verify`,
  `DELETE /domains/:id`, `host.domain.manage`) and staff takedowns (`host.site.manage`).
- The routes, exactly as they read on `origin/main` (the header's prose is not the line numbers): sites
  `GET /projects/:id/sites` `:123`, `POST /projects/:id/sites` `:127`, `GET /sites/:id` `:132`, `DELETE /sites/:id`
  `:136`; deploys `GET /sites/:id/deploys` `:139`, `POST /sites/:id/deploys` `:197`, `GET /deploys/:id` `:199`,
  `GET /deploys/:id/log` `:203`, `POST /deploys/:id/activate` `:207`, `POST /sites/:id/rollback` `:212`,
  `DELETE /deploys/:id` `:217`, `POST /sites/:id/source/deploys` `:265`; domains `:220`, `:224`, `:228`, `:233`;
  config `:237`, `:241`, `:245`; source `:253`, `:257`, `:261`; takedowns `:105-:120`. The step-1 read that named
  `:123`, `:127`, `:197`, `:207`, `:224` and `:237-:245` **matched `origin/main` on re-read**; the surface is larger
  than that list (takedowns, rollback, source, `GET /deploys/:id/log`), and this ADR uses the full surface.
- **Host owns the rows.** `OpenVibe.Host` `origin/main` `migrations/0001_initial.sql` creates `host_sites` (`:43`),
  `host_deploys` (`:58`), `host_deploy_files` (`:78`), `host_blobs` (`:88`), `host_activations` (`:96`),
  `host_deploy_logs` (`:107`), `host_domains` (`:116`) and `host_takedowns` (`:139`); `host_sites.active_deploy_id`
  is the one serving pointer, and `migrations/0003_preview.sql:15-16` adds `host_sites.preview_deploy_id` and
  `preview_expires_at`. A deploy is immutable and content-addressed: `host.deploy@1` (`contracts/host/deploy.v1.json`)
  carries `state` (`ready`/`failed`/`deleted`), `source` (`archive`/`files`/`preview`/`git`), its manifest hash and, for
  a git deploy, the public `repo_url`/`ref`/`commit_sha` provenance. A site is `host.site@1`
  (`contracts/host/site.v1.json`): one DNS label, the default hostname/URL and the single `active_deploy_id`.
- **Host owns domain verification and serving.** `host.domain@1` (`contracts/host/domain.v1.json`) is a site's default
  `<site>.openvibe.host` or a custom domain "served only once its DNS TXT record is verified (re-checked daily)", with
  "TLS certificates … issued by an operator". A domain is bound to a **site**, not to an authoring project.
- **Host's capabilities and manifest are registered.** `manifests/services/host.json` gives Host the capabilities
  `host.site.manage`, `host.deploy.create`, `host.domain.manage`, `host.site.config`, `namespacesOwned: ["host.*"]`, the
  domains `openvibe.host`, and the events `host.deploy.created`, `host.deploy.activated`, `host.deploy.failed`,
  `host.domain.verified`, `host.release.published`. Its exposure is `internal` / `publicSite: placeholder` (the domain
  serves the OpenVibe.Sites placeholder page) — **Stage B is alpha and not launched** (`OpenVibe.Host` `STATUS.json`:
  `"deployed": "loopback only, not launched"`, and `stages.B` "running on the host on loopback :4910 … not launched").
- **The host-side contracts already exist.** `contracts/host/`: `project`, `site`, `deploy`, `domain`, `site-config` and
  the `site-manage-request/result`, `deploy-create-request/result`, `domain-manage-request/result`,
  `site-config-request/result` pairs, all owned by `host` in `contracts/catalog.json`.
- **Website is a product, not a service, and has no code.** The only artifact is
  `manifests/products/openvibe.website.json` (this checkout): domain `openvibe.website`, name `OpenVibe.Website`,
  `"relationships": { "noRepo": true, … }`, launch "tenant hosting on OpenVibe.Host (built, not launched) and the
  editor". There is **no `OpenVibe.Website` checkout** under `~/OpenVibers`, **no `manifests/services/website.json`**,
  **no `manifests/repositories/OpenVibe.Website.json`**, and **no `website.*` id** in `contracts/catalog.json` (grep:
  zero). Website has no capability, no namespace and no contract.
- **Website is not OpenVibe.Sites.** `OpenVibe.Sites` is a separate, deliberate component: `manifests/services/sites.json`
  is the "static placeholder generator; not a runtime" (exposure `live`, no capabilities, no namespaces), and the plan
  deletes it in T11 (plan line 98: "Sites (33 domains) | — | Placeholder generator | **deleted** in T11"). Website is
  the product the plan puts on Host, not the placeholder page generator.
- **The plan.** Plan line 96: "Actor, Services, Run, Watch, Website, Zone | — | Not created | T13/T14/T17/T18/T19".
  T12 (line 531): "**Website** moves out of this track (T19): the builder/editor composes Host + Codes + Actor + Run +
  Media, so it is built after those exist instead of being rewritten around them later." T19 (line 776) "Product
  compositions (each complete when started)": "Every product gets its own authority only for genuinely unique domain
  data; everything else is composed from existing platform services." The composition row (line 783): "Website
  (openvibe.website) | Host + Codes + Actor + Run + Media". D36 (line 972): "Website on Host (D36, composed in T19)".
  T12's Stage B finish line (lines 526-529) is Host's: "tenant vhosts, TLS via ACME for custom domains, objects on
  Media with replication and backup, per-site headers/redirects/SPA fallback, preview deploys, Git deploys,
  sitemap/robots". The plan lists **no Website ADR** and gives T19 compositions, not steps; the step-1 framing is the
  implementation dossier's, not the plan's.

## Decision

1. **Website owns authoring; Host owns serving.** OpenVibe.Website owns the authoring record a person edits and
   publishes: its **projects** (the authoring workspaces), **pages** (the page tree and content), **revisions** (the
   source history a build is made from), **builds** (the artifact and manifest a revision produces), **Media asset
   pointers** (references to `media.object@1` objects, ADR-006 — pointers, never a second copy of the bytes) and the
   intended **domains** (the hostname(s) the authoring project targets, and the DNS instructions shown to its owner).
   OpenVibe.Host owns the **site**, the **deploy** and its **activation**, **domain binding, DNS verification and TLS**,
   and the actual **serving** of the bytes.
2. **Host is the one site/deploy authority, and it already is.** Every create, read, change, activate, roll back,
   delete, domain and config operation is the Host route named in Evidence: `GET/POST /projects/:id/sites`
   (`server/http/api.js:123`, `:127`), `POST /sites/:id/deploys` (`:197`), `POST /deploys/:id/activate` (`:207`),
   `POST /sites/:id/domains` (`:224`), `GET/PUT/DELETE /sites/:id/config` (`:237`/`:241`/`:245`) among them. Website
   calls them under its own principal and grants, exactly as ADR-048 requires of any control operation; it does not
   reach into Host's tables.
3. **Website keeps no duplicate `host_sites` / `host_deploys` rows.** It may hold at most a rebuildable read model of
   what it shows (a site id, an active deploy id), never the row of record, and never a second `active_deploy_id`
   pointer: the one serving pointer stays `host_sites.active_deploy_id`, exposed as `host.site@1.active_deploy_id`
   (`contracts/host/site.v1.json`). A Website publish means "upload a build, then activate it" through Host; the
   answer is Host's `host.deploy@1`.
4. **A Website build is not a Host deploy.** A revision and a build are authoring facts; a deploy is Host's immutable,
   content-addressed record of an uploaded output. Website's build manifest names the files and hashes it intends to
   publish; Host re-validates and stores them, and only a Host deploy can be served, activated or rolled back. The
   same rule applies to the CI path: `POST /sites/:id/source/deploys` (`:265`) always lands as the site's preview
   (`server/http/api.js` `noActivate`), and Website approves it through `POST /deploys/:id/activate` like any other
   deploy.
5. **Domains stay Host's rows.** Website owns the intended hostname and shows its owner the TXT instructions; Host owns
   the `host_domains` row, `POST /sites/:id/domains`, the daily re-check and `POST /domains/:id/verify`, the
   certificate and the serving (`host.domain@1`). A domain is bound to a Host **site** (`site_id`), not to a Website
   authoring project. Whether Website keeps any domain row of its own, or reads Host's `host.domains`, is open
   (below).
6. **Media bytes stay Media's; Website holds pointers.** An authoring asset is a pointer to a `media.object@1` object
   (ADR-006); a deploy's served bytes are Host's `host_blobs` / `host_deploy_files` (or, per T12, objects on Media with
   replication and backup). Website never becomes a second object store.
7. **Website is not OpenVibe.Sites, and it is not a new serving stack.** It composes Host + Codes + Actor + Run +
   Media (plan line 783); it never mounts a second Host API, a second `host.*` namespace or its own tenant vhosts.

## Authority boundaries

| Concern | OpenVibe.Website (authoring) | OpenVibe.Host (serving) |
|---|---|---|
| Project | the authoring workspace (files, settings, collaborators) it owns | `host.project@1` (`contracts/host/project.v1.json`): the Host tenancy keyed by Network `prj_` (`network_project_id`), quota (`GET/PUT /projects/:id/quota`, `:83`/`:87`) and members (`:92`/`:97`) |
| Pages | the page tree and content the editor reads/writes | none: a page is not a Host row; it becomes files in a deploy |
| Revisions | the source history a build is made from (from the editor or a Codes repository) | none: deploys are immutable content-addressed outputs, not revisions |
| Builds | the artifact and manifest a revision produces | a deploy is the uploaded output: `POST /sites/:id/deploys` (`:197`), or `POST /sites/:id/source/deploys` (`:265`, always preview) |
| Media assets | pointers to `media.object@1` objects (ADR-006) | the deploy's files (`host_deploy_files`, `host_blobs`); Host serves what it holds |
| Domains | the intended hostname(s) and the DNS instructions shown to the owner | the served domain: `host.domain@1`, `GET/POST /sites/:id/domains` (`:220`/`:224`), `POST /domains/:id/verify` (`:228`), `DELETE /domains/:id` (`:233`); TLS by the operator |
| Site | no row; it reads Host's site | `host.site@1`: `GET/POST /projects/:id/sites` (`:123`/`:127`), `GET/DELETE /sites/:id` (`:132`/`:136`); the one serving pointer `host_sites.active_deploy_id` |
| Deploy / activation | asks Host and shows the answer; keeps no deploy row | `GET /sites/:id/deploys` (`:139`), `GET /deploys/:id` (`:199`), `/log` (`:203`), `POST /deploys/:id/activate` (`:207`), `POST /sites/:id/rollback` (`:212`), `DELETE /deploys/:id` (`:217`) |
| Site config | none | `GET/PUT/DELETE /sites/:id/config` (`:237`/`:241`/`:245`): headers, redirects, SPA fallback (`host.site.config`) |
| Git source | the project's code home (Codes, T19) | `GET/PUT/DELETE /sites/:id/source` (`:253`/`:257`/`:261`): the repo and branch the project's CI deploys from; Host never clones, fetches or builds it |
| Takedown / serve | none | staff takedowns (`:105-:120`) and serving of the active deploy |

## Open questions for the owner

1. **The authoring contracts.** Whether Website's projects, pages, revisions and builds are new `website.*` contracts
   (and their shapes), or whether pages/revisions map onto Codes' repository objects, is open. Nothing exists today:
   no `website.*` id, no namespace and no service manifest.
2. **The Website project versus the Host project.** Whether a Website authoring project is a distinct row that links a
   Network `prj_` to a Host `host.project@1`, or is the Host project itself with authoring data beside it, is open. The
   plan's rule (T19, line 778) is only that the product keeps its own authority for genuinely unique domain data.
3. **Domains.** Whether Website keeps a domain row of its own (the intended hostname and its approval state) or reads
   Host's `host.domains` directly is open; what is fixed is that the binding, verification, certificate and serving are
   Host's.
4. **The build artifact.** Whether a build's output is stored as an authoring artifact (and where), or exists only as
   the Host deploy it is uploaded into, is open. T12 says Host keeps "objects on Media with replication and backup", so
   this may be Media, not Website.
5. **A Website service manifest.** Whether Website registers as a service (a `manifests/services/website.json` with a
   capability and namespace) before its authoring contracts, or ships as a product that only calls Host, is open.

## What this ADR does not claim

- No OpenVibe.Website repository exists on `origin/main`; there is no `OpenVibe.Website` checkout, no repository
  manifest and no service manifest. Every product manifest statement above is `manifests/products/openvibe.website.json`
  in this checkout, `"noRepo": true`.
- No `website.*` contract exists in `contracts/catalog.json`, no `website` namespace and no Website capability; the
  authoring model in Decision 1 is the boundary being fixed, not built code.
- Host's serving side is alpha and **not launched**: `manifests/services/host.json` exposure is `internal` /
  `publicSite: placeholder`, and `OpenVibe.Host` `STATUS.json` says Stage B "not launched". The routes in Evidence are
  code on `origin/main`, not a public service.
- No contract schema is added or changed by this ADR; it is prose and cites the existing `host.*` contracts.

## Out of scope

- Website's own repository, its editor/UI, its service manifest, its contracts and its deploy (T19).
- Codes' repository/file model and the T16 work; Actor's and Run's generation/execution paths (T17/T14); Media's object
  API (ADR-006/ADR-031) — Website only holds pointers.
- Host's Stage B launch, Public Suffix List submission and its Stage C integration with Run (T12).
- The `host.*` contracts and routes themselves: this ADR cites them, it does not redesign them.

## Consequences

- Additive and documentation-only: one new ADR and its row in `docs/adr/README.md`. No schema, no manifest and no code
  change, so `docs/ESTATE.md` and `manifests/repositories/` are untouched and `node scripts/estate.js --check` stays
  clean.
- Website can be coded once T12 (Host Stage B), T14 (Run) and T17 (Actor) land, against Host's existing routes, without
  a second site/deploy model.
- Rollback: the ADR is a document; removing it changes no runtime.
