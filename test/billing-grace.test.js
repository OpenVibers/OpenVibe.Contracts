'use strict';
// T5 step 11: a failed renewal moves a subscription to past_due grace (additive on the billing events).
const assert = require('assert');
const contracts = require('..');

const base = {
  subject: { type: 'user', id: 'usr_01JAB2C3D4E5F6G7H8J9K0MNPR' },
  streamer: { type: 'user', id: 'usr_01JAB2C3D4E5F6G7H8J9K0MNPQ' },
  kind: 'channel_subscription',
  active: false,
  expires_at: '2026-10-23T10:00:00.000Z',
  subscription: { id: 'sub_01JAB3C4D5E6F7G8H9J0K1MNQ0', status: 'active', auto_renew: true, cancel_at_period_end: false, provider: 'credit' },
  reason: 'renewed',
};
const V = (p) => contracts.validate('billing.entitlement.changed@1', p);
const withSub = (status) => ({ ...base, subscription: { ...base.subscription, status } });

assert.ok(V(base).valid, 'a payload without the grace fields still validates');
const pastDue = { ...withSub('past_due'), reason: 'renewal_failed', grace_until: '2026-10-26T10:00:00.000Z', renewal_period_end: '2026-11-23T10:00:00.000Z' };
assert.ok(V(pastDue).valid, 'past_due with grace_until and renewal_failed validates');
assert.ok(V({ ...pastDue, grace_until: null }).valid, 'grace_until may be null');
assert.ok(V({ ...withSub('expired'), reason: 'grace_ended' }).valid, 'grace_ended validates without the optional fields');
assert.ok(V({ ...withSub('expired'), reason: 'credit_refund', revoked_period: { starts_at: '2026-09-23T10:00:00.000Z', ends_at: '2026-10-23T10:00:00.000Z' } }).valid, 'credit_refund validates');
assert.ok(['active', 'canceled', 'expired'].every((s) => V(withSub(s)).valid), 'the earlier statuses still validate');
assert.ok(!V(withSub('grace')).valid, 'an unknown status is refused');
assert.ok(!V({ ...pastDue, grace_until: 'soon' }).valid, 'grace_until is a date-time');
assert.ok(!V({ ...pastDue, renewal_period_end: null }).valid, 'renewal_period_end is a date-time when present');

const rev = {
  transaction_id: 'txn_01JAB3C4D5E6F7G8H9J0K1MNQ4', type: 'refund', test: false,
  from_subject: 'usr_01JAB2C3D4E5F6G7H8J9K0MNPQ', to_subject: 'usr_01JAB2C3D4E5F6G7H8J9K0MNPR', provider: null,
  metadata: { original_type: 'subscription' }, reverses_txn: 'txn_01JAB3C4D5E6F7G8H9J0K1MNQ5',
};
assert.ok(contracts.validate('billing.transaction.reversed@1', rev).valid, 'a refund of a credit-paid subscription period validates');
console.log('billing-grace ok');
