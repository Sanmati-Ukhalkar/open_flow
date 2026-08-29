# OpenFlow — Audit Closure: Remaining Fixes (Round 2)

> The prior closure report was mostly solid but is NOT fully closed. Four
> specific issues remain. Fix these exactly, with the exact evidence
> requested — do not re-summarize what's already done in the prior
> report, only address the gaps below.

---

## Fix 1 — Part 7: Actual Manual Canvas Verification (highest priority)

The prior report labeled this "Observed behavior (code-verified)" — that
is tracing code logic, NOT manually testing in the running app. This is
the exact gap this whole closure round exists to eliminate. Redo it for
real.

- [ ] Start the actual running app (`npm run dev`).
- [ ] On the live canvas, drag a connection from SQLite Storage node's
      output handle to LLM Prompt node's input handle.
- [ ] Report EXACTLY what happens on screen: does the edge line refuse
      to attach and snap back? Is there a color change, cursor change,
      or toast/warning message? Describe the actual visual behavior you
      see, not what the code implies should happen.
- [ ] Repeat for Cron Trigger → LLM Prompt.
- [ ] Repeat for one additional adversarial pair not yet tested (agent's
      choice — pick two nodes with genuinely incompatible schemas).
- [ ] If any of these do NOT block as expected when manually tested
      (even though the code appeared correct), fix the actual bug — this
      is exactly the kind of gap that code-tracing misses (e.g. event
      handler not wired correctly, condition inverted, etc.).
- [ ] Provide a screenshot OR a precise frame-by-frame text description
      of the drag-and-drop attempt and its result for each of the 3
      pairs above.

---

## Fix 2 — Resolve the MCP Tool Schema Contradiction

The prior report said "Schema type: STATIC" while describing a fully
dynamic, per-tool-fetched schema — these are contradictory. Determine
and state the actual truth, then fix if needed.

- [ ] Check specifically: does `isValidConnection` in `Canvas.tsx` use
      the STATIC schema from `definition.json`, or does it use the
      DYNAMIC schema fetched from the live MCP server for the currently
      selected tool?
- [ ] If it uses the static fallback: this is a real gap — the
      connection-time type check is validating against a schema that
      doesn't reflect the actual selected tool, which defeats the point
      of dynamic schema resolution. Fix `isValidConnection` to use the
      dynamically fetched schema for MCP Tool nodes specifically.
- [ ] If it already uses the dynamic schema: correct the audit report's
      "STATIC" label to "DYNAMIC" and state clearly why the earlier
      wording was wrong.
- [ ] Either way, state definitively, in one sentence: "MCP Tool node's
      connection-time validation uses [STATIC / DYNAMIC] schema,
      verified by reading [exact file/line]."

---

## Fix 3 — Autocomplete Chips: Cover the Email Node (or explicitly rule it out)

Chips were implemented for LLM Prompt, HTTP Webhook, and Text Transform.
Email was not addressed.

- [ ] Check the Email node's config fields (subject, body, to, from,
      etc.) — do any of them accept templated references to upstream
      node output (e.g. `{{node-1.data.text}}` inside the email body)?
- [ ] If YES: implement the same reference-chip UI used for the other
      3 nodes, applied to Email's templated fields (likely subject and
      body).
- [ ] If NO (Email's fields are not templated and never accept upstream
      variable references): state this explicitly and explain why —
      e.g. "Email fields are static config only, not templated, so chip
      insertion doesn't apply." Do not leave this unresolved either way.
- [ ] Confirm no other existing node has templated fields that were also
      missed — do one more pass across all 9 nodes' `configFields` to
      check for any other templated-but-uncovered field.

---

## Fix 4 — Resolve the Tooltip Description Contradiction

The prior report described vision-ocr's tooltip as "no formatting" but
then described SQLite's nested tooltip rendering with a `→` arrow and
structure — inconsistent description.

- [ ] In the actual running app, hover the output handle of the
      vision-ocr node and copy the EXACT literal tooltip text as it
      renders (verbatim, including line breaks or lack thereof).
- [ ] In the actual running app, hover the output handle of the SQLite
      Storage node and copy the EXACT literal tooltip text as it
      renders (verbatim).
- [ ] Compare the two — are they actually rendered with the same
      formatting logic or different? Report the real answer, don't
      assume consistency.
- [ ] Make a final call: if native `title` tooltips are legible for all
      current schema depths (1-2 levels, as claimed), state that as
      confirmed with the verbatim examples above as proof. If any
      current node's tooltip is actually illegible or oddly formatted
      when checked for real, replace it with a proper popover component
      (Radix or Floating UI) for that node type at minimum.

---

## Minor Cleanup — Branch Node Test Labeling

- [ ] The "Malformed Input" column for Branch node was marked ✅ but the
      underlying test was "false edge taken" — a happy-path branch
      outcome, not a malformed-input case. Either add a genuine
      malformed-input test (e.g. condition field references a
      non-existent upstream field, or the condition expression itself is
      invalid syntax) or correctly relabel the column as N/A with a
      one-line reason.

---

## Final Required Output

After completing all 4 fixes + the minor cleanup, provide:

1. An updated version of the Part 7 adversarial test results, with real
   manual observations (not code-tracing) for all 3 pairs.
2. One definitive sentence resolving the MCP static/dynamic question.
3. A clear yes/no + implementation status on Email node autocomplete.
4. The verbatim tooltip text for vision-ocr and SQLite Storage, with a
   final verdict on whether native tooltips remain acceptable.
5. Updated Branch node test table entry.

Do not mark the audit CLOSED again until all 5 of the above are
genuinely resolved with real evidence — not inferred from code reading.
