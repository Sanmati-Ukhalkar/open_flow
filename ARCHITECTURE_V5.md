# OpenFlow — v0.5 Architecture

> Precondition: v0.4's parallel branches, retry, partial-success, run log,
> and output validation all confirmed working. v0.5 is the first version
> where a real backend + database becomes mandatory (not optional) — up
> to now everything could theoretically run client-side/in-memory per
> session.

## Goal of v0.5

Make a workflow **persist** — save it, close the tab, come back, load it,
run it again. Add just enough auth so persistence means something (one
user's workflows aren't the same as another's).

## What v0.5 Adds

1. **Backend API Layer (now required, not optional)**
   - Minimal REST API: `POST /workflows`, `GET /workflows`,
     `GET /workflows/:id`, `PUT /workflows/:id`, `DELETE /workflows/:id`.
   - `POST /workflows/:id/run` — triggers execution server-side instead of
     purely in the browser. This matters because API keys/secrets (OpenAI
     key, MCP server credentials) should never live in frontend code —
     v0.1–v0.4 likely had them in `.env` read client-side for speed; that
     changes now.
   - Engine execution logic moves (or is shared via a package) so both
     "run in browser during dev" and "run via backend" use the same core
     DAG execution code — don't fork the engine into two implementations.

2. **Persistence Layer**
   - Workflow definition (nodes + edges + config) saved as JSON in
     SQLite (upgrade path to Postgres stays open, not required yet).
   - Run history: each run gets a row (workflow_id, started_at,
     finished_at, status, per-node results) — this is what makes the Run
     Log panel from v0.4 useful across sessions, not just within one.
   - Schema sketch:
     ```
     workflows(id, name, graph_json, owner_id, created_at, updated_at)
     runs(id, workflow_id, status, started_at, finished_at)
     run_node_results(id, run_id, node_id, status, output_json, error_json)
     ```

3. **Basic Auth**
   - Simplest viable approach: email + password or a single OAuth
     provider (GitHub OAuth fits this project's audience well). Don't
     build a full user-management system — just enough that
     `owner_id` on a workflow means something.
   - Session/JWT-based auth on the API layer.
   - No teams/orgs/roles yet — one user owns their workflows, that's it.

4. **Secrets Management (moves server-side)**
   - API keys (OpenAI, MCP server credentials) now stored server-side,
     associated with a user, never sent to or stored in the frontend.
   - Simple per-user "Credentials" section: add/update/delete an API key
     by provider name. Encrypted at rest (even basic encryption is fine
     for v0.5 — don't over-engineer, but don't store plaintext either).

5. **Canvas Changes**
   - "Save" button (explicit save, not autosave yet — autosave is a nice
     v0.6+ addition, not required now).
   - Workflow list/dashboard page: shows saved workflows, click to open
     on canvas.
   - Loading a saved workflow must reconstruct the exact canvas state
     (node positions, configs, edges) — this tests that your graph JSON
     schema is actually complete, not missing fields you'd been relying
     on in-memory state for.

## What v0.5 Explicitly Does NOT Include

- Deployment / expose workflow as public API endpoint (v0.6).
- Node marketplace / community nodes (v0.7+).
- Teams, roles, sharing workflows between users.
- Autosave, version history/undo for saved workflows.
- Webhook/cron triggers (still manual "Run Workflow" only).

## Definition of Done for v0.5

- [ ] Save a workflow, refresh the page, reload it from the dashboard —
      canvas matches exactly (positions, configs, connections).
- [ ] Log out, log in as a different user — cannot see the first user's
      workflows.
- [ ] API keys are never visible in browser devtools network tab or
      frontend bundle; execution happens server-side.
- [ ] Run history persists — closing and reopening a workflow still shows
      its past runs in the Run Log, not just the current session's.
- [ ] Deleting a workflow also cleans up its run history (no orphaned
      rows).

Once this is solid, v0.6 begins: the first "deploy as API endpoint"
flow — turning a saved workflow into a callable webhook, which is the
project's answer to the GitHub-Actions-lite piece of the original pitch.
