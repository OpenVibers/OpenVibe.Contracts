'use strict';
/** One platform level. Experience is an earned, non-spendable whole number. */
function levelOf(xp) {
    if (!Number.isSafeInteger(xp) || xp < 0 || xp > 1000000000000) throw new RangeError('xp must be an integer from 0 to 1000000000000');
    const level = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
    const start = 50 * level * (level - 1);
    return { level, into: xp - start, span: 100 * level, next_at: 50 * level * (level + 1) };
}
const reasons = Object.freeze({
    'quest.completed': Object.freeze({ name: 'Finished a quest' }),
    'coins.earned': Object.freeze({ name: 'Earned OpenCoins' }),
    'video.published': Object.freeze({ name: 'Published a video' }),
    'stream.watched': Object.freeze({ name: 'Watched a stream' }),
});
function reasonName(code) { return reasons[code]?.name || 'Earned experience'; }
module.exports = { levelOf, reasons, reasonName };
