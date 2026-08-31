# OpenFlow — Current Monorepo Directory Structure & Repository Architecture Report

This document reports the exact current filesystem structure of the OpenFlow monorepo project as it exists on disk.

---

## 1. Monorepo Architecture Overview

OpenFlow is organized as an npm workspaces monorepo:

- **`apps/`**: Runnable application entrypoints
  - `apps/api`: Express REST API & WebSocket server for collaborative editing and execution control.
  - `apps/worker`: BullMQ background queue worker consuming `workflow-runs` jobs and executing workflow DAGs.
  - `apps/scheduler`: Cron ticker evaluating active scheduled deployments and enqueueing execution jobs.
  - `apps/web`: React 19 + React Flow canvas application built with Vite and TailwindCSS.
- **`packages/`**: Reusable shared internal libraries
  - `packages/db`: Unified database connection pool, migrations (`metadata.sqlite`), credential encryption, and Pino logger.
  - `packages/engine`: Core DAG validation, topological sorting, skip propagation, retry logic, and sandbox worker runner.
  - `packages/nodes`: Core node definitions (`definition.json`) and execution handlers (`run.ts`) plus community nodes.
  - `packages/shared-types`: Shared TypeScript types and BullMQ job payload definitions.
- **`docs/`**: Architecture guides, API reference, contributing guides, and audit logs.

---

## 2. Complete Directory Tree

```text
open_flow
├── .github
│   └── workflows
│       ├── ci.yml
│       └── deploy.yml
├── apps
│   ├── api
│   │   ├── src
│   │   │   ├── __tests__
│   │   │   │   ├── auth.test.ts
│   │   │   │   └── templates.test.ts
│   │   │   ├── analytics.ts
│   │   │   ├── auth.ts
│   │   │   ├── env.ts
│   │   │   ├── events.ts
│   │   │   ├── queue.ts
│   │   │   └── server.ts
│   │   └── package.json
│   ├── scheduler
│   │   ├── src
│   │   │   ├── __tests__
│   │   │   ├── env.ts
│   │   │   └── scheduler.ts
│   │   └── package.json
│   ├── web
│   │   ├── public
│   │   │   └── thumbnails
│   │   │       ├── tmpl-cron-task.png
│   │   │       ├── tmpl-daily-quote.png
│   │   │       ├── tmpl-data-logger.png
│   │   │       ├── tmpl-sentiment-analysis.png
│   │   │       ├── tmpl-summarize-slack.png
│   │   │       └── tmpl-text-transformer.png
│   │   ├── src
│   │   │   ├── canvas
│   │   │   │   ├── hooks
│   │   │   │   │   └── useYjsSync.ts
│   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   │   ├── AuthScreen.tsx
│   │   │   │   ├── Canvas.tsx
│   │   │   │   ├── categoryUtils.ts
│   │   │   │   ├── ConfigPanel.tsx
│   │   │   │   ├── CredentialsManager.tsx
│   │   │   │   ├── CustomDataEdge.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── DatabaseViewer.tsx
│   │   │   │   ├── dateHelper.ts
│   │   │   │   ├── DeploymentAlertModal.tsx
│   │   │   │   ├── DeploymentDashboard.tsx
│   │   │   │   ├── DeployModal.tsx
│   │   │   │   ├── GenericNode.tsx
│   │   │   │   ├── HistoryPanel.tsx
│   │   │   │   ├── HTTPWebhookNode.tsx
│   │   │   │   ├── LLMPromptNode.tsx
│   │   │   │   ├── Marketplace.tsx
│   │   │   │   ├── McpRegistry.tsx
│   │   │   │   ├── MCPToolNode.tsx
│   │   │   │   ├── NodeDocsModal.tsx
│   │   │   │   ├── NodeHandle.tsx
│   │   │   │   ├── NodeHeader.tsx
│   │   │   │   ├── OrgSettingsModal.tsx
│   │   │   │   ├── OutputPanel.tsx
│   │   │   │   ├── RunLogPanel.tsx
│   │   │   │   ├── ShortcutsOverlay.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── SQLiteStorageNode.tsx
│   │   │   │   ├── StickyNoteNode.tsx
│   │   │   │   ├── TextTransformNode.tsx
│   │   │   │   └── TriggerDashboard.tsx
│   │   │   ├── components
│   │   │   │   └── TemplateCloneModal.tsx
│   │   │   ├── pages
│   │   │   │   └── Templates.tsx
│   │   │   ├── App.tsx
│   │   │   ├── index.css
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── postcss.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   └── worker
│       ├── src
│       │   ├── __tests__
│       │   │   └── worker.test.ts
│       │   ├── env.ts
│       │   └── worker.ts
│       └── package.json
├── data
│   └── eng.traineddata
├── docs
│   ├── architecture
│   │   ├── ARCHITECTURE_DOCS.md
│   │   ├── ARCHITECTURE_INFRA.md
│   │   ├── ARCHITECTURE_V10.md
│   │   ├── ARCHITECTURE_V11.md
│   │   ├── ARCHITECTURE_V12.md
│   │   ├── ARCHITECTURE_V13.md
│   │   ├── ARCHITECTURE_V14.md
│   │   ├── ARCHITECTURE_V15.md
│   │   ├── ARCHITECTURE_V2.md
│   │   ├── ARCHITECTURE_V3.md
│   │   ├── ARCHITECTURE_V4.md
│   │   ├── ARCHITECTURE_V5.md
│   │   ├── ARCHITECTURE_V6.md
│   │   ├── ARCHITECTURE_V7.md
│   │   ├── ARCHITECTURE_V8.md
│   │   ├── ARCHITECTURE_V9.md
│   │   ├── ARCHITECTURE.md
│   │   └── CURRENT_STRUCTURE.md
│   ├── audits
│   │   ├── ARCHITECTURE_TRUING_RESULTS.md
│   │   ├── AUDIT_CLOSURE_PROMPT.md
│   │   ├── AUDIT_CLOSURE_ROUND2.md
│   │   ├── BROWSER_AGENT_QUEUE_ROUND2.md
│   │   ├── FINAL_STRICT_AUDIT_RESULTS.json
│   │   ├── FINAL_STRICT_AUDIT_RESULTS.md
│   │   ├── FINAL_STRICT_AUDIT.md
│   │   ├── NODE_AUDIT.md
│   │   ├── PRODUCT_POLISH_ROUND2.md
│   │   └── PRODUCT_POLISH_ROUND3.md
│   ├── guides
│   │   ├── AGENTS.md
│   │   ├── API_REFERENCE.md
│   │   ├── CONTRIBUTING.md
│   │   ├── NODE_AUTHORING_GUIDE.md
│   │   ├── TEMPLATE_IMPLEMENTATION_PROMPT.md
│   │   ├── UI_Screenshots.md
│   │   ├── USE_CASES.md
│   │   └── VIDEO_WALKTHROUGH.md
│   ├── images
│   │   ├── canvas_editor.png
│   │   └── landing_page.png
│   ├── screenshots
│   │   ├── 01_dark_canvas.png
│   │   ├── 01-canvas.png
│   │   ├── 02-node-added.png
│   │   ├── 03_post_run_canvas.png
│   │   ├── 03-node-config.png
│   │   ├── 04-execution-output.png
│   │   └── 05_after_drag_connection.png
│   └── CURRENT_STRUCTURE.md
├── packages
│   ├── db
│   │   ├── src
│   │   │   ├── __tests__
│   │   │   │   └── crypto.test.ts
│   │   │   ├── migrations
│   │   │   │   ├── 001_initial_schema.ts
│   │   │   │   └── 002_add_queue_job_id.ts
│   │   │   ├── crypto.ts
│   │   │   ├── db.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── migrate.ts
│   │   │   └── seed-templates.ts
│   │   └── package.json
│   ├── engine
│   │   ├── src
│   │   │   ├── __tests__
│   │   │   │   └── engine.test.ts
│   │   │   ├── engine.ts
│   │   │   ├── events.ts
│   │   │   ├── index.ts
│   │   │   ├── mcp-server.ts
│   │   │   ├── paths.ts
│   │   │   ├── sandbox-worker.ts
│   │   │   ├── sandbox.ts
│   │   │   ├── topoSort.test.ts
│   │   │   └── topoSort.ts
│   │   └── package.json
│   ├── nodes
│   │   ├── src
│   │   │   ├── branch
│   │   │   │   ├── definition.json
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── code-execution
│   │   │   │   ├── definition.json
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── community
│   │   │   │   ├── math-helper
│   │   │   │   │   ├── definition.json
│   │   │   │   │   ├── manifest.json
│   │   │   │   │   └── run.ts
│   │   │   │   └── .gitkeep
│   │   │   ├── cron-trigger
│   │   │   │   ├── definition.json
│   │   │   │   ├── manifest.json
│   │   │   │   ├── README.md
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── email
│   │   │   │   ├── definition.json
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── file-trigger
│   │   │   │   ├── definition.json
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── http-webhook
│   │   │   │   ├── definition.json
│   │   │   │   ├── manifest.json
│   │   │   │   ├── README.md
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── llm-prompt
│   │   │   │   ├── definition.json
│   │   │   │   ├── manifest.json
│   │   │   │   ├── README.md
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── loop
│   │   │   │   ├── definition.json
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── mcp-tool
│   │   │   │   ├── definition.json
│   │   │   │   ├── manifest.json
│   │   │   │   ├── README.md
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── sqlite-storage
│   │   │   │   ├── definition.json
│   │   │   │   ├── manifest.json
│   │   │   │   ├── README.md
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── sticky-note
│   │   │   │   └── definition.json
│   │   │   ├── text-transform
│   │   │   │   ├── definition.json
│   │   │   │   ├── manifest.json
│   │   │   │   ├── README.md
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── vector-retrieve
│   │   │   │   ├── definition.json
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── vector-store
│   │   │   │   ├── definition.json
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── vision-ocr
│   │   │   │   ├── definition.json
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── webhook-trigger
│   │   │   │   ├── definition.json
│   │   │   │   ├── manifest.json
│   │   │   │   ├── README.md
│   │   │   │   ├── run.test.ts
│   │   │   │   └── run.ts
│   │   │   ├── index.ts
│   │   │   ├── node-limits.json
│   │   │   └── registry.json
│   │   └── package.json
│   └── shared-types
│       ├── src
│       │   ├── index.ts
│       │   └── jobs.ts
│       └── package.json
├── tests
│   ├── helpers
│   │   └── navigateToCanvas.ts
│   ├── adversarial.spec.ts
│   ├── all-nodes-audit.spec.ts
│   ├── canvas.spec.ts
│   ├── live_browser_audit.ts
│   ├── screenshots-gen.spec.ts
│   └── strict-audit.spec.ts
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── create_wf_long_llm.json
├── create_wf_perm_fail_2.json
├── create_wf_perm_fail.json
├── create_wf_step4.json
├── create_wf.json
├── database.sqlite
├── docker-compose.yml
├── Dockerfile
├── eslint.config.js
├── LICENSE
├── metadata.sqlite
├── netlify.toml
├── package-lock.json
├── package.json
├── payload.json
├── playwright.config.ts
├── README.md
├── scratch_gen_structure.js
├── tree.txt
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── vitest.config.ts
```

---

## 3. Package Boundary Rules

1. **No Circular Package Imports**: `packages/shared-types` has zero internal dependencies. `packages/db` depends only on external drivers. `packages/nodes` and `packages/engine` depend on `packages/db` and `packages/shared-types`.
2. **Asynchronous Decoupling**: `apps/worker` and `apps/api` communicate exclusively via BullMQ on Redis. The API enqueues jobs and does not run workflow execution inline.
3. **Sandbox Isolation**: Community nodes execute inside isolated Worker threads with timeouts and capability-filtered environment access.
