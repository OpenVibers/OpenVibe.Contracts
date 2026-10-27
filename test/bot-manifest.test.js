'use strict';
// OpenVibe.Bot (ADR-043) declares its capabilities and events in its own STATUS.json; the manifest here must
// list the same ones, and every bot.* event it produces has a payload contract. A drift between the repositories
// fails here first.
const assert = require('assert');
const c = require('..');

// OpenVibe.Bot STATUS.json "capabilities" and "events" at origin/main (2026-10-04, with bot.job.dispatch, plan T14 step 6).
// bot.resource.read: the robots in OpenVibe.Services' resource index (planned 0.129.0, active 0.130.0; plan T13 step 8).
// bot.computer.control: an owner's agent uses their own machine (0.166.0, plan T14/T17; Bot's STATUS.json lists it with
// the computer kinds).
// bot.resource.control: an owner stops or resumes their robot from OpenVibe.Services (0.176.0, ADR-048 step 8 phase 2).
// bot.machine.ai: a model on the person's own machine, for that person (0.219.0, the AI-on-your-machines plan).
const BOT_CAPABILITIES = ['bot.robot.read', 'bot.robot.manage', 'bot.robot.control', 'bot.computer.control', 'bot.machine.ai', 'bot.device.connect', 'bot.job.dispatch', 'bot.resource.read', 'bot.resource.control'];
const BOT_EVENTS = ['bot.robot.online', 'bot.robot.offline', 'bot.estop.set', 'bot.estop.cleared', 'bot.command.refused'];

const bot = c.services.get('bot');
assert.deepStrictEqual([...bot.capabilities].sort(), [...BOT_CAPABILITIES].sort(), 'bot manifest capabilities are Bot STATUS.json capabilities');
assert.deepStrictEqual([...bot.eventsProduced].sort(), [...BOT_EVENTS].sort(), 'bot manifest eventsProduced are Bot STATUS.json events');
for (const t of BOT_EVENTS) assert.ok(c.resolve(`${t}@1`), `${t} has a payload contract`);

// The device and operator WebSocket frames are contracts too, and a command frame is refused for an unknown kind.
for (const id of ['bot.device-message@1', 'bot.command@1', 'bot.command-result@1', 'bot.robot-profile@1']) assert.ok(c.resolve(id), `${id} resolves`);
assert.ok(!c.validate('bot.command@1', { type: 'command', kind: 'fly' }).valid, 'an unknown command kind is refused');
// The computer kinds: a program and its arguments, never a shell line; a file op from the list; the answer in data.
const cmd = (kind, value) => ({ v: 1, seq: 1, ts: 1, type: 'command', id: 'op-1', kind, value });
assert.ok(c.validate('bot.command@1', cmd('exec', { argv: ['ls', '-la'] })).valid, 'exec with argv');
assert.ok(!c.validate('bot.command@1', cmd('exec', { argv: 'ls -la' })).valid, 'exec with a shell line is refused');
assert.ok(!c.validate('bot.command@1', cmd('exec', {})).valid, 'exec needs argv');
assert.ok(!c.validate('bot.command@1', cmd('fs', { op: 'delete', path: '/x' })).valid, 'fs has no delete');
assert.ok(!c.validate('bot.command@1', cmd('screen', { max_width: 100 })).valid, 'a screen at least 320 wide');
// Kind ai (0.219.0): one chat completion, its messages each a role and text, nothing that reaches the machine itself.
assert.ok(c.validate('bot.command@1', cmd('ai', { model: 'llama3.1:8b', messages: [{ role: 'user', content: 'hi' }] })).valid, 'ai with a model and messages');
assert.ok(!c.validate('bot.command@1', cmd('ai', { model: 'llama3.1:8b', messages: [{ role: 'tool', content: 'x' }] })).valid, 'ai messages are system, user or assistant');
assert.ok(!c.validate('bot.command@1', cmd('ai', { model: 'm', messages: [{ role: 'user', content: 'x' }], endpoint: 'http://10.0.0.1/' })).valid, 'ai never names an endpoint');
assert.ok(c.validate('bot.command@1', cmd('probe', { target: 'tcp://192.168.1.5:22' })).valid, 'a probe of a LAN port');
assert.ok(!c.validate('bot.command@1', cmd('probe', { target: 'file:///etc/passwd' })).valid, 'a probe is http(s) or tcp');
assert.ok(c.validate('bot.command@1', cmd('input', { action: 'click', x: 10, y: 20, width: 1280, height: 720 })).valid, 'a click in a picture\'s space');
assert.ok(c.validate('bot.command@1', cmd('input', { action: 'type', text: 'hello' })).valid, 'typing');
assert.ok(!c.validate('bot.command@1', cmd('input', { action: 'key', keys: 'ctrl+s; rm -rf ~' })).valid, 'a key is a key, never a command line');
assert.ok(!c.validate('bot.command@1', cmd('input', { action: 'drag' })).valid, 'only the listed actions');
assert.ok(!c.validate('bot.command@1', cmd('input', { action: 'scroll', dy: 500 })).valid, 'scrolls are bounded');
assert.ok(c.validate('bot.command-result@1', { v: 1, seq: 1, ts: 1, type: 'command_result', id: 'op-1', result: 'ack', data: { exit_code: 0 } }).valid, 'an ack with data');
console.log('bot manifest: all checks passed');
