import { describe, it, expect, beforeEach } from 'vitest';
import { db, runMigrations } from '@open-flow/db';

describe('Worker Queue Processing Integration', () => {
  beforeEach(async () => {
    await runMigrations();
  });

  it('initializes runs table with queued status and updates to success upon execution', async () => {
    const runId = `test-run-${Date.now()}`;
    const workflowId = 'test-wf-001';

    // 1. Insert queued run
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, 'queued')`,
        [runId, workflowId],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 2. Assert initial status is queued
    const initialRun: any = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM runs WHERE id = ?`, [runId], (err, row) =>
        err ? reject(err) : resolve(row)
      );
    });

    expect(initialRun).toBeDefined();
    expect(initialRun.status).toBe('queued');

    // 3. Simulate worker state transition to running
    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE runs SET status = 'running', queue_job_id = 'job-123', started_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [runId],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 4. Simulate worker completion transition to success
    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE runs SET status = 'success', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [runId],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 5. Assert final state
    const completedRun: any = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM runs WHERE id = ?`, [runId], (err, row) =>
        err ? reject(err) : resolve(row)
      );
    });

    expect(completedRun.status).toBe('success');
    expect(completedRun.queue_job_id).toBe('job-123');
    expect(completedRun.completed_at).toBeDefined();
  });
});
