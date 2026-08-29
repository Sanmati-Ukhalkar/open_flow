# OpenFlow — v0.3 Architecture

> Precondition: v0.2's 2-node run must show REAL output for both nodes
> (not "Idle" after clicking Run). Verify this before starting v0.3.

## Goal of v0.3

Now that 2 real nodes connect and pass data correctly, generalize just
enough to support **more node types** and let the user **add nodes from a
library** instead of them being hardcoded on canvas.

## What v0.3 Adds

1. **Node Library / Sidebar**
   - Left-side panel listing available node types as draggable cards.
   - Drag from sidebar → drops a new node instance onto canvas.
   - Categories: AI, MCP, Output, Storage (matches node categories in
     `ARCHITECTURE.md`).

2. **3 New Node Types (total 5 now: LLM, MCP, + these 3)**
   - **HTTP/Webhook Node** — sends a POST request (e.g. Slack-compatible
     webhook). Real call, not mocked.
   - **Storage Node** — inserts data into SQLite (embedded, zero setup).
   - **Text/Transform Node** — simple string templating (e.g. combine two
     upstream outputs into one formatted string). This is useful glue and
     also tests that a node can accept **multiple inputs**, not just one.
   - Each follows the exact node model: `definition.json` + `run.ts` +
     `README.md`, per `AGENTS.md`.

3. **Multi-input Support in the Engine**
   - Up to now, every node had exactly one incoming edge. The Transform
     node needs 2+. Engine must wait for ALL upstream nodes of a node to
     finish before running it.
   - This is the seed of real parallel-branch support (full version
     lands in v0.4), but here we only need "wait for all inputs," not
     "run independent branches concurrently."

4. **Canvas UX for arbitrary graphs**
   - Support 3+ nodes chained/branching, not just 2 in a line.
   - Basic auto-layout or at least "doesn't overlap" placement when a
     node is dropped from the sidebar.
   - Delete node / delete edge actions (didn't matter with only 2
     hardcoded nodes, matters now).

## What v0.3 Explicitly Does NOT Include

- Parallel execution of independent branches (still sequential/topological
  only — v0.4).
- Retry, run log, partial-success states (v0.4).
- Auth, saved workflows, deployment (v0.5+).
- Community/marketplace node installation — sidebar only shows the 5
  built-in nodes we wrote ourselves.

## Definition of Done for v0.3

- [ ] Sidebar shows 5 node types, each draggable onto canvas.
- [ ] User can build a graph like: LLM → Transform → (Storage + HTTP) with
      real drag-drop, no hardcoded starting nodes.
- [ ] Transform node correctly waits for both its inputs before running.
- [ ] Deleting a node also removes its edges cleanly (no orphaned edges
      breaking the engine).
- [ ] Every node in a 4-5 node graph shows correct run states in sequence
      when Run Workflow is clicked, with real output for each.

Only once this is solid do we move to v0.4 (real parallel branches,
per-node retry, run log, partial-success state) — that's where the
failure-handling model from `ARCHITECTURE.md` gets fully implemented, and
it depends on the multi-input plumbing built here.
