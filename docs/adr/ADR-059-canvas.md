# ADR-059: The canvas — an agent's live panel is data, drawn by one renderer

- **Status:** Accepted 2026-11-08 (plan track HO, wave 3: HO9).
- **Owner:** OpenVibe.Actor (the canvas belongs to the person's agent and its thread). OpenVibe.Shared draws it, and
  Chat, Surf, the Dock and Actor's own pages show it.
- **Contract:** `actor.canvas@1`.

## Evidence

- The study of Hermes and OpenClaw (`plan-state-2026-10-22/hermes-openclaw-2026-11-07.md`, item 13) found that an
  agent which can draw a panel beside the conversation feels like a product rather than a chat: a board of a trip,
  a table of prices, a checklist of what is left.
- OpenClaw's Canvas pushes an HTML document to a panel served by its gateway (`docs/platforms/mac/canvas.md`,
  `src/canvas/`). That works for one person on one machine.
- On OpenVibe a canvas is shown on several sites, to a signed-in person, beside their messages. HTML or script
  written by a model, or by whatever page the model read, would be cross-site scripting by design.

## Decision

1. **A canvas is a document of blocks:**
   - heading, text, list, checklist, table, metric, chart (bar or line), image, link and button;
   - `actor.canvas@1` names each block and its limits.
   - There is no HTML, no style, no script and no frame: text is plain and the renderer escapes it.
2. **One renderer** (OpenVibe.Shared `ov-canvas.js`) draws it everywhere, so a canvas looks and behaves the same in
   Chat, Surf, the Dock and Actor.
3. **What leaves the page is bounded:**
   - an image is only a picture on `openvibe.media`;
   - a link opens in a new tab with its host shown;
   - nothing loads from anywhere else.
4. **A canvas acts only through the person:**
   - a button sends its label to the agent as the person's own message (`action: "ask"`), and the agent's next steps
     go through its level and approvals like any other;
   - ticking a checklist item tells the agent which item changed.
   - A canvas never performs an act by itself.
5. **It is live and versioned:** `version` only grows. A viewer ignores an older version, and the agent replaces the
   whole document (at most 60 blocks), never parts of it.

## Alternatives

- **HTML widgets (OpenClaw's way).** Rejected: script and style from a model, shown on every OpenVibe site.
- **Markdown only.** Rejected: no tables with numbers, no checklists that answer back, no charts.
- **A canvas per site.** Rejected: one renderer and one contract are what make it the same everywhere.

## Migration and rollback

A new contract. Nothing consumes it until Actor stores canvases and Shared draws them. Rollback is retiring the
contract.

## Tests

`test/run.js`:
- the fixtures validate, and the invalid ones are refused: an html block, a picture from elsewhere, a button that
  runs something, too many blocks;
- no block type is named html, script, style or iframe;
- a button's only action is `ask`;
- an image's `src` is on `openvibe.media` only.
