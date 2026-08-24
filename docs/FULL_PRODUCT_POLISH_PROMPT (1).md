# OpenFlow — Full Product Polish Prompt (UI/UX + Node Completeness + Self-Audit)

> Paste this to Antigravity as one continuous task. It has THREE phases:
> (1) build against the requirements below, (2) self-audit against the
> Definition of Done, (3) if anything fails, list the gaps explicitly,
> write a remediation plan, and execute it — loop phases 2-3 until every
> item is genuinely green. Do not report "done" after phase 1 alone.

---

## Phase 0 — Ground Rules for This Task

- Evidence over claims: every checklist item needs a concrete artifact
  (screenshot, exact rendered text, or a precisely described manual
  test) — not a summary sentence. This has been a recurring failure mode
  in past audits on this project; do not repeat it.
- Don't just add features — remove/simplify where something is
  cluttered. Good UI is as much about restraint as addition.
- If a requirement is ambiguous or conflicts with something already
  built, stop and ask rather than guessing a resolution.
- Work in this order: Design System → Node Card & Canvas UX → Per-Node
  Data Completeness → Backend/Execution Testing → Self-Audit →
  Remediation. Don't jump ahead — later phases depend on earlier ones
  being real.

---

## Phase 1A — Design System (foundation, do this first)

### Color System
- [ ] Define a real design token set: primary/accent color, neutral
      scale (background/surface/border at multiple elevations), and
      semantic colors for status (success, error, warning, running/
      in-progress, skipped/neutral) — each with a light AND dark mode
      value, not just dark.
- [ ] Status colors must be distinguishable from each other AND
      accessible (WCAG AA contrast minimum) against their background in
      both themes — verify actual contrast ratios, don't eyeball it.
- [ ] Accent color should feel intentional and "AI-native," not a
      generic default purple/blue — pick something that gives the
      product a visual identity distinct from typical dev-tool templates
      (n8n, Zapier, generic React Flow demos all use similar palettes —
      differentiate).
- [ ] Node category colors: each node category (AI, MCP, Storage,
      Trigger, Logic/Branch, etc.) gets a consistent, distinguishable
      accent so users can visually parse a complex graph at a glance
      without reading every label.

### Typography
- [ ] Establish a clear type scale (not ad hoc font sizes per component)
      — headings, body, labels/metadata, code/monospace (for
      IDs, JSON output, technical values) each with defined size/weight.
- [ ] Monospace font specifically for: node IDs, JSON payloads, code
      snippets, raw output — this is currently likely inconsistent or
      absent, and is a real usability signal (tells users "this is raw
      data" vs. "this is UI label text").

### Spacing & Layout
- [ ] Consistent spacing scale (e.g. 4px/8px increments) applied
      throughout — node cards, config panels, sidebar, dashboard.
- [ ] Visual hierarchy audit: on the current canvas, is it immediately
      clear what's most important (node title) vs. secondary (config
      preview) vs. tertiary (IDs, metadata)? Fix any screen where
      everything looks the same visual weight.

### Motion & Micro-interactions
- [ ] Node state transitions (idle → running → success/error) should
      have a real transition, not an instant color snap — e.g. a subtle
      pulse/glow while running, a brief success flash on completion.
- [ ] Connection dragging: the connection line and target handles should
      give live visual feedback (highlight valid targets, dim/block
      invalid ones per the existing `isValidConnection` logic — connect
      this to a VISUAL state, not just a blocked drop).
- [ ] Hover states on every interactive element (nodes, buttons, sidebar
      items) — confirm nothing feels static/unresponsive to the cursor.
- [ ] Keep motion subtle and fast (150-250ms range) — this is a
      productivity tool, not a marketing site; motion should communicate
      state, not be decorative.

### Definition of Done — Phase 1A
- [ ] Screenshot comparison: same canvas view in light and dark mode,
      all status colors legible in both.
- [ ] Screenshot of the type scale applied (a screen showing heading,
      body, label, and monospace text together).
- [ ] A short screen-recording or frame sequence showing a node's state
      transition (idle → running → success) with visible motion, not an
      instant jump cut.

---

## Phase 1B — Node Card & Canvas UX Completeness

This is the core of "make nodes feel complete," beyond what
`ARCHITECTURE_V15.md` already scoped (minimap, search, renaming, theme).

### Live Data Visibility on the Node Card Itself
- [ ] Each node card, when it has run at least once, should show a
      COMPACT preview of its actual last output directly on the card
      (not just in the Execution Output panel below) — e.g. a truncated
      one-line preview of the LLM's response, or SQLite's rowId. This is
      currently likely absent — nodes probably only show CONFIG, not
      RESULT, on the card face.
- [ ] Each node card's input/output connection handles should show their
      TYPE as a small persistent label or icon (not just on hover) —
      e.g. a small `Aa` icon for string, `{}` for object, `#` for number
      — so type-scanning a graph doesn't require hovering every handle
      individually.
- [ ] When a node is selected, the config panel should show, alongside
      the config fields, a **live preview of the actual data it received
      as input on the last run** (not just what it's configured to
      expect) — this is the difference between "here's the schema" and
      "here's what actually flowed through here," which is far more
      useful for debugging.

### Connection Clarity
- [ ] Confirm (or implement if missing) that hovering a CONNECTED edge
      (not just a handle) shows a quick preview of the actual data value
      passing through it — this is a significant, high-value addition:
      users should be able to inspect data flow along an edge, not just
      at the endpoints.
- [ ] Edges carrying data from a successful run vs. an edge that's never
      run vs. an edge whose source failed should be visually distinct
      (color/style), not all identical grey lines.

### Node Card Information Architecture
- [ ] Audit every existing node type's card: is the MOST useful
      information (status, key config value, last result preview) shown
      without opening the config panel? Redesign any node card that
      requires opening the panel just to know what it's configured to
      do.
- [ ] Long config values (e.g. a full prompt template) should truncate
      gracefully on the card with a clear "..." affordance, not overflow
      or get cut off awkwardly.

### Definition of Done — Phase 1B
- [ ] Screenshot of a node card showing a live output preview after a
      real run.
- [ ] Screenshot of connection handles showing persistent type
      indicators (not requiring hover).
- [ ] Screenshot/description of hovering a connected edge and seeing its
      actual data value.
- [ ] Confirm this works across at least 3 different node types, not
      just one example.

---

## Phase 2 — Per-Node Data & Feature Completeness (backend-adjacent)

For EVERY existing node, verify and complete the following — this
extends `NODE_AUDIT.md`'s schema work with UI-facing completeness.

### Per-Node Checklist (apply to each node type)
- [ ] Input schema is not just technically correct (per `NODE_AUDIT.md`)
      but DISPLAYED clearly in the config panel — a labeled "Expects"
      section showing field names + types, before the user even
      connects anything.
- [ ] Output schema similarly DISPLAYED — a labeled "Produces" section.
- [ ] Every config field has a clear label AND a short helper
      description (not just a bare input box) — e.g. SQLite's "Data
      Column Name" field should explain what happens to extra fields
      (per the existing JSON-serialization behavior found in the prior
      audit).
- [ ] Every config field has appropriate input validation with inline
      error messages (e.g. a required field left empty shows a red
      outline + message BEFORE the user hits Run, not just as a runtime
      failure).
- [ ] Credentials/secrets required by a node are clearly indicated in
      its config panel (e.g. a small badge: "Requires OpenAI API Key —
      configured / not configured") — don't make the user discover a
      missing credential only via a runtime error.
- [ ] Node's `README.md` is linked/accessible from within the config
      panel itself (e.g. a small "?" icon opening node-specific docs) —
      don't make documentation something only findable in the repo.

### Definition of Done — Phase 2
- [ ] For 3 representative nodes (one AI node, one data/storage node,
      one trigger node), show the full config panel with all the above
      elements present: expects/produces sections, field descriptions,
      validation states, credential indicators, docs link.
- [ ] Confirm inline validation actually fires (deliberately leave a
      required field empty, screenshot the resulting error state).

---

## Phase 3 — Backend & Execution Testing (re-verify, don't assume)

This re-confirms core execution correctness in light of any UI changes
made above — UI changes must not have broken underlying behavior.

- [ ] Re-run the full existing test suite (unit + e2e) — report exact
      pass/fail counts, not "tests still work."
- [ ] Manually run at least 2 full multi-node workflows end-to-end in
      the actual running app after all UI changes — confirm real
      execution, real output, no regression from the design work.
- [ ] Re-verify `isValidConnection` blocking still works AFTER the new
      visual feedback (Phase 1B) is added — confirm the visual state and
      the actual blocking behavior are in sync (a node that LOOKS
      blockable but isn't, or vice versa, is worse than no visual
      indicator at all).
- [ ] Confirm the new "live data preview on card/edge" features
      correctly show NOTHING (a clean empty/idle state) for a node that
      hasn't run yet — don't show stale or placeholder data that could
      be mistaken for real output.

---

## Phase 4 — Self-Audit (mandatory before declaring done)

After completing Phases 1-3, go through EVERY Definition of Done item
above and produce a single table:

| Phase | Item | Status | Evidence |
|---|---|---|---|
| 1A | Color system light/dark | | |
| 1A | Type scale | | |
| 1A | State transition motion | | |
| 1B | Live output preview on card | | |
| 1B | Persistent type indicators | | |
| 1B | Edge data hover preview | | |
| 2 | Expects/Produces sections | | |
| 2 | Inline field validation | | |
| 2 | Credential indicators | | |
| 3 | Test suite pass counts | | |
| 3 | Manual multi-node run confirmed | | |
| 3 | isValidConnection sync check | | |

Status must be one of: `PASS` (with evidence), `PARTIAL` (state exactly
what's missing), or `NOT DONE`. No item may be marked PASS without
evidence in the final column.

## Phase 5 — Remediation Plan (only if anything is not PASS)

For every item marked PARTIAL or NOT DONE:
- [ ] State the specific reason it's incomplete.
- [ ] Propose a concrete fix.
- [ ] Estimate whether it's a small fix (do it now, in this same task)
      or a larger scope item (flag it clearly as a follow-up, do not
      silently drop it).
- [ ] Execute all small fixes now, then re-run Phase 4's audit table for
      just those items to confirm they're now PASS.

## Final Requirement

Do not report this task as complete until the Phase 4 table has zero
`NOT DONE` entries and every `PARTIAL` has either been resolved or
explicitly deferred with a stated reason and owner (you, for a future
session). A polished-looking summary with unresolved table entries
underneath is not an acceptable final state.
