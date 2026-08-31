# OpenFlow — Architecture Truing Audit Results

> **Audit Date:** August 30, 2026  
> **Scope:** Structural integrity verification against the production monorepo restructure specification (`apps/*`, `packages/*`, migration system, dependency boundaries, schema isolation, and environment configuration).  
> **Target Output:** Plain, unsoftened assessment of the actual repository state on disk.

---

## Executive Summary

The monorepo restructuring created the target directory layout (`apps/api`, `apps/worker`, `apps/scheduler`, `apps/web`, `packages/db`, `packages/engine`, `packages/nodes`, `packages/shared-types`), but left behind **critical half-migrations, hardcoded stale paths, dual schema definitions, and silent failure/bypass patterns**.

Key risks identified:
1. **The API server silently falls back to inline execution if Redis fails**, returning `202 Accepted` (`status: "queued"`) while running workloads in the web server process and corrupting tenant `orgId` parameters.
2. **The engine and sandbox still resolve hardcoded pre-split paths (`src/nodes/`, `src/server/`)**, causing node schema validation to silently bypass, community nodes to fail to load, and MCP servers to fail to spawn.
3. **`packages/db/src/db.ts` continues to execute 14 `CREATE TABLE` and 15 `ALTER TABLE` statements on module import**, bypassing the migration runner and creating conflicting schemas with `001_initial_schema.ts`.
4. **Environment variable configuration is disconnected**: `apps/api/src/auth.ts` looks for `AUTH_SECRET` while `.env.example`, `docker-compose.yml`, and `env.ts` define `JWT_SECRET`. Database encryption uses a hardcoded default key because `ENCRYPTION_KEY` is omitted from `.env.example`.

---

## Section 1 — Package Boundary Integrity

### 1.1 Dependency Audit by Package

| Package / App | Declared `dependencies` | Actually Used in Source | Unused Dependencies | Undeclared / Phantom Dependencies |
|---|---|---|---|---|
| **`apps/api`** | `@modelcontextprotocol/sdk`, `@open-flow/db`, `@open-flow/engine`, `@open-flow/nodes`, `@open-flow/shared-types`, `bullmq`, `cors`, `dotenv`, `express`, `ioredis`, `jsonwebtoken`, `pino`, `pino-pretty`, `ws`, `y-websocket`, `yjs`, `zod` | `@modelcontextprotocol/sdk`, `@open-flow/db`, `@open-flow/engine`, `@open-flow/nodes`, `bullmq`, `cors`, `dotenv`, `express`, `ioredis`, `ws`, `y-websocket`, `yjs`, `zod` | **`@open-flow/shared-types`** (not imported), **`jsonwebtoken`** (custom crypto used in [auth.ts](file:///c:/Projects/open_flow/apps/api/src/auth.ts)), **`pino`**, **`pino-pretty`** (uses raw `console`) | None |
| **`apps/scheduler`** | `@open-flow/db`, `@open-flow/shared-types`, `bullmq`, `dotenv`, `ioredis`, `node-cron`, `pino`, `pino-pretty`, `zod` | `@open-flow/db`, `@open-flow/shared-types`, `bullmq`, `dotenv`, `ioredis`, `node-cron`, `zod` | **`pino`**, **`pino-pretty`** (uses raw `console`) | None |
| **`apps/web`** | `@open-flow/shared-types`, `lucide-react`, `react`, `react-dom`, `reactflow`, `ws`, `y-websocket`, `yjs` | `lucide-react`, `react`, `react-dom`, `reactflow`, `y-websocket`, `yjs` | **`@open-flow/shared-types`** (not imported), **`ws`** (browser-native `window.WebSocket` is used) | **`@open-flow/engine`** (imported in [App.tsx#L21](file:///c:/Projects/open_flow/apps/web/src/App.tsx#L21)) |
| **`apps/worker`** | `@open-flow/db`, `@open-flow/engine`, `@open-flow/shared-types`, `bullmq`, `dotenv`, `ioredis`, `pino`, `pino-pretty`, `zod` | `@open-flow/db`, `@open-flow/engine`, `@open-flow/shared-types`, `bullmq`, `dotenv`, `ioredis`, `zod` | **`pino`**, **`pino-pretty`** (uses raw `console`) | None |
| **`packages/db`** | `@open-flow/shared-types`, `pg`, `pino`, `pino-pretty`, `sqlite3`, `umzug` | `pg`, `pino`, `sqlite3` | **`@open-flow/shared-types`** (not imported), **`pino-pretty`** (string transport target only), **`umzug`** (custom runner in [migrate.ts](file:///c:/Projects/open_flow/packages/db/src/migrate.ts)) | None |
| **`packages/engine`** | `@modelcontextprotocol/sdk`, `@open-flow/db`, `@open-flow/nodes`, `@open-flow/shared-types`, `dotenv` | `@modelcontextprotocol/sdk`, `@open-flow/db`, `@open-flow/nodes` | **`@open-flow/shared-types`** (not imported), **`dotenv`** (not imported) | **`reactflow`** (imported in [topoSort.ts#L1](file:///c:/Projects/open_flow/packages/engine/src/topoSort.ts#L1) & [topoSort.test.ts#L2](file:///c:/Projects/open_flow/packages/engine/src/topoSort.test.ts#L2)) |
| **`packages/nodes`** | `@modelcontextprotocol/sdk`, `@open-flow/db`, `@open-flow/shared-types`, `dotenv`, `nodemailer`, `openai`, `sqlite3`, `tesseract.js` | `@modelcontextprotocol/sdk`, `@open-flow/db`, `nodemailer`, `openai`, `tesseract.js` | **`@open-flow/shared-types`** (not imported), **`dotenv`** (not imported), **`sqlite3`** (delegates DB queries to `@open-flow/db`) | None |
| **`packages/shared-types`** | *(none)* | *(none)* | *(none)* | None |

### 1.2 Package Circular Dependency Graph

An analysis of import specifiers across `packages/*` reveals the following dependency topology:

```
packages/shared-types  (0 dependencies)
packages/db            (0 inter-package dependencies)
packages/nodes         └──> imports @open-flow/db
packages/engine        ├──> imports @open-flow/nodes
                       └──> imports @open-flow/db
```

- **Circular Dependency Status:** **PASS** — No circular references exist between `packages/*`. The dependency graph is a strict DAG.

### 1.3 Cross-App Boundary Isolation

- **`apps/web`**: **PASS** — Does not import from `apps/api`, `apps/worker`, or `apps/scheduler`.
- **`apps/api`**: **PASS** — Does not import from `apps/web`, `apps/worker`, or `apps/scheduler`.
- **`apps/scheduler`**: **PASS** — Does not import from other `apps/*`.
- **`apps/worker`**: **FAIL** — [apps/worker/src/\_\_tests\_\_/worker.test.ts#L3](file:///c:/Projects/open_flow/apps/worker/src/__tests__/worker.test.ts#L3) directly imports across application boundaries into `apps/api`:
  ```ts
  import { enqueueWorkflowRun, workflowQueue } from '../../../api/src/queue';
  ```
  `apps/worker` must never depend on `apps/api` source code. Queue definitions should reside in a shared package (or `@open-flow/shared-types` / a dedicated `@open-flow/queue` package).

---

## Section 2 — Leftover / Orphaned Code from Migration

### 2.1 Stale Pre-Restructure Path References

The following active source files, build scripts, and docs contain hardcoded paths pointing to the deleted root `src/` directory:

| Location | Line | Code / Reference | Real Impact |
|---|---|---|---|
| [packages/engine/src/engine.ts](file:///c:/Projects/open_flow/packages/engine/src/engine.ts#L81-L84) | 81, 83 | `path.resolve(process.cwd(), 'src/nodes/${nodeType}/definition.json')` | `checkOutputSchema` fails `fs.existsSync` and silently skips output schema validation for every node. |
| [packages/engine/src/engine.ts](file:///c:/Projects/open_flow/packages/engine/src/engine.ts#L219) | 219 | `path.resolve(process.cwd(), 'src/nodes/code-execution/run.ts')` | Sandboxed code-execution node fails to locate runner script at runtime. |
| [packages/engine/src/engine.ts](file:///c:/Projects/open_flow/packages/engine/src/engine.ts#L226) | 226 | `path.resolve(process.cwd(), 'src/nodes/community', node.type, 'run.ts')` | Dynamic community node execution fails with `UNKNOWN_NODE_TYPE`. |
| [packages/engine/src/sandbox.ts](file:///c:/Projects/open_flow/packages/engine/src/sandbox.ts#L13) | 13 | `path.resolve(process.cwd(), 'src/nodes/node-limits.json')` | Sandbox worker fails to load CPU/memory execution limits. |
| [packages/engine/src/sandbox.ts](file:///c:/Projects/open_flow/packages/engine/src/sandbox.ts#L125-L126) | 125–126 | `path.resolve(process.cwd(), 'src/nodes/.../definition.json')` | Sandbox capability validation fails to read declared permissions. |
| [apps/api/src/server.ts](file:///c:/Projects/open_flow/apps/api/src/server.ts#L1135-L1159) | 1135, 1159 | `path.resolve(process.cwd(), 'src/nodes')` and `src/nodes/community` | Node registry endpoint `/api/node-definitions` fails to scan directory. |
| [apps/api/src/server.ts](file:///c:/Projects/open_flow/apps/api/src/server.ts#L1210) | 1210 | `path.resolve(process.cwd(), 'src/server/mcp-server.ts')` | MCP server registration spawns non-existent script. |
| [packages/nodes/src/mcp-tool/run.ts](file:///c:/Projects/open_flow/packages/nodes/src/mcp-tool/run.ts#L87) | 87 | `path.resolve(process.cwd(), 'src/server/mcp-server.ts')` | MCP node runner fails to spawn local stdio MCP server. |
| [apps/web/src/canvas/Marketplace.tsx](file:///c:/Projects/open_flow/apps/web/src/canvas/Marketplace.tsx#L21) | 21 | `fetch('/src/nodes/registry.json')` | Client marketplace component fails to load registry JSON. |
| [docs/CURRENT_STRUCTURE.md](file:///c:/Projects/open_flow/docs/CURRENT_STRUCTURE.md#L406-L409) | 406–409 | Describes root `src/` monolithic directory layout. | Stale architectural documentation. |
| [docs/guides/CONTRIBUTING.md](file:///c:/Projects/open_flow/docs/guides/CONTRIBUTING.md#L13-L29) | 13, 29 | References `src/server/__tests__/engine.test.ts` and `src/server/seed-templates.ts`. | Onboarding guidance broken for contributors. |
| [docs/guides/NODE_AUTHORING_GUIDE.md](file:///c:/Projects/open_flow/docs/guides/NODE_AUTHORING_GUIDE.md#L11) | 11 | Directs users to create files in `src/nodes/`. | Onboarding guidance broken for contributors. |

### 2.2 Pre-Split `src/server/engine.ts` Check

- **Status:** **PASS** — `src/server/engine.ts` has been deleted. Only [packages/engine/src/engine.ts](file:///c:/Projects/open_flow/packages/engine/src/engine.ts) exists.

### 2.3 CI/CD Workflows (`ci.yml`, `deploy.yml`)

- **`.github/workflows/ci.yml`**:
  - Uses workspace-aware scripts: `npm run lint` (`eslint apps packages`), `npm run typecheck` (`tsc --noEmit`), `npm run test:unit` (`vitest run`), and `npm run test:e2e` (`playwright test`).
  - **Issue:** `npm run build` only runs `npm run build -w apps/web`. Backend packages (`packages/db`, `packages/engine`, `packages/nodes`) have no build steps tested during CI.
- **`.github/workflows/deploy.yml`**:
  - **FAIL:** [deploy.yml#L45](file:///c:/Projects/open_flow/.github/workflows/deploy.yml#L45) uploads artifact from `./dist`. However, Vite builds `apps/web` into `apps/web/dist`. On a clean GitHub Actions runner, `./dist` does not exist at root, causing the GitHub Pages deploy step to fail.

### 2.4 Containerization (`Dockerfile`, `docker-compose.yml`)

- **`Dockerfile`**:
  - Multi-stage targets exist for `api`, `worker`, `scheduler`, and `web`.
  - **Issue:** The `web` stage runs `CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173", "apps/web"]` (development mode) rather than compiling a static bundle and serving via Nginx or static file server.
- **`docker-compose.yml`**:
  - Configures services `redis`, `api`, `worker`, `scheduler`, `web`.
  - **Issue:** [docker-compose.yml#L23](file:///c:/Projects/open_flow/docker-compose.yml#L23) sets `JWT_SECRET=production-secret-change-me`, but `apps/api/src/auth.ts` ignores `JWT_SECRET` and reads `AUTH_SECRET`.

---

## Section 3 — Fallback/Bypass Pattern Sweep

### 3.1 Sweep Findings

| File & Line | Trigger Condition | Fallback Action Taken | Error Visibility | Classification |
|---|---|---|---|---|
| [apps/api/src/queue.ts#L27-L30](file:///c:/Projects/open_flow/apps/api/src/queue.ts#L27-L30) & [apps/api/src/server.ts#L596-L601](file:///c:/Projects/open_flow/apps/api/src/server.ts#L596-L601) | Redis is offline or BullMQ fails to enqueue job. | Catches error, returns `jobId = null`. `server.ts` executes `executeRunBackend(runId, id, userId)` **inline in the API process** and returns HTTP 202 `{ success: true, status: 'queued', jobId: null }`. | Logs `console.warn`, hides failure from client. | **DANGEROUS SHORTCUT / INCIDENT RISK** — Masks infrastructure outage, runs unthrottled worker execution inside API server, and passes `userId` as `orgId` (corrupting credential lookups). |
| [packages/engine/src/engine.ts#L79-L87](file:///c:/Projects/open_flow/packages/engine/src/engine.ts#L79-L87) | Node output schema definition file does not exist on disk. | `if (!fs.existsSync(definitionPath)) return { isValid: true };` | Silent return, no log. | **ACCIDENTAL BYPASS** — Due to stale path `src/nodes/`, schema validation is bypassed 100% of the time for every node. |
| [packages/db/src/migrate.ts#L11-L13](file:///c:/Projects/open_flow/packages/db/src/migrate.ts#L11-L13) | Any migration SQL statement errors out during migration. | `catch (error) { console.error(...); }` (does not rethrow or exit with error code). | Logs to `console.error`, but `process.exit(0)` is called. | **SILENT FAILURE** — CI or deployment scripts awaiting migration return exit code 0 despite failed database schema updates. |
| [packages/nodes/src/vector-store/run.ts#L68](file:///c:/Projects/open_flow/packages/nodes/src/vector-store/run.ts#L68) | JSON parsing fails on corrupted vector storage file. | `catch (e) { // ignore parse errors }` and resets store to `[]`. | Silent swallow. | **DATA LOSS RISK** — Overwrites corrupted file with empty array, losing all previously stored vectors. |

### 3.2 Database Engine Fallback (`packages/db`)

- **Postgres vs SQLite**: [packages/db/src/db.ts#L63-L76](file:///c:/Projects/open_flow/packages/db/src/db.ts#L63-L76) checks `if (connectionString) { this.isPg = true; ... } else { this.isPg = false; ... }`.
  - If `DATABASE_URL` is undefined, it defaults to SQLite at `metadata.sqlite`.
  - If `DATABASE_URL` is provided but invalid/unreachable, it attempts Postgres connection and rejects queries (does not silently fall back to SQLite).
  - **Issue:** No validation warns if Postgres connection fails at startup; connection is lazy and first query throws.

---

## Section 4 — Consistency Between Docs and Reality

### 4.1 Definition of Done Checklist

| Requirement | Status | Actual Codebase Reality |
|---|---|---|
| **Decoupled 4-App Workspace (`api`, `worker`, `scheduler`, `web`)** | **PARTIAL** | Directory structure exists, but `apps/web` has a phantom dependency on `@open-flow/engine`, and `apps/worker` test imports `apps/api` directly. |
| **Decoupled 4-Package Workspace (`db`, `engine`, `nodes`, `shared-types`)** | **PARTIAL** | Packages exist, but `packages/engine` has an undeclared dependency on `reactflow`, and engine/nodes contain hardcoded stale paths. |
| **True Database Migrations** | **FAIL** | `001_initial_schema.ts` and `002_add_queue_job_id.ts` exist, but [packages/db/src/db.ts](file:///c:/Projects/open_flow/packages/db/src/db.ts#L191-L479) still runs monolithic schema creation and 15 `ALTER TABLE` statements on import. |
| **Strict Schema Isolation** | **FAIL** | Table and column names in `db.ts` (`workflows.graph_json`, `workflow_versions`, `triggers.trigger_type`) conflict with `001_initial_schema.ts` (`workflows.nodes/edges`, `versions`, `triggers.type`). |
| **Decoupled Queue-Backed Execution** | **PARTIAL** | Worker consumes BullMQ jobs, but `apps/api` retains a silent fallback executing jobs directly in the API process when Redis is down. |
| **Centralized Environment Validation** | **FAIL** | `src/env.ts` files exist in `api`, `worker`, and `scheduler`, but none of the applications actually import or use them. Code reads `process.env` directly. |
| **Containerization with Independent Services** | **PARTIAL** | Dockerfile and compose exist, but `web` container runs Vite dev server rather than production static build. |

### 4.2 Architecture Documentation Drift

- **[docs/architecture/ARCHITECTURE.md](file:///c:/Projects/open_flow/docs/architecture/ARCHITECTURE.md)**: **STALE (High Drift)** — Still describes the initial single-process prototype architecture (v0.1–v0.7 roadmap) with in-process async execution and SQLite. Does not mention BullMQ, Redis, worker processes, scheduler, Postgres translation, or monorepo packages.
- **[docs/CURRENT_STRUCTURE.md](file:///c:/Projects/open_flow/docs/CURRENT_STRUCTURE.md)**: **STALE** — Outdated file from before the monorepo split showing single root `package.json` and monolithic `src/` tree.

### 4.3 `README.md` Quick Start Verification

- **[README.md#L136-L144](file:///c:/Projects/open_flow/README.md#L136-L144)**: **MISLEADING & BROKEN LINKS**
  - States `npm install && cp .env.example .env && npm run dev`. Does not inform developers that a local Redis instance (port 6380/6379) is strictly required for worker/scheduler/api execution.
  - Contains **6 broken markdown links** pointing to moved/non-existent root files:
    - Line 106: `[ARCHITECTURE.md](./ARCHITECTURE.md)` (file is at `docs/architecture/ARCHITECTURE.md`)
    - Line 159: `[ARCHITECTURE.md](./docs/ARCHITECTURE.md)` (file is at `docs/architecture/ARCHITECTURE.md`)
    - Line 160: `[Node-Authoring Guide](./docs/NODE_AUTHORING_GUIDE.md)` (file is at `docs/guides/NODE_AUTHORING_GUIDE.md`)
    - Line 161: `[API Reference Docs](./docs/API_REFERENCE.md)` (file is at `docs/guides/API_REFERENCE.md`)
    - Line 162: `[AGENTS.md](./AGENTS.md)` (file is at `docs/guides/AGENTS.md`)
    - Line 163: `[CONTRIBUTING.md](./CONTRIBUTING.md)` (file is at `docs/guides/CONTRIBUTING.md`)

---

## Section 5 — Migration & Schema Integrity

### 5.1 Ad-Hoc Schema Creation Audit

- **[packages/db/src/db.ts#L191-L479](file:///c:/Projects/open_flow/packages/db/src/db.ts#L191-L479)**: Executes inside `db.serialize()` immediately on module load:
  - 14 `CREATE TABLE IF NOT EXISTS` statements (`users`, `credentials`, `workflows`, `runs`, `run_node_results`, `workflow_versions`, `deployments`, `triggers`, `organizations`, `organization_members`, `invitations`, `mcp_servers`, `deployment_alerts`, `aggregated_metrics`).
  - 15 `ALTER TABLE` statements conditionally adding columns.
  - Data migration functions (`runV11Migration()`, `migrateResources()`) running uncontrolled mutations on startup.
- **[packages/nodes/src/sqlite-storage/run.ts#L54-L58](file:///c:/Projects/open_flow/packages/nodes/src/sqlite-storage/run.ts#L54-L58)**: Runs dynamic `CREATE TABLE IF NOT EXISTS ${tableName}` at node runtime.

### 5.2 Schema Drift Between `db.ts` and `001_initial_schema.ts`

| Table | `001_initial_schema.ts` Column Definition | `db.ts` Column Definition | Conflict / Breakage |
|---|---|---|---|
| `workflows` | `nodes TEXT, edges TEXT` | `graph_json TEXT` | Code expects `graph_json`; `001_initial_schema.ts` definition breaks graph loading. |
| `workflow_versions` | Named `versions` (`workflow_id, version_number, nodes, edges`) | Named `workflow_versions` (`workflow_id, graph_json`) | Table name mismatch and column structure mismatch. |
| `triggers` | `id, workflow_id, deployment_id, type, config, org_id` | `id, workflow_id, trigger_type, status, config_json, last_triggered_at, org_id` | Column names mismatch (`type` vs `trigger_type`, `config` vs `config_json`). |
| `deployments` | `version_id TEXT` | `workflow_version_id TEXT` | [apps/scheduler/src/scheduler.ts#L27](file:///c:/Projects/open_flow/apps/scheduler/src/scheduler.ts#L27) queries `version_id` and joins `t.deployment_id`, which fails against `db.ts` schema. |

### 5.3 Idempotency Test Execution

Running `npm run migrate` twice in succession:
- **Run 1:** Output:
  ```
  [DB] Running database migrations...
  Connected to SQLite database.
  Added column queue_job_id to runs table.
  Added column completed_at to runs table.
  [DB] Database migrations applied successfully.
  ```
  *(Note: "Added column completed_at..." was output by `db.ts` side-effect execution, not the migration runner).*
- **Run 2:** Output:
  ```
  [DB] Running database migrations...
  Connected to SQLite database.
  [DB] Database migrations applied successfully.
  ```
- **Result:** While the scripts do not throw SQL syntax errors on duplicate runs, **there is zero migration tracking** (no migration metadata table). Every migration script is re-evaluated on every run, and errors are swallowed in `migrate.ts`.

---

## Section 6 — Environment Variable Sprawl Check

### 6.1 Environment Variable Cross-Reference Matrix

| Variable Name | Used in Code Location | Present in `.env.example` | Defined in `env.ts` Schema | Status / Finding |
|---|---|---|---|---|
| `AUTH_SECRET` | [apps/api/src/auth.ts](file:///c:/Projects/open_flow/apps/api/src/auth.ts#L4) | ❌ Missing | ❌ Missing | **CRITICAL MISMATCH** — `.env.example` has `JWT_SECRET`, but code reads `AUTH_SECRET`. Defaults to hardcoded fallback. |
| `JWT_SECRET` | [apps/api/src/env.ts](file:///c:/Projects/open_flow/apps/api/src/env.ts#L10), `docker-compose.yml` | ✅ Present | ✅ Present (`api`) | **DEAD VARIABLE** — Never read by authentication logic. |
| `ENCRYPTION_KEY` | [packages/db/src/crypto.ts](file:///c:/Projects/open_flow/packages/db/src/crypto.ts#L7) | ❌ Missing | ❌ Missing | **SECURITY RISK** — Missing from `.env.example`. Defaults to hardcoded fallback key for AES credential encryption. |
| `DATABASE_URL` | `api/server.ts`, `db/db.ts`, `nodes/sqlite-storage` | ❌ Missing | ❌ Missing | **SETUP TRAP** — Undocumented PostgreSQL connection string. |
| `REDIS_URL` | `api/queue.ts`, `scheduler.ts`, `worker.ts` | ✅ Present | ✅ Present (`api`, `worker`, `scheduler`) | **PORT MISMATCH** — `scheduler.ts` defaults to port `6379`; `api` and `worker` default to `6380`. |
| `PORT` | `api/server.ts` | ✅ Present | ✅ Present (`api`) | Aligned. |
| `SQLITE_DB_PATH` | `packages/db/src/db.ts` | ❌ Missing | ❌ Missing | Missing from `.env.example`. |
| `STORAGE_DB_PATH` | `packages/nodes/src/sqlite-storage/run.ts` | ❌ Missing | ❌ Missing | Missing from `.env.example`. |
| `BACKEND_URL` | `apps/web/vite.config.ts` | ❌ Missing | ❌ Missing | Missing from `.env.example`. |
| `NODE_ENV` | `packages/db/src/logger.ts` | ❌ Missing | ✅ Present | Missing from `.env.example`. |
| `LOG_LEVEL` | `packages/db/src/logger.ts` | ❌ Missing | ❌ Missing | Missing from `.env.example`. |
| `SLOW_NODE_THRESHOLD_MS` | `packages/engine/src/engine.ts` | ❌ Missing | ❌ Missing | Missing from `.env.example`. |
| `OPENAI_API_KEY` | `packages/nodes` | ✅ Present | ❌ Missing | Aligned with nodes. |
| `GROQ_API_KEY` | `packages/nodes` | ✅ Present | ❌ Missing | Aligned with nodes. |
| `SMTP_USER` | `packages/nodes/src/email/run.ts` | ✅ Present | ❌ Missing | Aligned with email node. |
| `SMTP_PASS` | `packages/nodes/src/email/run.ts` | ✅ Present | ❌ Missing | Aligned with email node. |
| `SMTP_HOST` | *(none — configured in node config)* | ✅ Present | ❌ Missing | **STALE** in `.env.example`. |
| `SMTP_PORT` | *(none — configured in node config)* | ✅ Present | ❌ Missing | **STALE** in `.env.example`. |

---

## Real Issues Found

Ranked strictly by probability and severity of causing a production incident (highest severity first):

1. **Silent Fallback Execution in API with Tenant ID Corruption** *(Severity: Critical)*  
   [apps/api/src/server.ts#L596-L601](file:///c:/Projects/open_flow/apps/api/src/server.ts#L596-L601)  
   When BullMQ fails to enqueue (e.g. Redis connection blip), the API server silently catches the error, launches an unthrottled run inline inside the API process, returns `status: "queued"`, and incorrectly passes `userId` in place of `orgId` to `executeRunBackend`, corrupting organization tenancy and failing credential retrieval.

2. **Hardcoded Stale `src/` Paths in Engine, Sandbox, API & Marketplace** *(Severity: High)*  
   [packages/engine/src/engine.ts#L81](file:///c:/Projects/open_flow/packages/engine/src/engine.ts#L81), [packages/engine/src/sandbox.ts#L13](file:///c:/Projects/open_flow/packages/engine/src/sandbox.ts#L13), [apps/api/src/server.ts#L1210](file:///c:/Projects/open_flow/apps/api/src/server.ts#L1210), [packages/nodes/src/mcp-tool/run.ts#L87](file:///c:/Projects/open_flow/packages/nodes/src/mcp-tool/run.ts#L87)  
   Active runtime code resolves paths starting with `src/nodes/` and `src/server/mcp-server.ts` from `process.cwd()`. This completely breaks community node execution, MCP tool process spawning, sandbox resource limit enforcement, and silently disables output schema validation.

3. **Dual Schema Architecture & Monolithic `db.ts` Auto-Execution** *(Severity: High)*  
   [packages/db/src/db.ts#L191-L479](file:///c:/Projects/open_flow/packages/db/src/db.ts#L191-L479) vs [packages/db/src/migrations/001_initial_schema.ts](file:///c:/Projects/open_flow/packages/db/src/migrations/001_initial_schema.ts)  
   `db.ts` automatically executes 14 `CREATE TABLE` and 15 `ALTER TABLE` statements on module import. Its schema definitions directly conflict with migration files (`graph_json` vs `nodes/edges`, `workflow_versions` vs `versions`, `trigger_type` vs `type`). The SQL query in [apps/scheduler/src/scheduler.ts#L27](file:///c:/Projects/open_flow/apps/scheduler/src/scheduler.ts#L27) fails when run against `db.ts` schema.

4. **Secret Key Naming Disconnect (`AUTH_SECRET` vs `JWT_SECRET`) & Default Encryption Key** *(Severity: High)*  
   [apps/api/src/auth.ts#L4](file:///c:/Projects/open_flow/apps/api/src/auth.ts#L4), [packages/db/src/crypto.ts#L7](file:///c:/Projects/open_flow/packages/db/src/crypto.ts#L7)  
   Deployments configuring `JWT_SECRET` (as documented in `.env.example` and `docker-compose.yml`) will silently continue using hardcoded fallback signing keys for user sessions. Furthermore, `ENCRYPTION_KEY` is missing from `.env.example`, causing organization credentials to be encrypted with a hardcoded static key.

5. **Migration Runner Swallows Errors & Returns Code 0** *(Severity: Medium-High)*  
   [packages/db/src/migrate.ts#L11-L17](file:///c:/Projects/open_flow/packages/db/src/migrate.ts#L11-L17)  
   `runMigrations()` catches migration errors and does not reject or rethrow. Running `npm run migrate` exits with status `0` even if SQL errors occur, preventing CI/CD pipelines from detecting database schema initialization failures.

6. **Phantom Dependencies & Illegal Cross-App Test Imports** *(Severity: Medium)*  
   [apps/web/src/App.tsx#L21](file:///c:/Projects/open_flow/apps/web/src/App.tsx#L21), [packages/engine/src/topoSort.ts#L1](file:///c:/Projects/open_flow/packages/engine/src/topoSort.ts#L1), [apps/worker/src/\_\_tests\_\_/worker.test.ts#L3](file:///c:/Projects/open_flow/apps/worker/src/__tests__/worker.test.ts#L3)  
   - `apps/web` imports `@open-flow/engine` without declaring it in `package.json`.
   - `packages/engine` imports `reactflow` without declaring it in `package.json`.
   - `apps/worker` integration tests import directly from `apps/api/src/queue`.

7. **Broken GitHub Pages Deployment Pipeline** *(Severity: Medium)*  
   [.github/workflows/deploy.yml#L45](file:///c:/Projects/open_flow/.github/workflows/deploy.yml#L45)  
   Workflow looks for build artifacts at `./dist` instead of `./apps/web/dist`, causing deployment jobs to fail on clean checkouts.

8. **Unused Dependencies Across 7 Manifests** *(Severity: Low-Medium)*  
   `umzug`, `jsonwebtoken`, `ws` (in `apps/web`), `pino` / `pino-pretty` (in `api`, `worker`, `scheduler`), `sqlite3` (in `packages/nodes`), and `@open-flow/shared-types` (in 5 manifests) are declared but never imported or used.

9. **Documentation Staleness and Broken Markdown Links** *(Severity: Low)*  
   [docs/architecture/ARCHITECTURE.md](file:///c:/Projects/open_flow/docs/architecture/ARCHITECTURE.md) and [docs/CURRENT_STRUCTURE.md](file:///c:/Projects/open_flow/docs/CURRENT_STRUCTURE.md) describe the pre-restructure architecture; [README.md](file:///c:/Projects/open_flow/README.md) contains 6 broken links and omits Redis from its local setup instructions.
