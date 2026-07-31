# Project: [Name TBD] — Visual MCP-First Workflow Builder

> One-line pitch: An open-source, no-code, drag-and-drop canvas for composing
> AI tool-calls and MCP servers into runnable, deployable workflows.
> "n8n for MCP" — automation-native for AI, not AI bolted onto automation.

---

## 0. The Thing We Must Not Forget (Read This First)

We are **not** building six tools in one (Cursor + n8n + LangFlow + GitHub
Actions + Supabase + MCP). That pitch is too big to build credibly and too
big to explain in one sentence.

We are building **one thing well**: a visual canvas where a non-technical
user can drag nodes, connect them, configure them, and run a real workflow
— with **MCP servers and LLM calls as first-class node types**, not an
afterthought.

Everything else (Supabase-like storage, GitHub Actions-like deploy, node
marketplace) is a *future integration target*, not something we reimplement.
If a design decision drifts toward "let's rebuild X instead of integrating
with X," that's a signal to stop and re-read this section.

**The test for every feature before we build it:**
"Does this make the drag → connect → configure → run loop better, or does
it just make our pitch sound bigger?" Only build the former right now.

---

## 1. Full Architecture (Long-Term Target)

This is the eventual shape of the system. We are not building all of it now
— this section exists so every phase we DO build has a known place to slot
into, and so we don't paint ourselves into a corner.

```
┌─────────────────────────────────────────────────────────────┐
│                   VISUAL CANVAS (Frontend)                   │
│   React + React Flow — drag, connect, configure, run, watch  │
├─────────────────────────────────────────────────────────────┤
│                      API LAYER (Backend)                     │
│   REST + WebSocket — save/load workflows, trigger runs,      │
│   stream node status back to canvas in real time              │
├─────────────────────────────────────────────────────────────┤
│                     WORKFLOW ENGINE (Core)                   │
│   DAG validation, topological execution, parallel branches,  │
│   per-node retry using cached upstream output, run state      │
├───────────────┬───────────────────────┬─────────────────────┤
│  NODE RUNTIME  │  TRIGGER SYSTEM       │  STORAGE            │
│  Each node =   │  Manual run first;    │  Workflow defs,     │
│  isolated      │  later: webhook, cron │  run logs, node     │
│  async func    │                       │  outputs (SQLite    │
│  w/ schema in/ │                       │  → Postgres later)  │
│  out           │                       │                     │
├───────────────┴───────────────────────┴─────────────────────┤
│              NODE MARKETPLACE (future, not now)              │
│   Community-contributed nodes, shareable, versioned            │
└─────────────────────────────────────────────────────────────┘
```

### Node Model (the core abstraction — gets this right early)

Every node is:
- `definition.json` — id, display name, icon, category, input schema,
  output schema, config form fields.
- `run.ts` — the actual execution function: `(input, config) => output`.
- Declares whether it needs secrets/credentials (API keys), and what kind.

Node categories we care about first: **AI/LLM, MCP connector, Input/Trigger,
Output/Notify, Storage.** Everything else comes later.

### Failure Handling Model (decided, don't relitigate this)

- **Canvas layer**: failed node turns red with a small icon; nodes
  downstream that never ran show grey/skipped. Glanceable, no detail here.
- **Click-to-expand**: shows the error message in plain language, the input
  the node actually received, and a **Retry this node** button.
- **Run log**: secondary, collapsed by default — timestamped list of every
  node's start/end/status. For debugging multi-node or intermittent issues.
- **Partial success**: independent branches keep running even if a sibling
  branch fails. Overall run state can be `success | partial | failed`.
- **Retry granularity**: retry a single node using already-computed upstream
  outputs — never force a full re-run (burns API cost/quota on paid nodes).
- **Output validation**: nodes can declare a lightweight output schema so a
  node that "succeeds" but returns garbage/malformed data still gets flagged,
  not silently passed downstream.

---

## 2. What We're Actually Building First (v0.1 Scope)

**Goal:** prove the full user loop with ONE real node type before building
anything else. Not a mock. Not five node types.

### v0.1 includes:
- A canvas with drag-drop, one node type: **LLM Prompt node** (real OpenAI
  call, not mocked).
- Config panel: prompt text input, model selector, "Run" button.
- Run states on the node: idle → running → success/error.
- Output pane showing the actual LLM response.
- Plain-language error display if the call fails (rate limit, bad key, etc.)

### v0.1 explicitly excludes:
- Node library/sidebar (only one node type exists, no need yet).
- Multi-node connections / DAG engine.
- Auth, multi-user, saved workflows.
- MCP integration (comes in v0.2 — this is the differentiator, but we
  validate the loop with the simplest possible real node first).
- Marketplace, triggers, deployment.

**Why one node first:** the canvas UI is the whole value proposition of a
no-code tool. If we build it against fake data, we'll guess wrong about
error states, loading states, and config panel layout — and rebuild it
later anyway. One real node surfaces 80% of these problems immediately.

---

## 3. Phased Roadmap After v0.1

| Version | Deliverable |
|---|---|
| v0.1 | Canvas + one real LLM node, full run loop working |
| v0.2 | Second node type + connection between nodes (data flow A→B); first MCP connector node |
| v0.3 | Node library/sidebar UI; 4-5 node types (LLM, MCP, HTTP/Slack, simple storage) |
| v0.4 | DAG engine: parallel branches, per-node retry, run log, partial-success state |
| v0.5 | Save/load workflows (needs a backend + lightweight DB), basic auth |
| v0.6 | First "deploy as API endpoint" flow (this is our GitHub-Actions-lite feature) |
| v0.7+ | Node marketplace, triggers (webhook/cron), community contributions |

Each version must be **runnable and demoable**, not partial/broken — this
matters for keeping momentum and for anything we post publicly (Show HN,
Reddit, etc.).

---

## 4. Tech Stack

- **Frontend:** React + TypeScript + React Flow (canvas), Tailwind (styling)
- **Backend:** Node.js + TypeScript (fast prototyping, matches frontend
  language, good AI SDK support)
- **Node execution:** in-process async functions for now; sandboxing
  (Docker/WASM) is a later concern, not v0.1
- **Storage:** SQLite for v0.1–v0.4 (embedded, zero setup); Postgres when
  multi-user/auth lands
- **AI:** OpenAI SDK first; MCP SDK integration starts at v0.2
- **Realtime:** WebSocket for node status streaming (from v0.2 onward, once
  there's more than one node's worth of status to stream)

---

## 5. Positioning (keep repeating this until it's second nature)

- **What it is:** visual, no-code canvas for composing AI/MCP-powered
  workflows.
- **Who it's for:** non-technical or semi-technical users who want to chain
  AI steps together without writing code, but want AI-native building
  blocks (not automation tools with AI awkwardly bolted on).
- **The one-sentence answer to "why not just use n8n?":** n8n is
  automation-first with AI added on top; this is AI/MCP-first from the
  ground up — the node model, the canvas, and the marketplace are all
  designed around AI tool-calling as the default case, not the exception.
