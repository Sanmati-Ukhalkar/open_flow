# OpenFlow — Documentation Track

> Also a parallel track, not a numbered version. Sequencing depends on
> what already exists: the API reference genuinely can't be written
> before v0.6 ships (there's no API to document yet), while the
> node-authoring guide and video walkthrough could reasonably start
> earlier — even now, if a good demo already exists to show.

## Recommended Sequencing

| Item | Earliest reasonable timing | Why |
|---|---|---|
| **Node-Authoring Guide** | Now / alongside v0.7 marketplace prep | The node model has been stable since v0.1 — nothing blocks writing this today, and it directly enables outside contributors, so earlier is better. |
| **Video Walkthrough** | Once v0.4–v0.5 territory is solid | Needs a genuinely impressive multi-node run to demo (branching, retry, real output) — a single-node demo undersells the project at this point. |
| **API Reference Docs** | After v0.6 ships | Literally cannot be written before the deploy-as-endpoint feature exists — documenting a contract that doesn't exist yet just creates drift. |

---

## 1. Node-Authoring Guide

Distinct from `CONTRIBUTING.md` (which covers repo-wide contribution
process) — this is a focused, standalone doc purely about building a
node, with one fully worked example from empty folder to working PR.

### Structure
1. **The Node Model, Explained** — recap the
   `definition.json` + `run.ts` + `README.md` pattern from `AGENTS.md`,
   but with more explanation than that file's terse ground-rules format
   allows. Explain *why* the model looks like this (isolation, no direct
   node-to-node calls, standard input/output contract from
   `ARCHITECTURE_V2.md`).
2. **Full Worked Example** — build one real, complete node on the page,
   step by step (e.g. a simple "Word Count" node — trivial logic on
   purpose, so the guide teaches the *pattern*, not the specific node's
   business logic):
   - Write `definition.json` (walk through every field, what it controls
     in the UI).
   - Write `run.ts` (input handling, calling the output contract from
     `ARCHITECTURE_V2.md`'s `NodeOutput` type, error handling
     conventions — plain-language `message` + `code`, per `AGENTS.md`).
   - Write `run.test.ts` (per the testing requirement from the Infra
     track doc).
   - Write the node's own `README.md`.
3. **Common Patterns** — short recipes for things most node authors will
   hit: declaring required credentials/capabilities (ties into v0.9's
   sandbox capability model), handling multi-input nodes (Transform
   node's pattern), making a node cost-aware (ties into v0.13).
4. **Submission Checklist** — mirrors the marketplace submission process
   from `ARCHITECTURE_V7.md`, but as an actionable checklist here rather
   than prose.
5. **FAQ** — anticipate real questions: "can my node call an external
   API?", "how do I test without spending real API credits?", "what if
   my node needs a Python dependency, not just JS?"

### Definition of Done
- [ ] A contributor unfamiliar with the codebase can follow the guide
      alone and produce a working, tested node — validate this literally,
      by having someone actually try it (or simulate a fresh read with
      no other context).
- [ ] Every code snippet in the guide is copy-paste-runnable, not
      pseudocode — verify each one actually works against the current
      codebase.
- [ ] Linked from `README.md`'s Contributing section and from
      `CONTRIBUTING.md` directly.

---

## 2. Video Walkthrough

- Length: 4-6 minutes — long enough to show a real multi-node workflow
  end to end, short enough that non-technical evaluators actually watch
  the whole thing.
- Suggested structure:
  1. **0:00–0:30** — one-line pitch + the problem (fragmented AI/automation
     tooling), matches the README's "Why OpenFlow" framing exactly, don't
     improvise different messaging.
  2. **0:30–2:00** — build a real workflow live on camera: drag 3-4 nodes
     (e.g. LLM → Transform → Storage, or the invoice pipeline if v0.14's
     OCR node has shipped by then), connect them, configure one.
  3. **2:00–3:30** — run it, show real output, then deliberately trigger
     a failure to show the failure-handling UX (red node, click-to-expand,
     retry) — this is a genuine differentiator worth spending time on,
     not just the happy path.
  4. **3:30–4:30** — quick montage: node library breadth, deploy-as-endpoint
     (if shipped), self-host via Docker Compose (if shipped) — whatever's
     real by recording time, don't show anything not actually working.
  5. **4:30–5:00** — close with the repo URL, "star on GitHub," and one
     sentence on how to contribute.
- Practical notes: record at whatever version is actually stable when
  you get to this — don't hold the whole documentation track hostage
  waiting for a "perfect" version to demo. Re-record later if the UI
  changes significantly (e.g. after v0.15's theme/UX pack).
- Publish to YouTube (or similar) and embed/link prominently at the top
  of `README.md`, right under the pitch — this is often the very first
  thing a non-technical evaluator clicks, ahead of even reading text.

### Definition of Done
- [ ] Video recorded, 4-6 minutes, matches the structure above.
- [ ] Shows both a successful run AND a handled failure — not just the
      happy path.
- [ ] Embedded/linked at the top of `README.md`.
- [ ] Captions/subtitles added (accessibility + muted-autoplay viewing on
      social platforms).

---

## 3. API Reference Docs

> Cannot start before v0.6 (deploy-as-endpoint) ships — there's no
> stable HTTP contract to document until then.

### Structure
1. **Authentication** — how bearer tokens work for deployed endpoints
   (from `ARCHITECTURE_V6.md`), how to generate/regenerate one.
2. **Deploying a Workflow** — the deploy flow itself, versioning
   behavior (editing after deploy doesn't affect the live version until
   redeploy — this is a common point of confusion, document it clearly
   and prominently, not buried).
3. **Endpoint Reference**
   - Request format: how the entry input schema (from
     `ARCHITECTURE_V6.md`) maps to the expected JSON body.
   - Response format: what the output node(s) return, including error
     response shapes (401 unauthorized, 429 rate-limited, 5xx execution
     failure — with real example payloads for each, not just prose
     descriptions).
   - Rate limiting behavior: documented limits, what headers (if any)
     communicate remaining quota.
4. **Webhook/Cron Trigger Reference** (once v0.7 ships) — how external
   services should format requests to a Webhook Trigger node
   specifically, distinct from the deploy-as-endpoint contract in
   section 3 — these are two different HTTP surfaces, document them
   as clearly separate, don't conflate them.
5. **Code Examples** — at minimum, a `curl` example and one language SDK
   snippet (e.g. JS `fetch` or Python `requests`) for calling a deployed
   workflow — mirrors the "Quick Start" pattern already used in
   `README.md`.

### Definition of Done
- [ ] Every documented request/response example is tested against a
      real deployed workflow, not hand-written from memory — verify
      accuracy directly.
- [ ] Error response documentation covers all cases from
      `ARCHITECTURE_V6.md`'s definition-of-done (401, 429, paused
      deployment response).
- [ ] Linked from `README.md` and from the in-app deployment dashboard
      (once that UI exists) — a user who just deployed a workflow should
      find this doc within one click from that success screen.
- [ ] Reviewed for drift whenever the deploy/trigger contract changes —
      add a note in `CONTRIBUTING.md` that API changes require a doc
      update in the same PR, not a follow-up "later."
