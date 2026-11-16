'use strict';
/**
 * The system map (0.443.0; the owner, 2026-11-16: Codes, Actor, Computer and every agent should know "all the
 * different repositories and how they're interconnected … the SDK and API … which repositories it needs").
 *
 * One view of the network, built only from what this package already carries:
 * - every service (manifests/services): its repository, site, origin, health, capabilities and events;
 * - every repository (manifests/repositories) and the three libraries every repository builds on;
 * - every capability's owner;
 * and `reposFor(task)`, which picks the repositories a task needs and says why, and `markdown(task)`, the brief an
 * agent reads first (Codes writes it into a job's workspace as OPENVIBE.md).
 *
 *   const { systemMap, reposFor, markdown } = require('openvibe-contracts').systemMap;
 *   reposFor('the search box in the menu shows its label twice').picks[0].name  // 'OpenVibe.Shared'
 *
 * Domains come from the service manifests (what is deployed), never from the repository manifests' wish lists. The
 * internal origins (127.0.0.1:port) are left out unless asked for: { internal: true }.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'manifests');
const read = (sub) => fs.readdirSync(path.join(ROOT, sub)).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, sub, f), 'utf8')));

/** The three libraries: what each is for, and the words that mean a task touches it. */
const LIBRARIES = [
    {
        name: 'OpenVibe.Shared', repository: 'OpenVibers/OpenVibe.Shared', package: 'openvibe-shared', role: 'browser',
        what: 'The browser files every site serves at /shared/*: the navbar and its slots, the menu and its search, the sessions panel (ov-session), the composer, glyphs and icons, the kit of server-drawn parts, notifications, themes and motion. A change here reaches every site through a release and a pin round.',
        words: ['navbar', 'nav', 'menu', 'search', 'sidebar', 'session', 'sessions', 'composer', 'glyph', 'glyphs', 'icon', 'icons', 'kit', 'theme', 'themes', 'notification', 'notifications', 'tab', 'tabs', 'button', 'buttons', 'style', 'styles', 'css', 'animation', 'animations', 'effect', 'effects', 'thinking', 'thought', 'chip', 'picker', 'sheet', 'footer', 'header', 'layout', 'font', 'emoji', 'shared', 'label', 'labels', 'placeholder', 'suggestion', 'suggestions', 'trending'],
    },
    {
        name: 'OpenVibe.SDK', repository: 'OpenVibers/OpenVibe.SDK', package: 'openvibe-sdk', role: 'server',
        what: 'The Node server kit every service builds on: db (PostgreSQL, PGlite in tests), site (keys, routers, OpenAPI, link headers, times), sign-in and principals, events, jobs, caller limits, observability, and agents (the one agentic core).',
        words: ['sdk', 'server', 'database', 'postgres', 'postgresql', 'pglite', 'migration', 'migrations', 'principal', 'jwks', 'openapi', 'router', 'limits', 'observability', 'metrics', 'agentic', 'harness', 'consolidate', 'duplicate', 'duplicated'],
    },
    {
        name: 'OpenVibe.Contracts', repository: 'OpenVibers/OpenVibe.Contracts', package: 'openvibe-contracts', role: 'contracts',
        what: 'The binding schemas between services, the capability registry, the service, repository and product manifests, and this map. A new capability, event or frame starts here.',
        words: ['contract', 'contracts', 'schema', 'schemas', 'capability', 'capabilities', 'manifest', 'manifests', 'frame', 'compat'],
    },
];

/** How the network fits together: what any task that crosses a service boundary needs to know. */
const SPINE = [
    ['Sign-in', 'OpenVibe.Network (openvibe.network) is the one SSO/OAuth2 provider; services trust its RS256 tokens and check capabilities (openvibe-contracts capabilities), never roles of their own.'],
    ['Money', 'OpenVibe.Billing is the only ledger: checkouts, wallets, subscriptions and payouts are Billing calls.'],
    ['Media', 'OpenVibe.Media stores videos, clips, pictures and files; other services ask it through its client.'],
    ['Events', 'OpenVibe.Events carries what happened between services (cursor reads); a consumer never reads another service\'s tables.'],
    ['AI', 'OpenVibe.AI is the one AI gateway (every provider and model behind one API); OpenVibe.Exchange is its pages.'],
    ['Agents', 'Codes runs coding agents (any harness), Actor runs tasks, Computer drives desktops and browsers; Run and Link run their jobs on people\'s machines and shared nodes, Bot reaches robots.'],
    ['Libraries', 'Every site serves openvibe-shared from a pinned release; every server builds on openvibe-sdk; schemas live in openvibe-contracts. Change the library, release it, then pin it everywhere (never edit node_modules).'],
];

/**
 * Words that belong to one service's job though they name nothing (a task says "tokens per day", not "OpenVibe.AI").
 * Each word: the services that own it, by id, and how strongly.
 */
const CONCEPTS = {
    ai: [['ai', 4]], model: [['ai', 3], ['exchange', 2]], models: [['ai', 3], ['exchange', 2]], provider: [['ai', 3]], providers: [['ai', 3]],
    tokens: [['ai', 3]], quota: [['ai', 3]], allowance: [['ai', 3]], prompt: [['ai', 2]], gpu: [['ai', 2], ['run', 2]], gpus: [['ai', 2], ['run', 2]],
    rank: [['network', 4]], role: [['network', 3]], roles: [['network', 3]], owner: [['network', 2]], admin: [['network', 2]],
    login: [['network', 4]], signin: [['network', 4]], sso: [['network', 5]], oauth: [['network', 5]], account: [['network', 3]], accounts: [['network', 3]],
    notification: [['network', 5]], notifications: [['network', 5]], alerts: [['network', 4]], inbox: [['network', 3]], follow: [['network', 2]], follows: [['network', 2]],
    money: [['billing', 5]], wallet: [['billing', 4]], coins: [['billing', 4]], vibes: [['billing', 3]], checkout: [['billing', 5]], payout: [['billing', 4]], subscription: [['billing', 4]], tip: [['billing', 2], ['tips', 3]], tips: [['tips', 4]],
    video: [['media', 3]], videos: [['media', 3]], clip: [['media', 3], ['live', 2]], clips: [['media', 3], ['live', 2]], vod: [['media', 4]], vods: [['media', 4]], upload: [['media', 3]], uploads: [['media', 3]], thumbnail: [['media', 3]],
    stream: [['live', 4]], streams: [['live', 4]], streamer: [['live', 4]], broadcast: [['live', 4]], whip: [['live', 5]], rtmp: [['live', 5]], restream: [['openre', 5]],
    camera: [['cam', 4], ['live', 2]], cameras: [['cam', 4]], lens: [['cam', 3]], webcam: [['cam', 4]],
    chat: [['chat', 5]], message: [['chat', 2]], messages: [['chat', 2]], emote: [['chat', 3]], emotes: [['chat', 3]],
    agent: [['actor', 2], ['codes', 2]], agents: [['actor', 2], ['codes', 2]], harness: [['codes', 5]], harnesses: [['codes', 5]], claude: [['codes', 3]], codex: [['codes', 4]], coding: [['codes', 4]],
    task: [['actor', 2]], tasks: [['actor', 2]], schedule: [['actor', 2]], thought: [['actor', 2]], thoughts: [['actor', 2]],
    desktop: [['computer', 4]], browser: [['computer', 2]], screen: [['computer', 2]],
    node: [['run', 3]], nodes: [['run', 3]], machine: [['run', 3]], machines: [['run', 3]], job: [['run', 3]], jobs: [['run', 3]], sandbox: [['run', 3]],
    robot: [['bot', 5]], robots: [['bot', 5]], hardware: [['bot', 4]],
    event: [['events', 3]], events: [['events', 3]], webhook: [['events', 3]],
    item: [['inventory', 3]], items: [['inventory', 3]], cosmetic: [['inventory', 4]], cosmetics: [['inventory', 4]], art: [['design', 2], ['inventory', 2]],
    icon: [['design', 2]], icons: [['design', 2]], logo: [['design', 3]], brand: [['design', 3]],
    feed: [['search', 2]], trending: [['search', 3]],
    wiki: [['wiki', 5]], email: [['mail', 4]], mail: [['mail', 5]], game: [['games', 4]], games: [['games', 4]],
};
const LINK_WORDS = ['link', 'ov-node', 'shared-node', 'pairing'];

const STOP = new Set(('the a an and or of to in on for with from by at is are be it its this that these those as into than then '
    + 'when where what which who how why not no yes all any each every our your their my me we you they them it\'s '
    + 'make makes made do does did done have has had get gets got can could should would will just like also more most '
    + 'some such use uses using used need needs new old page pages site sites one two way thing things stuff shit').split(/\s+/));

const words = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9.\-\s]/g, ' ').split(/\s+/)
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, '')).filter((w) => w.length >= 3 && !STOP.has(w));
const stem = (w) => w.replace(/(ies|es|s)$/, '');

let cached = null;
function load() {
    if (cached) return cached;
    const services = read('services');
    const repositories = read('repositories');
    cached = { services, repositories };
    return cached;
}

const hostOf = (origin) => { try { return new URL(origin).host; } catch { return null; } };

/** The whole map: { libraries, services, repositories, spine }. */
function systemMap({ internal = false } = {}) {
    const { services, repositories } = load();
    const svc = services.map((m) => ({
        id: m.id,
        name: m.name,
        repository: m.repository,
        status: m.status,
        state: (m.exposure && m.exposure.state) || null,
        site: m.site ? { name: m.site.name || null, what: m.site.what || m.site.tagline || null } : null,
        origin: m.publicOrigin || null,
        domains: Array.isArray(m.domains) ? m.domains : [],
        health: m.health || null,
        ...(internal && m.internalOrigin ? { internalOrigin: m.internalOrigin } : {}),
        capabilities: m.capabilities || [],
        events: { produced: m.eventsProduced || [], consumed: m.eventsConsumed || [] },
    }));
    const byRepo = new Map(svc.map((s) => [s.repository, s]));
    const repos = new Map();
    for (const s of svc) repos.set(s.repository, { name: s.repository.split('/')[1], repository: s.repository, service: s.id, kind: 'service' });
    for (const r of repositories) {
        if (repos.has(r.repository)) continue;
        const lib = LIBRARIES.find((l) => l.repository === r.repository);
        repos.set(r.repository, { name: r.name, repository: r.repository, service: r.service || null, kind: lib ? 'library' : (byRepo.has(r.repository) ? 'service' : 'tool'), stage: r.stage || null });
    }
    for (const l of LIBRARIES) repos.set(l.repository, { name: l.name, repository: l.repository, service: null, kind: 'library', package: l.package });
    return {
        libraries: LIBRARIES.map(({ words: _w, ...l }) => l),
        services: svc,
        repositories: [...repos.values()].sort((a, b) => a.name.localeCompare(b.name)),
        spine: SPINE.map(([name, text]) => ({ name, text })),
    };
}

/** The words that name each service, weighted: its id and name, its site's name, its domains' labels. */
function namesOf(m) {
    const out = new Map();
    const add = (w, n) => { if (!w || w.length < 3 || STOP.has(w)) return; out.set(w, Math.max(out.get(w) || 0, n)); };
    add(m.id, 6);
    for (const w of words(String(m.name || '').replace(/^OpenVibe\./, ''))) add(w, 6);
    if (m.site && m.site.name) for (const w of words(m.site.name)) add(w, 5);
    for (const d of m.domains || []) {
        add(d, 8);
        for (const label of d.split('.')) if (!['openvibe', 'com', 'net', 'org', 'www', 'services', 'network'].includes(label)) add(label, 4);
    }
    return out;
}

/**
 * The repositories a task needs, best first, each with why: { picks: [{ name, repository, kind, score, why }] }.
 * A named service or domain counts most; then its site's words, its capabilities and events; a library when the
 * task speaks its language (a navbar, a schema, a migration).
 */
function reposFor(task, { limit = 6 } = {}) {
    const { services } = load();
    const text = String(task || '').toLowerCase();
    const ws = words(text);
    const set = new Set(ws.map(stem));
    const scores = [];
    for (const m of services) {
        let score = 0;
        const why = [];
        for (const [w, n] of namesOf(m)) {
            const hit = w.includes('.') ? text.includes(w) : set.has(stem(w));
            if (hit) { score += n; why.push(w.includes('.') ? `names ${w}` : `says "${w}"`); }
        }
        const what = new Set(words(m.site && (m.site.what || m.site.tagline)).map(stem));
        let siteHits = 0;
        for (const w of set) if (what.has(w) && siteHits < 3) { siteHits += 1; score += 1; }
        if (siteHits) why.push(`what it does (${siteHits} word${siteHits === 1 ? '' : 's'})`);
        let capHits = 0;
        const capWords = new Set((m.capabilities || []).flatMap((id) => id.split('.').slice(1)).map(stem));
        for (const w of set) if (capWords.has(w) && capHits < 3) { capHits += 1; score += 0.5; }
        if (capHits) why.push(`its capabilities (${capHits})`);
        if (score >= 1) scores.push({ name: m.name, repository: m.repository, kind: 'service', service: m.id, score, why });
    }
    // The concepts: a word that belongs to a service's job.
    const byId = new Map(services.map((m) => [m.id, m]));
    const concept = new Map();
    for (const w of new Set(ws)) {
        for (const [id, n] of CONCEPTS[w] || []) {
            const m = byId.get(id);
            if (!m) continue;
            const c = concept.get(id) || { m, score: 0, why: [] };
            c.score += n; c.why.push(`"${w}" is its job`);
            concept.set(id, c);
        }
    }
    for (const [id, c] of concept) {
        const was = scores.find((x) => x.service === id);
        if (was) { was.score += c.score; was.why.push(...c.why); } else scores.push({ name: c.m.name, repository: c.m.repository, kind: 'service', service: id, score: c.score, why: c.why });
    }
    if (LINK_WORDS.some((w) => text.includes(w))) scores.push({ name: 'OpenVibe.Link', repository: 'OpenVibers/OpenVibe.Link', kind: 'tool', score: 5, why: ['machines join through Link'] });
    for (const l of LIBRARIES) {
        const hits = l.words.filter((w) => set.has(stem(w)));
        if (hits.length) scores.push({ name: l.name, repository: l.repository, kind: 'library', score: 3 + hits.length * 1.5, why: hits.slice(0, 4).map((w) => `says "${w}"`) });
    }
    // One repository once (Shared is a library and the docs site of it): its best score, every reason.
    const merged = new Map();
    for (const p of scores) {
        const was = merged.get(p.repository);
        if (!was) { merged.set(p.repository, { ...p, why: [...p.why] }); continue; }
        if (p.kind === 'library') was.kind = 'library';
        was.score = Math.max(was.score, p.score) + Math.min(was.score, p.score) / 2;
        for (const w of p.why) if (!was.why.includes(w)) was.why.push(w);
    }
    const ranked = [...merged.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const picks = ranked.slice(0, Math.max(1, limit)).map((p) => ({ ...p, score: Math.round(p.score * 10) / 10, why: p.why.slice(0, 5) }));
    return { task: String(task || ''), picks };
}

/** The brief an agent reads first (OPENVIBE.md): the repositories this task likely needs, how the network fits, and every service. */
function markdown(task = '', { limit = 6 } = {}) {
    const map = systemMap();
    const { picks } = reposFor(task, { limit });
    const lines = ['# OpenVibe: the map for this task', ''];
    if (task) {
        lines.push('## The repositories this task likely needs', '');
        if (picks.length) for (const p of picks) lines.push(`- **${p.name}** (\`${p.repository}\`, ${p.kind}): ${p.why.join(', ') || 'related'}`);
        else lines.push('- Nothing in the task names a service: read the task again and look for its site, domain or product below.');
        lines.push('', 'Clone what you need with `git clone https://github.com/<repository>.git`. Each repository has an AGENTS.md: read it before changing anything.', '');
    }
    lines.push('## How it fits together', '');
    for (const s of map.spine) lines.push(`- **${s.name}:** ${s.text}`);
    lines.push('', '## The libraries', '');
    for (const l of map.libraries) lines.push(`- **${l.name}** (\`${l.package}\`): ${l.what}`);
    lines.push('', '## Every service', '', '| Service | Repository | Site | What it does |', '| --- | --- | --- | --- |');
    for (const s of map.services) {
        const what = String((s.site && s.site.what) || '').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 140);
        lines.push(`| ${s.id} | ${s.repository} | ${hostOf(s.origin) || (s.domains[0] || '')} | ${what} |`);
    }
    const others = map.repositories.filter((r) => r.kind === 'tool');
    if (others.length) lines.push('', `Other repositories: ${others.map((r) => r.name).join(', ')}.`);
    lines.push('');
    return lines.join('\n');
}

module.exports = { systemMap, reposFor, markdown, LIBRARIES, SPINE, CONCEPTS };
