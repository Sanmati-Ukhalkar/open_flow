import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
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
// API DEPLOYMENTS & VERSIONING ROUTES
// -------------------------------------------------------------

// Rate limiting map
const rateLimits = new Map<string, number[]>();

function checkRateLimit(deploymentId: string, limitPerMinute: number = 30): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(deploymentId) || [];
  const oneMinuteAgo = now - 60000;
  const activeTimestamps = timestamps.filter(t => t > oneMinuteAgo);
  
  if (activeTimestamps.length >= limitPerMinute) {
    return false;
  }
  
  activeTimestamps.push(now);
  rateLimits.set(deploymentId, activeTimestamps);
  return true;
}

// Public Callable API Deployment execution path
app.post('/api/deployments/:id/execute', async (req, res) => {
  const { id } = req.params;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Bearer API token is required to execute this deployment.' });
  }

  db.get('SELECT * FROM deployments WHERE id = ?', [id], async (err, deployment: any) => {
    if (err) {
      return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    if (!deployment) {
      return res.status(404).json({ error: 'Not Found', message: 'Deployment not found.' });
    }
    if (deployment.status !== 'active') {
      return res.status(403).json({ error: 'Forbidden', message: 'This deployment is currently paused.' });
    }
    if (deployment.bearer_token !== token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid bearer API token.' });
    }

    // Apply Rate Limiting
    if (!checkRateLimit(id)) {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Rate limit cap exceeded. Maximum 30 requests/minute.' });
    }

    // Fetch the version of the workflow
    db.get('SELECT * FROM workflow_versions WHERE id = ?', [deployment.workflow_version_id], async (verErr, version: any) => {
      if (verErr || !version) {
        return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve deployed version.' });
      }

      // Fetch the owner of the workflow to resolve credentials correctly
      db.get('SELECT owner_id FROM workflows WHERE id = ?', [deployment.workflow_id], async (wfErr, workflow: any) => {
        if (wfErr || !workflow) {
          return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve owner details.' });
        }

        const runId = `run-${Math.random().toString(36).substr(2, 9)}`;
        
        // Log the start of this run in the DB
        db.run(
          'INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, ?)',
          [runId, deployment.workflow_id, 'running'],
          async (insertErr) => {
            if (insertErr) {
              return res.status(500).json({ error: 'Internal Server Error', message: insertErr.message });
            }

            // Update deployment stats
            db.run(
              'UPDATE deployments SET request_count = request_count + 1, last_called_at = CURRENT_TIMESTAMP WHERE id = ?',
              [id]
            );

            // Execute the run synchronously (await it)
            await executeRunBackend(runId, deployment.workflow_id, workflow.owner_id, undefined, version.id, req.body);

            // Fetch results
            db.all('SELECT * FROM run_node_results WHERE run_id = ?', [runId], (resErr, results: any[]) => {
              if (resErr) {
                return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to read run results.' });
              }

              // Determine output nodes
              const graph = JSON.parse(version.graph_json);
              const nodes = graph.nodes || [];
              const edges = graph.edges || [];

              // Output nodes are marked as isOutputNode or are leaf nodes (nodes with no outgoing edges)
              let outputNodeIds = nodes.filter((n: any) => n.data?.isOutputNode).map((n: any) => n.id);
              
              if (outputNodeIds.length === 0) {
                // Default to leaf nodes
                outputNodeIds = nodes.filter((n: any) => {
                  const hasOutgoing = edges.some((e: any) => e.source === n.id);
                  return !hasOutgoing;
                }).map((n: any) => n.id);
              }

              const outputResults: Record<string, any> = {};
              results.forEach(r => {
                if (outputNodeIds.includes(r.node_id)) {
                  outputResults[r.node_id] = {
                    status: r.status,
                    output: r.output_json ? JSON.parse(r.output_json) : undefined,
                    error: r.error_json ? JSON.parse(r.error_json) : undefined
                  };
                }
              });

              db.get('SELECT status FROM runs WHERE id = ?', [runId], (_statusErr, runStatus: any) => {
                return res.json({
                  success: true,
                  runId,
                  status: runStatus?.status || 'unknown',
                  outputs: outputResults
                });
              });
            });
          }
        );
      });
    });
  });
});

// GET user's active deployments
app.get('/api/deployments', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  db.all(
    `SELECT deployments.*, workflows.name as workflow_name
     FROM deployments
     JOIN workflows ON deployments.workflow_id = workflows.id
     WHERE workflows.owner_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: { message: err.message } });
      return res.json({ success: true, deployments: rows });
    }
  );
});

// Deploy or redeploy a workflow
app.post('/api/deployments', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { workflowId } = req.body;

  if (!workflowId) {
    return res.status(400).json({ success: false, error: { message: 'Workflow ID is required.' } });
  }

  db.get('SELECT * FROM workflows WHERE id = ? AND owner_id = ?', [workflowId, userId], (err, workflow: any) => {
    if (err || !workflow) {
      return res.status(404).json({ success: false, error: { message: 'Workflow not found.' } });
    }

    const versionId = `ver-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create version snapshot
    db.run(
      'INSERT INTO workflow_versions (id, workflow_id, graph_json) VALUES (?, ?, ?)',
      [versionId, workflowId, workflow.graph_json],
      (verErr) => {
        if (verErr) {
          return res.status(500).json({ success: false, error: { message: verErr.message } });
        }

        const deployId = `dep-${Math.random().toString(36).substr(2, 9)}`;
        const token = `tok_${crypto.randomBytes(24).toString('hex')}`;

        // Create or update deployment to point to new version
        db.run(
          `INSERT INTO deployments (id, workflow_id, workflow_version_id, bearer_token, status)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(workflow_id) DO UPDATE SET
             workflow_version_id = excluded.workflow_version_id,
             updated_at = CURRENT_TIMESTAMP`,
          [deployId, workflowId, versionId, token, 'active'],
          function (deployErr) {
            if (deployErr) {
              return res.status(500).json({ success: false, error: { message: deployErr.message } });
            }

            // Get final deployment details
            db.get('SELECT * FROM deployments WHERE workflow_id = ?', [workflowId], (_selErr, deployment: any) => {
              return res.json({
                success: true,
                deployment: {
                  ...deployment,
                  workflow_name: workflow.name
                }
              });
            });
          }
        );
      }
    );
  });
});

// Toggle deployment between active and paused
app.post('/api/deployments/:id/toggle', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'active' && status !== 'paused') {
    return res.status(400).json({ success: false, error: { message: 'Invalid status. Expected active or paused.' } });
  }

  db.get(
    `SELECT deployments.* FROM deployments
     JOIN workflows ON deployments.workflow_id = workflows.id
     WHERE deployments.id = ? AND workflows.owner_id = ?`,
    [id, userId],
    (err, row) => {
      if (err || !row) {
        return res.status(404).json({ success: false, error: { message: 'Deployment not found.' } });
      }

      db.run(
        'UPDATE deployments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ success: false, error: { message: updateErr.message } });
          return res.json({ success: true, status });
        }
      );
    }
  );
});

// Regenerate Bearer API Token
app.post('/api/deployments/:id/token', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.get(
    `SELECT deployments.* FROM deployments
     JOIN workflows ON deployments.workflow_id = workflows.id
     WHERE deployments.id = ? AND workflows.owner_id = ?`,
    [id, userId],
    (err, row) => {
      if (err || !row) {
        return res.status(404).json({ success: false, error: { message: 'Deployment not found.' } });
      }

      const newToken = `tok_${crypto.randomBytes(24).toString('hex')}`;
      db.run(
        'UPDATE deployments SET bearer_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newToken, id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ success: false, error: { message: updateErr.message } });
          return res.json({ success: true, token: newToken });
        }
      );
    }
  );
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
