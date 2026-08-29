# OpenFlow — v0.13 Architecture

> Precondition: v0.12's real-time collaboration confirmed solid. By this
> point, workflows are being built by teams, deployed as endpoints, and
> triggered by cron/webhooks — this version is about giving people
> visibility into what all that running infrastructure is actually
> costing and how it's behaving.

## Goal of v0.13

Answer the two questions every team running deployed workflows will
eventually ask: **"what is this costing us"** and **"what's breaking and
how often."** Turn the run history that's existed since v0.4/v0.5 into
actual dashboards instead of just per-run logs.

## What v0.13 Adds

1. **Cost Tracking Per Node / Per Workflow**
   - Extend `run_node_results` (from v0.5) to capture cost-relevant
     metadata per execution: tokens used (LLM nodes), API calls made
     (MCP/HTTP nodes), execution duration.
   - Node types that incur cost declare a `costEstimator` in their
     package (e.g. LLM node computes `tokensUsed * pricePerToken` based
     on the model used) — this needs per-provider pricing data, kept
     as a small config table so pricing updates don't require code
     changes.
   - Aggregate view: cost per workflow over time (daily/weekly/monthly),
     cost per deployment, cost per organization (ties into v0.11's org
     model — this is also the natural seed for billing, if that's ever
     wanted, though billing itself stays explicitly out of scope here).

2. **Error Rate Dashboards**
   - Per-workflow and per-deployment: success rate over time, most
     common failing node, most common error type (rate limit vs. bad
     input vs. timeout vs. schema validation failure from v0.4).
   - Surface this prominently for **deployed** workflows especially —
     someone relying on a deployed endpoint (v0.6) in another system
     needs to know if it's been silently failing.

3. **Alerting (minimal)**
   - Simple threshold-based alert: "notify me if this deployment's error
     rate exceeds X% over Y runs" — delivered via the same
     HTTP/webhook node infrastructure already built (i.e. dogfood your
     own HTTP Webhook node type to send the alert, don't build a
     separate notification system).
   - No elaborate alerting rules engine — one threshold condition per
     deployment is enough for v0.13.

4. **Usage Analytics Dashboard**
   - Org-level view: most-used node types, most-active workflows,
     total runs over time, active deployments count.
   - Useful both for the org itself (understanding their own usage) and,
     in aggregate/anonymized form, potentially useful for you as the
     project maintainer to understand what node types matter most to
     prioritize — flag this clearly as opt-in/anonymized if implemented,
     don't silently collect usage data from self-hosted instances.

5. **Data Retention Policy**
   - Run history and cost data will grow unbounded otherwise. Add a
     configurable retention window (e.g. keep detailed run data for 90
     days, then aggregate-and-drop details) — a real operational concern
     once this data has been accumulating since v0.5.

## What v0.13 Explicitly Does NOT Include

- Actual billing/invoicing based on cost tracking — cost visibility only,
  monetization is a separate, later decision.
- Complex multi-condition alerting rules or integrations with external
  observability platforms (Datadog, Grafana, etc.) — that's a reasonable
  future "export metrics" feature, not required now.
- Predictive analytics/anomaly detection — simple threshold alerts and
  historical dashboards are the full scope here.

## Definition of Done for v0.13

- [ ] Cost estimate shown per workflow run, per node, matching actual
      provider pricing reasonably closely (spot-check against real
      OpenAI billing for a sample of runs).
- [ ] Error rate dashboard correctly reflects a deliberately-induced
      failure streak (e.g. temporarily break a node's config, confirm
      the dashboard shows the resulting error rate spike).
- [ ] Threshold alert fires correctly when a deployment's error rate
      crosses the configured limit, delivered via the existing webhook
      node, not a new notification pathway.
- [ ] Retention policy correctly ages out detailed run data after the
      configured window without breaking the aggregate dashboards that
      depend on historical totals.
- [ ] Any usage analytics collection is explicitly opt-in and disclosed,
      not silently enabled by default on self-hosted instances.

---

This closes the full extended roadmap (v0.1–v0.13). From here, treat
further scope purely as backlog driven by real user and contributor
feedback — the project should now have enough real usage data (thanks to
this very version) to make that prioritization concrete instead of
speculative.
