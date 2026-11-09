'use strict';
const assert = require('assert');
const { validate } = require('..');
const error = { code: 'route.unavailable', words: 'No model could take this task.', next: 'Pick a model or add an AI key, then retry.', action: 'pick_model' };
assert.ok(validate('ai.run-error@1', error).valid, 'a safe action error is in the contract');
assert.ok(!validate('ai.run-error@1', { ...error, raw: '{tried:[...]}' }).valid, 'raw provider payloads have no display field');
const map = require('../manifests/ai-run-error-codes.v1.json').codes;
assert.deepStrictEqual(map['route.unavailable'], { words: error.words, next: error.next, action: error.action });
const item = {
    service: 'ai', id: 'run_123', kind: 'ai_run', title: 'Draft a post', summary: error.words,
    bucket: 'failed', state: 'failed', created_at: '2026-11-09T08:00:00.000Z', updated_at: '2026-11-09T08:01:00.000Z',
    href: 'https://ai.openvibe.services/runs/run_123', actions: ['open'], error: error.words,
    run_error: error, skill: 'blog.write', subject: { kind: 'post', title: 'Patch notes draft', url: 'https://openvibe.blog/posts/42' },
    model: 'gpt-5-nano', maker: 'OpenAI', duration_ms: 60000, step: null,
};
assert.ok(validate('common.action-item@1', item).valid, 'the action feed carries the run details');
assert.ok(!validate('common.action-item@1', { ...item, duration_ms: -1 }).valid);
const state = {
    open: true, tab: 'vibe', pinned: false, agent: null, chat: null,
    vibe: { slug: 'v-abc', at: '2026-11-09T08:00:00.000Z' }, agent_filter: 'failed',
    place: { phone: { corner: 'bottom-right' }, desktop: { corner: 'top-left', width: 420, height: 640 } },
    updated_at: '2026-11-09T08:00:00.000Z',
};
assert.ok(validate('network.dock-state@1', state).valid, 'the recent conversation and Agents filter sync');
assert.ok(!validate('network.dock-state@1', { ...state, vibe: { slug: '<bad>', at: state.vibe.at } }).valid);
assert.ok(validate('chat.vibe-conversations-result@1', { count: 1, conversations: [{ slug: 'v-abc', name: 'Patch notes', last_message_at: state.updated_at, created_at: state.updated_at, last_line: 'What changed?', last_answer_at: null, site: 'openvibe.blog' }] }).valid);
assert.ok(validate('actor.skill-run-request@1', { skill: 'skl_example', input: {}, choice: { mode: 'balanced' } }).valid);
assert.ok(validate('actor.skill-run-result@1', { run: { id: 'tsk_example', skill: 'blog.write', subject: 'Patch notes' } }).valid);
console.log('dock v2 contracts: safe errors, action context, synced state, Vibe list and skill runs');
