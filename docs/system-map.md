# The system map

`openvibe-contracts` carries a manifest for every service, repository and capability. The system map reads them as one
picture of the network, so an agent knows which repositories a task needs before it opens one.

The agents that read it:
- **Codes** writes the brief into every coding job's workspace as `OPENVIBE.md`.
- **Actor** and **Computer** give their agents the same answer as a tool.

```js
const { systemMap, reposFor, markdown } = require('openvibe-contracts').systemMap;

reposFor('the search box in the menu shows its label twice', { limit: 4 }).picks;
// [{ name: 'OpenVibe.Shared', repository: 'OpenVibers/OpenVibe.Shared', kind: 'library', score: 9,
//    why: ['says "menu"', 'says "search"', 'says "label"'] }, { name: 'OpenVibe.Search', … }, …]

markdown('owner rank should be able to use more tokens per day');  // the brief, as Markdown
systemMap();                    // { libraries, services, repositories, spine }
systemMap({ internal: true });  // the same, with each service's internal origin
```

## What is on it

- **Services** (`manifests/services`):
  - id, name and repository;
  - the site and what it does;
  - the public origin, domains and health path;
  - capabilities, and the events it produces and consumes.
- **Repositories**: every service's repository, the repositories with no service (Link, Extensions and others), and
  the three libraries.
- **Libraries**:
  - `openvibe-shared`: the browser chrome every site serves;
  - `openvibe-sdk`: the Node server kit;
  - `openvibe-contracts`: schemas, capabilities, manifests and this map.
- **The spine**: how the network fits together. Sign-in is Network's, money is Billing's, media is Media's, events
  travel on Events, AI goes through AI, and agents run on Codes, Actor, Computer, Run, Link and Bot.

Domains come only from the service manifests, which are what is deployed. Internal origins are left out unless
`internal: true` asks for them.

## How a task finds its repositories

`reposFor(task)` scores every service and library, then returns the best few, each with the reasons it was picked.
In order of weight:

1. **A name or a domain** in the task: `openvibe.codes`, "Actor", "the wiki".
2. **A word that is a service's job** (`CONCEPTS`). "tokens per day" points to AI, "rank" and "notifications" to
   Network, "camera" to Cam, "checkout" to Billing.
3. **The words of a service's own description** and its capabilities.
4. **A library's language**: navbar, menu, glyph or theme point to Shared; migration or router to the SDK; schema or
   capability to Contracts.

A repository appears once, with every reason it was picked: Shared is both a library and the docs site of it.

A new service is on the map as soon as its manifest is. A word that keeps pointing to the wrong place belongs in
`CONCEPTS`, together with a test in `test/system-map.test.js`.
