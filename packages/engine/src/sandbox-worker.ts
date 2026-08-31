/**
 * sandbox-worker.ts
 * Runs inside a Worker thread. Receives node run data via workerData,
 * dynamically imports the node's run.ts, executes it, and posts result back.
 *
 * Security: Enforces capabilities boundaries (Issue #11):
 *  - Only environmental keys listed in allowedEnv are exposed.
 *  - Network access (`fetch`) is blocked if `network:fetch` capability is omitted.
 *  - Subprocess spawning (`child_process`) is disabled inside the worker thread.
 */
import { parentPort, workerData } from 'worker_threads';
import { pathToFileURL } from 'url';

const { runPath, input, config, allowedEnv, capabilities = [] } = workerData as {
  runPath: string;
  input: any;
  config: any;
  allowedEnv: Record<string, string>;
  capabilities?: string[];
};

// 1. Patch process.env so only declared capabilities' keys are visible and sensitive keys are explicitly purged
const SENSITIVE_KEYS = ['ENCRYPTION_KEY', 'JWT_SECRET', 'DATABASE_URL', 'SQLITE_DB_PATH', 'STORAGE_DB_PATH', 'REDIS_URL'];
Object.keys(process.env).forEach(key => {
  if (!(key in allowedEnv) || SENSITIVE_KEYS.includes(key)) {
    delete process.env[key];
  }
});
Object.assign(process.env, allowedEnv);
SENSITIVE_KEYS.forEach(key => delete process.env[key]);

// 2. Enforce Network Capability Boundary (Issue #11 & #14)
const hasNetworkCap = capabilities.includes('network:fetch');
if (!hasNetworkCap) {
  const blockNetwork = () => {
    throw new Error("SANDBOX_SECURITY_VIOLATION: Outbound network access is disabled for this node type because it lacks the 'network:fetch' capability declaration.");
  };

  if (typeof globalThis.fetch === 'function') {
    // @ts-ignore
    globalThis.fetch = blockNetwork;
  }
}

// 3. Enforce Subprocess Spawning Capability Boundary (Issue #14)
const hasChildProcessCap = capabilities.includes('exec:child_process');
if (!hasChildProcessCap) {
  try {
    const cp = require('child_process');
    const blockExec = () => {
      throw new Error("SANDBOX_SECURITY_VIOLATION: Child process execution is disabled for this node type because it lacks the 'exec:child_process' capability declaration.");
    };
    cp.exec = blockExec;
    cp.spawn = blockExec;
    cp.execFile = blockExec;
    cp.execSync = blockExec;
  } catch {
    // Ignore if child_process cannot be required
  }
}

async function main() {
  try {
    // Dynamically import the community node's run.ts
    const mod = await import(pathToFileURL(runPath).href);
    if (typeof mod.run !== 'function') {
      throw { code: 'SANDBOX_INVALID_MODULE', message: `Node at ${runPath} does not export a run() function.` };
    }
    const output = await mod.run(input, config);
    parentPort!.postMessage({ success: true, output });
  } catch (err: any) {
    parentPort!.postMessage({
      success: false,
      error: {
        code: err.code || 'SANDBOX_RUNTIME_ERROR',
        message: err.message || 'An error occurred inside the sandbox.'
      }
    });
  }
}

main();
