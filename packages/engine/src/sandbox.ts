/**
 * sandbox.ts
 * Runs a community node's run.ts in an isolated Worker thread with:
 *  - Hard timeout (kills the worker if exceeded)
 *  - Capability-filtered env vars (only declared secrets injected)
 *  - Structured error mapping onto the existing node error model
 */
import { Worker } from 'worker_threads';
import fs from 'fs';
import { resolveNodeFile } from './paths';

// Load per-node-type resource limits from config file
const limitsPath = resolveNodeFile('node-limits.json');
let nodeLimits: Record<string, { timeoutMs: number }> = { default: { timeoutMs: 30000 } };
if (fs.existsSync(limitsPath)) {
  try {
    nodeLimits = JSON.parse(fs.readFileSync(limitsPath, 'utf8'));
  } catch {
    // Use defaults if parse fails
  }
}

// Map capability strings to the env var keys they unlock
// Community nodes only receive the env vars they explicitly declare
const CAPABILITY_ENV_MAP: Record<string, string[]> = {
  'secrets:llm':      ['GROQ_API_KEY', 'OPENAI_API_KEY'],
  'secrets:openai':   ['OPENAI_API_KEY'],
  'secrets:groq':     ['GROQ_API_KEY'],
  'network:fetch':    [],  // network access is declared but no specific env needed
  'storage:sqlite':   [],  // storage access is declared but no specific env needed
};

/**
 * Run a node's run.ts inside a sandboxed Worker thread.
 *
 * @param nodeType   - The node type id (used to find run.ts and look up limits)
 * @param runPath    - Absolute path to the node's run.ts file
 * @param input      - Node input data
 * @param config     - Node config from the canvas
 * @param capabilities - Array of declared capability strings from definition.json
 * @returns          - { output } on success, throws structured error on failure
 */
export function runInSandbox(
  nodeType: string,
  runPath: string,
  input: any,
  config: any,
  capabilities: string[] = []
): Promise<any> {
  // Resolve timeout: per-type override or default
  const timeoutMs = (nodeLimits[nodeType] ?? nodeLimits['default']).timeoutMs;

  // Build the allowedEnv — only env vars unlocked by declared capabilities
  const allowedEnv: Record<string, string> = {};
  for (const cap of capabilities) {
    const keys = CAPABILITY_ENV_MAP[cap] ?? [];
    for (const key of keys) {
      const val = process.env[key];
      if (val !== undefined) allowedEnv[key] = val;
    }
  }

  return new Promise((resolve, reject) => {
    const workerUrl = new URL('./sandbox-worker.ts', import.meta.url);
    const worker = new Worker(workerUrl, {
      workerData: { runPath, input, config, allowedEnv, capabilities },
      // Use tsx to transpile TypeScript worker on the fly
      execArgv: ['--import', 'tsx/esm'],
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32
      }
    });

    let settled = false;

    const timeoutHandle = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      reject({
        code: 'SANDBOX_TIMEOUT',
        message: `Node execution timed out after ${timeoutMs / 1000}s. The node was killed to prevent hanging the workflow.`
      });
    }, timeoutMs);

    worker.on('message', (msg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      if (msg.success) {
        resolve(msg.output);
      } else {
        reject(msg.error);
      }
    });

    worker.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      reject({
        code: 'SANDBOX_WORKER_ERROR',
        message: err.message || 'Sandbox worker crashed unexpectedly.'
      });
    });

    worker.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      if (code !== 0) {
        reject({
          code: 'SANDBOX_EXIT',
          message: `Sandbox worker exited with code ${code}. The node may have crashed or used excessive memory.`
        });
      }
    });
  });
}

/**
 * Read capability declarations from a node's definition.json.
 * Returns [] if the file doesn't exist or has no capabilities field.
 */
export function getNodeCapabilities(nodeType: string, isCommunity: boolean): string[] {
  try {
    const defPath = isCommunity
      ? resolveNodeFile('community', nodeType, 'definition.json')
      : resolveNodeFile(nodeType, 'definition.json');
    if (!fs.existsSync(defPath)) return [];
    const def = JSON.parse(fs.readFileSync(defPath, 'utf8'));
    return Array.isArray(def.capabilities) ? def.capabilities : [];
  } catch {
    return [];
  }
}
