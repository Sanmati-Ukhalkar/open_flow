import { Worker, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { db, runMigrations, logger, log } from '@open-flow/db';
import { executeRunBackend } from '@open-flow/engine';
import { WorkflowRunJob } from '@open-flow/shared-types';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null
});

logger.info({ service: 'worker', redisUrl }, 'Connecting to Redis...');

export const WORKFLOW_QUEUE_NAME = 'workflow-runs';
export const workflowQueue = new Queue(WORKFLOW_QUEUE_NAME, {
  connection: redisConnection
});

export const worker = new Worker<WorkflowRunJob>(
  WORKFLOW_QUEUE_NAME,
  async (job: Job<WorkflowRunJob>) => {
    const { runId, workflowId, orgId, targetNodeId, versionId, initialInputs } = job.data;
    log.info({ runId, workflowId }, `[Worker] Processing job ${job.id} for run ${runId}`);

    // Update status to running
    await new Promise<void>((resolve) => {
      db.run(
        `UPDATE runs SET status = 'running', queue_job_id = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [job.id, runId],
        () => resolve()
      );
    });

    try {
      await executeRunBackend(runId, workflowId, orgId, targetNodeId, versionId, initialInputs);
      
      // Update status to success if not already updated
      await new Promise<void>((resolve) => {
        db.run(
          `UPDATE runs SET status = 'success', finished_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'failed'`,
          [runId],
          () => resolve()
        );
      });
      log.info({ runId, workflowId }, `[Worker] Completed job ${job.id} successfully.`);
    } catch (error: any) {
      log.error({ runId, workflowId }, `[Worker] Error executing run ${runId}: ${error.message || error}`);
      await new Promise<void>((resolve) => {
        db.run(
          `UPDATE runs SET status = 'failed', error = ?, finished_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [error.message || String(error), runId],
          () => resolve()
        );
      });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    lockDuration: 10000,      // 10 seconds lock duration
    stalledInterval: 5000,     // check for stalled jobs every 5 seconds
    maxStalledCount: 1         // Mark stalled job as failed after 1 stall (worker crash mid-execution)
  }
);

worker.on('ready', () => {
  console.log('[Worker] Worker process is ready and listening for jobs on queue "workflow-runs".');
});

worker.on('failed', async (job: Job<WorkflowRunJob> | undefined, err: Error) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  if (job?.data?.runId) {
    await new Promise<void>((resolve) => {
      db.run(
        `UPDATE runs SET status = 'failed', error = ?, finished_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'running'`,
        [`Job execution failed: ${err.message || 'worker interrupted'}`, job.data.runId],
        () => resolve()
      );
    });
  }
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

// Run migrations and startup reconciliation on worker boot
runMigrations()
  .then(() => reconcileStuckRuns())
  .catch(err => logger.error({ service: 'worker', error: err.message || err }, 'DB migration/reconciliation failed'));
