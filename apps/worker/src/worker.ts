import { Worker, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { db, runMigrations, logger, log } from '@open-flow/db';
import { executeRunBackend } from '@open-flow/engine';
import { WorkflowRunJob } from '@open-flow/shared-types';

dotenv.config();

const getRedisConnectionOptions = () => {
  const urlStr = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
  try {
    const u = new URL(urlStr);
    return {
      host: u.hostname || '127.0.0.1',
      port: parseInt(u.port || '6380', 10)
    };
  } catch {
    return { host: '127.0.0.1', port: 6380 };
  }
};

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
export const redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });

logger.info({ service: 'worker', redisUrl }, 'Connecting to Redis...');

export const WORKFLOW_QUEUE_NAME = 'workflow-runs';
export const workflowQueue = new Queue(WORKFLOW_QUEUE_NAME, {
  connection: getRedisConnectionOptions()
});

export async function processWorkflowRunJob(job: Job<WorkflowRunJob>) {
  console.log(`[Worker Entry] Received job ${job.id} with data:`, JSON.stringify(job.data));
  const { runId, workflowId, orgId, targetNodeId, versionId, initialInputs } = job.data;
  log.info({ runId, workflowId }, `[Worker] Processing job ${job.id} for run ${runId}`);

  // Update status to running
  await new Promise<void>((resolve) => {
    db.run(
      `UPDATE runs SET status = 'running', queue_job_id = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [job.id, runId],
      (err) => {
        if (err) console.error('[WORKER RUNNING UPDATE ERROR]', err);
        resolve();
      }
    );
  });

  try {
    await executeRunBackend(runId, workflowId, orgId, targetNodeId, versionId, initialInputs);
    
    // Update status to success if not already updated
    await new Promise<void>((resolve) => {
      db.run(
        `UPDATE runs SET status = 'success', finished_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'failed'`,
        [runId],
        (err) => {
          if (err) console.error('[WORKER SUCCESS UPDATE ERROR]', err);
          resolve();
        }
      );
    });
    log.info({ runId, workflowId }, `[Worker] Completed job ${job.id} successfully.`);
  } catch (error: any) {
    log.error({ runId, workflowId }, `[Worker] Error executing run ${runId}: ${error.message || error}`);
    await new Promise<void>((resolve) => {
      db.run(
        `UPDATE runs SET status = 'failed', error = ?, finished_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [error.message || String(error), runId],
        (err) => {
          if (err) console.error('[WORKER FAILED UPDATE ERROR]', err);
          resolve();
        }
      );
    });
    throw error;
  }
}

export const worker = new Worker<WorkflowRunJob>(
  WORKFLOW_QUEUE_NAME,
  processWorkflowRunJob,
  {
    connection: getRedisConnectionOptions(),
    concurrency: 5
  }
);

worker.on('ready', () => {
  console.log('[Worker] Worker process is ready and listening for jobs on queue "workflow-runs".');
});

worker.on('active', (job) => {
  console.log(`[Worker Active] Started processing job ${job.id}`);
});

worker.on('error', (err) => {
  console.error('[Worker Error]:', err);
});

worker.on('failed', async (job: Job<WorkflowRunJob> | undefined, err: Error) => {
  if (!job) return;
  console.error(`[Worker Job Failed] ${job.id}:`, err);
});

export async function reconcileStuckRuns() {
  try {
    const runningRuns: any[] = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM runs WHERE status = 'running'`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (runningRuns.length === 0) return;

    console.log(`[Worker Reconciliation] Found ${runningRuns.length} runs in 'running' status. Reconciling with Queue...`);

    for (const run of runningRuns) {
      let isActiveOrWaiting = false;
      if (run.queue_job_id) {
        try {
          const job = await workflowQueue.getJob(run.queue_job_id);
          if (job) {
            const state = await job.getState();
            if (state === 'active' || state === 'waiting' || state === 'delayed') {
              isActiveOrWaiting = true;
            }
          }
        } catch (jobErr: any) {
          logger.warn({ service: 'worker', jobId: run.queue_job_id, error: jobErr.message }, 'Error checking job state');
        }
      }

      if (!isActiveOrWaiting) {
        logger.warn({ service: 'worker', runId: run.id }, 'Marking interrupted run and nodes as failed');
        const errorPayload = JSON.stringify({
          code: 'WORKER_INTERRUPTED',
          message: 'interrupted: worker restarted mid-execution'
        });
        await new Promise<void>((resolve) => {
          db.run(
            `UPDATE run_node_results SET status = 'error', error_json = ? WHERE run_id = ? AND status IN ('running', 'idle')`,
            [errorPayload, run.id],
            () => resolve()
          );
        });
        await new Promise<void>((resolve) => {
          db.run(
            `UPDATE runs SET status = 'failed', error = 'interrupted: worker restarted mid-execution', finished_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'running'`,
            [run.id],
            () => resolve()
          );
        });
      }
    }
  } catch (err: any) {
    logger.error({ service: 'worker', error: err.message || err }, 'Error during startup reconciliation');
  }
}

// Run migrations and startup reconciliation on worker boot (except during unit tests)
if (process.env.NODE_ENV !== 'test') {
  runMigrations()
    .then(() => reconcileStuckRuns())
    .catch(err => logger.error({ service: 'worker', error: err.message || err }, 'DB migration/reconciliation failed'));
}
