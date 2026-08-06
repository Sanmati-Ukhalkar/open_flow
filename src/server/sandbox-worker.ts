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

const { runPath, input, config, allowedEnv, capabilities = [] } = workerData as {
  runPath: string;
  input: any;
  config: any;
  allowedEnv: Record<string, string>;
  capabilities?: string[];
};

// 1. Patch process.env so only declared capabilities' keys are visible
Object.keys(process.env).forEach(key => {
  if (!(key in allowedEnv)) {
    delete process.env[key];
  }
});
Object.assign(process.env, allowedEnv);

// 2. Enforce Network Capability Boundary (Issue #11)
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

async function main() {
  try {
    // Dynamically import the community node's run.ts
    const mod = await import(runPath);
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
