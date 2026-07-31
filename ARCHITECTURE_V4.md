# OpenFlow — v0.4 Architecture

> Precondition: v0.3's 5-node graph (branch + merge) must run with real
> output at every node, confirmed. This is the version where the
> "Failure Handling Model" from `ARCHITECTURE.md` finally gets built for
> real — everything before this was the plumbing it depends on.

## Goal of v0.4

Make the engine handle **real-world execution problems**: branches that
run at the same time, nodes that fail without killing everything else,
retrying only what broke, and giving the user a way to see what actually
happened during a run.

## What v0.4 Adds

1. **True Parallel Branch Execution**
   - Until now: engine ran nodes one at a time in topological order, even
     independent branches (e.g. the two LLM Prompt nodes in v0.3 likely
     ran sequentially even though they don't depend on each other).
   - Now: any nodes whose dependencies are already satisfied run
     concurrently (`Promise.all` on the ready set), not just left-to-right.
   - Visual: canvas should show 2+ nodes in `running` state at the same
     time when they're independent.

2. **Per-Node Retry Using Cached Upstream Output**
   - Every completed node's output is cached in the run's in-memory state
     (or SQLite run-state table) for the duration of that run.
   - "Retry" button on a failed node re-executes ONLY that node, using the
     already-cached outputs of its upstream nodes as input — never
     re-runs the whole graph.
   - Critical for cost control: LLM/MCP nodes shouldn't be re-billed for
     upstream steps that already succeeded.

3. **Partial-Success Run State**
   - Overall run status becomes one of: `success | partial | failed`
     (previously only per-node states existed, no run-level rollup).
   - `partial` = at least one branch succeeded fully, at least one other
     branch failed/skipped.
   - Independent branches must be allowed to keep running even after a
     sibling branch fails — this was implicitly true in v0.3 (branches
     ran async-ish) but now must be explicit and correct under real
     concurrency.

4. **Skip Propagation**
   - If a node fails, every downstream node that depends on it (directly
     or transitively) must be marked `skipped`, not attempted.
   - This must work correctly through the Text Transform node's
     multi-input logic: if ONE of its two inputs failed, Transform itself
     is skipped (can't run with a missing input) — but this should NOT
     skip the OTHER branch that fed the other, successful input.

5. **Run Log Panel**
   - New collapsible panel (separate from the existing per-node Execution
     Output tabs): a flat, timestamped list of every node's
     start/end/status for the current run.
   - Collapsed by default — this is for debugging, not the primary
     failure UI (inline node red-state + click-to-expand remains primary,
     per `ARCHITECTURE.md`).
   - Each log line links to (clicking it selects/highlights) the
     corresponding node on canvas.

6. **Output Validation (lightweight)**
   - Each node's `definition.json` gains an optional `outputSchema`.
   - After a node runs "successfully," its output is checked against this
     schema. If it doesn't match (e.g. LLM returned prose instead of the
     expected JSON), the node is flagged `success-with-warning` (distinct
     visual, e.g. yellow) instead of silently passing bad data downstream.

## What v0.4 Explicitly Does NOT Include

- Auth, multi-user, saved/persisted workflows across sessions (v0.5).
- Deployment / API endpoint exposure (v0.6).
- Node marketplace / community nodes (v0.7+).
- Retrying more than one node at a time / bulk retry — single-node retry
  only for now.

## Definition of Done for v0.4

- [ ] Two independent branches visibly run concurrently (both show
      `running` simultaneously), not sequentially.
- [ ] Killing one branch (force an error, e.g. bad API key) does not stop
      the other branch from completing.
- [ ] Overall run shows `partial` when exactly this happens.
- [ ] Retry on the failed node re-runs ONLY that node, correctly reusing
      cached upstream output — verify by checking upstream nodes are NOT
      re-executed (e.g. no duplicate LLM API call in logs).
- [ ] Run Log panel shows accurate start/end times and statuses for a
      5+ node run, collapsed by default.
- [ ] A node with a deliberately malformed output schema shows
      `success-with-warning`, not a silent pass-through.

Once this is solid, v0.5 begins: saving/loading workflows and basic auth
— the first version where a user's work persists across sessions.
