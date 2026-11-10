'use strict';
const assert = require('node:assert/strict');
const { validate } = require('..');
for (const kind of ['search', 'image']) {
    const id = `exchange.${kind}-result`;
    const legacy = require(`../fixtures/${id}/valid/platform.json`);
    const fallback = require(`../fixtures/${id}/valid/fallback.json`);
    assert.equal(validate(id + '@1', legacy).valid, true, 'old clients still produce valid receipts');
    assert.equal(validate(id + '@1', fallback).valid, true, 'ordered failures and success are retained');
    assert.equal(validate(id + '@1', require(`../fixtures/${id}/invalid/unsafe-reason.json`)).valid, false, 'raw upstream error text is refused');
    for (const patch of [{ status: 'unknown' }, { time_ms: -1 }, { cost_usd: -1 }, { api_key: 'not-a-real-key' }]) {
        const bad = structuredClone(fallback);
        Object.assign(bad.receipt.attempts[0], patch);
        assert.equal(validate(id + '@1', bad).valid, false);
    }
    const many = structuredClone(fallback);
    many.receipt.attempts = Array(65).fill(fallback.receipt.attempts[0]);
    assert.equal(validate(id + '@1', many).valid, false, 'receipts have bounded attempts');
}
console.log('search attempts: ok');
