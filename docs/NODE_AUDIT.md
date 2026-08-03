# OpenFlow — Node & Connection Audit Checklist

> Purpose: systematically test every existing node, fix its I/O schema,
> and verify the canvas correctly shows/enforces connection types. Work
> through this ONE NODE AT A TIME, in order — do not batch multiple nodes
> in one pass, that's how inconsistencies get missed.

## How to Use This File (with Antigravity / an AI coding agent)

For each node, paste its section into the agent as a task, e.g.:

> "Audit the LLM Prompt node against the checklist in
> NODE_AUDIT.md § LLM Prompt Node. Fix anything that fails. Show me a
> diff before applying changes."

Work node-by-node, commit after each one passes its checklist. Don't move
to the next node until the current one is fully green — partial fixes
across many nodes at once make regressions hard to trace back.

---

## Part A — Universal Checklist (apply to EVERY node)

Run this exact checklist against each node before moving to the
node-specific sections below.

### A1. Schema Correctness
- [ ] `definition.json` has a real `inputSchema` (not empty/omitted) —
      exact shape of what this node expects as input, using JSON Schema
      or an equivalent typed format.
- [ ] `definition.json` has a real `outputSchema` — exact shape of what
      this node produces, matching the `NodeOutput` contract from
      `ARCHITECTURE_V2.md` (`{ data, meta? }`).
- [ ] Schema types are as SPECIFIC as possible — `string` is worse than
      `{ type: "object", properties: { invoice_number: "string", total:
      "number" } }` when the node's real output has that shape. Vague
      schemas defeat the whole point of this audit.
- [ ] Required vs. optional config fields are marked correctly in
      `configFields` — a missing required field should be catchable
      before run, not discovered as a runtime error.

### A2. Connection Behavior on Canvas
- [ ] Hovering this node's INPUT handle shows its expected type clearly.
- [ ] Hovering this node's OUTPUT handle shows its actual output type
      clearly.
- [ ] Dragging a connection FROM an incompatible upstream node's output
      TO this node's input is either blocked or shows a clear warning —
      test this explicitly with at least one deliberately mismatched
      node pair.
- [ ] Dragging a connection FROM a compatible node connects cleanly with
      no warning.
- [ ] If this node accepts multiple input types (e.g. a Transform node
      that's flexible), that flexibility is explicit in the schema
      (e.g. a union type), not just "accepts anything" by omission.

### A3. Execution Correctness
- [ ] Node runs successfully with valid input + valid config — real
      call, real output, verified manually at least once.
- [ ] Node fails GRACEFULLY with invalid/missing required config — clear
      plain-language error (per `AGENTS.md`'s `code` + `message`
      convention), not a raw stack trace or silent hang.
- [ ] Node's actual output at runtime is validated against its own
      `outputSchema` (per v0.4's output validation) — deliberately make
      it return a malformed shape once during testing, confirm it shows
      `success-with-warning`, not a silent pass.
- [ ] Node correctly declares required credentials/secrets (if any) and
      fails clearly (not cryptically) when they're missing.

### A4. Environment & Config
- [ ] All required env vars for this node are listed in `.env.example`
      with a comment explaining what each is for.
- [ ] Node's `README.md` accurately lists setup steps — verify by
      literally following them on a clean checkout.
- [ ] No hardcoded API keys, URLs, or credentials anywhere in `run.ts` —
      search the file explicitly for this.

### A5. Testing
- [ ] `run.test.ts` exists and covers: happy path, missing required
      config, malformed input, external-call failure (mocked) — per the
      Infra track's testing requirements.
- [ ] Tests use mocked external calls, not real API credits.

---

## Part B — Per-Node Sections

Fill in / check off each node you currently have. Add a new section here
for any node not yet listed as you build more.

### LLM Prompt Node
- [ ] Input schema: what does it actually accept? (Currently likely just
      a hardcoded prompt string in config — does it ALSO accept upstream
      data to inject into the prompt template? If so, that's part of the
      input schema and needs to be explicit.)
- [ ] Output schema: raw text string, or does it support structured/JSON
      output mode? If both are possible depending on config, the schema
      needs to reflect that conditionally (or you standardize on one).
- [ ] Model selector: confirm invalid/unavailable model names fail
      clearly, not with a generic API error.
- [ ] Run Part A in full against this node.

### MCP Tool Node
- [ ] Input schema: depends entirely on which tool is selected on the
      connected MCP server — schema should be DYNAMIC based on the
      selected tool's own declared schema (fetched from the MCP server),
      not a static guess. This is likely your biggest gap — verify
      whether tool selection currently surfaces the tool's real
      parameter schema to the user at all.
- [ ] Output schema: same — depends on the tool. Confirm the actual
      response shape from a real tool call and encode it accurately, at
      least for whichever tool you're using in testing.
- [ ] Confirm connection failure to the MCP server itself (server down,
      bad URL) fails clearly, distinct from a tool execution error.
- [ ] Run Part A in full against this node.

### Text Transform Node
- [ ] Input schema: MUST be a union/flexible type since this node
      accepts multiple upstream inputs of potentially different types —
      document this explicitly rather than leaving it untyped.
- [ ] Confirm behavior when one of two expected inputs is missing (e.g.
      upstream branch failed/skipped) — should this node also skip, or
      run with partial data? Decide explicitly and document in its
      README, don't leave it as undefined behavior.
- [ ] Output schema: string (formatted/templated text) — confirm this is
      actually what's produced, not sometimes an object.
- [ ] Run Part A in full against this node.

### SQLite Storage Node
- [ ] Input schema: what shape of data does it actually accept for
      insertion? (Object with arbitrary keys mapped to columns? A fixed
      shape?) Make this explicit.
- [ ] Output schema: confirm it's consistently `{ success, rowId }` (as
      shown in your working v0.3 screenshot) — encode that exact shape.
- [ ] Confirm behavior when input data doesn't match the target table's
      existing columns — clear error, not a silent partial insert.
- [ ] Run Part A in full against this node.

### HTTP Webhook Node
- [ ] Input schema: what gets sent in the POST body — raw upstream data,
      or a configured template? Make explicit.
- [ ] Output schema: response status/body from the webhook call.
- [ ] Confirm timeout and non-2xx response handling both produce clear,
      distinct error messages.
- [ ] Run Part A in full against this node.

<!-- Add a new ### section here for each additional node as you build
     them (OCR, Email, Code Execution, RAG, Branch, Loop, etc.) — copy
     the structure above: input schema check, output schema check,
     node-specific edge cases, then "Run Part A in full." -->

---

## Part C — Canvas-Level Verification (after all nodes pass Part A/B)

Once every individual node's schema is correct, verify the CONNECTIONS
between them work as a system, not just in isolation.

- [ ] Build a real multi-node workflow (e.g. LLM → Transform → Storage)
      and confirm every connection point shows correct types when
      hovered, BEFORE running anything.
- [ ] Deliberately attempt an invalid connection (e.g. connect an HTTP
      Webhook node's response output directly into an SQLite node
      expecting a specific object shape it doesn't match) — confirm the
      canvas warns or blocks this, rather than allowing a connection
      that will only fail at runtime.
- [ ] Confirm that once connected, the DOWNSTREAM node's config panel
      can reference the upstream node's actual output fields (e.g. a
      dropdown/autocomplete showing available fields from the connected
      source) rather than requiring the user to guess field names by
      memory. This is the single biggest usability win available here —
      prioritize it if nothing else in Part C gets built immediately.
- [ ] Re-run the FULL existing demo workflows (invoice pipeline, any
      others you've built) end to end one more time after all fixes —
      confirm nothing regressed.

## Definition of Done (Whole Audit)
- [ ] Every existing node passes Part A in full.
- [ ] Every node-specific concern in Part B is resolved.
- [ ] Part C's canvas-level connection verification passes.
- [ ] At least one real multi-node workflow runs correctly end-to-end
      after all fixes, with type hints visible at every connection point
      before running.
