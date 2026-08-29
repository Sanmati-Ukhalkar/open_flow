# OpenFlow — v0.10 Architecture

> Precondition: v0.9's sandboxed execution confirmed solid. This version
> is a lower-risk, high-onboarding-value feature — good to slot in after
> a security-heavy version like v0.9, before tackling something as heavy
> as teams/orgs in v0.11.

## Goal of v0.10

Give new users a **starting point** instead of a blank canvas. Blank-canvas
no-code tools have a steep "what do I even build" wall — templates are
usually the highest-leverage onboarding investment for an OSS project
trying to grow adoption.

## What v0.10 Adds

1. **Template Data Model**
   - A template is just a workflow graph JSON (same shape as a saved
     workflow from v0.5) plus metadata: title, description, category,
     preview thumbnail, required credentials list (e.g. "needs an OpenAI
     key").
   - Stored the same way regular workflows are (reuse the
     `workflows`/`workflow_versions` tables from v0.5/v0.6), flagged
     with `is_template: true` and no `owner_id` (or owned by a system
     account) so they're visible to everyone.

2. **Template Gallery**
   - New page/section: browsable grid of templates, filterable by
     category (e.g. "AI/LLM," "Notifications," "Data Processing").
   - Ship with 4-6 real, working starter templates at launch — don't
     ship a gallery with placeholder/broken templates, that undermines
     trust in the whole feature. Good candidates given nodes that exist
     by now:
     - Invoice/Document extraction pipeline (the original demo workflow)
     - "Summarize and Slack it" (LLM + HTTP webhook)
     - MCP tool chaining example
     - Simple data-to-SQLite logger

3. **"Use This Template" Flow**
   - Clicking a template creates a **copy** into the user's own
     workflows (new `workflow_id`, `owner_id` = current user) — never
     lets a user edit the shared template directly.
   - If the template requires credentials the user hasn't set up yet
     (e.g. no OpenAI key stored), surface that clearly before or right
     after cloning — don't let them hit a cryptic node error on first
     run.

4. **Community Template Submission (lightweight, manual for now)**
   - Mirror the v0.7 marketplace approach: a documented process in
     `CONTRIBUTING.md` for submitting a template (export your workflow
     JSON, submit via PR to a `templates/` folder), reviewed manually
     before being added to the gallery.
   - No in-app "publish my workflow as a template" self-serve flow yet —
     that's a reasonable v0.11+ addition once there's a review process
     that scales.

## What v0.10 Explicitly Does NOT Include

- Self-serve template publishing from within the app.
- Template versioning/updates propagating to users who already cloned
  one (a clone is a one-time copy, intentionally not linked afterward).
- Paid/premium templates or any monetization angle.
- Personalized template recommendations — a simple category filter is
  enough for v0.10.

## Definition of Done for v0.10

- [ ] Gallery shows 4-6 templates, each with accurate title, description,
      and required-credentials list.
- [ ] "Use This Template" creates an independent copy — editing the
      cloned copy never affects the original template or other users'
      copies.
- [ ] A template requiring a credential the user lacks shows a clear
      setup prompt before the user hits a confusing run-time error.
- [ ] Every shipped template actually runs successfully end-to-end when
      cloned and run with valid credentials — test each one, not just
      the UI around them.
- [ ] `CONTRIBUTING.md` documents the template submission process clearly
      enough that an outside contributor could submit one without asking
      you directly.
