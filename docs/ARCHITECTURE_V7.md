# OpenFlow — v0.7 Architecture

> Precondition: v0.6's deploy/versioning/auth/rate-limiting confirmed
> solid and safe (this is the version where outside code and outside
> traffic both start touching your system — don't rush into it on a shaky
> v0.6).

## Goal of v0.7

Open the system up in two directions at once: **inbound** (workflows can
now start themselves, via webhook/cron, not just manual runs or deploy
calls) and **outward** (outside contributors can add new node types
without touching core engine code). This is the point where OpenFlow
stops being "your project" and starts being able to grow via community
contribution.

## What v0.7 Adds

### A. Inbound Triggers

1. **Cron Trigger Node**
   - A node type that isn't triggered by upstream data, but by a
     schedule (`definition.json` declares a cron expression config
     field).
   - Backend needs a scheduler (simple: a periodic job checking
     `next_run_at` per workflow, or a lightweight cron library) that
     calls the same execution path as a manual/deployed run.
   - Must respect pause/resume from v0.6's deployment model — a paused
     workflow's cron shouldn't fire.

2. **Webhook Trigger Node**
   - Distinct from v0.6's "deploy as endpoint" (which exposes the whole
     workflow as one callable API). This is a node that makes the
     workflow **start** when an external service posts to a URL — e.g.
     "new row in some external system," "new GitHub issue," etc.
   - Reuses the bearer-token + rate-limit infra from v0.6, doesn't
     reinvent it.

3. **Trigger Management UI**
   - Dashboard view: which workflows have active triggers, next
     scheduled run (for cron), last triggered time, enable/disable.

### B. Node Marketplace (Contribution Path)

4. **Node Package Format (formalize what's been implicit)**
   - Every node so far has followed `definition.json` + `run.ts` +
     `README.md`. Now formalize this as an installable package: add a
     `package.json`-style manifest (name, version, author, node type ID)
     so a node folder is self-describing and distributable.
   - Publish the format spec in `CONTRIBUTING.md` so outside contributors
     know exactly what a valid node package looks like.

5. **Marketplace Registry (start simple — do NOT build a hosted service
   yet)**
   - v0.7 registry = a curated list in a GitHub repo (or a JSON file in
     this repo) pointing to community node packages. Not a hosted
     marketplace website with its own backend — that's a later, separate
     project once there's real contributor volume.
   - "Install" in v0.7 = copy the node package files into
     `src/nodes/community/<node-name>/` and restart — manual but real.
     A one-click in-app installer is a good v0.8+ target, not now.

6. **Node Validation on Install**
   - Since community nodes run arbitrary code (`run.ts`), at minimum:
     validate the manifest shape, and clearly warn the user that
     installing a third-party node means running its code — no sandboxing
     yet (that was flagged as a "later" concern all the way back in the
     original architecture notes), but don't pretend otherwise. Be
     explicit about the trust boundary in the UI.

## What v0.7 Explicitly Does NOT Include

- Sandboxed/isolated execution for community nodes (Docker/WASM) — real
  security boundary work, a dedicated future version, not bolted on here.
- Hosted marketplace website, ratings/reviews, one-click install from
  within the app.
- Teams/orgs, shared workflow ownership.
- Event-based triggers beyond webhook/cron (e.g. polling external APIs
  for changes) — a good v0.8 candidate.

## Definition of Done for v0.7

- [ ] A workflow with a Cron Trigger node actually fires on schedule with
      no manual click, and appears correctly in run history.
- [ ] A workflow with a Webhook Trigger node starts when hit externally
      (e.g. via `curl`), same auth/rate-limit rules as v0.6 deployments.
- [ ] Pausing a workflow stops its cron/webhook triggers from firing.
- [ ] A node package built by someone unfamiliar with the codebase (test
      this literally — have another person or a fresh read of
      `CONTRIBUTING.md` alone build one) can be dropped into
      `src/nodes/community/` and shows up correctly in the sidebar.
- [ ] The UI clearly discloses "this runs third-party code" before/while
      a community node is used — no silent trust assumption.

This is the last version in the original roadmap arc. Beyond this,
scope should be driven by actual user/contributor feedback rather than
more pre-planned versions — re-evaluate priorities based on what people
who've adopted OpenFlow by this point are actually asking for.
