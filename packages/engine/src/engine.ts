import { db, decrypt, log } from '@open-flow/db';
import { topoSort } from './topoSort';
import {
  runLLMPrompt,
  runMCPTool,
  runHTTPWebhook,
  runSQLiteStorage,
  runTextTransform,
  runCronTrigger,
  runWebhookTrigger,
  runFileTrigger,
  runEmail,
  runVisionOCR as runOCR,
  runVectorStore,
  runVectorRetrieve,
  runBranch
} from '@open-flow/nodes';
import { runInSandbox, getNodeCapabilities } from './sandbox';
import { workflowEvents, WORKFLOW_RUN_UPDATE } from './events';
import path from 'path';
import fs from 'fs';


// Error tracking integration placeholder
function reportToErrorTracker(error: any, context: Record<string, any>) {
  log.error(
    { runId: context.runId, workflowId: context.workflowId, nodeId: context.nodeId },
    `[ERROR_TRACKER] Unhandled exception in engine: ${error.message || error}`,
    { errorStack: error.stack, ...context }
  );
}

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

// Helper to estimate cost
function calculateNodeCost(nodeType: string, output: any, config?: any): { costCents: number, metadata: any } {
  if (nodeType === 'llm-prompt' && output?.usage) {
    const model = config?.model || 'groq/compound';
    const tokens = output.usage.total_tokens || 0;
    let costCents = 0;
    if (model.includes('llama')) costCents = tokens * 0.00001; 
    else if (model.includes('gpt-4')) costCents = tokens * 0.003;
    else costCents = tokens * 0.0001;
    return { costCents, metadata: { tokens } };
  }
  if (nodeType === 'mcp-tool' || nodeType === 'http-webhook') {
    return { costCents: 0.01, metadata: { calls: 1 } }; 
  }
  return { costCents: 0, metadata: {} };
}

// Helper to validate output schema against definition
function checkOutputSchema(nodeType: string, output: any): { isValid: boolean; warning?: string } {
  try {
    let definitionPath = path.resolve(process.cwd(), `src/nodes/${nodeType}/definition.json`);
    if (!fs.existsSync(definitionPath)) {
      definitionPath = path.resolve(process.cwd(), `src/nodes/community/${nodeType}/definition.json`);
    }
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

export async function evaluateNode(node: any, nodeInput: any, orgId: string): Promise<any> {
  let output: any;
if (node.type === 'llm-prompt') {
              const model = node.data.config?.model || 'groq/compound';
              const isGroqModel = !model.startsWith('gpt-4');
              const provider = isGroqModel ? 'groq' : 'openai';
              
              // Load user's credential from DB if configured
              const credential = await dbGet(
                'SELECT encrypted_key FROM credentials WHERE org_id = ? AND provider = ?',
                [orgId, provider]
              );
              let apiKey = undefined;
              if (credential) {
                try {
                   apiKey = decrypt(credential.encrypted_key);
                } catch (e) {
                  log.error({ nodeId: node.id }, 'Failed to decrypt API key credential:', e);
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
            } else if (node.type === 'cron-trigger') {
              output = await runCronTrigger(nodeInput, node.data.config);
            } else if (node.type === 'webhook-trigger') {
              output = await runWebhookTrigger(nodeInput, node.data.config);
            } else if (node.type === 'file-trigger') {
              output = await runFileTrigger(nodeInput, node.data.config);
            } else if (node.type === 'email') {
              const userCred = await dbGet('SELECT encrypted_key FROM credentials WHERE org_id = ? AND provider = ?', [orgId, 'smtp_user']);
              const passCred = await dbGet('SELECT encrypted_key FROM credentials WHERE org_id = ? AND provider = ?', [orgId, 'smtp_pass']);
              
              let smtp_user = '';
              let smtp_pass = '';
              
              try {
                if (userCred) smtp_user = decrypt(userCred.encrypted_key);
                if (passCred) smtp_pass = decrypt(passCred.encrypted_key);
              } catch (e) {
                log.error({ nodeId: node.id }, 'Failed to decrypt SMTP credentials:', e);
              }
              
              output = await runEmail(nodeInput, node.data.config, { smtp_user, smtp_pass });
            } else if (node.type === 'vision-ocr') {
              output = await runOCR(nodeInput, node.data.config);
            } else if (node.type === 'vector-store' || node.type === 'vector-retrieve') {
              const credential = await dbGet('SELECT encrypted_key FROM credentials WHERE org_id = ? AND provider = ?', [orgId, 'openai']);
              let apiKey = '';
              try {
                if (credential) apiKey = decrypt(credential.encrypted_key);
              } catch (e) {
                log.error({ nodeId: node.id }, 'Failed to decrypt OpenAI credentials:', e);
              }
              
              if (node.type === 'vector-store') {
                output = await runVectorStore(nodeInput, node.data.config, { openai: apiKey });
              } else {
                output = await runVectorRetrieve(nodeInput, node.data.config, { openai: apiKey });
              }
            } else if (node.type === 'code-execution') {
              const runPath = path.resolve(process.cwd(), 'src/nodes/code-execution/run.ts');
              output = await runInSandbox(node.type, runPath, nodeInput, node.data.config, []);
            } else if (node.type === 'branch') {
              output = await runBranch(nodeInput, node.data.config);
            } else {
              // Community node: execute in sandboxed Worker thread
              // Only capabilities declared in definition.json are injected
              const runPath = path.resolve(process.cwd(), 'src/nodes/community', node.type, 'run.ts');
              if (fs.existsSync(runPath)) {
                const capabilities = getNodeCapabilities(node.type, true);
                output = await runInSandbox(node.type, runPath, nodeInput, node.data.config, capabilities);
              } else {
                throw {
                  code: 'UNKNOWN_NODE_TYPE',
                  message: `Unsupported node type: "${node.type}". No run.ts found in src/nodes/community/${node.type}/`
                };
              }
            }


  return output;
}

export async function executeLoopSubgraph(
  loopNode: any,
  loopInput: any,
  orgId: string,
  allNodes: any[],
  allEdges: any[]
): Promise<any> {
  const { listPath, nodesInLoop, resultNode } = loopNode.data.config;
  
  const keys = (listPath || '').split('.').filter(Boolean);
  let list = loopInput;
  for (const k of keys) {
    if (list) list = list[k];
  }
  
  if (!Array.isArray(list)) {
    throw new Error(`List path "${listPath}" does not resolve to an array`);
  }

  const nodeIds = (nodesInLoop || '').split(',').map((s: string) => s.trim());
  const subgraphNodes = allNodes.filter((n: any) => nodeIds.includes(n.id));
  const subgraphEdges = allEdges.filter((e: any) => nodeIds.includes(e.source) && nodeIds.includes(e.target));
  
  const results = [];
  
  for (const item of list) {
    const sortedNodes = topoSort(subgraphNodes, subgraphEdges);
    const nodeOutputs = new Map<string, any>();
    
    for (const node of sortedNodes) {
      const incomingEdges = subgraphEdges.filter((e: any) => e.target === node.id);
      let nodeInput: any = {};
      
      if (incomingEdges.length === 0) {
        nodeInput = { ...loopInput, item };
      } else if (incomingEdges.length === 1) {
        nodeInput = nodeOutputs.get(incomingEdges[0].source) || {};
      } else {
        nodeInput = incomingEdges.reduce((acc: any, edge: any) => {
          acc[edge.source] = nodeOutputs.get(edge.source) || {};
          return acc;
        }, {} as Record<string, any>);
      }
      
      if (node.type === 'loop') {
         // Prevent recursive loops for now
         nodeOutputs.set(node.id, { results: [] });
         continue;
      }

      const output = await evaluateNode(node, nodeInput, orgId);
      nodeOutputs.set(node.id, output);
    }
    
    if (resultNode && nodeOutputs.has(resultNode)) {
      results.push(nodeOutputs.get(resultNode));
    }
  }
  
  return { results };
}

export async function executeRunBackend(
  runId: string,
  workflowId: string,
  orgId: string,
  startNodeId?: string,
  versionId?: string,
  initialInput?: any
) {
  const runStartTime = Date.now();
  log.info({ workflowId, runId }, `Starting workflow execution run...`);
  workflowEvents.emit(WORKFLOW_RUN_UPDATE, {
    workflowId,
    runId,
    status: 'started',
    timestamp: new Date().toISOString()
  });
  try {
    let graphJson: string;
    if (versionId) {
      const version = await dbGet('SELECT * FROM workflow_versions WHERE id = ?', [versionId]);
      if (!version) {
        log.error({ workflowId, runId }, `Failed to fetch workflow version: ${versionId}`);
        await dbRun('UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?', ['failed', runId]);
        return;
      }
      graphJson = version.graph_json;
    } else {
      const workflow = await dbGet('SELECT * FROM workflows WHERE id = ?', [workflowId]);
      if (!workflow) {
        log.error({ workflowId, runId }, `Failed to fetch workflow: ${workflowId}`);
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
      log.warn({ workflowId, runId }, `Cycle detected in workflow execution, aborting run.`, err);
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
      log.info({ workflowId, runId, nodeId: startNodeId }, `Retrying workflow execution starting from node: ${startNodeId}`);
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
            pStatus === 'skipped' ||
            pStatus === 'skipped-by-branch'
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

          const runDurationMs = Date.now() - runStartTime;
          log.info({ workflowId, runId }, `Workflow run completed with status "${finalStatus}" in ${runDurationMs}ms`);
          await dbRun(
            'UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP, duration_ms = ? WHERE id = ?',
            [finalStatus, runDurationMs, runId]
          );
          workflowEvents.emit(WORKFLOW_RUN_UPDATE, {
            workflowId,
            runId,
            status: finalStatus,
            timestamp: new Date().toISOString()
          });
          
          // Fire deployment alerts if necessary (in background)
          if (finalStatus === 'failed') {
            checkDeploymentAlerts(workflowId).catch(err => log.error({ workflowId, runId }, 'Alert check failed:', err));
          }
        }
        return;
      }

      // Execute ready nodes concurrently in parallel
      await Promise.all(
        readyNodes.map(async (node: any) => {
          const incomingEdges = edges.filter((e: any) => e.target === node.id);
          const parents = incomingEdges.map((e: any) => e.source);

          // Check if any upstream parent failed or was skipped
          let shouldSkip = false;
          let skipReason = 'skipped';
          
          for (const edge of incomingEdges) {
            const pId = edge.source;
            const pStatus = nodeStatuses.get(pId);
            
            if (pStatus === 'error' || pStatus === 'skipped') {
              shouldSkip = true;
              break;
            }
            if (pStatus === 'skipped-by-branch') {
              shouldSkip = true;
              skipReason = 'skipped-by-branch';
              break;
            }
            
            const pOutput = nodeOutputs.get(pId);
            const takenEdge = pOutput?.data?.takenEdge;
            if (takenEdge !== undefined) {
              if (edge.sourceHandle && edge.sourceHandle !== takenEdge) {
                shouldSkip = true;
                skipReason = 'skipped-by-branch';
                break;
              }
            }
          }

          if (shouldSkip) {
            log.info({ workflowId, runId, nodeId: node.id }, `Skipping node execution: reason=${skipReason}`);
            nodeStatuses.set(node.id, skipReason);
            await dbRun(
              'UPDATE run_node_results SET status = ? WHERE run_id = ? AND node_id = ?',
              [skipReason, runId, node.id]
            );
            workflowEvents.emit(WORKFLOW_RUN_UPDATE, {
              workflowId,
              runId,
              nodeId: node.id,
              status: skipReason,
              timestamp: new Date().toISOString()
            });
            await schedulerStep();
            return;
          }

          // Compile parent outputs
          let nodeInput: any = {};
          if (parents.length === 0) {
            nodeInput = initialInput || {};
          } else {
            // Always map by parent ID so that {{parent-id.property}} resolves!
            nodeInput = parents.reduce((acc: any, pId: string) => {
              acc[pId] = nodeOutputs.get(pId) || {};
              return acc;
            }, {} as Record<string, any>);

            // If there's only one parent, mix in its properties to the root of nodeInput
            // so that flat keys (like {{text}} or {{input.text}}) also work.
            if (parents.length === 1) {
              const singleParentOutput = nodeOutputs.get(parents[0]) || {};
              if (typeof singleParentOutput === 'object' && singleParentOutput !== null) {
                Object.assign(nodeInput, singleParentOutput);
              }
            }
          }

          // Transition to running
          log.info({ workflowId, runId, nodeId: node.id }, `Executing node: type=${node.type}`);
          nodeStatuses.set(node.id, 'running');
          await dbRun(
            'UPDATE run_node_results SET status = ? WHERE run_id = ? AND node_id = ?',
            ['running', runId, node.id]
          );
          workflowEvents.emit(WORKFLOW_RUN_UPDATE, {
            workflowId,
            runId,
            nodeId: node.id,
            status: 'running',
            timestamp: new Date().toISOString()
          });

          // Artificial delay for canvas visualizations
          await new Promise(r => setTimeout(r, 700));

          const maxRetries = Math.min(Math.max(Number(node.data?.config?.maxRetries) || 0, 0), 5);
          const initialDelayMs = Math.max(Number(node.data?.config?.retryDelayMs) || 1000, 100);
          const backoffFactor = 2;
          const nodeStartTime = Date.now();

          let lastError: any = null;
          let executionSucceeded = false;

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
              const retryDelay = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
              log.warn({ workflowId, runId, nodeId: node.id }, `Auto-retrying node execution (attempt ${attempt}/${maxRetries}) after ${retryDelay}ms delay...`);
              workflowEvents.emit(WORKFLOW_RUN_UPDATE, {
                workflowId,
                runId,
                nodeId: node.id,
                status: 'retrying',
                message: `Transient error encountered. Retrying (${attempt}/${maxRetries}) in ${retryDelay}ms...`,
                timestamp: new Date().toISOString()
              });
              await new Promise(r => setTimeout(r, retryDelay));
            }

            try {
              let output: any;
              if (node.type === 'loop') {
                output = await executeLoopSubgraph(node, nodeInput, orgId, nodes, edges);
              } else {
                output = await evaluateNode(node, nodeInput, orgId);
              }
              // Output Validation
              const validation = checkOutputSchema(node.type, output);
              const status = validation.isValid ? 'success' : 'success-with-warning';

              nodeStatuses.set(node.id, status);
              nodeOutputs.set(node.id, output);
              workflowEvents.emit(WORKFLOW_RUN_UPDATE, {
                workflowId,
                runId,
                nodeId: node.id,
                status,
                output,
                timestamp: new Date().toISOString()
              });

              const outputToSave = validation.isValid 
                ? output 
                : { ...output, warning: validation.warning };
                
              const durationMs = Date.now() - nodeStartTime;
              const { costCents, metadata } = calculateNodeCost(node.type, output, node.data?.config);

              log.info({ workflowId, runId, nodeId: node.id }, `Node execution succeeded: status=${status}, duration=${durationMs}ms`);
              const slowThreshold = Number(process.env.SLOW_NODE_THRESHOLD_MS) || 5000;
              if (durationMs > slowThreshold) {
                log.warn({ workflowId, runId, nodeId: node.id }, `Slow node execution detected: ${durationMs}ms (threshold: ${slowThreshold}ms)`);
              }

              await dbRun(
                'UPDATE run_node_results SET status = ?, output_json = ?, duration_ms = ?, cost_cents = ?, metadata_json = ? WHERE run_id = ? AND node_id = ?',
                [status, JSON.stringify(outputToSave), durationMs, costCents, JSON.stringify(metadata), runId, node.id]
              );

              executionSucceeded = true;
              break;
            } catch (err: any) {
              lastError = err;
            }
          }

          if (!executionSucceeded && lastError) {
            const err = lastError;
            const errorPayload = {
              code: err.code || 'EXECUTION_ERROR',
              message: err.message || 'An error occurred during execution.'
            };

            log.error({ workflowId, runId, nodeId: node.id }, `Node execution failed after retries: code=${errorPayload.code}, message="${errorPayload.message}"`, err);

            nodeStatuses.set(node.id, 'error');
            nodeErrors.set(node.id, errorPayload);
            workflowEvents.emit(WORKFLOW_RUN_UPDATE, {
              workflowId,
              runId,
              nodeId: node.id,
              status: 'error',
              error: errorPayload,
              timestamp: new Date().toISOString()
            });

            const durationMs = Date.now() - nodeStartTime;
            await dbRun(
              'UPDATE run_node_results SET status = ?, error_json = ?, duration_ms = ? WHERE run_id = ? AND node_id = ?',
              ['error', JSON.stringify(errorPayload), durationMs, runId, node.id]
            );

            // Propagate cascade skips immediately to descendants
            const descendants = getDownstreamDescendants(node.id, edges);
            for (const descId of descendants) {
              log.info({ workflowId, runId, nodeId: descId }, `Skipping downstream node due to parent execution failure`);
              nodeStatuses.set(descId, 'skipped');
              await dbRun(
                'UPDATE run_node_results SET status = ? WHERE run_id = ? AND node_id = ?',
                ['skipped', runId, descId]
              );
              workflowEvents.emit(WORKFLOW_RUN_UPDATE, {
                workflowId,
                runId,
                nodeId: descId,
                status: 'skipped',
                timestamp: new Date().toISOString()
              });
            }
          }

          // Recurse step
          await schedulerStep();
        })
      );
    };

    await schedulerStep();
  } catch (error) {
    reportToErrorTracker(error, { workflowId, runId });
    await dbRun('UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?', ['failed', runId]);
  }
}

async function checkDeploymentAlerts(workflowId: string) {
  // Find if there is an active deployment for this workflow
  const deployment = await dbGet('SELECT * FROM deployments WHERE workflow_id = ?', [workflowId]);
  if (!deployment) return;

  const alertConfig = await dbGet('SELECT * FROM deployment_alerts WHERE deployment_id = ?', [deployment.id]);
  if (!alertConfig) return;

  // Calculate error rate over the last window_runs
  const runs = await dbAll(
    'SELECT status FROM runs WHERE workflow_id = ? ORDER BY started_at DESC LIMIT ?', 
    [workflowId, alertConfig.window_runs]
  );
  
  if (runs.length === 0) return;

  const errorCount = runs.filter((r: any) => r.status === 'failed' || r.status === 'partial').length;
  const errorRatePercent = (errorCount / runs.length) * 100;

  if (errorRatePercent >= alertConfig.error_threshold_percent) {
    console.log(`Alert triggered for deployment ${deployment.id}: ${errorRatePercent}% error rate.`);
    // Fire the webhook
    try {
      await fetch(alertConfig.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert: 'Deployment Error Rate Threshold Exceeded',
          deploymentId: deployment.id,
          workflowId,
          errorRatePercent,
          thresholdPercent: alertConfig.error_threshold_percent,
          windowRuns: alertConfig.window_runs,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Failed to deliver webhook alert:', e);
    }
  }
}
