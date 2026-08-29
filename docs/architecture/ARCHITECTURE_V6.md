# OpenFlow — v0.6 Architecture

> Precondition: v0.5's save/load, auth, and server-side execution with
> secrets confirmed working. v0.6 builds directly on top of the backend
> API layer from v0.5 — do not start this if workflows still only run
> from the canvas UI.

## Goal of v0.6

Let a user turn a saved workflow into a **public, callable API
endpoint** — the project's answer to "GitHub Actions-lite" from the
original pitch. This is the first feature that makes OpenFlow useful
*outside* its own UI.

## What v0.6 Adds

1. **Deploy Button on a Saved Workflow**
   - On the workflow dashboard/canvas: "Deploy" action generates a stable
     public URL, e.g. `POST /api/deploy/:deployId`.
   - Deploying creates a `deployments` row pointing at a specific
     **version** of the workflow graph (see versioning below) — not a
     live pointer to "whatever the canvas currently has," so editing the
     workflow later doesn't silently change a live endpoint.

2. **Versioning (minimal)**
   - Each deploy snapshots the graph JSON at that moment as an immutable
     version (`workflow_versions` table: id, workflow_id, graph_json,
     created_at).
   - Redeploying creates a new version and updates the deployment to
     point at it. Old deploy URL keeps working unless explicitly changed.
   - No fancy diffing/rollback UI yet — just enough that "what's live"
     and "what's being edited" are clearly separate.

3. **Deployment Execution Path**
   - Public endpoint accepts a JSON body matching the workflow's declared
     **entry input schema** (the first node's expected input — you'll
     need to formalize this now; up to now the "start" of a graph was
     just whatever the first node's config had hardcoded).
   - Runs the graph server-side using the same engine as manual runs, but
     triggered via HTTP instead of the "Run Workflow" button.
   - Returns the final node's (or explicitly marked "output nodes'")
     result as the HTTP response — needs a way to mark which node(s) in
     a graph represent "the output" when there are multiple leaf nodes.

4. **API Key for Deployed Endpoints**
   - Deployed endpoints require a bearer token (generated per deployment,
     shown once, regenerable) — these are public URLs, they can't be
     wide open.
   - Rate limiting per deployment (simple: fixed requests/minute cap) —
     someone hammering a deployed endpoint shouldn't blow through the
     owner's OpenAI quota unbounded.

5. **Deployment Dashboard**
   - List of a user's deployed workflows: URL, status (active/paused),
     version, request count, last called.
   - Pause/resume a deployment (stops accepting requests without
     deleting it).
   - Basic per-deployment run history, reusing the Run Log infra from
     v0.4/v0.5 — a deployed run is still just a "run," now triggered by
     HTTP instead of a click.

## What v0.6 Explicitly Does NOT Include

- Node marketplace / community nodes (v0.7+).
- Webhook/cron *triggers into* a workflow (this version is about
  exposing a workflow as a callable endpoint others hit — inbound
  scheduled/event triggers are a related but separate feature, v0.7+).
- Auto-scaling, queuing under heavy load — a naive per-request execution
  is fine for v0.6; this is a solo/small-project deploy target, not
  production infra.
- Custom domains, usage billing.

## Definition of Done for v0.6

- [ ] Deploy a saved workflow, get a URL + bearer token.
- [ ] `curl` the URL with a valid token and correct input JSON → get back
      the workflow's real output.
- [ ] Invalid/missing token → 401, not a silent failure or crash.
- [ ] Edit the workflow on canvas after deploying → live endpoint keeps
      returning old behavior until explicitly redeployed.
- [ ] Redeploy → new version live, old version still viewable in history.
- [ ] Pausing a deployment → endpoint returns a clear "deployment paused"
      response instead of executing.
- [ ] Hitting the rate limit → clear 429 response, doesn't crash the
      engine or spike API costs.

Once this is solid, v0.7 begins: the node marketplace and inbound
triggers (webhook/cron) — the last major pieces from the original
long-term architecture, and the point where outside contributors can
start adding node types without touching your core engine code.
