'use strict';
const assert = require('node:assert/strict');
const contracts = require('..');
const example = require('../contracts/link/compute.v1.json').examples[0];

assert.equal(contracts.validate('link.compute@1', example).valid, true);
assert.equal(contracts.validate('link.compute@1', {
    ...example, sources: [...example.sources, { kind: 'exchange', name: 'GPU', status: 'ready', reason: null, price: null }],
}).valid, false, 'a ready rental needs a live price and quote lifetime');
assert.equal(contracts.validate('link.compute@1', {
    ...example, candidates: [{ ...example.candidates[0], price: { amount_usd: -1, unit: 'hour' } }],
}).valid, false, 'negative prices cannot be displayed');
assert.equal(contracts.validate('link.compute@1', {
    ...example, candidates: [{ ...example.candidates[0], status: 'imaginary' }],
}).valid, false, 'unknown placement state is rejected');
console.log('link.compute contract: ok');
