# OpenFlow — Audit Closure & Verification Prompt

> Use this as a direct prompt to Antigravity (or any AI coding agent).
> Paste sections one at a time, in order. Do NOT accept a "done" claim
> for any item without the exact evidence requested — a summary claim
> without proof is not acceptable for any checkbox below.

---

## Instructions for the Agent (paste this framing first)

> You are closing gaps from a prior node/connection audit. For every item
> below, do not just say "done" — show the exact evidence requested
> (file diff, test output, or a described manual verification with
> actual observed values). If something is already partially done,
> state precisely what's missing, don't round up to "complete." If you
> find a genuine ambiguity (e.g. a design decision not yet made), stop
> and ask instead of guessing.

---

## Part 1 — Full Node Coverage (fix the incomplete audit first)

The prior audit covered LLM Prompt, Branch, HTTP Webhook, Trigger nodes,
and Email. **MCP Tool, Text Transform, and SQLite Storage were not
covered.** Do these three now, applying the exact same standard:

### MCP Tool Node
- [ ] Confirm whether `inputSchema`/`outputSchema` are currently STATIC
      or DYNAMIC (fetched from the connected MCP server based on
      selected tool). State which one it currently is.
- [ ] If static: this is the priority fix. Implement dynamic schema
      resolution — when a tool is selected in config, fetch that tool's
      real parameter/response schema from the MCP server and use it for
      both the config panel AND the connection-type-checking logic.
- [ ] Show the exact schema resolved for one real tool call as evidence
      (not a hypothetical example).
- [ ] Confirm MCP server connection failure produces a distinct error
      from a tool execution failure (different `code` values).

### Text Transform Node
- [ ] Confirm input schema explicitly supports multiple/flexible
      upstream types (union type or equivalent) rather than being
      untyped/`any`.
- [ ] State explicitly what happens when one of two expected inputs is
      missing (upstream skipped/failed) — does Transform also skip, or
      run with partial data? This must be a documented decision, not
      unspecified behavior. Update the node's README with the decision.
- [ ] Confirm output schema (string) is accurate against real output.

### SQLite Storage Node
- [ ] Confirm input schema explicitly documents what shape of data is
      accepted for insertion (arbitrary object → columns, or fixed
      shape).
- [ ] Confirm output schema matches `{ success, rowId }` exactly.
- [ ] Test: send input data with a field that doesn't match the target
      table's columns. Report the actual observed behavior (error?
      silent partial insert? something else?) and fix if it's not a
      clear error.

---

## Part 2 — Fix the Branch Node Dual-Return Issue

The current implementation returns BOTH `{ data: { takenEdge, result } }`
AND root-level `takenEdge, result` "for backwards compatibility." This is
schema drift — two sources of truth for the same value.

- [ ] Pick ONE shape: `{ data: { takenEdge, result } }` (matches the
      standard contract used by every other node).
- [ ] Update the scheduler to read from `data.takenEdge` /
      `data.result` instead of the root-level keys.
- [ ] Remove the root-level duplicate fields entirely.
- [ ] Re-run branch-node-specific tests, confirm nothing broke from
      removing the root-level keys — show test output.

---

## Part 3 — Runtime Output Validation (not just connection-time checking)

Connection-time schema checking (does source output type match target
input type) and RUNTIME output validation (does what a node actually
returns during execution match its declared outputSchema) are two
different enforcement points. Confirm both exist, separately.

- [ ] For each node, confirm: after execution completes, is the actual
      returned data checked against `outputSchema`? State yes/no per
      node — do not assume connection-time checking covers this.
- [ ] Pick one node capable of producing malformed output at runtime
      (e.g. LLM Prompt node configured for structured/JSON output that
      the model fails to follow correctly) and deliberately trigger
      malformed output.
- [ ] Report the OBSERVED result: does the canvas show
      `success-with-warning` (distinct state from plain success/error,
      per the v0.4 failure-handling model), or does bad data silently
      pass downstream? If the latter, implement the missing check.

---

## Part 4 — Config Panel Field Autocomplete (the highest-priority missing item)

This was flagged as the single biggest usability win and is not yet
implemented.

- [ ] When a downstream node is connected to an upstream node, its
      config panel fields that accept upstream data (e.g. a template
      string field) should show/autocomplete the ACTUAL field names
      available from the connected upstream node's output schema — not
      require the user to guess or memorize field names.
- [ ] Example to verify concretely: connect LLM Prompt → Text Transform.
      Open Text Transform's config panel. Confirm the template field
      shows selectable/insertable references to the LLM node's real
      output fields (e.g. `{{llm-node-1.data.text}}`), not a blank text
      box requiring manual typing of the exact correct path.
- [ ] If this requires meaningful new UI work, scope it honestly — don't
      claim it's done with just a tooltip. A tooltip showing the type is
      NOT the same as an autocomplete/insertable field reference.

---

## Part 5 — Tooltip Quality Check

Native HTML `title` tooltips were used for hover type hints. Verify
whether this is sufficient or needs upgrading.

- [ ] For a node with a NESTED object output schema (e.g.
      `{ invoice_number: string, total: number, vendor: string }`),
      hover the connection handle and report exactly what text is shown.
- [ ] If the native tooltip renders the nested shape illegibly (all on
      one line, no formatting, delayed appearance), replace it with a
      custom tooltip/popover component that can render structured type
      information clearly. Show a screenshot or exact rendered output
      as evidence either way.

---

## Part 6 — Real Per-Node Test Coverage Breakdown

"46 unit tests passed" does not indicate coverage. Produce an honest
breakdown.

- [ ] For EVERY node (all 8+, including the 3 from Part 1), list which
      of these 4 test cases exist in its `run.test.ts`:
      1. Happy path (valid input + config)
      2. Missing/invalid required config
      3. Malformed input
      4. Mocked external-call failure
- [ ] Present this as a literal table: node name × 4 columns × pass/fail/
      missing. Do not summarize as "tests passing" without this table.
- [ ] For any node missing any of the 4, add the missing test(s) now.

---

## Part 7 — Adversarial Connection Test (manual, in the running app)

Automated `isValidConnection` unit tests are not sufficient proof this
works — verify it manually in the actual running canvas.

- [ ] In the live app, attempt to connect SQLite Storage node's output
      directly into an HTTP Webhook or LLM Prompt node's input (types
      should be incompatible).
- [ ] Report the OBSERVED behavior: is the connection visually blocked,
      does it show a warning, or does it silently allow the connection?
      Include exact UI behavior, not just "the check exists in code."
- [ ] Attempt at least one more adversarial pair (agent's choice, but
      state which pair and why it's expected to be incompatible).

---

## Part 8 — Docs & Env Accuracy (was not covered in the prior audit)

- [ ] For each node touched in this or the prior audit, confirm
      `.env.example` lists every required env var with an explanatory
      comment — check literally, don't assume it's still accurate.
- [ ] For each node's own `README.md`, confirm setup steps are followed
      literally on paper (walk through them line by line) and flag any
      step that's outdated, missing, or unclear given current code.

---

## Final Report Format Required

At the end, produce a single summary table:

| Node | Schema Fixed | Runtime Validation | Test Coverage (4/4) | Docs Accurate |
|---|---|---|---|---|
| LLM Prompt | | | | |
| MCP Tool | | | | |
| Text Transform | | | | |
| SQLite Storage | | | | |
| HTTP Webhook | | | | |
| Branch | | | | |
| Cron Trigger | | | | |
| Webhook Trigger | | | | |
| Email | | | | |

Plus a separate line confirming: **Config panel field autocomplete —
implemented / not implemented / partially implemented (state exactly
what's missing).**

Do not mark this audit closed until every cell in the table is genuinely
green and the autocomplete item is either implemented or explicitly
deferred with a stated reason.
