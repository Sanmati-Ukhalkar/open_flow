# OpenFlow — v0.9 Architecture

> Precondition: v0.8's undo/redo, shortcuts, and multi-select confirmed
> solid. This version closes the security gap deliberately deferred since
> v0.7 — community nodes currently run as arbitrary in-process code with
> no isolation. Do not grow the marketplace further (more install
> sources, ratings, etc.) before this lands.

## Goal of v0.9

Isolate node execution so a community-contributed node **cannot** access
the host filesystem, other users' secrets, or the rest of the process —
without breaking the existing node model (`definition.json` + `run.ts`)
that every prior node was built against.

## What v0.9 Adds

1. **Sandbox Execution Boundary**
   - Two realistic options, pick one deliberately rather than drifting:
     - **Docker container per node run** — simplest to reason about
       (full OS-level isolation), heavier resource cost per execution.
     - **WASM runtime (e.g. via a JS-to-WASM sandbox)** — lighter weight,
       faster cold start, more restrictive on what a node can do (no
       arbitrary native calls) — likely the better fit for most nodes
       (HTTP calls, JSON transforms, API calls), less so for anything
       needing native libraries.
   - Recommendation: start with Docker for correctness and simplicity,
     revisit WASM as an optimization once sandboxing works at all. Don't
     block v0.9 on picking the "perfect" long-term runtime.

2. **Resource Limits**
   - Per-node execution gets a hard timeout (e.g. 30s default,
     configurable per node type) and memory cap.
   - A node that hangs or leaks memory must be killed and reported as a
     failed node (`error` state, clear "execution timed out" message),
     not allowed to hang the whole run.

3. **Explicit Capability Declarations**
   - `definition.json` gains a `capabilities` field: e.g.
     `["network:fetch", "secrets:openai"]`. A node can only access what
     it explicitly declares.
   - Built-in nodes (LLM, MCP, HTTP, Storage) get audited and given
     accurate capability lists as part of this version — this also
     serves as the reference example for community node authors.
   - The UI's existing "this runs third-party code" warning (from v0.7)
     now shows the **specific capabilities** being granted, not just a
     generic warning — much more useful trust signal.

4. **Secrets Access Inside the Sandbox**
   - A node with `secrets:openai` capability gets that one credential
     injected into its sandboxed execution context — never the full set
     of a user's stored credentials.
   - No node can read another node's injected secrets, even within the
     same workflow run.

5. **Sandbox Failure UX**
   - Sandbox crash, OOM kill, or timeout must map cleanly onto the
     existing node error states from `ARCHITECTURE.md` (red node,
     click-to-expand, plain-language message) — not a new, different
     failure path the user has to learn.

## What v0.9 Explicitly Does NOT Include

- Migrating built-in nodes to a *different* execution model than
  community nodes — ideally both run through the same sandbox path so
  there's only one execution model to maintain and test.
- Auto-scaling sandbox infrastructure — a solo/small-project deploy can
  run sandboxes sequentially or with a small concurrency cap; this isn't
  production infra work yet.
- Marketplace growth features (ratings, search, more install sources) —
  explicitly paused until this ships, per the precondition above.

## Definition of Done for v0.9

- [ ] A deliberately malicious test node (attempts to read
      `/etc/passwd`, attempts to `fetch()` without declaring the
      capability, attempts to read another node's env var) fails safely
      in every case — verify each attack individually, don't just test
      the happy path.
- [ ] A node that infinite-loops is killed at the timeout and reported as
      a clear, distinct error, not a hung UI.
- [ ] All 4-5 built-in node types still work identically to before from
      the user's perspective, now running through the sandbox.
- [ ] Capability list shown in the UI accurately reflects what a node
      can access before a user installs/runs a community node.
- [ ] Per-node resource limits are configurable (at least via a config
      file, doesn't need UI yet) so heavier nodes (e.g. OCR) aren't
      killed prematurely by a limit tuned for lightweight nodes.
