# OpenFlow — Template Implementation Prompt

> Use this as a direct prompt to Antigravity (or any AI coding agent).
> Builds on `ARCHITECTURE_V10.md` (template data model + gallery). This
> file is the actual content plan: which templates to build, in what
> order, and the exact bar each one must meet before being added to the
> gallery. Implement ONE template at a time, verify it runs end-to-end
> with real execution before moving to the next.

## Ground Rule (read first)

A template is only allowed into the gallery if it **actually runs
successfully end-to-end with real node execution** — no template should
ship that only "looks complete" on canvas. This mirrors the same
discipline used for every node build so far: real execution over
appearance of completeness.

Each template also needs:
- Accurate `requiredCredentials` list (so the "use this template" flow
  from `ARCHITECTURE_V10.md` can warn the user before they hit a
  confusing runtime error).
- A short description explaining what it does and why someone would use
  it — written for a non-technical evaluator browsing the gallery, not
  an internal dev note.

---

## Template 1 — Document Extraction Pipeline (flagship / priority 1)

**Use case:** upload a scanned invoice/receipt/document, extract
structured fields, log them, get notified.

**Graph:** File Upload Trigger → Vision/OCR → LLM Prompt (structured
extraction) → SQLite Storage → Email (or HTTP Webhook/Slack)

**Why priority 1:** this is the project's original motivating example
(from the very first architecture discussion) — it should be the first
template a new user sees, since it's the clearest demonstration of what
OpenFlow is actually for.

**Required credentials:** OpenAI (or Groq) API key, SMTP credentials (if
Email is used).

**Done when:** a real scanned document image produces correctly
extracted structured fields, logged to SQLite, with a real notification
sent — test with an actual sample invoice image, not synthetic text.

---

## Template 2 — Summarize & Notify

**Use case:** take a long piece of text (pasted, or from an upstream
source), summarize it with an LLM, send the summary somewhere.

**Graph:** LLM Prompt (input: raw text via manual trigger or webhook) →
Text Transform (format into a clean message) → HTTP Webhook (Slack-
compatible) or Email

**Why this template:** simplest possible "real value in under 60
seconds" demo — good for a user's very first successful run, lower
setup friction than Template 1 (no OCR/file handling needed).

**Required credentials:** OpenAI/Groq API key, webhook URL or SMTP.

**Done when:** pasting a real block of text produces an accurate summary
that's actually delivered to the configured destination.

---

## Template 3 — MCP Tool Chaining Example

**Use case:** demonstrate the project's actual differentiator — chaining
an LLM with a real MCP tool call.

**Graph:** LLM Prompt (generates or extracts a value) → MCP Tool (uses
that value as input to a real MCP server tool, e.g. `text_analyzer` from
your existing test MCP server) → Text Transform (format combined result)

**Why this template:** the gallery needs at least one template that
showcases MCP specifically — this is your positioning's proof point
("AI/MCP-first"), it shouldn't only exist as a manual test case.

**Required credentials:** OpenAI/Groq API key, MCP server connection
(pre-configured to your existing test server if no generic public one is
suitable).

**Done when:** the LLM's output correctly flows into the MCP tool call as
input, and the tool's real response is visible in the final output.

---

## Template 4 — Scheduled Data Logger

**Use case:** periodically fetch or generate data and log it, unattended.

**Graph:** Cron Trigger → LLM Prompt (or HTTP call to fetch data) →
SQLite Storage

**Why this template:** demonstrates unattended/scheduled execution
(v0.7's trigger system) — a distinct category from manually-run
templates 1-3, shows the "runs by itself" value proposition.

**Required credentials:** OpenAI/Groq API key (if LLM node used).

**Done when:** the workflow fires on its configured schedule without
manual intervention and correctly logs a new row each time, verified
across at least 2 real scheduled firings (not just one manual test run
of the underlying nodes).

---

## Template 5 — Conditional Routing Example

**Use case:** demonstrate branch-based decision-making — route data
differently based on a condition.

**Graph:** LLM Prompt (e.g. classify input as "urgent" or "normal") →
Branch Node (condition on classification) → [true: Email urgent alert] /
[false: SQLite log only]

**Why this template:** showcases the Branch node (from
`ARCHITECTURE_V14.md`) with a genuinely useful real-world pattern
(triage/routing), not a toy example — helps users understand branching
by seeing it solve a real problem.

**Required credentials:** OpenAI/Groq API key, SMTP.

**Done when:** feeding both an "urgent" and a "normal" example input
correctly takes the different branch each time, verified for both paths,
not just one.

---

## Template 6 — RAG Q&A Starter (if RAG nodes from v0.14 are shipped)

**Use case:** ingest a document into a vector store, then answer
questions against it.

**Graph:** Embed & Store node (ingest a document) — as a SEPARATE
one-time setup workflow — then a second workflow: Retrieve node (query)
→ LLM Prompt (answer using retrieved context)

**Why this template:** likely needs to be split into TWO templates (one
for ingestion, one for querying) since they're genuinely different
use-run patterns (ingest once, query many times) — don't force this into
a single linear graph if that misrepresents how it's actually used.

**Required credentials:** OpenAI/Groq API key (for embeddings + LLM),
vector store config if not using the default embedded option.

**Done when:** a real document is ingested, and a genuinely relevant
question against its content returns a correct, grounded answer — not a
hallucinated one. Test with a question whose answer is NOT common
knowledge, to actually prove retrieval is working (not just the LLM's
own training data answering).

---

## Build Order

1. Template 1 (Document Extraction) — flagship, do first.
2. Template 2 (Summarize & Notify) — simplest, good second win.
3. Template 3 (MCP Chaining) — positioning-critical, do before showing
   this project to anyone externally.
4. Template 4 (Scheduled Logger) — only after v0.7's triggers are
   confirmed solid.
5. Template 5 (Conditional Routing) — only after Branch node's audit
   fixes (Round 2) are fully closed — don't build a showcase template on
   top of a node still being debugged.
6. Template 6 (RAG) — only if/when RAG nodes actually exist and are
   individually audited per `NODE_AUDIT.md`'s standard.

## Definition of Done (per template, apply to each)

- [ ] Graph builds correctly when cloned via "Use This Template."
- [ ] Runs successfully end-to-end with REAL execution (no mocked/
      simulated results) using realistic sample input.
- [ ] `requiredCredentials` list is accurate — verified by testing with
      those credentials deliberately removed first (confirm the correct
      warning shows before running).
- [ ] Description is written for a non-technical gallery browser, not an
      internal engineering note.
- [ ] Thumbnail/preview accurately reflects the actual graph shape (not
      a generic placeholder image).

## Final Gallery Check (after all templates built)

- [ ] Every template in the gallery has been personally run successfully
      at least once by whoever is implementing this — no template ships
      on the strength of "the individual nodes work, so the chain should
      too." Verify the whole chain for real.
- [ ] Gallery categories (from `ARCHITECTURE_V10.md`) correctly group
      these 6 (e.g. "AI/LLM," "Notifications," "Data Processing,"
      "Scheduling," "Advanced/RAG").
