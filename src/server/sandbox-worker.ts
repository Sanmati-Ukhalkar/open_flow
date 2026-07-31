/**
 * sandbox-worker.ts
 * Runs inside a Worker thread. Receives node run data via workerData,
 * dynamically imports the node's run.ts, executes it, and posts result back.
 *
 * Security: Only the env vars listed in workerData.allowedEnv are
 * exposed — the full process.env is NOT accessible from within.
 */
import { parentPort, workerData } from 'worker_threads';

const { runPath, input, config, allowedEnv } = workerData as {
  runPath: string;
  input: any;
  config: any;
  allowedEnv: Record<string, string>;
};

// Patch process.env so only declared capabilities' keys are visible
// This is best-effort isolation — prevents accidental leakage, not adversarial attacks
Object.keys(process.env).forEach(key => {
  if (!(key in allowedEnv)) {
    delete process.env[key];
  }
});
Object.assign(process.env, allowedEnv);

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
