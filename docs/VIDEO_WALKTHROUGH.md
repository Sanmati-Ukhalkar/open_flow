# Video Walkthrough Script & Outline

This document outlines the script, timing, visual cues, and recording steps for the official OpenFlow video walkthrough.

- **Target Length**: 4 to 6 minutes
- **Aspect Ratio**: 16:9 (1080p or 4K resolution)
- **Voiceover Tone**: Professional, clear, concise, and developer-focused. Avoid hype; focus on utility.

---

## Storyboard & Script Outline

### Scene 1: Pitch & The Problem (0:00 - 0:30)
- **Visuals**: Start with a close-up of the OpenFlow landing canvas with a few connections. Zoom out to show the interface. Show a quick text/image overlay comparing Cursor, n8n, and custom code.
- **Voiceover (VO)**: 
  > "Developers and AI teams today are juggling a fragmented toolkit. Coding assistants, custom orchestration frameworks, and generic automation tools. Integrating them means rewriting the same patterns from scratch.
  > 
  > OpenFlow is an open-source, visual canvas built AI and MCP-first from the ground up. Instead of grafting AI onto a legacy automation engine, OpenFlow makes LLMs, MCP servers, and vector databases first-class building blocks."

### Scene 2: Building a Workflow Live (0:30 - 2:00)
- **Visuals**: Clear the canvas. Start dragging nodes from the sidebar:
  1. Drag a **Webhook Trigger** node.
  2. Drag an **LLM Prompt** node and connect the trigger to it.
  3. Drag a **Text Transform** node and connect the LLM output.
  4. Drag a **HTTP Webhook** (Slack) node and connect the Text Transform output.
- **Visuals**: Show configuration panel edits:
  - Click the **LLM Prompt** node. Enter `Analyze the sentiment of this feedback: {{webhook-trigger.body.message}}`. Select `llama-3.1-8b-instant`.
  - Click the **Text Transform** node. Enter template: `Sentiment Analysis Result: {{llm-prompt.text}}`.
- **VO**:
  > "Let's build a real-time sentiment analysis and notification pipeline. We start with a Webhook Trigger node. 
  > 
  > We drag in our LLM Prompt node. OpenFlow supports models from OpenAI and Groq out of the box. We'll write our prompt and interpolate the incoming webhook payload. 
  > 
  > Next, we add a Text Transform node to format the output, and connect it to a Slack notification webhook. Building pipelines is as simple as drag, connect, and configure."

### Scene 3: Running & Handled Failure (2:00 - 3:30)
- **Visuals**: 
  - Click **Run Workflow**. Show nodes turning green one by one (running state -> success).
  - Open the output panel and show the generated text.
  - Now, deliberately edit the HTTP Webhook URL to be invalid (e.g., remove the webhook token) or misconfigure the LLM node prompt to trigger a failure.
  - Click **Run Workflow** again. Show the failing node outline turning red with an error icon.
  - Click the red node. Show the sidebar sliding open with a plain-language error message: `INVALID_API_KEY` or `URL_UNREACHABLE`, showing the exact inputs received.
  - Fix the config, click **Retry Node**, and show the run completing successfully.
- **VO**:
  > "Let's trigger a run. The workflow executes. Each node changes state dynamically: from idle, to running, to success. In the output panel, we see the real-time LLM response.
  > 
  > But real-world API calls fail. If we misconfigure a node, the execution stops. Downstream nodes are skipped to save costs, and the failed node turns red.
  > 
  > Clicking the node expands a detailed panel containing the plain-language error message and the exact input payload. We can fix the config and retry the execution starting from this specific node, reusing cached upstream data without re-running the entire workflow."

### Scene 4: Advanced Features Montage (3:30 - 4:30)
- **Visuals**: Quick, smooth edits showing:
  - The node library sidebar showing MCP tool nodes, SQLite storage, OCR, and Code Execution.
  - Toggling deployment: Click the **Deploy** tab, show deploying the workflow as a live HTTP API endpoint, copy the bearer token.
  - Real-time collaboration: Show two mouse cursors on the canvas editing the same workflow simultaneously (Yjs in action).
- **VO**:
  > "OpenFlow extends beyond simple chains. You can connect Model Context Protocol (MCP) servers to expose local databases, filesystem commands, and tools directly to your models.
  > 
  > With a single click, deploy your visual workflow as a production-ready HTTP endpoint, secured by bearer tokens. Multiple team members can collaborate on the same canvas in real-time, backed by SQLite persistence."

### Scene 5: Outro & Call to Action (4:30 - 5:00)
- **Visuals**: Show OpenFlow's GitHub repository page. Highlight the star button. Fade to a slide showing:
  - Repository URL: `https://github.com/Sanmati-Ukhalkar/open_flow`
  - Command: `docker compose up`
- **VO**:
  > "OpenFlow is fully open-source and ready to host. Run it locally with docker compose, or star us on GitHub to join the community. We can't wait to see what you build. Thank you!"

---

## Production Checklist

- [ ] Use a high-quality microphone with pop filter.
- [ ] Record in a quiet environment.
- [ ] Hide browser bookmarks bar and clean up system tray icons.
- [ ] Set browser zoom to 110% - 120% for readability.
- [ ] Cut out verbal filler ("um", "ah") during editing.
- [ ] Add captions/subtitles (essential for muted autoplays).
