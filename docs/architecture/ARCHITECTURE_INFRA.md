# OpenFlow — Infrastructure Track

> Unlike the numbered version docs (v0.1–v0.15), this is a **parallel
> track**, not a sequential version. These four items support every
> other version rather than being a feature themselves — some of them
> (testing, CI) should ideally have started much earlier than v0.15, and
> retrofitting them now means auditing everything built so far, not just
> building something new.

## Why This Is a Separate Track, Not "v0.16"

If this were sequenced as v0.16, it would imply testing/CI didn't matter
until now — that's backwards. The honest positioning: **testing and CI
should be retrofitted as soon as possible, ideally before v0.7's
community node contributions actually start landing**, since that's the
point where untested code from outside contributors starts merging into
the engine. Docker self-host and observability are more legitimately
"whenever it fits," but testing/CI are overdue the moment this doc is
read.

**Recommended real-world sequencing:** start Testing + CI now, in
parallel with whatever numbered version is currently in progress — don't
block feature work on it, but don't push it past v0.7 either.

---

## 1. Testing Setup

### Unit Tests — Engine
- Cover the core execution logic first, since it's the highest-risk,
  most-reused code in the project:
  - Topological sort / DAG validation (cycles rejected, valid graphs
    ordered correctly).
  - Parallel branch execution (independent branches actually run
    concurrently, dependent ones wait correctly).
  - Multi-input nodes (waits for ALL upstream nodes, not just the first).
  - Skip propagation (a failed node's downstream marked `skipped`,
    unrelated branches unaffected).
  - Retry logic (retrying a node reuses cached upstream output, doesn't
    re-trigger upstream nodes).
- Framework: Vitest (pairs naturally with a Vite-based frontend, fast,
  minimal config) — use the same test runner for both frontend and
  backend/engine code where possible, don't introduce two different
  testing stacks without a real reason.

### Unit Tests — Nodes
- Every node's `run.ts` gets a test file alongside it
  (`src/nodes/<node-name>/run.test.ts`), following the node model
  convention already established in `AGENTS.md`.
- Mock external calls (OpenAI, MCP servers, SMTP, etc.) — unit tests
  should not make real network calls or cost real API credits. Real-call
  verification belongs in a separate, explicitly-labeled integration
  test suite that's not run on every commit.
- Add "every new node PR must include a `run.test.ts`" to
  `CONTRIBUTING.md` — this is the actual enforcement mechanism, not just
  a nice-to-have guideline.

### End-to-End Tests — Canvas
- Framework: Playwright (good React Flow / canvas-interaction support,
  handles drag-and-drop reasonably well).
- Cover the critical user path, not exhaustive UI coverage:
  1. Drag a node onto canvas, configure it, run it, see real output.
  2. Connect two nodes, run the graph, confirm data flows correctly.
  3. Save a workflow, reload the page, confirm it loads correctly.
  4. Trigger a node failure, confirm skip propagation shows correctly
     on canvas.
- Keep e2e suite small and fast intentionally — a handful of true
  critical-path tests beats a large, slow, flaky suite that gets ignored.

### Definition of Done
- [ ] Engine unit tests cover DAG validation, parallel execution,
      multi-input, skip propagation, and retry — passing.
- [ ] At least one unit test per existing node type — passing, using
      mocked external calls.
- [ ] 3-5 critical-path e2e tests passing consistently (no flakiness on
      repeated runs).
- [ ] `CONTRIBUTING.md` updated to require tests on new node PRs.

---

## 2. CI Pipeline (GitHub Actions)

- Trigger: every PR + every push to main.
- Jobs:
  1. **Lint** — ESLint + TypeScript type-check, fail fast if this
     doesn't pass (cheapest check, run first).
  2. **Unit tests** — engine + node tests from section 1.
  3. **E2E tests** — Playwright suite, can run after lint+unit pass
     (don't waste CI minutes running e2e if lint already failed).
  4. **Build check** — confirm `npm run build` succeeds (catches broken
     imports/type errors that only show up at build time).
- Branch protection: require CI to pass before merging to main — this is
  what actually makes the testing setup from section 1 matter; tests
  that exist but aren't enforced get skipped under deadline pressure.
- Status badge in `README.md` (build/CI passing badge) — small but real
  trust signal for anyone evaluating the repo.

### Definition of Done
- [ ] CI runs automatically on every PR, all 4 jobs execute.
- [ ] A PR with a failing test or lint error is visibly blocked from
      merging (branch protection rule active, not just advisory).
- [ ] CI badge added to `README.md`, reflects real status.
- [ ] Average CI run time is reasonable (aim under ~5 min) — if e2e
      tests make this too slow, consider running e2e only on PRs to
      main rather than every push.

---

## 3. Docker Compose Self-Host Setup

- Ties directly back to the original long-term architecture
  (`ARCHITECTURE.md` § 1, "Infrastructure & Deployment" — self-hosted via
  Docker Compose) — this is that vision finally getting built.
- `docker-compose.yml` covering:
  - Frontend (built + served, or dev mode via a flag)
  - Backend/API
  - SQLite (or Postgres, if migrated by this point per v0.5's note about
    an upgrade path) — volume-mounted so data persists across restarts
  - Environment variable template for secrets (`.env.example` extended
    to cover self-host-specific config, not just API keys)
- One-command goal: `docker compose up` should produce a fully working
  local instance — canvas reachable, able to save workflows, run nodes,
  with **zero manual setup steps beyond providing API keys**.
- Document this prominently in `README.md`'s Quick Start as an
  alternative to the `npm install` path — self-hosters and local
  contributors have different needs, serve both clearly.

### Definition of Done
- [ ] `docker compose up` on a clean machine (no prior Node/npm setup)
      produces a working instance reachable in a browser.
- [ ] Data persists across `docker compose down` / `up` cycles (volume
      correctly configured).
- [ ] Documented in README with accurate, tested steps — verify by
      literally following your own instructions on a fresh environment.

---

## 4. Engine Observability (Internal, Not User-Facing)

> Distinct from v0.13's user-facing analytics/cost dashboards — this is
> for **you and future contributors debugging the engine itself**, not
> for end users viewing their workflow's history.

- Structured logging throughout the engine (not `console.log` scattered
  ad hoc) — a consistent logger (e.g. Pino) with log levels
  (debug/info/warn/error) and structured fields (workflow_id, run_id,
  node_id) attached to every relevant log line.
- Execution tracing: ability to trace a single run's full lifecycle
  through logs — every node's start/end, every retry, every branch
  decision — searchable/filterable by `run_id`.
- Error tracking integration (e.g. Sentry or similar) for the backend —
  catches unhandled exceptions in the engine itself (distinct from
  handled node-execution errors, which already surface to users via the
  existing failure UI) — this is for bugs in OpenFlow's own code, not
  in a node's external API call.
- Performance basics: log slow node executions (above a configurable
  threshold) to help spot engine bottlenecks as graphs grow larger
  (relevant once v0.14's Loop node ships — loops are the most likely
  source of unexpected slowness).

### Definition of Done
- [ ] All engine code uses structured logging, not raw `console.log`.
- [ ] A single run's execution can be fully reconstructed from logs
      filtered by `run_id` alone.
- [ ] An unhandled exception in engine code (deliberately trigger one to
      test) is captured by the error tracker with useful context, not
      just a silent crash or generic 500.
- [ ] Slow-node logging in place and verified against a deliberately
      slow test node.
