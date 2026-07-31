# Open Flow 🌊

**An open-source, no-code, drag-and-drop canvas for composing AI tool-calls and MCP servers into runnable, deployable workflows.**

"n8n for MCP" — automation-native for AI, not AI bolted onto automation.

---

## 🚀 Vision

Open Flow is designed for users who want to chain AI steps together without writing code, using **AI-native building blocks**. The node model, the canvas, and the workflow engine are designed around AI tool-calling as the default case.

## 🖼️ Starter Templates

Kickstart your workflow automations with these gorgeous, pre-configured blueprints:

### Summarize and Slack it
*Takes input text, uses an LLM to generate a concise summary, and posts the result to a Slack webhook.*  
<img src="public/thumbnails/tmpl-summarize-slack.png" width="400" />

### Data-to-SQLite Logger
*Listens for incoming HTTP webhook requests and logs the payload directly into a local SQLite database table.*  
<img src="public/thumbnails/tmpl-data-logger.png" width="400" />

### Basic Cron Task
*Runs on a scheduled interval (e.g., every 5 minutes) and pings a health-check or heartbeat URL.*  
<img src="public/thumbnails/tmpl-cron-task.png" width="400" />

### AI Text Transformer
*Takes a webhook input, transforms it using an LLM, and formats the output.*  
<img src="public/thumbnails/tmpl-text-transformer.png" width="400" />

### Customer Feedback Sentiment Analysis
*Listens for customer feedback via webhook, analyzes the sentiment (Positive/Neutral/Negative) using an LLM, and stores the structured result into a local database.*  
<img src="public/thumbnails/tmpl-sentiment-analysis.png" width="400" />

### Daily Inspirational Slack Quote
*A daily morning task that prompts an LLM for an inspiring quote and sends it to Slack.*  
<img src="public/thumbnails/tmpl-daily-quote.png" width="400" />

---

## 🛠 Features

- **No-Code Drag-and-Drop Canvas:** Powered by React Flow and Yjs for real-time collaborative editing.
- **Workflow Engine:** Built-in validation, topological execution, and real-time streaming status.
- **Organization & RBAC Support:** Granular team access and role-based controls.
- **Observability:** Granular run analytics, token cost monitoring, and execution tracking out of the box.
- **Deployments:** Provision production-ready webhook trigger URLs instantly.

## 💻 Tech Stack
- **Frontend:** React, Vite, TailwindCSS, React Flow, Yjs
- **Backend:** Node.js, Express, WebSocket, SQLite
- **AI Integrations:** LLMs (OpenAI SDK), Model Context Protocol (MCP)

## 📦 Quickstart

```bash
# Clone the repository
git clone https://github.com/Sanmati-Ukhalkar/open_flow.git
cd open_flow

# Install dependencies
npm install

# Start the dev server (frontend + backend)
npm run dev
```

Visit `http://localhost:5173` to get started!

---
*Built for the future of AI automation.*