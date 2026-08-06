# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, etc.) working in
this repository. Read `ARCHITECTURE.md` first — it has the full plan and
the reasoning behind current scope. This file is about *how* to work in
this codebase day to day.

## Project in one sentence

Open-source, no-code, drag-and-drop canvas for building AI/MCP-powered
workflows. Currently in v0.1: canvas + one real node type (LLM prompt),
full run loop. Do not build ahead of the current version's scope — see
"Current Scope" below before touching anything.

## Ground rules

1. **Do not expand scope.** If a task seems to require a feature from a
   later roadmap version (see `ARCHITECTURE.md` § 3), stop and flag it
   instead of building it. Example: don't add a node library sidebar in
   v0.1 — there's only one node type, it doesn't need one yet.
2. **One real thing over many fake things.** Never mock a node's execution
   to make the UI "look done." If a node claims to call an API, it must
   actually call it (using a placeholder API key from `.env`, never a
   hardcoded key).
3. **Every node follows the node model exactly** (see § "Node Structure"
   below). No one-off node implementations that skip the schema.
4. **Small, runnable commits.** Every commit should leave the app in a
   state that runs (`npm run dev` works, no broken imports). Don't commit
   half-finished features across multiple files.
5. **No premature abstraction.** Don't build a generic plugin system,
   marketplace loader, or config DSL until there are at least 3 real node
   types that would benefit from it. Copy-paste between 2 nodes is fine.

## Current Scope (update this section as versions ship)

**Active version: v0.1**
- Canvas: React Flow, single draggable node type (LLM Prompt).
- Config panel: prompt text field, model dropdown, Run button.
- Node visual states: `idle | running | success | error`.
- Output panel: shows real LLM response text.
- Error handling: plain-language error message on failure (see
  `ARCHITECTURE.md` § 1 "Failure Handling Model" — inline node error +
  click-to-expand detail; no run log yet, that's v0.4).

**Not in scope right now (do not build):** node sidebar/library, multiple
node types, node-to-node connections/DAG logic, MCP integration, auth,
saved workflows, deployment, marketplace.

## Node Structure (applies from v0.2 onward, keep in mind now)

Every node lives in `src/nodes/<node-name>/` with:
```
definition.json   # id, displayName, icon, category, inputSchema, outputSchema, configFields
run.ts             # async function: (input, config) => output
README.md          # short docs: what it does, required config/secrets
```
- `run.ts` must throw errors with a `code` and a plain-language `message`
  field — the UI error display depends on this, not raw stack traces.
- Nodes never call each other directly. All data passes through the engine.

## Repo Structure (current)

```
src/
  canvas/        # React Flow canvas, node rendering, config panels
  nodes/         # node implementations (definition.json + run.ts per node)
  engine/        # execution logic (grows from v0.2 onward)
  lib/           # shared utilities
.env.example     # required env vars (API keys) — never commit real keys
ARCHITECTURE.md
AGENTS.md
README.md
CONTRIBUTING.md
```

## Style / Conventions

- TypeScript everywhere, strict mode on.
- Functional React components, hooks only (no class components).
- Tailwind for styling — no separate CSS files unless truly global.
- Keep functions small and single-purpose; prefer composition over deep
  nesting.
- Comment *why*, not *what* — code should be readable without comments for
  the "what."

## Before opening a PR (for agents assisting with contributions)

- [ ] App runs with `npm run dev`, no console errors.
- [ ] New node (if any) has `definition.json`, `run.ts`, `README.md`.
- [ ] No hardcoded API keys or secrets.
- [ ] Scope matches "Current Scope" above — if it doesn't, flag it in the
      PR description instead of merging silently.
