# OpenFlow — v0.12 Architecture

> Precondition: v0.11's org/team model confirmed solid. Real-time
> collaboration only makes sense once multiple people can legitimately
> access the same workflow (which v0.11 provides) — don't attempt this
> on top of the old single-owner model.

## Goal of v0.12

Let multiple users edit the **same workflow canvas at the same time** —
see each other's cursors, node moves, and edits live, without clobbering
each other's changes. This is the hardest engineering problem in the
roadmap so far; treat it as its own project phase, not a quick add-on.

## What v0.12 Adds

1. **Choose a Sync Strategy (decide explicitly, don't drift)**
   - **CRDT-based** (e.g. Yjs) — generally the better fit for this kind
     of structured, node-graph document; handles merge conflicts
     automatically, has mature libraries with React Flow integration
     precedent.
   - **Operational Transform (OT)** — more complex to implement
     correctly from scratch; only worth it if a strong reason to avoid
     CRDT libraries exists.
   - Recommendation: **Yjs (CRDT)** — don't hand-roll conflict resolution
     for a graph structure; that's a well-trodden, easy-to-get-subtly-
     wrong problem space.

2. **Real-Time Transport Layer**
   - WebSocket connection per open workflow session (the WebSocket
     mention in the original long-term architecture from `ARCHITECTURE.md`
     finally becomes necessary here, not before).
   - Server relays Yjs updates between connected clients editing the same
     workflow; server also persists periodic snapshots back to the
     `workflows` table (v0.5) so the source of truth stays consistent
     even if all clients disconnect.

3. **Presence Indicators**
   - Show other connected users' cursors/selection on the canvas (name/
     avatar + colored cursor, standard collaborative-editor pattern).
   - Show who's currently viewing vs. actively editing a specific node's
     config panel — avoid two people editing the same node's config
     simultaneously without visibility into that happening.

4. **Conflict Handling for Node Config Panels**
   - Canvas-level changes (node position, edges) merge naturally via
     CRDT. Config panel text fields (e.g. a Prompt Template textarea)
     need explicit handling: either lock a config panel to one editor at
     a time (simpler, recommended for v0.12) or do live collaborative
     text merging (much harder, defer).
   - Recommendation: **soft-lock** — when User A opens a node's config
     panel, User B sees "being edited by [User A]" and gets a read-only
     view until A closes the panel. Real collaborative text editing
     inside config fields is a good v0.13+ stretch, not required now.

5. **Interaction with Undo/Redo (v0.8)**
   - Per-user undo stacks vs. shared undo stack — decide explicitly.
     Recommendation: **per-user undo**, scoped to that user's own recent
     actions (undoing shouldn't let User A revert User B's changes) —
     matches how most collaborative editors behave and avoids confusing
     "I pressed undo and someone else's work vanished" moments.

## What v0.12 Explicitly Does NOT Include

- Collaborative editing inside a single text field (config panel
  soft-lock is enough for now).
- Video/voice/chat alongside the canvas — out of scope entirely, a
  different product surface.
- Permissions finer than what v0.11 already provides (still org role-
  based, no new per-session permission layer).

## Definition of Done for v0.12

- [ ] Two users open the same workflow, one moves a node — the other
      sees it move live, no page refresh needed.
- [ ] Both users can edit different nodes' configs simultaneously without
      data loss or overwrite.
- [ ] One user opening a node's config panel shows a clear "being edited
      by X" state to others, preventing simultaneous edits on the same
      field.
- [ ] Disconnecting a client (closed tab, lost network) doesn't corrupt
      the shared document — reconnecting picks up the current state
      correctly.
- [ ] Undoing your own action doesn't revert a collaborator's separate
      action made in between.
- [ ] Server-persisted snapshot in the `workflows` table stays consistent
      with the live collaborative session (verify by refreshing a
      client mid-session — reload matches current shared state, not a
      stale save).
