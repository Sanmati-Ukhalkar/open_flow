# OpenFlow — Product Polish: Round 3 Closure

> Round 2 improved evidence quality substantially but introduced a real,
> verifiable bug: a 3-way color collision. Fix that first — it's a
> functional defect, not a nitpick. Then tighten the two remaining
> evidence gaps. Do not touch anything already solid from Round 2.

---

## Fix 1 — Resolve the 3-Way Color Collision (priority, this is a real bug)

Your own Round 2 report states these three values are identical in dark
mode:
- **Running status color:** `#38BDF8`
- **MCP Tools category color:** `#38BDF8`
- **Communication & API category color:** `#38BDF8`

This means: an MCP node or a Communication node will visually look like
it's in the "running" state even when idle, and MCP and Communication
categories are indistinguishable from each other. Both defeat the actual
purpose of these two features.

- [ ] First, confirm this collision is real by checking the actual
      rendered CSS output in the running app (not just re-reading the
      token file) — screenshot or describe two idle nodes, one MCP and
      one Communication category, side by side, to confirm they
      currently look identical or near-identical.
- [ ] Rebalance the palette so that:
      1. NO status color (running/success/error/warning/skipped) matches
         ANY category color, in either light or dark mode.
      2. NO two category colors match or are near-indistinguishable from
         each other, in either mode.
      3. The global accent color (`#0284C7`/`#0EA5E9`) is either excluded
         from the category palette entirely, or clearly distinguished
         from whichever category currently shares its hue family — an
         app-wide accent doubling as a category color undermines the
         "distinct per category" goal.
- [ ] Write out the FULL final palette as a single table (status colors +
      all 6 category colors, light + dark) in one place, so a collision
      like this is visible at a glance next time, instead of scattered
      across separate report sections where it's easy to miss.
- [ ] Screenshot a canvas with at least one node from EVERY category
      (6 nodes) sitting idle simultaneously, confirming all 6 are
      visually distinct from each other AND from the running/success/
      error status colors.

---

## Fix 2 — One Full Per-Node Output Trace From a Real Manual Run

Round 2 confirmed a template ran and topological order was correct, but
didn't show the actual per-node output values, which was explicitly
requested.

- [ ] Pick ONE template (Document Extraction, since it's the flagship).
- [ ] Run it live in the app, once, with real input.
- [ ] Report a literal trace: for EACH node in that graph, in the order
      it executed, state: node name → what input it received → what
      output it actually produced (real values, not placeholders or
      truncated summaries) → final status.
- [ ] This should read like a real execution log a person watched
      happen, not a test-suite pass/fail summary.

---

## Fix 3 — Screenshot Artifacts (only if the tooling genuinely supports it)

Round 2 gave detailed prose descriptions of visual states instead of
attached image files, for items that explicitly asked for a screenshot.

- [ ] Check whether the current environment/tool can actually attach or
      export image files as part of this report. If yes, attach real
      screenshots for: the light/dark canvas comparison, the node card
      live preview, the edge hover tooltip, and the 6-category canvas
      from Fix 1.
- [ ] If image attachment genuinely isn't possible in this workflow,
      state that plainly as a tooling limitation — don't silently
      substitute prose again without flagging why. In that case, prose
      descriptions with exact rendered text/values/class names (as
      already improved in Round 2) are the accepted fallback — just be
      explicit that this is a fallback, not the originally requested
      format.

---

## Final Required Output

- [ ] Updated palette table (Fix 1) with zero collisions, verified
      against itself before reporting PASS.
- [ ] One full per-node execution trace (Fix 2) for a real run.
- [ ] A one-line statement on whether screenshots are attached this round
      or why they still aren't (Fix 3) — no silent omission either way.

Once these three are addressed, this audit can genuinely be marked
CLOSED — everything else from Rounds 1 and 2 has held up under scrutiny
and does not need to be redone.
