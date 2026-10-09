# ADR-055: Money and the inventory — primary sales first, trading later, never paid chance

**Status:** Proposed 2026-10-09 (plan track T21, step 6), for the owner's decision. It would amend ADR-054 §5 (the
money boundary) within ADR-012 (economic classification) and ADR-025 (no trading between people without a new ADR).
Nothing here is built until the owner accepts it and the open questions at the end are answered.

## Context

- The inventory (ADR-054) is live and free. Items are granted for what people do: OpenVibe.Quest rewards (§3
  grantors), staff grants, and creators giving their Workshop badges (§6).
- The owner wants a Steam-like economy: creators earn from what they make, people trade and a market prices items.
- Three ADR-012 rules decide what is possible:
  - **Rule 3:** CREDIT (Vibes bought with money) becomes MONEY only by being given to someone, such as a creator.
  - **Rule 5:** LOYALTY (OpenCoins, channel points) is never bought, never converted and never moved between people.
  - **Rule 6:** cosmetics are not tradable, and a paid cosmetic is an ENTITLEMENT bought through Billing.
- Billing is the only ledger (ADR-012 rule 1). Its cutover from Live waits on O1, the PowerChat webhook re-point.

## Decision (proposed)

The money arrives in three phases. Each starts only when the previous one has run cleanly and the owner says so.

### Phase A — primary sales (fits ADR-012 as written)

- **Who sells:** an item's issuer may put a price on a published definition: a Workshop creator on their badge, or Live
  on its cosmetics. The price is in **Vibes** or in **OpenCoins**, never both, and the issuer chooses.
- **Vibes:** the buyer spends CREDIT, and Billing books the sale as an ENTITLEMENT.
  - A creator's share goes to `creator_payable:<subject>` (MONEY, ADR-012 rule 3); the platform keeps the rest.
  - Proposed split: 80% creator and 20% platform, the same as Tips.
  - Inventory grants the instance with origin `bought` only after Billing confirms the purchase, keyed by the Billing
    intent id.
  - A refund or chargeback revokes that instance. Self-purchase (a creator buying their own item) is refused by
    subject.
- **OpenCoins:** the buyer spends LOYALTY on Network's wallet. Nobody is paid, and the instance's origin is
  `redeemed`. This is a shop, not a conversion: rule 5 holds, because OpenCoins never become money or move to another
  person.
- **Limits and honesty:**
  - The supply cap stays the issuer's; a sold-out item stays sold out.
  - Prices are shown before checkout.
  - A purchase limit per person per day applies (proposed: 20).
  - Rarity is still a label, never odds.
- **Contracts:** `inventory/definition@1` gains `price` (`{ currency: vibes|opencoins, amount }`); instance origins
  gain `bought` and `redeemed`; Billing gains an `inventory` purchase intent; events gain `inventory.item.bought`.

### Phase B — gifting between people (needs an ADR-012 rule 6 amendment)

- A person may give an item they own to another person, for nothing in return, if the issuer marked it `giftable`.
- A gifted item cannot be gifted again for 7 days.
- No value moves, so this stays outside MONEY, CREDIT and LOYALTY. It does change "cosmetics are not tradable", so
  rule 6 is amended to: "cosmetics are not sold between people; an issuer may let its items be gifted".

### Phase C — trading and a market (stays closed)

- Swaps between people, listings, escrow, a market price and cash value for items stay closed under ADR-025.
- Opening them needs its own ADR after legal review: virtual-item marketplaces and money transmission per country,
  KYC for sellers, VAT, disputes, fraud, wash trading and minors.
- This ADR does not open them.

### Never

- **No paid chance.** No cases, crates, loot boxes, keys, gacha or random rewards bought with Vibes or OpenCoins, in
  any phase, in any country. Free drops with published odds stay allowed.
- No item is ever converted into Vibes, OpenCoins or money by the platform, and no "sell back to OpenVibe".

## Alternatives considered

- **Open trading and a market at once, Steam-style:** rejected for now. It brings money movement between people,
  escrow, disputes and regulatory exposure (ADR-025) before there is an owner, a review process or legal advice.
- **Sales in OpenCoins only:** creators would earn nothing real, which is the owner's point of the Workshop.
- **Sales in Vibes only:** this would leave out the network-wide earn-and-spend loop that OpenCoins exist for.
- **Paid random rewards with odds published:** rejected outright. It is a regulated or banned practice in several
  countries and contrary to the network's honesty rule.

## Consequences

- Phase A gives creators income and Live a cosmetics shop again (priced in OpenCoins or Vibes) without new
  money-transmission exposure. All money stays in Billing's journal.
- Inventory stays a non-financial service: it records origins and listens for Billing's confirmations, and holds no
  balance.

## Open questions for the owner

1. Accept phase A? Is the creator/platform split 80/20?
2. Should Live's own cosmetics be sold, and in which currency (OpenCoins, Vibes, or each per item)?
3. Minimum age for buying with Vibes: Network has no age data today. Does Phase A need an age attestation at checkout?
4. Phase B (gifting): accept the rule 6 amendment?
5. Does phase A wait for the Billing cutover (O1), as this ADR assumes, so that Vibes purchases land in Billing's
   ledger rather than Live's?

## Acceptance tests (when built)

- A Vibes purchase grants exactly one `bought` instance per Billing intent; a replay grants nothing; a refund revokes.
- A creator's share lands in `creator_payable`; self-purchase is refused.
- An OpenCoins purchase debits Network's wallet once and grants a `redeemed` instance. No route converts an item, Vibes
  or OpenCoins into money.
- A route-inventory test fails on any endpoint that sells a random reward, lists an item between people, or holds
  escrow (phase C stays closed).
