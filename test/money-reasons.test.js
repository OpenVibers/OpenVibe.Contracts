'use strict';
// billing.money-reason@1 and lib/money-reasons.js: one list of plain words for a ledger key.
const assert = require('assert');
const contracts = require('..');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const { moneyReasons } = contracts;

const quest = moneyReasons.describe('quest:publish-a-video', { resolve: { quest: () => ({ name: 'Publish a video', url: 'https://openvibe.quest/quests/publish-a-video' }) } });
ok(quest.known && quest.text === 'for the quest Publish a video', 'a quest key reads "for the quest Publish a video"');
ok(quest.subject && quest.subject.url === 'https://openvibe.quest/quests/publish-a-video', 'and links to the quest');

const slug = moneyReasons.describe('quest:publish-a-video');
ok(slug.text === 'for the quest Publish a video', 'without the catalog, the slug names the quest');
ok(slug.subject.url === 'https://openvibe.quest/quests/publish-a-video', 'and its address still holds');

ok(moneyReasons.describe('Media request: A film').text === 'for the stream A film', 'a media request names the stream');
ok(moneyReasons.describe('Refund: A film').text === 'for a refund of A film', 'a refund names what it returns');
ok(moneyReasons.describe('account_merge').text === 'for merging your accounts', 'a reason with no page has its own words');
ok(moneyReasons.describe('account_merge').subject === null, 'and no subject');

const received = moneyReasons.describe('donation:received', { subject: { name: '@bob' } });
ok(received.text === 'for a tip from @bob', 'a received tip names the sender');

const tip = moneyReasons.describe('donation', { subject: { name: '@alice', url: 'https://openvibe.live/@alice' } });
ok(tip.text === 'for a tip to @alice' && tip.subject.url === 'https://openvibe.live/@alice', 'a provided subject names a tip');

const unknown = moneyReasons.describe('nobody:declared-this', { site: 'live' });
ok(!unknown.known, 'an undeclared key is not known');
ok(unknown.text === 'for something on OpenVibe.Live', 'it reads "for something on <site>"');
ok(!/nobody:|declared-this/.test(unknown.text), 'and never shows the key');

const row = moneyReasons.describeRow({ reason: 'quest:go-live', app_id: 'quest' });
ok(row.text === 'for the quest Go live' && row.site === 'OpenVibe.Quest', 'a raw row is described by its reason and app');

const schema = contracts.schema('billing.money-reason@1');
ok(schema && schema.properties.text.maxLength === 300, 'billing.money-reason@1 is in the catalog');
ok(contracts.validate('billing.money-reason@1', { key: 'quest:go-live', text: 'for the quest Go live', subject: { name: 'Go live', url: 'https://openvibe.quest/quests/go-live' }, site: 'OpenVibe.Quest', known: true }).valid,
    'a made reason validates');
ok(!contracts.validate('billing.money-reason@1', { key: 'quest:go-live', text: 'for the quest Go live', extra: 1 }).valid,
    'a made reason has no extra fields');

console.log(`openvibe-contracts money reasons: ${n} checks passed`);
