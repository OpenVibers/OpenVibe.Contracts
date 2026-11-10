'use strict';
const assert = require('assert');
const { levels, validate } = require('..');
for (let l = 1; l <= 10000; l++) {
 const at = 50*l*(l-1);
 assert.equal(levels.levelOf(at).level, l);
 if (at) assert.equal(levels.levelOf(at-1).level, l-1);
 assert.equal(levels.levelOf(at).into, 0);
 assert.equal(levels.levelOf(at).span, 100*l);
}
for (const x of [-1, 1.5, NaN, Infinity, '100']) assert.throws(() => levels.levelOf(x));
assert.equal(levels.reasonName('quest.completed'), 'Finished a quest');
assert.equal(levels.reasonName('private:raw-code'), 'Earned experience');
assert(validate('network.level@1', {...levels.levelOf(300), xp:300, rank:null, recent:[]}).valid);
console.log('levels: curve boundaries and named reasons passed');
