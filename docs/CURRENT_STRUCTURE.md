# OpenFlow — Current Directory Structure & Repository Architecture Report

This document reports the exact current filesystem structure of the OpenFlow project as it exists on disk.

---

## 1. Complete Directory Tree

```text
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
├── database.sqlite
├── docker-compose.yml
├── docs
│   ├── AGENTS.md
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE.md
│   ├── ARCHITECTURE_DOCS.md
│   ├── ARCHITECTURE_INFRA.md
│   ├── ARCHITECTURE_V10.md
│   ├── ARCHITECTURE_V11.md
│   ├── ARCHITECTURE_V12.md
│   ├── ARCHITECTURE_V13.md
│   ├── ARCHITECTURE_V14.md
│   ├── ARCHITECTURE_V15.md
│   ├── ARCHITECTURE_V2.md
│   ├── ARCHITECTURE_V3.md
│   ├── ARCHITECTURE_V4.md
│   ├── ARCHITECTURE_V5.md
│   ├── ARCHITECTURE_V6.md
│   ├── ARCHITECTURE_V7.md
│   ├── ARCHITECTURE_V8.md
│   ├── ARCHITECTURE_V9.md
│   ├── AUDIT_CLOSURE_PROMPT.md
│   ├── AUDIT_CLOSURE_ROUND2.md
│   ├── BROWSER_AGENT_QUEUE_ROUND2.md
│   ├── CONTRIBUTING.md
│   ├── CURRENT_STRUCTURE.md
│   ├── FINAL_STRICT_AUDIT.md
│   ├── FINAL_STRICT_AUDIT_RESULTS.json
│   ├── FINAL_STRICT_AUDIT_RESULTS.md
│   ├── FULL_PRODUCT_POLISH_PROMPT (1).md
│   ├── NODE_AUDIT.md
│   ├── NODE_AUTHORING_GUIDE.md
│   ├── PRODUCT_POLISH_ROUND2.md
│   ├── PRODUCT_POLISH_ROUND3.md
│   ├── README (1).md
│   ├── TEMPLATE_IMPLEMENTATION_PROMPT.md
│   ├── UI_Screenshots.md
│   ├── USE_CASES.md
│   ├── VIDEO_WALKTHROUGH.md
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
├── e2e
│   └── live_browser_audit.ts
├── eng.traineddata
├── eslint.config.js
├── index.html
├── metadata.sqlite
├── netlify.toml
├── package.json
├── playwright-report
│   └── index.html
├── playwright.config.ts
├── postcss.config.js
├── public
│   └── thumbnails
│       ├── tmpl-cron-task.png
│       ├── tmpl-daily-quote.png
│       ├── tmpl-data-logger.png
│       ├── tmpl-sentiment-analysis.png
│       ├── tmpl-summarize-slack.png
│       └── tmpl-text-transformer.png
├── refactor.cjs
├── scratch_clean_run.ts
├── scratch_r2_screenshots.ts
├── scratch_r2_step1.ts
├── scratch_r2_step2.ts
├── scratch_step10.ts
├── scratch_step11.ts
├── scratch_step12.ts
├── scratch_step13.ts
├── scratch_step14.ts
├── scratch_step15.ts
├── scratch_step5.ts
├── scratch_step6.ts
├── scratch_step7.ts
├── scratch_step8.ts
├── scratch_step9.ts
├── src
│   ├── App.tsx
│   ├── canvas
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── AuthScreen.tsx
│   │   ├── Canvas.tsx
│   │   ├── ConfigPanel.tsx
│   │   ├── CredentialsManager.tsx
│   │   ├── CustomDataEdge.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DatabaseViewer.tsx
│   │   ├── DeployModal.tsx
│   │   ├── DeploymentAlertModal.tsx
│   │   ├── DeploymentDashboard.tsx
│   │   ├── GenericNode.tsx
│   │   ├── HTTPWebhookNode.tsx
│   │   ├── HistoryPanel.tsx
│   │   ├── LLMPromptNode.tsx
│   │   ├── MCPToolNode.tsx
│   │   ├── Marketplace.tsx
│   │   ├── McpRegistry.tsx
│   │   ├── NodeDocsModal.tsx
│   │   ├── NodeHandle.tsx
│   │   ├── NodeHeader.tsx
│   │   ├── OrgSettingsModal.tsx
│   │   ├── OutputPanel.tsx
│   │   ├── RunLogPanel.tsx
│   │   ├── SQLiteStorageNode.tsx
│   │   ├── ShortcutsOverlay.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StickyNoteNode.tsx
│   │   ├── TextTransformNode.tsx
│   │   ├── TriggerDashboard.tsx
│   │   ├── categoryUtils.ts
│   │   ├── dateHelper.ts
│   │   └── hooks
│   │       └── useYjsSync.ts
│   ├── components
│   │   └── TemplateCloneModal.tsx
│   ├── engine
│   │   ├── topoSort.test.ts
│   │   └── topoSort.ts
│   ├── index.css
│   ├── main.tsx
│   ├── nodes
│   │   ├── branch
│   │   │   ├── definition.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── code-execution
│   │   │   ├── definition.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── community
│   │   │   ├── .gitkeep
│   │   │   └── math-helper
│   │   │       ├── definition.json
│   │   │       ├── manifest.json
│   │   │       └── run.ts
│   │   ├── cron-trigger
│   │   │   ├── README.md
│   │   │   ├── definition.json
│   │   │   ├── manifest.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── email
│   │   │   ├── definition.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── file-trigger
│   │   │   ├── definition.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── http-webhook
│   │   │   ├── README.md
│   │   │   ├── definition.json
│   │   │   ├── manifest.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── llm-prompt
│   │   │   ├── README.md
│   │   │   ├── definition.json
│   │   │   ├── manifest.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── loop
│   │   │   ├── definition.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── mcp-tool
│   │   │   ├── README.md
│   │   │   ├── definition.json
│   │   │   ├── manifest.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── node-limits.json
│   │   ├── registry.json
│   │   ├── sqlite-storage
│   │   │   ├── README.md
│   │   │   ├── definition.json
│   │   │   ├── manifest.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── sticky-note
│   │   │   └── definition.json
│   │   ├── text-transform
│   │   │   ├── README.md
│   │   │   ├── definition.json
│   │   │   ├── manifest.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── vector-retrieve
│   │   │   ├── definition.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── vector-store
│   │   │   ├── definition.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   ├── vision-ocr
│   │   │   ├── definition.json
│   │   │   ├── run.test.ts
│   │   │   └── run.ts
│   │   └── webhook-trigger
│   │       ├── README.md
│   │       ├── definition.json
│   │       ├── manifest.json
│   │       ├── run.test.ts
│   │       └── run.ts
│   ├── pages
│   │   └── Templates.tsx
│   └── server
│       ├── __tests__
│       │   ├── auth.test.ts
│       │   ├── engine.test.ts
│       │   └── templates.test.ts
│       ├── analytics.ts
│       ├── auth.ts
│       ├── crypto.ts
│       ├── db.ts
│       ├── engine.ts
│       ├── events.ts
│       ├── logger.ts
│       ├── mcp-server.ts
│       ├── sandbox-worker.ts
│       ├── sandbox.ts
│       ├── seed-templates.ts
│       └── server.ts
├── tailwind.config.js
├── test-results
│   └── .last-run.json
├── tests
│   ├── adversarial.spec.ts
│   ├── all-nodes-audit.spec.ts
│   ├── canvas.spec.ts
│   ├── helpers
│   │   └── navigateToCanvas.ts
│   ├── screenshots-gen.spec.ts
│   └── strict-audit.spec.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── vite.config.ts
└── vitest.config.ts
```

---

## 2. Top-Level Directory Contents Summary

### `.github/`
Contains GitHub workflow configurations for automated CI/CD pipelines.
- `workflows/`: Subdirectory containing CI pipeline definitions (`ci.yml`, `deploy.yml`).

### `docs/`
Contains project documentation, architecture specifications, audit logs, prompts, and visual assets.
- `AGENTS.md`: Agent behavior guidelines and workflow specifications.
- `API_REFERENCE.md`: Documentation for HTTP & WebSocket API endpoints.
- `ARCHITECTURE.md`: Core system design, execution model, and data flow documentation.
- `ARCHITECTURE_DOCS.md`: Comprehensive documentation system guidelines.
- `ARCHITECTURE_INFRA.md`: Infrastructure, deployment, and containerization specifications.
- `ARCHITECTURE_V2.md` through `ARCHITECTURE_V15.md`: Versioned architectural iterations and feature evolution logs.
- `AUDIT_CLOSURE_PROMPT.md`: System audit prompt definitions.
- `AUDIT_CLOSURE_ROUND2.md`: Round 2 system audit resolution summary.
- `BROWSER_AGENT_QUEUE_ROUND2.md`: Browser agent automation task queue for audit verification.
- `CONTRIBUTING.md`: Developer contribution guidelines and repository setup instructions.
- `CURRENT_STRUCTURE.md`: Current complete project directory structure and repository architecture report.
- `FINAL_STRICT_AUDIT.md`: Strict system audit requirements and checklists.
- `FINAL_STRICT_AUDIT_RESULTS.json`: JSON output of automated audit assertion results.
- `FINAL_STRICT_AUDIT_RESULTS.md`: Detailed report of final strict audit findings.
- `FULL_PRODUCT_POLISH_PROMPT (1).md`: Product polish instructions and UI quality requirements.
- `NODE_AUDIT.md`: Audit checklist and status report for canvas node components.
- `NODE_AUTHORING_GUIDE.md`: Guide for creating custom node definitions and execution handlers.
- `PRODUCT_POLISH_ROUND2.md`: Second-pass product polish tracker.
- `PRODUCT_POLISH_ROUND3.md`: Third-pass product polish tracker.
- `README (1).md`: Alternate documentation overview file.
- `TEMPLATE_IMPLEMENTATION_PROMPT.md`: Instructions for template creation and seeding.
- `UI_Screenshots.md`: Catalog of application UI interface screenshots.
- `USE_CASES.md`: Real-world workflow automation use cases.
- `VIDEO_WALKTHROUGH.md`: Video recording script and walkthrough notes.
- `images/`: Subdirectory storing static visual assets for documentation (`canvas_editor.png`, `landing_page.png`).
- `screenshots/`: Subdirectory storing visual UI screenshots captured during automated test runs.

### `e2e/`
Contains end-to-end audit scripts for browser testing.
- `live_browser_audit.ts`: Live browser testing script validating active frontend interactions.

### `playwright-report/`
Contains HTML test reports generated by Playwright test runs.
- `index.html`: Entry point HTML file for viewing Playwright E2E test execution reports.

### `public/`
Contains static public assets served directly by the web application.
- `thumbnails/`: Subdirectory storing PNG preview icons for workflow templates (`tmpl-cron-task.png`, `tmpl-daily-quote.png`, `tmpl-data-logger.png`, `tmpl-sentiment-analysis.png`, `tmpl-summarize-slack.png`, `tmpl-text-transformer.png`).

### `src/`
Contains the entire application source code, including frontend React components, canvas engine, node definitions, and backend Express server.
- `App.tsx`: Top-level React container component with routing and modal state.
- `canvas/`: Subdirectory containing React Flow canvas components (`Canvas.tsx`, `ConfigPanel.tsx`, `Sidebar.tsx`, `Dashboard.tsx`, etc.), sidebar tools, log panels, modal dialogs, and real-time Yjs synchronization hooks (`hooks/useYjsSync.ts`).
- `components/`: Subdirectory for shared UI components (`TemplateCloneModal.tsx`).
- `engine/`: Subdirectory containing workflow DAG topology sorting logic (`topoSort.ts`) and unit tests (`topoSort.test.ts`).
- `index.css`: Global CSS design tokens, Tailwind directives, and custom styling.
- `main.tsx`: Client application entry point mounting React root onto DOM.
- `nodes/`: Subdirectory containing node definitions (`definition.json`), manifests (`manifest.json`), unit tests (`run.test.ts`), and execution handlers (`run.ts`) for built-in nodes (`branch`, `code-execution`, `cron-trigger`, `email`, `file-trigger`, `http-webhook`, `llm-prompt`, `loop`, `mcp-tool`, `sqlite-storage`, `sticky-note`, `text-transform`, `vector-retrieve`, `vector-store`, `vision-ocr`, `webhook-trigger`) and `community/` nodes.
- `pages/`: Subdirectory for top-level application view pages (`Templates.tsx`).
- `server/`: Subdirectory containing Express backend (`server.ts`), SQLite database access (`db.ts`), JWT authentication (`auth.ts`), WebSocket event signaling (`events.ts`), sandbox code execution worker (`sandbox.ts`, `sandbox-worker.ts`), MCP server integration (`mcp-server.ts`), analytics (`analytics.ts`), and unit test suite (`__tests__/`).

### `test-results/`
Contains temporary output artifacts from Playwright test execution.
- `.last-run.json`: Playwright metadata recording the status and timestamps of the most recent test run.

### `tests/`
Contains Playwright automated test suites and test helper scripts.
- `adversarial.spec.ts`: E2E test suite asserting resilience against malformed inputs and edge cases.
- `all-nodes-audit.spec.ts`: E2E test suite validating all canvas node types in action.
- `canvas.spec.ts`: Core canvas interaction E2E test suite (drag-drop, edge connections, node execution).
- `helpers/`: Subdirectory containing test setup helpers (`navigateToCanvas.ts`).
- `screenshots-gen.spec.ts`: Automated screenshot generator spec for documentation assets.
- `strict-audit.spec.ts`: Complete end-to-end verification audit suite.

---

## 3. Package Manifests & Dependencies

### Root `package.json`
Location: `./package.json`

- **Dependencies**:
  - `@modelcontextprotocol/sdk`
  - `@types/jsonwebtoken`
  - `@types/nodemailer`
  - `cors`
  - `dotenv`
  - `express`
  - `jsonwebtoken`
  - `lucide-react`
  - `nodemailer`
  - `openai`
  - `pg`
  - `pino`
  - `pino-pretty`
  - `react`
  - `react-dom`
  - `reactflow`
  - `sqlite3`
  - `tesseract.js`
  - `ws`
  - `y-websocket`
  - `yjs`

- **devDependencies**:
  - `@playwright/test`
  - `@types/cors`
  - `@types/express`
  - `@types/node`
  - `@types/pg`
  - `@types/react`
  - `@types/react-dom`
  - `@types/sqlite3`
  - `@types/ws`
  - `@typescript-eslint/eslint-plugin`
  - `@typescript-eslint/parser`
  - `@vitejs/plugin-react`
  - `autoprefixer`
  - `concurrently`
  - `eslint`
  - `postcss`
  - `tailwindcss`
  - `tsx`
  - `typescript`
  - `vite`
  - `vitest`

*(Note: No other `package.json` files exist in subdirectories.)*

---

## 4. Frontend & Backend Architectural Separation Status

- **Repository Structure**: Frontend (`src/App.tsx`, `src/canvas/`, `src/components/`, `src/pages/`) and Backend (`src/server/`, `src/engine/`, `src/nodes/`) currently **live together in one single repository** (`open_flow`) governed by a single root `package.json`.
- **Process Execution**: In development mode (`npm run dev`), frontend and backend run as **two separate processes** orchestrated concurrently:
  - **Frontend process**: Vite dev server serving the React SPA (`npm run dev:frontend` -> `vite` on port 5173 / 3000).
  - **Backend process**: Express server running via `tsx` on Node.js (`npm run dev:backend` -> `tsx src/server/server.ts` on port 3001), handling REST endpoints, WebSocket signaling, SQLite database access, and workflow sandbox execution.
