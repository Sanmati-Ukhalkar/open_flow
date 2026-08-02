# OpenFlow

**A visual, no-code, drag-and-drop workflow builder — built AI/MCP-first
from the ground up, not bolted on as an afterthought.**

> Think "n8n for MCP": a canvas where you chain AI tool-calls, MCP
> servers, and everyday automation steps together, without writing code.

![status](https://img.shields.io/badge/status-active--development-purple)
![license](https://img.shields.io/badge/license-MIT-blue)
![version](https://img.shields.io/badge/version-v0.3-orange)

<!-- Add a real screenshot or GIF of the canvas in action here — this
matters more than anything else in the README for getting stars. -->
<!-- ![demo](./docs/demo.gif) -->

---

## Why OpenFlow

Developers and teams juggle a fragmented toolkit today: coding
assistants, separate AI-orchestration frameworks (LangChain, MCP
servers), and separate automation tools (n8n, Zapier). Nothing connects
them well, so the same integration patterns get rebuilt from scratch
every time.

Most existing visual workflow tools were built **automation-first**,
with AI features added on top later. OpenFlow flips that: the node
model, the canvas, and the execution engine are designed around AI
tool-calling and MCP servers as the default case — not a plugin bolted
onto a generic automation tool.

**Why not just use n8n?** n8n is automation-first with AI added on;
OpenFlow is AI/MCP-first from the ground up.

---

## What It Does

Drag nodes onto a canvas, connect them, configure them, hit run. A
typical workflow might look like:

```
PDF Upload → OCR → LLM Extraction → Database Storage → Slack Notification
```

Every node is:
- **Real**, not mocked — an LLM node actually calls OpenAI, an MCP node
  actually calls a real MCP server.
- **Composable** — outputs from one node feed into the next, branches
  run independently, multi-input nodes merge upstream data.
- **Shareable** — nodes follow a standard package format
  (`definition.json` + `run.ts` + `README.md`) so anyone can build and
  contribute new ones.

---

## Quick Start

```bash
git clone https://github.com/<your-username>/openflow.git
cd openflow
npm install
cp .env.example .env   # add your OpenAI API key
npm run dev
```

Open `http://localhost:5173`, drag a node onto the canvas, configure it,
and click **Run Workflow**.

---

## Current Status

OpenFlow is being built version by version, with each version shipping
something fully working before the next begins — no half-finished
features, no UI built against mocked data.

| Version | Status | What it adds |
|---|---|---|
| v0.1 | ✅ Shipped | Canvas + one real node (LLM Prompt), full run loop |
| v0.2 | ✅ Shipped | Second node type (MCP Tool), node-to-node data flow |
| v0.3 | ✅ Shipped | Node library/sidebar, 5 node types, multi-input support |
| v0.4 | 🔧 In progress | Parallel branches, per-node retry, run log, output validation |
| v0.5 | ⏳ Planned | Save/load workflows, basic auth, server-side execution |
| v0.6 | ⏳ Planned | Deploy a workflow as a public API endpoint |
| v0.7 | ⏳ Planned | Cron/webhook triggers, community node marketplace |
| v0.8+ | ⏳ Backlog | Keyboard shortcuts & undo/redo, sandboxed execution, templates, teams, real-time collaboration, observability |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full architecture and
the detailed per-version specs (`ARCHITECTURE_V2.md` through
`ARCHITECTURE_V13.md`) for what each upcoming version includes.

---

## Node Types (so far)

| Node | What it does |
|---|---|
| **LLM Prompt** | Calls OpenAI (or other providers) with a configurable prompt and model |
| **MCP Tool** | Executes a tool exposed by a connected MCP server |
| **Text Transform** | Combines/formats multiple upstream inputs into one output |
| **SQLite Storage** | Appends a row of data to a local SQLite table |
| **HTTP Webhook** | Fires a POST request (e.g. a Slack-compatible webhook) |

More node types are planned — see [`CONTRIBUTING.md`](./CONTRIBUTING.md)
for how to build and submit your own.

---

## Tech Stack

- **Frontend:** React, TypeScript, React Flow, Tailwind CSS
- **Backend:** Node.js, TypeScript
- **Execution:** In-process async node runners (sandboxed execution
  planned — see `ARCHITECTURE_V9.md`)
- **Storage:** SQLite (embedded, zero setup)
- **AI:** OpenAI SDK, MCP SDK

---

## Contributing

OpenFlow is early and actively evolving — contributions, bug reports,
and node ideas are welcome. Start here:

1. Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) to understand the current
   scope and what NOT to build yet.
2. Read [`AGENTS.md`](./AGENTS.md) if you're using an AI coding
   assistant (Claude Code, Cursor, etc.) to contribute.
3. Check issues labeled [`good first issue`](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).
4. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for how to run the project
   locally and submit a node or a PR.

---

## License

MIT — see [`LICENSE`](./LICENSE) for details.
