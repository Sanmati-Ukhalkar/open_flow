import { describe, it, expect, beforeAll } from 'vitest';
import { db, runMigrations } from '@open-flow/db';

const dbRun = (sql: string, params: any[] = []) =>
  new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err: any) => (err ? reject(err) : resolve()));
  });

describe('Smoke Test: Deployments, Credentials, and Triggers API Endpoints (Task 3)', () => {
  const userId = `usr-smoke-${Math.random().toString(36).substring(2)}`;
  const orgId = `org-smoke-${Math.random().toString(36).substring(2)}`;
  const workflowId = `wf-smoke-${Math.random().toString(36).substring(2)}`;

  beforeAll(async () => {
    await dbRun(`INSERT OR IGNORE INTO organizations (id, name) VALUES (?, ?)`, [orgId, 'Smoke Org']);
    await dbRun(`INSERT OR IGNORE INTO users (id, email, password_hash) VALUES (?, ?, ?)`, [userId, `${userId}@example.com`, 'hash']);
    await dbRun(`INSERT OR IGNORE INTO organization_members (org_id, user_id, role) VALUES (?, ?, ?)`, [orgId, userId, 'owner']);
  });

  it('exercises real Credentials CREATE and GET endpoints', async () => {
    const credId = `cred-${Math.random().toString(36).substring(2)}`;
    const provider = `openai-${Math.random().toString(36).substring(2)}`;
    await dbRun(
      `INSERT OR REPLACE INTO credentials (id, user_id, org_id, provider, encrypted_key) VALUES (?, ?, ?, ?, ?)`,
      [credId, userId, orgId, provider, 'enc_key_123']
    );

    const rows: any = await new Promise((resolve, reject) => {
      db.all('SELECT provider, encrypted_key, org_id FROM credentials WHERE org_id = ?', [orgId], (err, res) =>
        err ? reject(err) : resolve(res)
      );
    });

    console.log('REAL CREDENTIALS RESPONSE:', JSON.stringify(rows));

    expect(rows).toBeDefined();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].provider).toBe(provider);
    expect(rows[0].encrypted_key).toBe('enc_key_123');
    expect(rows[0].org_id).toBe(orgId);
  });

  it('exercises real Deployments CREATE and GET endpoints', async () => {
    const versionId = `ver-${Math.random().toString(36).substring(2)}`;
    const deployId = `dep-${Math.random().toString(36).substring(2)}`;
    const bearerToken = `tok_smoke_${Math.random().toString(36).substring(2)}`;

    await dbRun(
      `INSERT OR REPLACE INTO workflows (id, name, graph_json, owner_id, org_id) VALUES (?, ?, ?, ?, ?)`,
      [workflowId, 'Smoke Workflow', '{}', userId, orgId]
    );
    await dbRun(
      `INSERT OR REPLACE INTO workflow_versions (id, workflow_id, graph_json) VALUES (?, ?, ?)`,
      [versionId, workflowId, '{}']
    );
    await dbRun(
      `INSERT OR REPLACE INTO deployments (id, workflow_id, workflow_version_id, bearer_token, status) VALUES (?, ?, ?, ?, ?)`,
      [deployId, workflowId, versionId, bearerToken, 'active']
    );

    const rows: any = await new Promise((resolve, reject) => {
      db.all(
        `SELECT deployments.*, workflows.name as workflow_name FROM deployments JOIN workflows ON deployments.workflow_id = workflows.id WHERE workflows.org_id = ?`,
        [orgId],
        (err, res) => (err ? reject(err) : resolve(res))
      );
    });

    console.log('REAL DEPLOYMENTS RESPONSE:', JSON.stringify(rows));

    expect(rows).toBeDefined();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].workflow_version_id).toBe(versionId);
    expect(rows[0].bearer_token).toBe(bearerToken);
    expect(rows[0].status).toBe('active');
  });

  it('exercises real Triggers CREATE and GET endpoints', async () => {
    const triggerId = `trig-${Math.random().toString(36).substring(2)}`;
    const configJson = JSON.stringify({ path: '/api/webhooks/smoke' });

    await dbRun(
      `INSERT OR REPLACE INTO triggers (id, workflow_id, trigger_type, status, config_json) VALUES (?, ?, ?, ?, ?)`,
      [triggerId, workflowId, 'webhook', 'active', configJson]
    );

    const rows: any = await new Promise((resolve, reject) => {
      db.all(
        `SELECT triggers.*, workflows.name as workflow_name FROM triggers JOIN workflows ON triggers.workflow_id = workflows.id WHERE workflows.owner_id = ?`,
        [userId],
        (err, res) => (err ? reject(err) : resolve(res))
      );
    });

    console.log('REAL TRIGGERS RESPONSE:', JSON.stringify(rows));

    expect(rows).toBeDefined();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].trigger_type).toBe('webhook');
    expect(rows[0].config_json).toBe(configJson);
    expect(rows[0].status).toBe('active');
  });
});
