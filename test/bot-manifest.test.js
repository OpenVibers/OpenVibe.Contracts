'use strict';
// OpenVibe.Bot (ADR-043) declares its capabilities and events in its own STATUS.json; the manifest here must
// list the same ones, and every bot.* event it produces has a payload contract. A drift between the repositories
// fails here first.
const assert = require('assert');
const c = require('..');

// OpenVibe.Bot STATUS.json "capabilities" and "events" at origin/main (2026-10-04, with bot.job.dispatch, plan T14 step 6).
// bot.resource.read: the robots in OpenVibe.Services' resource index (planned 0.129.0, active 0.130.0; plan T13 step 8).
const BOT_CAPABILITIES = ['bot.robot.read', 'bot.robot.manage', 'bot.robot.control', 'bot.device.connect', 'bot.job.dispatch', 'bot.resource.read'];
const BOT_EVENTS = ['bot.robot.online', 'bot.robot.offline', 'bot.estop.set', 'bot.estop.cleared', 'bot.command.refused'];

const bot = c.services.get('bot');
assert.deepStrictEqual([...bot.capabilities].sort(), [...BOT_CAPABILITIES].sort(), 'bot manifest capabilities are Bot STATUS.json capabilities');
assert.deepStrictEqual([...bot.eventsProduced].sort(), [...BOT_EVENTS].sort(), 'bot manifest eventsProduced are Bot STATUS.json events');
for (const t of BOT_EVENTS) assert.ok(c.resolve(`${t}@1`), `${t} has a payload contract`);

// The device and operator WebSocket frames are contracts too, and a command frame is refused for an unknown kind.
for (const id of ['bot.device-message@1', 'bot.command@1', 'bot.command-result@1', 'bot.robot-profile@1']) assert.ok(c.resolve(id), `${id} resolves`);
assert.ok(!c.validate('bot.command@1', { type: 'command', kind: 'fly' }).valid, 'an unknown command kind is refused');
console.log('bot manifest: all checks passed');
