# OpenFlow — Browser Agent Queue, Round 2 (Remaining Items Only)

> The first real pass (FINAL_MASTER_AUDIT_REPORT.md) was genuinely
> credible — real rgba() reads, a real 3.1s API call, and an honestly
> reported PARTIAL. Don't re-test anything it already covered (Steps
> 0-15 there). This queue covers ONLY what's still missing. Same rule as
> before: paste ONE block at a time, review before sending the next.

---

## R2-Step 1 — Trigger a Real Error State (needed for the missing error color)

```
/browser

On the OpenFlow canvas, configure an LLM Prompt node with an invalid
setting that will genuinely fail at runtime (e.g. select a model name
that doesn't exist, or if you have a way to temporarily use an invalid
API key, do that instead). Click Run.

Report back:
1. Real screenshot of the node in its error state.
2. The ACTUAL computed border/text color read via DevTools
   getComputedStyle on the errored node — not a value from memory.
3. The real error message text shown to the user.
4. Restore the node to a working config afterward so it doesn't stay
   broken.

Do not test anything else. Just this, and report.
```

---

## R2-Step 2 — Global Accent Color (isolated read)

```
/browser

Find one UI element that uses ONLY the app's global accent color, not a
node category color — e.g. the primary "Run Workflow" button, or the
active/selected state of a UI control that isn't a canvas node.

Report back:
1. Real screenshot of that element.
2. The ACTUAL computed color value via DevTools getComputedStyle, for
   both light and dark mode (toggle theme between reads).

Do not test anything else. Just this, and report.
```

---

## R2-Step 3 — Numeric Contrast Ratios (real numbers, not ">4.5:1")

```
/browser

Using DevTools' built-in accessibility/contrast checker (in the Elements
panel, inspecting a color value usually shows a contrast ratio directly,
or use the Lighthouse/Accessibility panel), get the ACTUAL numeric
contrast ratio for these pairs, in both light and dark mode:
1. Success status color against its background.
2. Error status color against its background (use the error state from
   R2-Step 1).
3. One category badge color (your choice) against its background.

Report the exact numeric ratios shown by the tool (e.g. "5.2:1"), not an
approximation. If DevTools doesn't show this directly, say so and report
COULD NOT VERIFY rather than estimating.

Do not test anything else. Just this, and report.
```

---

## R2-Step 4 — Credential Badge, Configured State

```
/browser

Find a node that currently shows a "Needs configuration" or similar
missing-credential badge. If possible through the UI (a settings/
credentials page), actually configure that credential for real. If you
cannot do this through the UI without a real credential you don't have,
say so plainly.

Report back:
1. Real screenshot of the badge BEFORE (unconfigured state — reuse
   what's already confirmed if needed).
2. Real screenshot of the badge AFTER, showing the "configured" state,
   if you were able to actually set a real credential.
3. If you could not test this state change, report COULD NOT VERIFY and
   explain exactly what blocked it (e.g. "no UI exists to add
   credentials" or "I don't have a real SMTP credential to enter").

Do not test anything else. Just this, and report.
```

---

## R2-Step 5 — Handle Type Indicators (accuracy check)

```
/browser

Place 3 different node types on canvas (pick ones with different
input/output types — e.g. one that outputs text, one that outputs an
object, one that's a trigger with no input).

Report back:
1. Real screenshot of each node's handles, zoomed in enough to read any
   type indicator icon/label on them.
2. For each, state what the indicator actually shows and whether it
   matches what that node's real schema should be (text vs object vs
   trigger, etc.) — a real observed cross-check, not assumed.

Do not test anything else. Just this, and report.
```

---

## R2-Step 6 — Malformed Output Warning State (A5)

```
/browser

Find a way to make a node return output that doesn't match its declared
schema — e.g. if the LLM node has a "structured/JSON output" mode,
configure a prompt that's likely to make the model return something
that ISN'T valid JSON, then run it.

Report back:
1. Real screenshot of the node's resulting visual state.
2. State plainly: did it show a distinct "success-with-warning" state
   (different from plain success or plain error), or did it just show
   normal success/error with no distinction? Report exactly what you
   observed, even if the feature doesn't actually exist.

If you cannot realistically force malformed output, report COULD NOT
VERIFY and explain why.

Do not test anything else. Just this, and report.
```

---

## R2-Step 7 — Undo/Redo and Delete

```
/browser

On canvas, move a node to a new position. Press Ctrl+Z (or Cmd+Z).

Report back:
1. Did the node actually move back to its original position? Real
   screenshot before undo, and after.
2. Press Ctrl+Shift+Z (or Cmd+Shift+Z) for redo — did it move forward
   again? Report the result.
3. Select a node and press Delete/Backspace — was it removed, along
   with any connected edges? Real screenshot of the result.
4. For any of these that don't work or don't exist, report NOT
   IMPLEMENTED plainly rather than a vague description.

Do not test anything else. Just this, and report.
```

---

## R2-Step 8 — Minimap (if present)

```
/browser

Build a graph with at least 5 nodes spread out on canvas. Look for a
minimap element (usually bottom-right or bottom-left corner).

Report back:
1. Real screenshot showing the minimap, if one exists.
2. Try clicking a spot on the minimap — does the main canvas view
   actually navigate there? Report the real observed result.
3. If no minimap exists at all, report NOT IMPLEMENTED.

Do not test anything else. Just this, and report.
```

---

## R2-Step 9 — Docs / Help Modal

```
/browser

Open a node's config panel. Look for a "?" or help/docs icon/button.

Report back:
1. Real screenshot of the config panel showing this element (or its
   absence).
2. If present, click it — real screenshot of whatever opens, and report
   what content is actually shown (node overview, schema, credentials,
   etc. — or if it's empty/broken).
3. If it doesn't exist, report NOT IMPLEMENTED.

Do not test anything else. Just this, and report.
```

---

## R2-Step 10 — Mobile / Responsive View

```
/browser

Resize the browser window (or use device emulation in DevTools) down to
a phone-sized width (around 375px wide).

Report back:
1. Real screenshot of the resulting layout.
2. Report plainly: does it degrade gracefully (readable, usable in some
   reduced form) or does it visibly break (overlapping elements,
   unusable controls, horizontal scroll)? Describe exactly what you see,
   don't soften it either way.

Do not test anything else. Just this, and report.
```

---

## After This Round

Once these 10 are done, you'll have genuinely covered the full original
30-item checklist with real evidence. At that point, ask it to compile
everything from BOTH rounds (the original 15 + these 10) into a single
final `FINAL_MASTER_AUDIT_REPORT_V2.md` — since every individual answer
was already given for real in this conversation, compiling them is low-
risk. Bring the compiled result back here for one more honest review
before calling this actually done.
