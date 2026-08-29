# OpenFlow — v0.8 Architecture

> Precondition: v0.1–v0.7 confirmed working end to end (canvas → engine →
> persistence → deploy → triggers → community nodes). This version is a
> deliberate pivot from "new capabilities" to "make the existing canvas
> feel like a real editor" — the kind of polish that matters once people
> are actually building workflows regularly, not just testing the demo.

## Goal of v0.8

Canvas power-user UX: undo/redo, keyboard shortcuts, multi-select,
copy/paste. None of this changes what a workflow *can do* — it changes
how fast and safe it is to *build* one. This is usually the first thing
real users complain about once the core engine works ("I deleted a node
by accident and lost my config").

## What v0.8 Adds

### 1. Undo/Redo History
- Every canvas mutation (add node, delete node, move node, add edge,
  delete edge, edit config field) pushes a state snapshot onto an undo
  stack.
- Keep it simple: store full graph JSON snapshots, not a diff/patch
  system — diffing is a premature optimization here, snapshots are fine
  until graphs get huge.
- Undo stack should be per-workflow, cleared when switching workflows
  (not a global app-wide undo).
- Config field edits should debounce into a single undo step per "pause
  in typing," not one step per keystroke.

### 2. Full Keyboard Shortcut Set

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` (or `Ctrl/Cmd + Y`) | Redo |
| `Delete` / `Backspace` | Delete selected node(s)/edge(s) |
| `Ctrl/Cmd + C` | Copy selected node(s) |
| `Ctrl/Cmd + V` | Paste (offset slightly from original position) |
| `Ctrl/Cmd + D` | Duplicate selected node(s) in place with offset |
| `Ctrl/Cmd + A` | Select all nodes |
| `Ctrl/Cmd + click` (node) | Add/remove node from multi-select |
| `Shift + drag` (canvas) | Marquee/box select multiple nodes |
| `Ctrl/Cmd + S` | Save workflow |
| `Ctrl/Cmd + Enter` | Run Workflow |
| `Space + drag` (or middle-mouse drag) | Pan canvas |
| `+` / `-` or `Ctrl/Cmd + Scroll` | Zoom in/out |
| `Ctrl/Cmd + 0` | Reset zoom / fit view to graph |
| `Esc` | Deselect all / close config panel |
| `Arrow keys` (node selected) | Nudge selected node position by 1px (Shift+arrow = 10px) |
| `?` | Open shortcuts cheat-sheet overlay |

- Add a small **"?" keyboard shortcuts overlay** (triggered by `?`) so
  users can discover these without reading docs — cheap to build, high
  value for a no-code audience who won't expect to memorize shortcuts.
- All shortcuts must be disabled while focus is inside a text input
  (e.g. typing in the Prompt Template textarea) — `Delete` deleting a
  node while the user is mid-edit in a config field is the single most
  common and most painful bug in canvas editors. Test this explicitly.

### 3. Multi-Select & Bulk Actions
- Marquee select (shift+drag box) and ctrl/cmd+click both add to
  selection.
- Bulk delete, bulk move (drag any selected node moves all selected),
  bulk copy/paste.
- Selected nodes get a visible highlight state distinct from the
  "currently configuring" state (config panel should still only show
  one node's config at a time — clarify what happens when 2+ nodes are
  selected: config panel shows nothing or a "2 nodes selected" summary,
  not a crash or stale panel).

### 4. Copy/Paste Across Workflows (stretch, not required for done)
- Copy a node (or subgraph) in one workflow, paste into a different
  workflow tab/session. Uses clipboard as JSON under the hood. Nice to
  have, not blocking — don't let this delay the core shortcut set above.

## What v0.8 Explicitly Does NOT Include

- Any new node types, engine changes, or backend/API changes — this
  version touches the canvas/frontend only.
- Real-time collaborative editing (multiple users on one workflow at
  once) — that's a much bigger, separate feature (would need OT/CRDT),
  not an extension of undo/redo.
- Version history / named checkpoints for a workflow (different from
  undo — that's closer to the deployment versioning from v0.6, a
  separate concern).

## Definition of Done for v0.8

- [ ] Every shortcut in the table above works and does not fire while
      typing in a text field.
- [ ] Undo/redo correctly restores node positions, configs, and edges —
      not just "something changed back," verify exact state match.
- [ ] Deleting a node via `Delete` key removes its edges cleanly (reuse
      the same cleanup logic as the existing delete button, don't
      duplicate it).
- [ ] Marquee select + bulk delete removes exactly the selected nodes and
      their edges, nothing else.
- [ ] `?` overlay lists all shortcuts accurately and closes on `Esc` or
      clicking outside.
- [ ] Undo stack resets when switching to a different saved workflow (no
      cross-workflow undo bleed).

## Suggested Versions After v0.8

Since the pre-planned roadmap arc (v0.1–v0.7) is done and v0.8 is UX
polish, treat everything past this point as a backlog to prioritize by
actual feedback rather than a fixed sequence. Reasonable candidates,
roughly in likely order of value:

- **v0.9 — Sandboxed node execution.** Docker or WASM isolation for
  community nodes from v0.7's marketplace — the security gap flagged
  but deliberately deferred back then.
- **v0.10 — Workflow templates.** Starter templates (e.g. "Invoice
  Processing," "Slack Digest Bot") so new users don't start from a blank
  canvas — strong onboarding lever for an OSS project trying to grow.
- **v0.11 — Team/org support.** Shared workspaces, multiple users on
  the same workflows, basic roles (owner/editor/viewer).
- **v0.12 — Real-time collaboration.** Multiple users editing one
  canvas simultaneously (only worth doing after teams/orgs exist).
- **v0.13 — Observability/analytics.** Per-workflow cost tracking
  (API spend across nodes), error-rate dashboards — valuable once
  people have deployed workflows running in production via v0.6/v0.7.

Do not commit to more than one of these in detail until v0.8 ships and
you have real user signal on which one actually matters most.
