# OpenFlow — Product Polish: Round 2 Closure

> The prior report substituted code-tracing for the visual/manual
> evidence explicitly required. Fix the specific gaps below only — the
> underlying feature work is largely solid, this round is about PROVING
> it, fixing the accent color, and covering what was silently omitted.

---

## Fix 1 — Replace Every "Code-Reference" Evidence With Real Evidence

For each row below, the prior evidence was a file/component name, not
what was asked for. Redo with the actual requested artifact.

- [ ] **1A Color system light/dark** — provide two screenshots of the
      SAME canvas view (with at least 2 nodes in different states: one
      success, one error) — one in light mode, one in dark mode. Not the
      CSS file.
- [ ] **1A State transition motion** — provide a short frame-by-frame
      description (3-4 frames) OR a screen recording of one node going
      idle → running → success in the live app. Not the keyframe
      definitions.
- [ ] **1B Live output preview on card** — screenshot of an actual node
      card, post-run, showing its real result preview text/value
      on the card face. Use a real executed value, not a placeholder.
- [ ] **1B Edge data hover preview** — screenshot of hovering a real
      connected edge in the live app showing the floating tooltip with
      actual JSON/text payload from a real run.
- [ ] **2 Inline field validation** — screenshot of a required field
      left empty, showing the actual red outline + error message, taken
      by triggering it live (leave a field blank, attempt to run, or
      blur the field — whichever triggers validation — then screenshot).
- [ ] **2 Credential indicators** — screenshot of the badge in both
      states: `✓ Configured` (with a real credential set) AND
      `Requires API Key` (with it removed/unset) — both states, not just
      one.
- [ ] **3 Manual multi-node run confirmed** — this must be an ACTUAL
      manual run in the running app, not `templates.test.ts` /
      `engine.test.ts` passing. Open the live app, build or open 2
      different multi-node workflows, click Run on each, and report:
      what ran, in what order, and what the real output was for each
      node. Automated tests passing is separate evidence and does not
      satisfy this item.
- [ ] **3 isValidConnection sync check** — in the live app, attempt one
      valid and one invalid connection. Report the ACTUAL observed
      visual behavior during the drag (does a target handle highlight
      green/red before drop?) and the actual result (did the invalid one
      get blocked on drop?). Comparing badge code to Canvas.tsx code is
      not sufficient — this needs to be watched happening.

---

## Fix 2 — Accent Color Violates Its Own Requirement

The chosen accent (`#4F46E5` / `#6366F1`, Electric Indigo) is Tailwind's
default indigo — this is precisely the generic dev-tool purple/blue the
requirement explicitly said to avoid, and directly contradicts the
"distinct from n8n/Zapier/generic React Flow demos" instruction.

- [ ] Propose 2-3 genuinely different accent color directions (not
      variations of the same indigo/purple hue) — consider something
      that reads as distinctly "AI-native" without being a cliché
      (avoid: generic purple, generic blue, the exact teal/green
      overused by other AI-tool rebrands too).
- [ ] Pick one, implement it across the design token system, and provide
      a before/after screenshot of the same canvas view.
- [ ] Confirm status colors (success/error/warning/running) still pass
      WCAG AA contrast against the NEW accent-influenced palette, not
      just the old one — report actual contrast ratio numbers this time
      (e.g. using a contrast checker), not just the label "WCAG AA
      compliant."

---

## Fix 3 — Node Category Colors (missing entirely, not in the audit table at all)

This requirement was never marked PASS, PARTIAL, or NOT DONE — it was
just absent, which is worse than flagging it honestly.

- [ ] Implement a distinguishable accent color per node category (AI/LLM,
      MCP, Storage, Trigger, Logic/Branch, Notification/Output — group
      existing node types into these categories or your own sensible
      grouping).
- [ ] Apply this to node card headers/icons so a complex multi-node graph
      is visually scannable by category at a glance.
- [ ] Screenshot a graph with at least 4 different category types present
      simultaneously, showing the visual distinction.

---

## Fix 4 — Complete the Type Scale (currently only monospace was addressed)

- [ ] Define and show the FULL type scale: heading size/weight, body
      size/weight, label/metadata size/weight, and monospace — as
      originally required, not just the monospace piece.
- [ ] Screenshot a single screen (e.g. the config panel) showing all
      four text treatments together, labeled.

---

## Fix 5 — Address the Remaining Unmentioned Items

These were in the original prompt's checklists and were not addressed
or reported on at all:

- [ ] **Graceful truncation** of long config values (e.g. a full prompt
      template) on the node card — confirm it truncates cleanly with a
      "..." affordance, not an overflow/cutoff. Screenshot a node with a
      deliberately long config value.
- [ ] **Distinct edge styling** for: never-run edge, edge whose source
      failed, and edge that successfully carried data — these should be
      3 visually different states, not just "execution status lines."
      Screenshot or describe all 3 states on real edges.
- [ ] **Empty-state correctness** for live preview features — confirm a
      node that has NEVER run shows a clean empty/idle state on its card
      and on hover of its edges, not stale, blank-but-styled-as-data, or
      placeholder content that could be mistaken for real output.
      Screenshot a never-run node's card and edge hover state.

---

## Final Required Output

Produce an updated Phase 4 audit table with:
- Every previously-circular evidence entry replaced with real evidence
  (screenshot description or manual-test narrative) per Fix 1.
- Accent color row updated to reflect the new palette, with contrast
  ratios stated numerically.
- A NEW row added: "Node category colors" — with real status and
  evidence, not omitted.
- Type scale row updated to reflect the full scale, not just monospace.
- Three NEW rows added: truncation, edge state styling, empty-state
  correctness — each with real status and evidence.

Do not mark this CLOSED unless every row has genuine visual/manual
evidence — a file or component name is not evidence for any UI-facing
requirement in this list.
