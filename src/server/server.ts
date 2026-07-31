import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { db } from './db';
import { encrypt } from './crypto';
import { hashPassword, generateSessionToken, authenticateToken, AuthenticatedRequest } from './auth';
import { executeRunBackend } from './engine';
import { run as runLLMPrompt } from '../nodes/llm-prompt/run';
import { run as runMCPTool } from '../nodes/mcp-tool/run';
import { run as runHTTPWebhook } from '../nodes/http-webhook/run';
import { run as runSQLiteStorage } from '../nodes/sqlite-storage/run';
import { run as runTextTransform } from '../nodes/text-transform/run';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: { message: 'Email and password are required.' } });
  }

  const userId = `usr-${Math.random().toString(36).substr(2, 9)}`;
  const passwordHash = hashPassword(password);

  db.run(
    'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
    [userId, email, passwordHash],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ success: false, error: { message: 'User already exists with this email address.' } });
        }
        return res.status(500).json({ success: false, error: { message: err.message } });
      }

      const token = generateSessionToken(userId, email);
      return res.json({ success: true, token, user: { id: userId, email } });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: { message: 'Email and password are required.' } });
  }

  const passwordHash = hashPassword(password);

  db.get(
    'SELECT * FROM users WHERE email = ? AND password_hash = ?',
    [email, passwordHash],
    (err, user: any) => {
      if (err) {
        return res.status(500).json({ success: false, error: { message: err.message } });
      }
      if (!user) {
        return res.status(400).json({ success: false, error: { message: 'Invalid credentials. Please verify your email and password.' } });
      }

      const token = generateSessionToken(user.id, user.email);
      return res.json({ success: true, token, user: { id: user.id, email: user.email } });
    }
  );
});

// -------------------------------------------------------------
// CREDENTIALS ROUTES
// -------------------------------------------------------------

app.get('/api/credentials', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  db.all('SELECT provider FROM credentials WHERE user_id = ?', [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
    return res.json({ success: true, credentials: rows });
  });
});

app.post('/api/credentials', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { provider, apiKey } = req.body;

  if (!provider || !apiKey) {
    return res.status(400).json({ success: false, error: { message: 'Provider and API key are required.' } });
  }

  const id = `cred-${Math.random().toString(36).substr(2, 9)}`;
  const encryptedKey = encrypt(apiKey);

  db.run(
    `INSERT INTO credentials (id, user_id, provider, encrypted_key)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET encrypted_key = excluded.encrypted_key`,
    [id, userId, provider, encryptedKey],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, error: { message: err.message } });
      }
      return res.json({ success: true });
    }
  );
});

app.delete('/api/credentials/:provider', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { provider } = req.params;

  db.run(
    'DELETE FROM credentials WHERE user_id = ? AND provider = ?',
    [userId, provider],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, error: { message: err.message } });
      }
      return res.json({ success: true });
    }
  );
});

// -------------------------------------------------------------
// WORKFLOWS ROUTES
// -------------------------------------------------------------

app.get('/api/workflows', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  db.all('SELECT * FROM workflows WHERE owner_id = ? ORDER BY updated_at DESC', [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
    return res.json({ success: true, workflows: rows.map((r: any) => ({ ...r, graph: JSON.parse(r.graph_json) })) });
  });
});

app.post('/api/workflows', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { name, graph } = req.body;

  if (!name || !graph) {
    return res.status(400).json({ success: false, error: { message: 'Workflow name and graph definitions are required.' } });
  }

  const id = `wf-${Math.random().toString(36).substr(2, 9)}`;
  const graphJson = JSON.stringify(graph);

  db.run(
    'INSERT INTO workflows (id, name, graph_json, owner_id) VALUES (?, ?, ?, ?)',
    [id, name, graphJson, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, error: { message: err.message } });
      }
      return res.json({ success: true, workflow: { id, name, graph } });
    }
  );
});

app.get('/api/workflows/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.get('SELECT * FROM workflows WHERE id = ? AND owner_id = ?', [id, userId], (err, row: any) => {
    if (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
    if (!row) {
      return res.status(404).json({ success: false, error: { message: 'Workflow not found.' } });
    }
    return res.json({ success: true, workflow: { ...row, graph: JSON.parse(row.graph_json) } });
  });
});

app.put('/api/workflows/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { name, graph } = req.body;

  if (!name || !graph) {
    return res.status(400).json({ success: false, error: { message: 'Workflow name and graph definitions are required.' } });
  }

  const graphJson = JSON.stringify(graph);

  db.run(
    'UPDATE workflows SET name = ?, graph_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?',
    [name, graphJson, id, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, error: { message: err.message } });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, error: { message: 'Workflow not found.' } });
      }
      return res.json({ success: true, workflow: { id, name, graph } });
    }
  );
});

app.delete('/api/workflows/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.run('DELETE FROM workflows WHERE id = ? AND owner_id = ?', [id, userId], function (err) {
    if (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: { message: 'Workflow not found.' } });
    }
    return res.json({ success: true });
  });
});

// -------------------------------------------------------------
// RUN ORCHESTRATION ROUTES
// -------------------------------------------------------------

// Start server-side run execution in the background
app.post('/api/workflows/:id/run', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.get('SELECT * FROM workflows WHERE id = ? AND owner_id = ?', [id, userId], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
    if (!row) {
      return res.status(404).json({ success: false, error: { message: 'Workflow not found.' } });
    }

    const runId = `run-${Math.random().toString(36).substr(2, 9)}`;
    db.run(
      'INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, ?)',
      [runId, id, 'running'],
      function (runErr) {
        if (runErr) {
          return res.status(500).json({ success: false, error: { message: runErr.message } });
        }

        // Trigger execution asynchronously in the background
        executeRunBackend(runId, id, userId);

        return res.json({ success: true, runId });
      }
    );
  });
});

// Retry single node in a run
app.post('/api/runs/:runId/retry', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { runId } = req.params;
  const { nodeId } = req.body;

  if (!nodeId) {
    return res.status(400).json({ success: false, error: { message: 'Node ID is required for retry.' } });
  }

  db.get(
    'SELECT runs.*, workflows.owner_id FROM runs JOIN workflows ON runs.workflow_id = workflows.id WHERE runs.id = ?',
    [runId],
    (err, run: any) => {
      if (err) {
        return res.status(500).json({ success: false, error: { message: err.message } });
      }
      if (!run || run.owner_id !== userId) {
        return res.status(404).json({ success: false, error: { message: 'Run not found.' } });
      }

      // Reset run status to running
      db.run(
        'UPDATE runs SET status = ?, finished_at = NULL WHERE id = ?',
        ['running', runId],
        function (updateErr) {
          if (updateErr) {
            return res.status(500).json({ success: false, error: { message: updateErr.message } });
          }

          // Trigger retry execution asynchronously in the background
          executeRunBackend(runId, run.workflow_id, userId, nodeId);

          return res.json({ success: true, runId });
        }
      );
    }
  );
});

// Poll status of all execution results for a run
app.get('/api/runs/:runId', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { runId } = req.params;

  db.get(
    'SELECT runs.*, workflows.owner_id FROM runs JOIN workflows ON runs.workflow_id = workflows.id WHERE runs.id = ?',
    [runId],
    (err, run: any) => {
      if (err) {
        return res.status(500).json({ success: false, error: { message: err.message } });
      }
      if (!run || run.owner_id !== userId) {
        return res.status(404).json({ success: false, error: { message: 'Run not found.' } });
      }

      db.all(
        'SELECT * FROM run_node_results WHERE run_id = ?',
        [runId],
        (resultsErr, rows) => {
          if (resultsErr) {
            return res.status(500).json({ success: false, error: { message: resultsErr.message } });
          }

          const nodesStatus: Record<string, any> = {};
          rows.forEach((r: any) => {
            nodesStatus[r.node_id] = {
              status: r.status,
              output: r.output_json ? JSON.parse(r.output_json) : undefined,
              error: r.error_json ? JSON.parse(r.error_json) : undefined
            };
          });

          return res.json({
            success: true,
            run: {
              id: run.id,
              workflow_id: run.workflow_id,
              status: run.status,
              started_at: run.started_at,
              finished_at: run.finished_at,
              nodes: nodesStatus
            }
          });
        }
      );
    }
  );
});

// Get all execution run logs for a workflow
app.get('/api/workflows/:id/runs', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.get('SELECT * FROM workflows WHERE id = ? AND owner_id = ?', [id, userId], (err, workflow: any) => {
    if (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
    if (!workflow) {
      return res.status(404).json({ success: false, error: { message: 'Workflow not found.' } });
    }

    db.all(
      'SELECT * FROM runs WHERE workflow_id = ? ORDER BY started_at DESC',
      [id],
      (runsErr, rows) => {
        if (runsErr) {
          return res.status(500).json({ success: false, error: { message: runsErr.message } });
        }
        return res.json({ success: true, runs: rows });
      }
    );
  });
});

// -------------------------------------------------------------
// LEGACY ROUTE (dev fallback)
// -------------------------------------------------------------
app.get('/api/mcp/tools', async (_req, res) => {
  const serverPath = path.resolve(process.cwd(), 'src/server/mcp-server.ts');
  const transport = new StdioClientTransport({
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ["tsx", serverPath]
  });

  const client = new Client({
    name: "open-flow-express-client",
    version: "0.1.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    const toolsResult = await client.listTools();
    await transport.close();
    
    return res.json({ success: true, tools: toolsResult.tools });
  } catch (error: any) {
    console.error("Error listing MCP tools:", error);
    try {
      await transport.close();
    } catch {}
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/run-node', async (req, res) => {
  const { nodeType, config, input } = req.body;
  try {
    let output: any;
    if (nodeType === 'llm-prompt') {
      output = await runLLMPrompt(input || {}, config || {});
    } else if (nodeType === 'mcp-tool') {
      output = await runMCPTool(input || {}, config || {});
    } else if (nodeType === 'http-webhook') {
      output = await runHTTPWebhook(input || {}, config || {});
    } else if (nodeType === 'sqlite-storage') {
      output = await runSQLiteStorage(input || {}, config || {});
    } else if (nodeType === 'text-transform') {
      output = await runTextTransform(input || {}, config || {});
    } else {
      return res.status(400).json({ success: false, error: { message: 'Invalid node type.' } });
    }
    return res.json({ success: true, output });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
