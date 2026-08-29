# OpenFlow — Current Monorepo Directory Structure Report

This document reports the exact current filesystem structure of the OpenFlow monorepo following Phase 0-6 restructuring.

---

## 1. Complete Directory Tree

`	ext
open_flow
├── .env
├── .env.example
├── .github
│   └── workflows
│       ├── ci.yml
│       └── deploy.yml
├── .gitignore
├── Dockerfile
├── LICENSE
├── README.md
├── apps
│   ├── api
│   │   ├── package.json
│   │   └── src
│   │       ├── __tests__
│   │       │   ├── auth.test.ts
│   │       │   └── templates.test.ts
│   │       ├── analytics.ts
│   │       ├── auth.ts
│   │       ├── env.ts
│   │       ├── events.ts
│   │       ├── queue.ts
│   │       └── server.ts
│   ├── scheduler
│   │   ├── package.json
│   │   └── src
│   │       ├── __tests__
│   │       ├── env.ts
│   │       └── scheduler.ts
│   ├── web
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── postcss.config.js
│   │   ├── public
│   │   │   └── thumbnails
│   │   │       ├── tmpl-cron-task.png
│   │   │       ├── tmpl-daily-quote.png
│   │   │       ├── tmpl-data-logger.png
│   │   │       ├── tmpl-sentiment-analysis.png
│   │   │       ├── tmpl-summarize-slack.png
│   │   │       └── tmpl-text-transformer.png
│   │   ├── src
│   │   │   ├── App.tsx
│   │   │   ├── canvas
│   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   │   ├── AuthScreen.tsx
│   │   │   │   ├── Canvas.tsx
│   │   │   │   ├── ConfigPanel.tsx
│   │   │   │   ├── CredentialsManager.tsx
│   │   │   │   ├── CustomDataEdge.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── DatabaseViewer.tsx
│   │   │   │   ├── DeployModal.tsx
│   │   │   │   ├── DeploymentAlertModal.tsx
│   │   │   │   ├── DeploymentDashboard.tsx
│   │   │   │   ├── GenericNode.tsx
│   │   │   │   ├── HTTPWebhookNode.tsx
│   │   │   │   ├── HistoryPanel.tsx
│   │   │   │   ├── LLMPromptNode.tsx
│   │   │   │   ├── MCPToolNode.tsx
│   │   │   │   ├── Marketplace.tsx
│   │   │   │   ├── McpRegistry.tsx
│   │   │   │   ├── NodeDocsModal.tsx
│   │   │   │   ├── NodeHandle.tsx
│   │   │   │   ├── NodeHeader.tsx
│   │   │   │   ├── OrgSettingsModal.tsx
│   │   │   │   ├── OutputPanel.tsx
│   │   │   │   ├── RunLogPanel.tsx
│   │   │   │   ├── SQLiteStorageNode.tsx
│   │   │   │   ├── ShortcutsOverlay.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── StickyNoteNode.tsx
│   │   │   │   ├── TextTransformNode.tsx
│   │   │   │   ├── TriggerDashboard.tsx
│   │   │   │   ├── categoryUtils.ts
│   │   │   │   ├── dateHelper.ts
│   │   │   │   └── hooks
│   │   │   │       └── useYjsSync.ts
│   │   │   ├── components
│   │   │   │   └── TemplateCloneModal.tsx
│   │   │   ├── index.css
│   │   │   ├── main.tsx
│   │   │   └── pages
│   │   │       └── Templates.tsx
│   │   ├── tailwind.config.js
│   │   └── vite.config.ts
│   └── worker
│       ├── package.json
│       └── src
│           ├── __tests__
│           │   └── worker.test.ts
│           ├── env.ts
│           └── worker.ts
├── data
│   └── eng.traineddata
├── database.sqlite
├── docker-compose.yml
├── docs
│   ├── CURRENT_STRUCTURE.md
│   ├── architecture
│   │   ├── ARCHITECTURE.md
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
│   │   └── ARCHITECTURE_V9.md
│   ├── audits
│   │   ├── AUDIT_CLOSURE_PROMPT.md
│   │   ├── AUDIT_CLOSURE_ROUND2.md
│   │   ├── BROWSER_AGENT_QUEUE_ROUND2.md
│   │   ├── FINAL_STRICT_AUDIT.md
│   │   ├── FINAL_STRICT_AUDIT_RESULTS.json
│   │   ├── FINAL_STRICT_AUDIT_RESULTS.md
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
│   └── screenshots
│       ├── 01-canvas.png
│       ├── 01_dark_canvas.png
│       ├── 02-node-added.png
│       ├── 03-node-config.png
│       ├── 03_post_run_canvas.png
│       ├── 04-execution-output.png
│       └── 05_after_drag_connection.png
├── eslint.config.js
├── metadata.sqlite
├── netlify.toml
├── package.json
├── packages
│   ├── db
│   │   ├── package.json
│   │   └── src
│   │       ├── crypto.ts
│   │       ├── db.ts
│   │       ├── index.ts
│   │       ├── logger.ts
│   │       ├── migrate.ts
│   │       ├── migrations
│   │       │   ├── 001_initial_schema.ts
│   │       │   └── 002_add_queue_job_id.ts
│   │       └── seed-templates.ts
│   ├── engine
│   │   ├── package.json
│   │   └── src
│   │       ├── __tests__
│   │       │   └── engine.test.ts
│   │       ├── engine.ts
│   │       ├── events.ts
│   │       ├── index.ts
│   │       ├── mcp-server.ts
│   │       ├── sandbox-worker.ts
│   │       ├── sandbox.ts
│   │       ├── topoSort.test.ts
│   │       └── topoSort.ts
│   ├── nodes
│   │   ├── package.json
│   │   └── src
│   │       ├── branch
│   │       │   ├── definition.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── code-execution
│   │       │   ├── definition.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── community
│   │       │   ├── .gitkeep
│   │       │   └── math-helper
│   │       │       ├── definition.json
│   │       │       ├── manifest.json
│   │       │       └── run.ts
│   │       ├── cron-trigger
│   │       │   ├── README.md
│   │       │   ├── definition.json
│   │       │   ├── manifest.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── email
│   │       │   ├── definition.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── file-trigger
│   │       │   ├── definition.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── http-webhook
│   │       │   ├── README.md
│   │       │   ├── definition.json
│   │       │   ├── manifest.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── index.ts
│   │       ├── llm-prompt
│   │       │   ├── README.md
│   │       │   ├── definition.json
│   │       │   ├── manifest.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── loop
│   │       │   ├── definition.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── mcp-tool
│   │       │   ├── README.md
│   │       │   ├── definition.json
│   │       │   ├── manifest.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── node-limits.json
│   │       ├── registry.json
│   │       ├── sqlite-storage
│   │       │   ├── README.md
│   │       │   ├── definition.json
│   │       │   ├── manifest.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── sticky-note
│   │       │   └── definition.json
│   │       ├── text-transform
│   │       │   ├── README.md
│   │       │   ├── definition.json
│   │       │   ├── manifest.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── vector-retrieve
│   │       │   ├── definition.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── vector-store
│   │       │   ├── definition.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       ├── vision-ocr
│   │       │   ├── definition.json
│   │       │   ├── run.test.ts
│   │       │   └── run.ts
│   │       └── webhook-trigger
│   │           ├── README.md
│   │           ├── definition.json
│   │           ├── manifest.json
│   │           ├── run.test.ts
│   │           └── run.ts
│   └── shared-types
│       ├── package.json
│       └── src
│           ├── index.ts
│           └── jobs.ts
├── playwright-report
│   └── index.html
├── playwright.config.ts
├── test-results
│   └── .last-run.json
├── tests
│   ├── adversarial.spec.ts
│   ├── all-nodes-audit.spec.ts
│   ├── canvas.spec.ts
│   ├── helpers
│   │   └── navigateToCanvas.ts
│   ├── live_browser_audit.ts
│   ├── screenshots-gen.spec.ts
│   └── strict-audit.spec.ts
├── tree.txt
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── vitest.config.ts
`
