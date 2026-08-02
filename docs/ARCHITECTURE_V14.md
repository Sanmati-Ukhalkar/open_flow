# OpenFlow — v0.14 Architecture: Core Node Expansion Pack

> Precondition: current engine (parallel branches, multi-input, retry —
> v0.3/v0.4 territory) confirmed solid. Read the "Important Distinction"
> section below before starting — two of these eight items are NOT
> ordinary nodes and will require real engine changes, not just a new
> `definition.json` + `run.ts`.

## Important Distinction — Read First

Most nodes so far (LLM, MCP, Storage, HTTP, Transform) are **data nodes**:
input → process → output, no effect on the shape of the graph itself.

Two items on this list are different:

- **Conditional/Branch node** changes *which path the graph takes* at
  runtime — the engine currently assumes every edge from a completed node
  fires. A branch node needs the engine to support "only follow edge A OR
  edge B based on a condition," which is a real change to the DAG
  execution logic, not just a new node folder.
- **Loop/Iterator node** changes *how many times a sub-chain runs* — the
  engine currently assumes each node runs exactly once per workflow run.
  A loop needs the engine to support re-executing a subgraph N times
  (once per list item) and collecting N results back into one output.

Build these two **last**, after the six straightforward data nodes,
specifically because they require engine work the others don't. Don't let
their complexity block shipping the easier five.

---

## Recommended Build Order (by dependency + complexity, not preference)

| Order | Node | Why this position |
|---|---|---|
| 1 | **Email Node** | Simplest — same shape as the existing HTTP Webhook node (SMTP/Gmail API call, no engine changes). Good warm-up. |
| 2 | **Vision/OCR Node** | Standard data node (image in → text out). Closes the original invoice-pipeline gap. No engine changes. |
| 3 | **File Upload Trigger Node** | New trigger *type* but reuses the trigger infrastructure pattern from Cron/Webhook triggers (v0.7) — watches a folder/bucket, fires the same way a webhook does. |
| 4 | **Vector DB / RAG Node** | Standalone data node, but higher setup complexity (needs an embeddings provider + vector store choice). No engine changes, just more moving parts internally. |
| 5 | **Code Execution Node** | Standard data node shape, BUT security-critical (arbitrary user code) — should land only after or alongside the sandboxing work from v0.9. Don't ship this node without sandbox isolation; it's the highest-risk node type in the whole project. |
| 6 | **Schedule-aware Cron UI** | Pure frontend/UX improvement on top of the existing Cron Trigger node (v0.7) — no new backend logic, just a friendlier config UI. |
| 7 | **Conditional/Branch Node** | Requires engine change: conditional edge-following. Build after the above are stable so engine changes aren't competing with node-building churn. |
| 8 | **Loop/Iterator Node** | Requires engine change: subgraph repetition + result collection. Hardest item on this list — build last, and consider it worth its own dedicated version rather than squeezing it in. |

---

## 1. Email Node
- `definition.json` + `run.ts`, same pattern as HTTP Webhook.
- Config: provider (SMTP generic / Gmail API), to/from/subject/body
  fields, supports templated fields (reuse Text Transform's templating
  approach so syntax is consistent across nodes).
- Credentials: SMTP creds or Gmail OAuth token, stored via the existing
  per-user/per-org credentials system (v0.5/v0.11).
- **Done when:** a real email is sent and received, with a templated
  body pulling from an upstream node's output.

## 2. Vision/OCR Node
- Input: image or PDF (file reference/URL/base64).
- Uses a real OCR provider or library (e.g. Tesseract for local, or a
  cloud OCR API for higher accuracy — decide based on accuracy needs vs.
  wanting to stay dependency-light; document the tradeoff in the node's
  README).
- Output: extracted text (+ optionally bounding box data, but plain text
  output is enough for v0.14).
- **Done when:** a real scanned invoice image produces correct extracted
  text, feeding into an LLM node downstream — this finally completes the
  original invoice-pipeline demo end-to-end with real OCR.

## 3. File Upload Trigger Node
- Watches a configured location: local folder (self-hosted) or cloud
  bucket (S3-compatible) — support at least one to start, local folder
  is simplest for v0.14.
- On new file detected, triggers the workflow the same way a Webhook
  Trigger (v0.7) does — reuse that trigger-firing code path, don't
  duplicate it.
- **Done when:** dropping a file into a watched folder actually starts a
  real workflow run, visible in run history.

## 4. Vector DB / RAG Node(s)
- Likely needs to be **two node types**, not one:
  - **Embed & Store node** — takes text, generates embeddings, stores in
    a vector store.
  - **Retrieve node** — takes a query, returns top-K similar chunks from
    the vector store.
- Vector store choice: start with something embeddable/self-hosted
  (e.g. a local vector index) to match the "zero setup" philosophy used
  for SQLite — avoid requiring an external hosted vector DB for the
  default path, keep that as an advanced config option.
- **Done when:** a real document can be embedded/stored, then a query
  node retrieves genuinely relevant chunks — test with a real
  multi-document set, not a single trivial example.

## 5. Code Execution Node
- Input: user-provided JS (or Python) snippet + upstream data as
  available variables.
- **Hard requirement:** must run inside the sandboxed execution
  environment from `ARCHITECTURE_V9.md` — this is the single riskiest
  node type in the entire project (arbitrary user code, by design). Do
  not ship an unsandboxed version "temporarily" — that's the kind of
  shortcut that becomes a real vulnerability once workflows are shared
  or deployed publicly (v0.6).
- Resource limits (timeout, memory) enforced same as any sandboxed node.
- **Done when:** a snippet that intentionally tries to escape the sandbox
  (file access, network without declared capability) fails safely, same
  bar as the v0.9 sandbox validation checklist.

## 6. Schedule-aware Cron UI
- Visual builder: dropdowns/pickers for "every X minutes/hours," "daily
  at TIME," "weekly on DAY at TIME," with an "advanced/raw cron" toggle
  for power users.
- Purely a frontend layer generating a standard cron expression under
  the hood — the existing Cron Trigger node (v0.7) doesn't change.
- **Done when:** a non-technical user can set up "every day at 9am"
  without knowing cron syntax exists, while power users can still drop
  into raw cron expressions.

## 7. Conditional/Branch Node
- Config: a condition expression against upstream data (e.g. "if
  `{{node.output.status}} == 'success'`") and two labeled outgoing
  edges (`true` / `false`).
- **Engine change required:** execution logic must evaluate the
  condition after the branch node runs, then only mark the matching
  edge's downstream node(s) as ready to run — the other path's nodes get
  a new state, distinct from `error` or `skipped-due-to-upstream-failure`
  (e.g. `skipped-by-branch`), since this is an intentional path-not-taken,
  not a failure.
- **Done when:** a workflow with a branch node correctly runs only the
  matching path, and the canvas clearly shows the untaken path as
  intentionally skipped (not styled like an error).

## 8. Loop/Iterator Node
- Config: an upstream list input + a designated sub-chain (a subgraph of
  nodes to repeat) + how to collect results (e.g. array of each
  iteration's output).
- **Engine change required:** this is the biggest lift in the list.
  Needs: subgraph identification (which nodes belong to "inside the
  loop"), re-execution of that subgraph once per list item (respecting
  existing parallel/retry logic per iteration), and result aggregation
  back into a single array output for whatever comes after the loop.
- Consider scoping v0.14's version of this down: cap max iterations
  (e.g. 50) to avoid runaway cost on LLM-heavy loops, and make cost/time
  estimates visible before running (ties into v0.13's cost tracking, if
  that's shipped by this point).
- **Done when:** a real list (e.g. 5 PDF files) processed through a loop
  containing an OCR + LLM sub-chain produces 5 correct, correctly
  ordered results — verify parallel iterations don't cross-contaminate
  each other's data.

---

## What v0.14 Explicitly Does NOT Include
- More node types beyond these 8 — resist adding "just one more" mid-flight.
- UI/UX for editing the loop subgraph visually as a nested canvas
  (v0.14 can start with "select existing nodes to include in the loop"
  rather than a fully nested sub-canvas editor — that's a reasonable
  v0.15+ polish item if the flat approach proves confusing).
- Any change to auth, deployment, or org model — this version is scoped
  purely to new node types + the two engine changes they require.

## Definition of Done for v0.14 (overall)
- [ ] All 6 straightforward nodes (Email, OCR, File Trigger, RAG x2,
      Cron UI) shipped and individually tested per their own criteria
      above.
- [ ] Code Execution node ships only alongside confirmed sandbox
      isolation — never before it.
- [ ] Branch node's untaken-path visual state is distinct from both
      `error` and normal `skipped` (upstream failure) — three visually
      distinct states total on the canvas by the end of this version.
- [ ] Loop node correctly handles at least: an empty list (0 iterations,
      no error), a single-item list, and a multi-item list with one
      deliberately-failing iteration (confirm it doesn't halt the other
      iterations, consistent with the partial-success philosophy from
      `ARCHITECTURE_V4.md`).
- [ ] The original invoice-processing demo workflow (PDF → OCR → LLM →
      Storage → Notification) finally runs with a **real** OCR node,
      closing the loop on the project's original motivating example.
