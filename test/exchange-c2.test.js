'use strict';
const assert = require('node:assert/strict');
const contracts = require('..');
for (const id of ['compat-routing', 'request-preset', 'generation']) {
    const name = 'exchange.' + id;
    assert.equal(contracts.validate(name + '@1', require('../fixtures/' + name + '/valid/example.json')).valid, true, name);
    assert.equal(contracts.validate(name + '@1', require('../fixtures/' + name + '/invalid/example.json')).valid, false, name);
}
for (const provider of [{ max_price: { prompt: -1 } }, { zdr: 'true' }, { data_collection: 'maybe' }, { unknown: true }])
    assert.equal(contracts.validate('exchange.compat-routing@1', { provider }).valid, false);
console.log('exchange-c2: ok');
