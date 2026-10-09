# ADR-054: The OpenVibe inventory — one authority for items across the network

**Status:** Accepted 2026-10-09 (plan track T21, step 1), on the owner's direction of 2026-10-08. Builds on ADR-012
(money lives only in Billing), ADR-025 (nothing traded between people without a new ADR), ADR-029 (account merge),
ADR-033 (account export and deletion), ADR-035 (each authority owns its PostgreSQL database) and ADR-048 (one authority
per resource).

## Context

> **Owner, 2026-10-08:** "improve and overhaul/remake the inventory system to be more like steam / csgo / etc style
> community driven and modular through sdk / api type shit rather than our current inventory seen on openvibe.live for
> name fx and particles and all that shit it should be a cross site network wide shared multi purpose modular system
> with user profiles and shit".

What exists today is Live's cosmetics, and only Live can see them:

- **The catalog is code.** `OpenVibe.Live` `server/monetization/cosmetics.js` `COSMETICS` lists name effects,
  particles, hats and voices, each with a tier and the CSS or speech values Live renders.
- **Ownership is two tables in Live's database.** `user_cosmetics` holds what a person unlocked (`user_id`, `item_id`,
  `category`) and `user_equipped` holds one item per slot. On 2026-10-09 production held 153 unlock rows for 8 people
  (voice 116, name effect 20, particle 10, hat 7) and 16 equipped slots; `user_equipped_tag` was empty.
- **Unlocks come only from Live's own routes** (`server/monetization/cosmetics-routes.js`). Nothing else can grant,
  show or equip an item, and nothing outside Live knows a person owns one.

## Decision

### 1. A new authority: OpenVibe.Inventory

- **Identity:** service `inventory`, repository `OpenVibers/OpenVibe.Inventory`, loopback port 5030.
- **Storage:** its own PostgreSQL database `ov_inventory` (ADR-035).
- **Public read API:** `https://inventory.openvibe.network`, a Network subdomain like `api.` and `auth.`.
- **Owns:** item kinds, definitions, instances, the equipped set and the item ledger. Nothing else holds item
  ownership. Live keeps only the renderers for the kinds it shows.
- **Profile pages** stay with Network, which owns people: the public profile shows the person's showcase by reading
  Inventory.

### 2. The model

- **Kind** (a contract, string id `<namespace>.<kind>`, e.g. `live.name_effect`, `games.skin`, `network.badge`, `network.profile_frame`).
  A kind declares:
  - its attribute schema (JSON Schema);
  - its slots, so one item of the kind can be equipped per slot and surface;
  - the surfaces that render it (`chat`, `overlay`, `profile`, `game:<id>`), each with the renderer contract the
    surface implements.

  A new kind is a contract plus a renderer, never a new table.
- **Definition** (`itd_<ULID>`): kind, name, description, art (a Media object or a renderer token such as a CSS class
  the kind's renderers know), rarity, attributes valid against the kind's schema, issuer, optional supply cap and
  status (`draft` → `in_review` → `published` → `retired`).
  - The issuer is a service, an app (ADR-014) or a creator.
  - Rarity is one of `common`, `uncommon`, `rare`, `epic`, `legendary`, shown with any odds that apply, never hidden.
- **Instance** (`inv_<ULID>`): one definition owned by one subject, with its origin (`granted`, `earned`, `migrated`;
  `bought` and `traded` are reserved for §5), acquisition time, optional per-instance attributes (a serial number, a
  wear value) and state (`owned`, `consumed`, `revoked`).
- **Equipped set:** per subject and slot, the instance in use. Surfaces read it in batches (many subjects in one call)
  and cache it briefly.
- **Ledger:** an append-only row for every movement (granted, earned, migrated, equipped, unequipped, consumed,
  revoked, merged), with the acting principal and the reason. This is the audit trail later trading needs.

### 3. Who can do what (capabilities, guarded with `requireCapability`)

| Capability | Who | What |
|---|---|---|
| `inventory.item.read` | public | a person's public inventory and equipped set, definitions, kinds |
| `inventory.item.list` | the person, or a service acting for them | their own full inventory, including hidden items |
| `inventory.equip.manage` | the person, or a service acting for them | equip and unequip their own instances |
| `inventory.item.grant` | an issuer, for definitions it issued, and the grantors it names on a definition | grant an instance to a subject (idempotent per key) |
| `inventory.item.consume` | an issuer, for definitions it issued | consume or revoke an instance |
| `inventory.definition.manage` | an issuer, for its namespace | create, edit, submit, retire definitions |
| `inventory.definition.review` | staff | publish or reject a submitted definition |

Apps act with grants from Services (ADR-048). A grant to an app names the definition namespace it may issue in.

**Grantors (amendment, 2026-10-09).** A definition may name `grantors`: other services or apps its issuer lets grant
that one item. A grantor grants only: origin `earned` or `granted`, idempotent per its own key, within the supply cap,
recorded in the ledger with the grantor as the actor. Defining, editing, consuming and revoking stay the issuer's, and
the issuer sets and clears the list (`PATCH /definitions/:id`). This is how an item is earned on one site and
issued by another: Live stays the issuer of its hats while OpenVibe.Quest gives some of them as quest rewards.

### 4. Events

The authority publishes these on OpenVibe.Events through its outbox:

- `inventory.item.granted`
- `inventory.item.consumed`
- `inventory.item.revoked`
- `inventory.item.equipped`
- `inventory.item.unequipped`
- `inventory.definition.published`

A person's own item events have visibility `subject`, and public profile changes are `public`.

### 5. The money boundary

ADR-012 and ADR-025 hold until a later ADR changes them.

- **Not in v1:** items are not sold, bought, traded between people, cashed out or converted into OpenCoins or Vibes.
  There are no drops, cases or paid random rewards.
- **What a later ADR must cover first:** trading with escrow and confirmation, a marketplace priced in OpenCoins and
  Vibes, and a creator revenue share. It must give the legal basis per country, the Billing flows (ADR-012
  classification of every item that can be traded), trade holds, fraud and dispute handling, and minors' protection.
- **Allowed now:** issuers grant items for things people do (a quest, an event, a stream milestone, a game
  achievement), and staff grant them.

### 6. Community items (the Workshop)

- Creators submit definitions in their own namespace (`creator.<username>.*`).
- Review covers safety, art rights and honest rarity before anything is published.
- A published item credits its creator. A revenue share waits for §5's ADR.

**The Workshop, v1 (amendment, 2026-10-09).** Money stays out (§5); everything below is free.

- **Workshop kinds.** A kind may be marked `workshop`. Any signed-in person may submit a definition of it: the person is
  its issuer (`user:usr_…`) and its credit, and it starts `in_review`. Nobody else sees it until staff publish it.
- **The first Workshop kind is `network.badge`:** one small image shown just before a person's name in chat and on
  their profile (renderer `network.badge.image@1`), one worn at a time. The image is PNG or WebP, square, 64 to 512
  pixels and at most 200 KB, stored in OpenVibe.Media. The equipped read carries its `media_id`, so a renderer needs
  no second read.
- **Review** (`inventory.definition.review`, staff only): safety, art rights (the creator confirms they made the
  image or may use it) and an honest rarity (common unless staff decide otherwise). Staff publish it or reject it with a
  reason the creator reads. A rejected item stays visible to its creator; they can submit another.
- **Giving.** A creator gives their published item, free, to the people they choose: origin `granted`, within the
  supply cap they set (at most 10 000) and at most 100 gifts a day. Nothing is sold, bought or traded.
- **Limits.** At most 5 items in review at once and 20 submissions a day per person.
- **Takedown.** Staff retire an item (it is no longer given; owned instances stay) or revoke every instance when it
  breaks the rules. Both are recorded in the ledger.

### 7. Account data and merge

- **Export (ADR-033):** the person's instances, equipped set and ledger rows.
- **Deletion:** their instances and equipped set are deleted, and their ledger rows lose their subject, which keeps the
  supply counts true. A creator's published definitions stay, with the creator credit removed.
- **Merge (ADR-029):** instances move to the surviving subject, and duplicates of a unique definition keep the oldest.

### 8. Live's cosmetics are the first kinds (convert, verify, delete)

1. **Convert:**
   - Kinds `live.name_effect`, `live.particle`, `live.hat`, `live.voice` and `live.chat_tag` are registered.
   - Each `COSMETICS` entry becomes a definition issued by `live`, keeping its id as an alias. Tier maps to rarity:
     1 common, 2 uncommon, 3 rare, 4 epic, 5 and 6 legendary.
   - Every `user_cosmetics` row becomes an instance with origin `migrated`, and every `user_equipped` row becomes the
     equipped slot.
2. **Verify:** each person's unlocked set and equipped slots match, row for row, on both sides.
3. **Switch:** Live reads through Inventory, behind a Live setting `INVENTORY_AUTHORITY` (`live` until the switch, then
   `inventory`). Its routes become calls to Inventory with Live's service token acting for the person.
4. **Delete:** after the N-1 window, a contract migration drops `user_cosmetics`, `user_equipped` and
   `user_equipped_tag`. Live keeps the CSS and speech renderers.

## Alternatives considered

- **Inside Network** (the wallet and profile area): rejected.
  - Network is identity and the money ledger, and an inventory has its own lifecycle, write load (grants from every
    game and site) and review queue.
  - Keeping it apart keeps the ADR-012 boundary visible: an item is never a balance.
- **Inside Live:** rejected, because items must work across every site.
- **Inside Games:** rejected, because Live, Chat, Community and the profile also show items, and Games is one issuer
  among many.

## Rollback

- **Before the Live switch:** stop the Inventory service; Live still reads its own tables.
- **After the switch and before the delete:** set `INVENTORY_AUTHORITY=live`. Live writes no item rows while switched,
  so anything granted in between is replayed from the Inventory ledger.

## Acceptance tests

- A kind's schema refuses a definition with invalid attributes, and a renderer is chosen per surface from the kind.
- A grant is idempotent per key, honours the supply cap, and writes one ledger row and one `inventory.item.granted`.
- An issuer cannot grant, consume or edit outside its namespace, and staff review is required to publish a creator's
  definition.
- Equip refuses an instance the person does not own or that is consumed, and holds one item per slot.
- A batch read of equipped sets for 100 subjects is one query.
- No route sells, buys, trades or converts an item (a route-inventory test, as for Trade).
- Live's migration verifies row for row before the switch; Live renders the same name effects, particles, hats and
  voices after it.
- Export, deletion and merge behave as in §7.
