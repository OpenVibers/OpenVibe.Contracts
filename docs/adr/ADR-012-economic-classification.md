# ADR-012: Billing vs loyalty, credits and currency classification

**Status:** Accepted 2026-09-22. Gates Wave 8 (OpenVibe.Billing), Wave 9 (Tips) and Wave 10 (VIP). Amended 2026-09-24: ledger transaction types mapped to the roadmap's names; OpenCoins stays in Network; the payouts/refunds/plans table substitution.

## Context and current evidence

A code survey on 2026-09-22 found twenty economic units across Live, Network and Games (the full inventory with file references is `docs/economic-inventory.md` in OpenVibe.Billing). The findings that drive this decision:

- **Vibes** exist as two mutable columns on Live's `users`: a spendable balance bought with real money (Stripe, PayPal, CCBill, NOWPayments, PowerChat) and a cashout balance that is paid out by hand over PayPal. A donation moves bought Vibes into the recipient's withdrawable balance; the recipient can also "recycle" cashout back into spendable.
- The Vibes ledger (`transactions`) is written best-effort after the balance changes, is mutable, and has no idempotency keys; `payment_orders` has no unique provider reference; there is no refund, chargeback or dispute handling for any provider; a user deletion cascades away that user's provider receipts. The ledger's type CHECK does not allow `recycle`, so recycling fails after the balances moved.
- Card, PayPal and crypto rails are switched off in production (`payments_enabled=false`); only PowerChat carries money today, at very low volume, and almost no balances are non-zero. The economy is close to dormant, which makes this the cheapest moment to move money onto a real ledger.
- **OpenCoins** (Network wallet) already has a ledger with unique idempotency keys; it is earned by activity, never bought, and spent on media requests. A user-to-user transfer API exists but has no caller.
- **Channel points** are per-streamer, earned by watching and chatting, spent on streamer rewards and media requests; mutable balance, partial log, no keys.
- Cosmetics and chat tags are unlocks without balances. Arena levels are XP. Scraplandia bottle caps are items in the game world.
- Several legacy units are frozen (Live "gold", Camp Funds, Hobo Coins, the old Live game).

## Decision

Every unit belongs to exactly one class. The class decides which system owns it and what it may ever be converted into.

| Class | Meaning | Units | Owner |
|---|---|---|---|
| **MONEY** | Real-money value received, owed or paid out | provider receipts and payment orders; Vibes **cashout** balances (creator payable); cashout requests; site-routed PowerChat donations; subscription payments; platform revenue (purchase spread, retained subscription share, site-route fee) | **OpenVibe.Billing** |
| **CREDIT** | Prepaid value bought with money, spendable only on OpenVibe, never withdrawable by the buyer | Vibes **spendable** balance | **OpenVibe.Billing** (a liability until spent) |
| **ENTITLEMENT** | A right granted by a payment (or by a plan), with a start and an end | channel subscriptions; future VIP perks | **OpenVibe.Billing** holds the entitlement truth; **OpenVibe.VIP** holds plans and perks |
| **LOYALTY** | Earned by activity, no cash value, not bought, not withdrawable, **not transferable between people** | OpenCoins; channel points; Arena XP | Network (OpenCoins) and Live (channel points) until Billing's loyalty ledger exists; never mixed with MONEY/CREDIT accounts |
| **COSMETIC-ENTITLEMENT** | An unlocked item, no balance, not tradable | global cosmetics; chat tags | the product that renders it (Live today) |
| **GAME-STATE** | Gameplay truth inside a game world | bottle caps, inventory, reputation, unlocks, market stock | OpenVibe.Games |
| **LEGACY-ARCHIVE** | Frozen; kept for reconciliation and claims only | Live `openvibe_coins_balance` ("gold"), Camp Funds, Hobo Coins, old Live game tables, hobo-quest backups | read-only in place |
| **EXTERNAL** | Money that never touches OpenVibe | direct PowerChat tips to a streamer's own account | recorded as an interaction by Tips; no Billing liability |

### Rules that follow

1. **Only Billing moves MONEY and CREDIT.** Balances become ledger accounts in a balanced, append-only double-entry journal (`user_credit:<subject>`, `creator_payable:<subject>`, `provider_clearing:<provider>`, `platform_revenue`, `payouts_pending`, `refunds`). No product keeps a mutable money column once Billing is authoritative.
2. **Every provider event is recorded once.** Webhooks land in Billing, are stored as immutable receipts keyed by `(provider, provider_event_id)`, and settle with idempotency keys; replays produce no second effect. Refunds, reversals and chargebacks are first-class journal entries that trace to the original transaction; a chargeback on credit that was already donated leaves the recipient's payable intact and books the loss against platform revenue, pending review.
3. **CREDIT → MONEY happens only by giving it to someone else** (a tip or paid interaction). The buyer can never withdraw it. Self-dealing is refused by subject, not by local id.
4. **MONEY → CREDIT (recycle) stays allowed** as an explicit journal entry, or is retired by product decision; it is never an unrecorded balance swap.
5. **LOYALTY never converts to MONEY or CREDIT, is never bought, and is not transferable between people.** Network's `network.coins.transfer` grant is revoked; the endpoint stays only for staff tooling. Loyalty ledgers keep idempotency keys that are deterministic per event (no `Date.now()`/random keys).
6. **Cosmetics are not tradable.** The dormant "deactivate to game item for trading" path stays dead. A future paid cosmetic is an ENTITLEMENT bought through Billing.
7. **Game state never bridges to MONEY, CREDIT or LOYALTY** without a new ADR.
8. **Legacy balances are never shown as live.** Frozen "gold" stays for a future claim flow and is removed from live displays.
9. **Test money is marked, not mixed.** Test transactions carry a test flag in Billing and never count toward creator or platform totals.
10. **Payouts are a separately controlled capability.** Approving a cashout requires a payout reference from the provider; the escrow period is enforced by Billing, not only displayed.
11. **Freeze switch first.** Billing ships with an economy freeze (writes refused, reads served) before any balance moves.

## Alternatives considered

- **One Network ledger for Vibes, OpenCoins and channel points** (earlier platform plan): rejected; it mixes loyalty with money and puts a money ledger inside the identity service (roadmap anti-goal 4 and rule 11 of section 7.2).
- **Treat Vibes as a single MONEY unit**: rejected; bought-but-unspent Vibes are a prepaid liability with different rules (not withdrawable) from creator payables.
- **Keep migrating balances as columns**: rejected; the absence of atomicity, keys and refunds is the problem being solved.

## Migration consequences

- Billing imports: every `payment_orders` row as a provider receipt (status preserved; duplicates by provider reference reconciled and reported), every `transactions` row as historical journal entries marked `imported`, and **opening balances** per account equal to the current Live columns. Any difference between the replayed history and the columns is booked to an explicit `import_adjustment` entry and listed for review; nothing is silently absorbed.
- Test-era rows before `stats_vibes_reset_at` are imported flagged as test.
- Live becomes a Billing client for checkout, donations, cashout, subscriptions and balance reads; its columns freeze (legacy, read-only) at cutover. Provider webhooks move to Billing's endpoints; the PowerChat webhook is re-pointed.
- Subscriptions become Billing entitlements; VIP later adds plans and perks on top.
- OpenCoins and channel points are **not** migrated into Billing in Wave 8. They stay where they are, keep their ledgers, and get deterministic keys; Billing's loyalty ledger is a later, separate step.

## Rollback

Until cutover, Live remains authoritative and Billing only shadows (imports and reconciles). After cutover, rollback means freezing Billing, exporting its journal, and re-deriving Live's columns from it; the cutover runbook keeps the last Live snapshot.

## Acceptance tests

- A duplicated provider webhook produces exactly one accounting effect; a replayed idempotency key returns the original result.
- A refund, reversal or chargeback traces to its original transaction and keeps history immutable.
- The journal balances (sum of all entries is zero) after every operation and after import.
- Credit cannot be withdrawn by its buyer; loyalty cannot be bought, transferred or cashed out.
- Creator payables reconcile exactly to the ledger; imported opening balances equal the Live columns at cutover, with every adjustment listed.
- The freeze switch refuses writes and serves reads.
- Entitlements are queryable with Live offline.

## Amendment 2026-09-24: transaction types, OpenCoins, table substitution

### Ledger transaction types (roadmap §28.3, §28.4 item 23)

The roadmap asks for named types: platform fee, creator earning, payout hold and release, and the
compensating reversals. Billing does not add them as new `transactions.type` values. Each of them
is a **leg** (an entry on an account kind) of an existing, named type. The mapping is binding, and
reports and events use these names:

| Roadmap name | Billing type(s) | Leg (account kind) | Where |
|---|---|---|---|
| **Platform fee** (purchase spread, retained subscription share, site-route fee) | `purchase`, `subscription`, site-routed tips from receipts | credit to `platform_revenue` (cents or bits). The provider's own fee is kept as `fee_cents` in metadata, never as revenue. | `server/ops/common.js` receiptEntries, `ops/subscriptions.js` |
| **Creator earning** | `donation` (tip, donation, paid interaction), `subscription` (the creator's share), `import` / `subscription_share` for imported Live history | credit to `creator_payable:<subject>` | `ops/transfers.js`, `ops/subscriptions.js`, `importer/live.js` |
| **Payout hold** | `cashout_request` | `creator_payable` → `payouts_pending`, with `escrow_until`. Billing refuses approval during escrow (rule 10). | `ops/cashouts.js` request |
| **Payout release** (paid out) | `cashout_paid` | `payouts_pending` → `provider_clearing:<provider>_payouts` (bits to cents through `fx_conversion`), with the provider's payout reference required | `ops/cashouts.js` approve |
| **Payout release** (returned) | `cashout_denied` | `payouts_pending` → `creator_payable`, and `reverses_txn` → the request | `ops/cashouts.js` deny |
| **Compensating reversals** | `refund`, `chargeback` (with `reverses_txn` → the original); `refund` of a transfer (a media request that never played); `adjustment` (staff, with a reason) | back to `user_credit` or out through `refunds` / `chargeback_loss`. A creator's payable is never clawed back for credit already given away: the loss is booked and flagged for review. | `ops/reversals.js`, `ops/transfers.js` refund, `ops/admin.js` |
| (MONEY → CREDIT) | `recycle` | `creator_payable` → `user_credit` (rule 4) | `ops/cashouts.js` recycle |

A new money movement gets a new `type` value only when no existing type and leg describes it.
Adding one is additive in Billing's CHECK and in `billing.transaction.settled@1`.

### OpenCoins stays in Network (supersession)

Roadmap Wave 8 (line 692) says "Network's OpenCoins wallet becomes a Billing client". **This ADR
supersedes that line.** OpenCoins are LOYALTY. Network owns them, with their own ledger, and
Billing does not hold, mirror or proxy them (see Decision, and Migration consequences: "OpenCoins
and channel points are **not** migrated into Billing in Wave 8"). A Billing loyalty ledger, if it
ever comes, is a separate step with its own ADR amendment, and it never shares accounts with MONEY
or CREDIT. The Network requirement ledger (D28) and the roadmap crosswalk should cite this
paragraph instead of listing the line as remaining.

### Table substitution (roadmap §11.1.1)

The roadmap's minimal entity list names twelve tables. Billing has nine of them under those names:
`accounts`, `ledger_entries`, `transactions`, `provider_events`, `payment_intents`, `subscriptions`,
`entitlements`, `reconciliation_runs` and `idempotency_keys`. It deliberately substitutes the other
three:

| Roadmap entity | Billing's equivalent | Why |
|---|---|---|
| `payouts` | `cashouts` (`server/db.js`), with the `cashout_request` / `cashout_paid` / `cashout_denied` journal transactions | The product calls them cashouts. The row holds the payout method, escrow and provider payout reference. |
| `refunds` | reversal transactions (`type refund` or `chargeback`, `reverses_txn` → the original) plus the `refunds` and `chargeback_loss` accounts (`server/ops/reversals.js`) | A refund is a journal fact, not a separate mutable record. Partial and cumulative reversals are checked against the original. |
| `plans` | VIP's `vip_plans` (OpenVibe.VIP) | Plans and perks are VIP's (see the ENTITLEMENT row in the Decision). Billing holds only the entitlement truth. |

Billing also has `external_receipts` (EXTERNAL-class PowerChat tips, recorded without liability)
and `account_balances` (a projection of the journal, checked by reconciliation). Thin `payouts` or
`refunds` views may be added for reporting. They are not required.
