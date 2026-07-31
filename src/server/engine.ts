import { db } from './db';
import { decrypt } from './crypto';
import { topoSort } from '../engine/topoSort';
import { run as runLLMPrompt } from '../nodes/llm-prompt/run';
import { run as runMCPTool } from '../nodes/mcp-tool/run';
import { run as runHTTPWebhook } from '../nodes/http-webhook/run';
import { run as runSQLiteStorage } from '../nodes/sqlite-storage/run';
import { run as runTextTransform } from '../nodes/text-transform/run';
import path from 'path';
import fs from 'fs';

// Promise wrapper utilities for SQLite callbacks
const dbRun = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbAll = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper to validate output schema against definition
function checkOutputSchema(nodeType: string, output: any): { isValid: boolean; warning?: string } {
  try {
    const definitionPath = path.resolve(process.cwd(), `src/nodes/${nodeType}/definition.json`);
    if (!fs.existsSync(definitionPath)) {
      return { isValid: true };
    }
    const definition = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));
    const schema = definition.outputSchema;
    if (!schema) {
      return { isValid: true };
    }

    if (schema.type === 'object') {
      const dataToValidate = output.data !== undefined ? output.data : output;
      if (typeof dataToValidate !== 'object' || dataToValidate === null) {
        return { isValid: false, warning: `Output is not an object. Expected: ${schema.type}.` };
      }

      if (schema.properties) {
        for (const key of Object.keys(schema.properties)) {
          const propSchema = schema.properties[key];
          const val = dataToValidate[key];
          if (val === undefined) continue;
          
          const valType = typeof val;
          if (propSchema.type === 'string' && valType !== 'string') {
            return { isValid: false, warning: `Property '${key}' is of type '${valType}'. Expected: 'string'.` };
          }
          if (propSchema.type === 'number' && valType !== 'number') {
            return { isValid: false, warning: `Property '${key}' is of type '${valType}'. Expected: 'number'.` };
          }
          if (propSchema.type === 'boolean' && valType !== 'boolean') {
            return { isValid: false, warning: `Property '${key}' is of type '${valType}'. Expected: 'boolean'.` };
          }
          if (propSchema.type === 'object' && valType !== 'object') {
            return { isValid: false, warning: `Property '${key}' is of type '${valType}'. Expected: 'object'.` };
          }
        }
      }
    }
    return { isValid: true };
  } catch {
    return { isValid: true };
  }
}

// Find downstream descendants in a given list of edges
function getDownstreamDescendants(nodeId: string, edges: any[]): string[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = edges.filter(e => e.source === current).map(e => e.target);
    for (const child of children) {
      if (!visited.has(child)) {
        visited.add(child);
        queue.push(child);
      }
    }
  }
  return Array.from(visited);
}

// Main server-side DAG execution engine
export async function executeRunBackend(
  runId: string,
  workflowId: string,
  userId: string,
  startNodeId?: string,
  versionId?: string,
  initialInput?: any
) {
  try {
    let graphJson: string;
    if (versionId) {
      const version = await dbGet('SELECT * FROM workflow_versions WHERE id = ?', [versionId]);
      if (!version) {
        await dbRun('UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?', ['failed', runId]);
        return;
      }
      graphJson = version.graph_json;
    } else {
      const workflow = await dbGet('SELECT * FROM workflows WHERE id = ?', [workflowId]);
      if (!workflow) {
        await dbRun('UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?', ['failed', runId]);
        return;
      }
      graphJson = workflow.graph_json;
    }

    const graph = JSON.parse(graphJson);
    const { nodes, edges } = graph;

    // Check for cycles
    try {
      topoSort(nodes, edges);
    } catch (err: any) {
      await dbRun('UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?', ['failed', runId]);
      return;
    }

    // 2. Fetch existing results if this is a retry, or initialize all to idle
    const existingResults = await dbAll('SELECT * FROM run_node_results WHERE run_id = ?', [runId]);
    const nodeStatuses = new Map<string, string>();
    const nodeOutputs = new Map<string, any>();
    const nodeErrors = new Map<string, any>();

    let resetNodeIds: string[] = [];
    if (startNodeId) {
      const descendants = getDownstreamDescendants(startNodeId, edges);
      resetNodeIds = [startNodeId, ...descendants];
    }

    // Populate node states map
    nodes.forEach((node: any) => {
      const existing = existingResults.find(r => r.node_id === node.id);
      if (existing && !resetNodeIds.includes(node.id)) {
        nodeStatuses.set(node.id, existing.status);
        if (existing.output_json) {
          nodeOutputs.set(node.id, JSON.parse(existing.output_json));
        }
        if (existing.error_json) {
          nodeErrors.set(node.id, JSON.parse(existing.error_json));
        }
      } else {
        nodeStatuses.set(node.id, 'idle');
      }
    });

    // Write database rows for newly reset or initialized nodes
    for (const node of nodes) {
      const existing = existingResults.find(r => r.node_id === node.id);
      if (existing) {
        if (resetNodeIds.includes(node.id) || !startNodeId) {
          await dbRun(
            'UPDATE run_node_results SET status = ?, output_json = NULL, error_json = NULL WHERE id = ?',
            ['idle', existing.id]
          );
        }
      } else {
        await dbRun(
          'INSERT INTO run_node_results (id, run_id, node_id, status) VALUES (?, ?, ?, ?)',
          [`res-${Math.random().toString(36).substr(2, 9)}`, runId, node.id, 'idle']
        );
      }
    }

    const schedulerStep = async () => {
      // Find all idle nodes whose parents have all finished
      const readyNodes = nodes.filter((node: any) => {
        if (nodeStatuses.get(node.id) !== 'idle') return false;

        const incomingEdges = edges.filter((e: any) => e.target === node.id);
        const parents = incomingEdges.map((e: any) => e.source);

        return parents.every((pId: string) => {
          const pStatus = nodeStatuses.get(pId);
          return (
            pStatus === 'success' ||
            pStatus === 'success-with-warning' ||
            pStatus === 'error' ||
            pStatus === 'skipped'
          );
        });
      });

      if (readyNodes.length === 0) {
        const statuses = Array.from(nodeStatuses.values());
        const hasRunning = statuses.some(s => s === 'running');
        if (!hasRunning) {
          // Determine final workflow status
          const hasSuccess = statuses.some(s => s === 'success' || s === 'success-with-warning');
          const hasFailure = statuses.some(s => s === 'error');
          const hasSkipped = statuses.some(s => s === 'skipped');

          let finalStatus = 'success';
          if (hasFailure || hasSkipped) {
            finalStatus = hasSuccess ? 'partial' : 'failed';
          }

          await dbRun(
            'UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
            [finalStatus, runId]
          );
        }
        return;
      }

      // Execute ready nodes concurrently in parallel
      await Promise.all(
        readyNodes.map(async (node: any) => {
          const incomingEdges = edges.filter((e: any) => e.target === node.id);
          const parents = incomingEdges.map((e: any) => e.source);

          // Check if any upstream parent failed or was skipped
          const parentFailedOrSkipped = parents.some((pId: string) => {
            const pStatus = nodeStatuses.get(pId);
            return pStatus === 'error' || pStatus === 'skipped';
          });

          if (parentFailedOrSkipped) {
            nodeStatuses.set(node.id, 'skipped');
            await dbRun(
              'UPDATE run_node_results SET status = ? WHERE run_id = ? AND node_id = ?',
              ['skipped', runId, node.id]
            );
            await schedulerStep();
            return;
          }

          // Compile parent outputs
          let nodeInput: any = {};
          if (parents.length === 0) {
            nodeInput = initialInput || {};
          } else if (parents.length === 1) {
            nodeInput = nodeOutputs.get(parents[0]) || {};
          } else if (parents.length > 1) {
            nodeInput = parents.reduce((acc: any, pId: string) => {
              acc[pId] = nodeOutputs.get(pId) || {};
              return acc;
            }, {} as Record<string, any>);
          }

          // Transition to running
          nodeStatuses.set(node.id, 'running');
          await dbRun(
            'UPDATE run_node_results SET status = ? WHERE run_id = ? AND node_id = ?',
            ['running', runId, node.id]
          );

          // Artificial delay for canvas visualizations
          await new Promise(r => setTimeout(r, 700));

          try {
            let output: any;

            if (node.type === 'llm-prompt') {
              const model = node.data.config?.model || 'llama-3.1-8b-instant';
              const isGroqModel = model.startsWith('llama') || model.startsWith('mixtral') || model.startsWith('gemma');
              const provider = isGroqModel ? 'groq' : 'openai';
              
              // Load user's credential from DB if configured
              const credential = await dbGet(
                'SELECT encrypted_key FROM credentials WHERE user_id = ? AND provider = ?',
                [userId, provider]
              );
              let apiKey = undefined;
              if (credential) {
                try {
                  apiKey = decrypt(credential.encrypted_key);
                } catch (e) {
                  console.error('Failed to decrypt API key credential:', e);
                }
              }

              // Pass decrypted key down inside node run config context
              output = await runLLMPrompt(nodeInput, {
                ...node.data.config,
                apiKey
              });
            } else if (node.type === 'mcp-tool') {
              output = await runMCPTool(nodeInput, node.data.config);
            } else if (node.type === 'http-webhook') {
              output = await runHTTPWebhook(nodeInput, node.data.config);
            } else if (node.type === 'sqlite-storage') {
              output = await runSQLiteStorage(nodeInput, node.data.config);
            } else if (node.type === 'text-transform') {
              output = await runTextTransform(nodeInput, node.data.config);
            } else {
              throw new Error(`Unsupported node type: ${node.type}`);
            }

            // Output Validation
            const validation = checkOutputSchema(node.type, output);
            const status = validation.isValid ? 'success' : 'success-with-warning';

            nodeStatuses.set(node.id, status);
            nodeOutputs.set(node.id, output);

            const outputToSave = validation.isValid 
              ? output 
              : { ...output, warning: validation.warning };

            await dbRun(
              'UPDATE run_node_results SET status = ?, output_json = ? WHERE run_id = ? AND node_id = ?',
              [status, JSON.stringify(outputToSave), runId, node.id]
            );

          } catch (err: any) {
            const errorPayload = {
              code: err.code || 'EXECUTION_ERROR',
              message: err.message || 'An error occurred during execution.'
            };

            nodeStatuses.set(node.id, 'error');
            nodeErrors.set(node.id, errorPayload);

            await dbRun(
              'UPDATE run_node_results SET status = ?, error_json = ? WHERE run_id = ? AND node_id = ?',
              ['error', JSON.stringify(errorPayload), runId, node.id]
            );

            // Propagate cascade skips immediately to descendants
            const descendants = getDownstreamDescendants(node.id, edges);
            for (const descId of descendants) {
              nodeStatuses.set(descId, 'skipped');
              await dbRun(
                'UPDATE run_node_results SET status = ? WHERE run_id = ? AND node_id = ?',
                ['skipped', runId, descId]
              );
            }
          }

          // Recurse step
          await schedulerStep();
        })
      );
    };

    await schedulerStep();
  } catch (error) {
    console.error('Fatal engine failure inside backend scheduler:', error);
    await dbRun('UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?', ['failed', runId]);
  }
}
