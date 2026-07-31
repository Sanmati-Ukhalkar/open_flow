# OpenFlow — v0.2 Architecture

> Precondition: v0.1 loop must be fully real (Run → actual OpenAI call →
> real output/error shown) before starting this. Do not build v0.2 on top
> of a fake v0.1 loop.

## Goal of v0.2

Prove that **two nodes can connect and pass data**, and introduce the
**first MCP connector node** — this is the actual differentiator, so it
enters as early as possible without breaking the "one thing at a time"
rule.

## What v0.2 Adds

1. **A second node type: MCP Tool node**
   - Connects to one hardcoded MCP server (pick one simple public MCP
     server for testing, e.g. a filesystem or fetch-based one).
   - `definition.json` + `run.ts` following the same node model as the LLM
     node.
   - Config panel: server URL/connection field, tool selector (list tools
     exposed by that server), input mapping.

2. **Node-to-node connection (the real DAG step)**
   - React Flow edge between LLM node → MCP node (or vice versa).
   - Output of node A becomes input of node B — this is the first time
     data actually flows across the canvas, not just within one node.
   - Visual: edge shows a subtle "pending / flowing / done" state during
     a run.

3. **Minimal execution engine (replacing single-node run logic)**
   - Input: 2-node graph (nodes + one edge).
   - Topological order: trivial with 2 nodes, but write it generically —
     this is the seed of the real engine from v0.4.
   - Executes node A, passes its output as node B's input, executes node B.
   - No parallel branches yet (that's v0.4). No retry yet. No run log yet.

4. **Run state per node, now shown for 2 nodes at once**
   - Same states as v0.1 (`idle | running | success | error`), just
     confirm they render correctly when two nodes are mid-run
     simultaneously (A finished + running, B queued, etc.)
   - If node A fails, node B must visually show **skipped**, not run.
     This is the first real test of the "downstream nodes go grey"
     failure rule from `ARCHITECTURE.md`.

## What v0.2 Explicitly Does NOT Include

- Node sidebar/library (still only 2 node types — don't build a library
  UI for 2 items).
- Parallel branches / multiple outgoing edges from one node.
- Per-node retry, run log, partial-success state (v0.4).
- Auth, saved workflows, deployment (v0.5+).
- More than one MCP server connection option — hardcode one for now.

## Data Contract Between Nodes

Every node's output must conform to a simple shape so any node can feed
any other node without special-casing:

```ts
type NodeOutput = {
  data: unknown;       // the actual payload passed downstream
  meta?: {
    tokensUsed?: number;
    durationMs?: number;
  };
};
```

The MCP node's `run.ts` receives the LLM node's `data` field as its input
— no hidden coupling beyond this contract.

## Definition of Done for v0.2

- [ ] Two nodes exist on canvas, connected by one edge.
- [ ] Run Workflow executes node A for real, passes output to node B, node
      B executes for real (real MCP tool call, not mocked).
- [ ] Both nodes show correct run states in sequence, not just at the end.
- [ ] If node A fails, node B shows "skipped," never attempts to run.
- [ ] Output panel shows both nodes' real outputs, clearly attributed to
      each node (not merged into one blob).

Only once every box above is checked do we move to v0.3 (node
library/sidebar UI) — do not add more node types or UI polish before this
is solid, per the "one real thing over many fake things" rule in
`AGENTS.md`.
