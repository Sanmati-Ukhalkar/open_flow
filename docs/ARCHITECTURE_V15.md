# OpenFlow — v0.15 Architecture: Canvas UX Pack

> Precondition: v0.14's node expansion (10+ node types by this point)
> confirmed shipped — this version exists specifically BECAUSE the
> sidebar now has enough nodes that scrolling breaks, which is why it's
> sequenced after v0.14, not before. Pure frontend version — no engine,
> API, or data-model changes.

## Goal of v0.15

Make the canvas usable at the scale the project has now reached: 10+
node types, larger graphs, and a wider range of devices/users than the
early single-node demo ever had to handle. All six items are additive UI
— none change how workflows execute.

## Recommended Build Order (cheapest + highest-friction-removed first)

| Order | Item | Why this position |
|---|---|---|
| 1 | **Minimap** | Near-zero effort (native React Flow feature), immediate value on any graph with 5+ nodes. |
| 2 | **Node Search** | Directly fixes the pain caused by v0.14 (10+ nodes in the sidebar) — highest-urgency item. |
| 3 | **Inline Node Renaming** | Small, self-contained change to node header + data model. |
| 4 | **Dark/Light Theme Toggle** | Self-contained styling work, no interaction with other items. |
| 5 | **Onboarding Tour** | Needs the other UI pieces (search, sidebar, run button) to already be stable, since the tour points at them. |
| 6 | **Mobile/Tablet Read-Only View** | Largest scope, most new surface area — build last so it reflects the finished desktop UI, not a moving target. |

---

## 1. Minimap
- Use React Flow's built-in `<MiniMap />` component — do not build a
  custom one, this is a solved problem in the library already in use.
- Bottom-right corner by default (avoid colliding with the existing
  zoom controls in the bottom-left and the Run Workflow button top area).
- Should reflect node status colors (success/error/running) at a glance,
  not just generic grey boxes — reuse the same status-color tokens as
  the node cards themselves for consistency.
- Collapsible/toggleable — some users on small graphs won't want it
  taking up space.
- **Done when:** a 15+ node graph can be navigated via minimap click/drag
  without manually panning, and status colors are visible at that scale.

## 2. Node Search (Sidebar)
- Search input pinned to the top of the Node Library sidebar (from
  v0.3), filters the existing list live as the user types.
- Match against node name AND description (e.g. searching "email" should
  surface the Email node even if "email" isn't in its title exactly —
  match description text too).
- Empty state: "No nodes match '{query}'" rather than a blank list.
- Keep category grouping intact while filtering (filtered results still
  show under their category headers) — don't flatten the list and lose
  that structure.
- **Done when:** typing a partial node name or keyword narrows the
  10+ item sidebar to matching nodes in real time, with no perceptible
  lag.

## 3. Inline Node Renaming
- Data model change: each node instance gains an optional `label` field
  (falls back to the node type's default display name if unset) — stored
  as part of the node's data in the graph JSON, so it persists through
  save/load (v0.5) and shows correctly in Run Log entries (v0.4/v0.5).
- Interaction: double-click the node title in its header → becomes an
  editable text field → Enter or blur commits, Esc cancels.
- Must integrate with Undo/Redo (v0.8) — renaming is a normal undoable
  action, not a special case.
- Renamed nodes should show their custom label everywhere a node is
  referenced: canvas, Execution Output tabs, Run Log, minimap tooltips.
- **Done when:** renaming "LLM Prompt" to "Extract Invoice Fields"
  updates that name consistently across canvas, output tabs, and run
  history — and survives a save/reload cycle.

## 4. Dark/Light Theme Toggle
- Toggle placed in the top nav bar (near where "CANVAS ENGINE: ACTIVE"
  status text currently sits, based on the existing UI).
- Implementation: CSS variable-based theming (light/dark palettes swap
  via a root-level class or data attribute) — do not hardcode colors
  per-component, since that makes future theme changes expensive.
- Respect system preference (`prefers-color-scheme`) as the default on
  first visit, but let the explicit toggle override and persist that
  choice (localStorage) for returning visits.
- Node status colors (success green, error red, running/pulse state)
  must remain clearly distinguishable in BOTH themes — verify contrast
  in light mode specifically, since the current UI shown in screenshots
  so far has been dark-only.
- **Done when:** every screen (canvas, sidebar, config panel, dashboard,
  run log) renders correctly in both themes with no illegible or
  low-contrast elements, and the choice persists across sessions.

## 5. Onboarding Tour
- Triggered automatically on a brand-new user's first visit to an empty
  canvas (or manually re-triggerable from a help/menu icon for anyone
  who wants to replay it).
- Scope to a short sequence (aim for 4-6 steps, not a long walkthrough):
  1. Point at the Node Library sidebar — "drag a node onto the canvas"
  2. Point at a dropped node — "click to configure it"
  3. Point at the connection handles — "connect nodes to pass data"
  4. Point at Run Workflow — "run your workflow"
  5. Point at Execution Output — "see real results here"
  6. (Optional) Point at node search — "search once you have more nodes"
- Skippable at any step, never blocks interaction with the actual canvas
  underneath it (spotlight/overlay style, not a modal that traps focus).
- **Done when:** a genuinely new user (test with someone who hasn't seen
  the product) can complete their first real run using only the tour,
  no external explanation needed.

## 6. Mobile/Tablet Read-Only View
- Explicitly **read-only** for v0.15 — viewing a workflow's structure and
  its current/last run status, not editing or building on a small
  screen. Full drag-and-drop canvas editing on mobile is a much larger,
  separate effort (touch-based node dragging, config panels on small
  viewports) — deliberately out of scope here.
- Responsive breakpoint: below a tablet-ish width, canvas becomes
  pan/zoom-only (no node dragging, no sidebar), config panel becomes a
  bottom sheet triggered by tapping a node (shows config values +
  status, not editable fields).
- Execution Output / Run Log should be fully viewable on mobile — this
  is likely the most valuable piece of mobile support (checking if a
  deployed workflow is healthy), more so than viewing the canvas graph
  itself.
- **Done when:** opening a workflow on a phone-sized viewport shows its
  graph (pan/zoom, no editing), tapping a node shows its config/status
  in a bottom sheet, and Run Log/Execution Output are fully readable.

---

## What v0.15 Explicitly Does NOT Include
- Full mobile editing (drag-and-drop node placement on touch devices).
- Custom minimap styling beyond what React Flow's component supports
  out of the box.
- Multi-language/i18n theming or tour content — English only for now.
- Onboarding tour customization per node type (e.g. a tour that adapts
  based on which nodes exist) — one fixed tour sequence is enough.

## Definition of Done for v0.15 (overall)
- [ ] Minimap present, toggleable, reflects real node status colors.
- [ ] Node search filters the sidebar live, preserves category grouping,
      handles zero-match state gracefully.
- [ ] Node renaming works, integrates with undo/redo, persists through
      save/reload, and shows consistently in Execution Output + Run Log.
- [ ] Theme toggle covers every screen with no contrast/legibility
      issues in either mode, persists across sessions.
- [ ] A first-time user can complete a real run guided only by the
      onboarding tour, with no step blocking underlying interaction.
- [ ] Mobile viewport shows a working read-only graph view + fully
      readable Run Log/Execution Output — verified on an actual small
      screen size, not just a resized desktop browser window.
