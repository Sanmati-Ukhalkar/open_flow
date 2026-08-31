import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, runMigrations } from '@open-flow/db';
import { worker, workflowQueue } from '../worker';
import { WorkflowRunJob } from '@open-flow/shared-types';

describe('Worker Queue Processing Integration', () => {
  beforeEach(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    try {
      await worker.close();
      await workflowQueue.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  it('consumes job from real BullMQ queue and updates run status from queued to success', async () => {
    const runId = `test-run-${Date.now()}`;
    const workflowId = `test-wf-${Date.now()}`;
    const userId = `test-user-${Date.now()}`;
    const orgId = `test-org-${Date.now()}`;

    // 1. Setup workflow in DB
    const graphJson = JSON.stringify({
      nodes: [
        {
          id: 'node-1',
          type: 'text-transform',
          data: { config: { template: 'Hello World' } }
        }
      ],
      edges: []
    });

    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO workflows (id, name, owner_id, org_id, graph_json) VALUES (?, ?, ?, ?, ?)`,
        [workflowId, 'Integration Test Workflow', userId, orgId, graphJson],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 2. Insert initial queued run in DB
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, 'queued')`,
        [runId, workflowId],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Assert initial status is queued in DB
    const initialRun: any = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM runs WHERE id = ?`, [runId], (err, row) =>
        err ? reject(err) : resolve(row)
      );
    });
    expect(initialRun).toBeDefined();
    expect(initialRun.status).toBe('queued');

    // 3. Enqueue job via BullMQ queue exported by worker package
    const jobData: WorkflowRunJob = {
      type: 'workflow_run',
      runId,
      workflowId,
      orgId,
      timestamp: Date.now()
    };
    const job = await workflowQueue.add('WorkflowRunJob', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });
    const jobId = job.id;
    console.log('ENQUEUED JOB ID:', jobId);

    // Verify job was enqueued into real BullMQ queue without any fallback
    expect(jobId).toBeDefined();
    expect(typeof jobId).toBe('string');

    // 4. Poll database until real worker finishes consuming job from BullMQ queue
    let completedRun: any = null;
    for (let i = 0; i < 50; i++) {
      completedRun = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM runs WHERE id = ?`, [runId], (err, row) =>
          err ? reject(err) : resolve(row)
        );
      });
      if (completedRun && (completedRun.status === 'success' || completedRun.status === 'failed')) {
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    // 5. Assert status changed as a RESULT of worker consuming the BullMQ job from Redis
    expect(completedRun).toBeDefined();
    expect(completedRun.status).toBe('success');
    expect(completedRun.queue_job_id).toBe(jobId);
  }, 20000);
});
