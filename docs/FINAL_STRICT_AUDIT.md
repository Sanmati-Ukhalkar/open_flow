# OpenFlow — Final Strict Audit (Consolidated, Browser-Verified)

> This is the master audit. It consolidates everything from
> `NODE_AUDIT.md`, `AUDIT_CLOSURE_PROMPT.md`, and the 3 product-polish
> rounds into ONE strict, evidence-only checklist — meant to be executed
> via `/agent` (the real browser agent) using the module structure from
> `BROWSER_AGENT_TEST_PLAN.md`. Nothing here is satisfied by reading
> code, tracing logic, or generating illustrative content. Everything is
> satisfied only by a real, observed action in the running app.

---

## Zero-Tolerance Rules (apply to every single item below)

1. **No code-tracing as evidence.** "The function exists and looks
   correct" is not evidence. Only an observed browser action counts.
2. **No generated images.** Only real captured browser screenshots.
   If a screenshot cannot be captured, the item is `COULD NOT VERIFY`,
   never filled in with a described/imagined image.
3. **No invented timings or logs.** Network/console data must be read
   directly from browser devtools at the moment of the real action.
4. **No rounding PARTIAL up to PASS.** If any sub-condition of an item
   fails, the item is PARTIAL or FAIL, with the specific failing part
   named.
5. **No silent omission.** Every item below must appear in the final
   report with a status — absence of a row is treated as FAIL, not
   as "not applicable" (unless explicitly marked N/A with a stated
   reason).
6. **Cross-check before reporting PASS.** For any item involving color,
   compare the newly reported value against every other value in the
   same category (status colors vs. category colors vs. accent) before
   marking it collision-free — this exact failure happened twice already
   in this project.

---

## Section A — Node Correctness (real execution, real schema check)

For EVERY existing node type:
- [ ] A1: Real run with valid input/config → real output observed in
      Execution Output panel (verbatim captured, not summarized).
- [ ] A2: Real run with a required field left empty → real validation
      error observed (or `NO VALIDATION` reported honestly if none
      appears).
- [ ] A3: Config panel's "Expects"/"Produces" sections checked against
      what the node ACTUALLY received/produced in a real run — do the
      displayed schema and the real data match, or does the schema lie?
- [ ] A4: Credential-required nodes show a real credential badge state,
      observed with devtools/UI, not assumed from config.
- [ ] A5: Node's output — after a real run — checked against its
      declared output schema. If deliberately malformed (e.g. force a
      bad LLM response), does the UI actually show a distinct
      `success-with-warning` state, observed for real?

## Section B — Connection System (real drag-and-drop only)

- [ ] B1: One genuinely incompatible node pair — real drag attempted,
      real outcome (blocked/allowed) observed and screenshotted.
- [ ] B2: One genuinely compatible node pair — real drag attempted,
      real successful connection observed and screenshotted.
- [ ] B3: Handle type indicators — read the actual rendered icon/label
      on at least 3 different node types' handles, confirm they're
      accurate to that node's real schema.
- [ ] B4: Edge hover — real hover on a real data-carrying edge from an
      actual completed run, exact tooltip content captured verbatim.
- [ ] B5: Edge hover on a never-run edge — confirm real empty/idle
      state, not stale or placeholder-as-data content.

## Section C — Color System (the section that has failed twice — be
exhaustive here)

- [ ] C1: Read the ACTUAL computed CSS value (via devtools, not the
      token file) for every status color (running/success/error/
      warning/skipped), light AND dark mode — 10 real values total.
- [ ] C2: Read the ACTUAL computed CSS value for every node category
      color, light AND dark mode.
- [ ] C3: Read the ACTUAL computed CSS value for the global accent,
      light AND dark mode.
- [ ] C4: Build a single table of ALL values from C1-C3 side by side.
      Manually compare every value against every other value in the
      same theme mode. List any exact matches or near-matches
      (visually indistinguishable at normal viewing size) explicitly.
- [ ] C5: Screenshot one canvas with at least one idle node from every
      category present simultaneously, in both light and dark mode (2
      screenshots total) — real visual confirmation, not just the hex
      table.
- [ ] C6: For each status/category color pair against its background,
      report an actual contrast ratio using a real contrast-checking
      method (browser extension, devtools accessibility panel, or
      equivalent) — not a claimed "WCAG AA compliant" label without a
      number.

## Section D — Execution & Timing Integrity

- [ ] D1: Real multi-node run (3+ nodes) with the Network tab open
      BEFORE clicking run.
- [ ] D2: Report every real network request fired during that run:
      endpoint, method, status, and ACTUAL duration as shown by the
      browser — flag if any node's real duration seems suspiciously
      fast for what it claims to do (e.g. an LLM call under 50ms should
      be treated as suspicious and double-checked, not reported as-is).
- [ ] D3: Cross-check canvas visual node states against the Execution
      Output panel's reported statuses for the same run — report any
      mismatch found.

## Section E — Layout, Typography, Motion

- [ ] E1: Screenshot showing heading, body, label, and monospace text
      together on one real screen, confirm 4 visually distinct
      treatments are actually rendered (not just defined in CSS).
- [ ] E2: Real observation (screenshot sequence or recording) of one
      node's idle → running → success transition, confirm actual
      motion occurs, not an instant snap.
- [ ] E3: Screenshot a node with a deliberately long config value,
      confirm real truncation behavior (not overflow/cutoff).
- [ ] E4: Screenshot the 3 distinct edge visual states (never-run,
      success, failed/skipped) together if achievable in one graph, or
      as 3 separate real screenshots.

## Section F — Cross-Cutting Sanity Checks

- [ ] F1: Reload the app after all testing — confirm no state corruption
      (theme, last workflow, etc.) from the testing session itself.
- [ ] F2: Check browser console for any errors/warnings thrown during
      the full testing session — report them verbatim if present, don't
      omit console noise even if the UI appeared to work.
- [ ] F3: Re-run the existing automated test suite one final time,
      report the real pass/fail count — this supplements, not replaces,
      everything above.

---

## Required Final Report Structure

Produce `FINAL_STRICT_AUDIT_RESULTS.md` with:

1. One row per item above (A1-F3, ~30 items) in a single master table:
   `Item | Status (PASS/PARTIAL/FAIL/COULD NOT VERIFY/N/A) | Evidence`.
2. A dedicated "Color Collision Table" (from C4) shown in full, not
   summarized.
3. A dedicated "Suspicious Timing Flags" list (from D2) — anything that
   looked too fast to be real, called out explicitly even if it turned
   out fine on closer look.
4. An honest overall count: X PASS / X PARTIAL / X FAIL / X COULD NOT
   VERIFY out of ~30 total items.
5. A closing statement: is this build actually ready to be called
   "polished and correct," or does it still have open issues — answered
   plainly, not diplomatically softened.

This audit is only truly closed when every item has real, observed
evidence and the color collision table shows zero matches across every
theme mode.
