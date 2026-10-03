# The estate

Data only, from the plan's §1.1 "The estate" table (`OpenVibe_Updated_Plan_Based_On_Codebase.md`, 2026-09-30). Every
cell is read straight from that table; `—` means §1.1 does not state it, not that it is empty in the estate. The
authority for runtime, database, pins and deployment is each repository's `STATUS.json`, `package.json` and
`migrations/`, so this table is a summary and T1 step 2 replaces it with one generated in CI from those sources.

| Repository | Product | Authority it owns | Runtime | Database | Domain | SDK/Contracts pin | Deployment | Public/private | Current track |
|---|---|---|---|---|---|---|---|---|---|
| — | Network | identity, registry, grants, node/device principal | — | SQLite | openvibe.network + auth/api/admin/my/themes | — | Production | — | T2 |
| — | Live | product surface only (no chat/money/transport after T3/T4/T5) | — | SQLite | openvibe.live | — | Production | — | T4 |
| — | Chat | all chat tables | — | PostgreSQL | openvibe.chat | — | Production; T3 cutovers landed | — | T3 |
| — | Media | all bytes, delivery | — | PostgreSQL | openvibe.media | — | Production; Fabric F1a/F1b live | — | T4 |
| — | Events | event semantics | — | PostgreSQL | events.openvibe.network | — | Production backbone; ADR-042 fabric | — | T7 |
| — | AI | models, provider routing | — | — | ai.openvibe.services | — | Production, internal only | — | T6 |
| — | Billing | the ledger | — | — | billing.openvibe.network | — | Shadow; Live is money authority | — | T5 |
| — | Tips, VIP | — | — | — | — | — | Built; not launched | — | T5 |
| — | OpenRe.Stream | ingest | — | — | ingest.openre.stream | — | Built; 0 of 102 slots | — | T4 |
| — | Host | sites, tenant config | — | — | openvibe.host, `ovhost` | — | Stage A production | — | T12 |
| — | Community | community hub | — | PostgreSQL | openvibe.community | — | Production (forum empty) | — | T10 |
| — | Tools | tools | — | SQLite | openvibe.tools + 7 satellites | — | Production, guard in report mode | — | T8 |
| — | Games | game world | — | PostgreSQL | openvibe.games, play. | — | Production; M1 identity live | — | T8 |
| — | Blog, Wiki | — | — | — | — | — | Deployed, thin | — | T9 |
| — | Search | — | — | — | — | — | Deployed; 0 real documents | — | T9 |
| — | Sources, News, Reviews, Deals, Coupons, Trade | — | — | — | — | — | Built; empty, sources disabled | — | T9 |
| — | Codes | — | — | — | openvibe.codes | — | Deployed, thin (the old product) | — | T16 |
| OpenVibe.Bot | Bot | robots, robot control (device principal moves to Network) | — | — | openvibe.bot | — | Service built (T15 step 1: robots, devices, pairing, device/operator WS, four profiles; ADR-043); robots still live in Live; not cut over | — | T15 |
| OpenVibe.Node | Node | — | — | — | — | — | Core built on `origin/main` (`node-core` merged: node core, pairing, control link, WHIP publisher, Adeept + Cozmo plugins, installer, CI); not deployed | — | T14 |
| — | Actor, Services, Run, Watch, Website, Zone | — | — | — | — | — | Not created | — | T13/T14/T17/T18/T19 |
| — | openvibe-agents | — | — | — | — | — | Internal harness (§2.4); prototype for T16's routing | — | T16 |
| — | Sites (33 domains) | — | — | — | 33 domains | — | Placeholder generator | — | deleted in T11 |
| — | Realtime | — | — | — | — | — | Empty repo (closed by ADR-005) | — | deleted in T0 |
| — | SDK, Contracts, Shared, Publishing, Extensions, Examples | libraries | — | — | — | Contracts 0.83.0, SDK 0.25.2 | — | — | T1 |
