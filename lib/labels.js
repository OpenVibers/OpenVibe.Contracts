'use strict';
/**
 * The six content labels (L1, labels and choices, 2026-10-31) and the three viewer choices.
 *
 * One list for every contract, service and SDK: nudity, language, graphic, 18+, flashing and spoilers.
 * Labels are choices, not bans — a creator sets them, the AI may suggest them, three viewer suggestions
 * or a moderator put one on, and each viewer's network.label-prefs@1 decides what they see. The native
 * apps start nudity and 18+ at hide until the person turns them on in their web settings.
 */
const LABELS = Object.freeze(['nudity', 'language', 'graphic', '18+', 'flashing', 'spoilers']);

/** What a viewer may choose for each label (network.label-prefs@1). */
const CHOICES = Object.freeze(['show', 'blur', 'hide']);

/** The plain words the account page and every chip use. Copy, not markup: the API carries it too. */
const INFO = Object.freeze([
    Object.freeze({ id: 'nudity', title: 'Nudity', description: 'Nudity and sexual content.' }),
    Object.freeze({ id: 'language', title: 'Strong language', description: 'Swearing and strong language.' }),
    Object.freeze({ id: 'graphic', title: 'Graphic violence', description: 'Graphic violence or injury.' }),
    Object.freeze({ id: '18+', title: '18+', description: 'For adults only.' }),
    Object.freeze({ id: 'flashing', title: 'Flashing lights', description: 'Flashing lights or rapid motion.' }),
    Object.freeze({ id: 'spoilers', title: 'Spoilers', description: 'Gives away a story.' }),
]);

/** The web default, and the value an unset label means on OpenVibe. */
const DEFAULT = 'show';

/** All six at the default, as network.label-prefs@1's `prefs`. */
const defaults = () => Object.fromEntries(LABELS.map((label) => [label, DEFAULT]));

module.exports = { LABELS, CHOICES, INFO, DEFAULT, defaults };
