import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { db } from '@open-flow/db';
import { app } from '../server';
import { generateSessionToken } from '../auth';

const dbRun = (sql: string, params: any[] = []) =>
  new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err: any) => (err ? reject(err) : resolve()));
  });

describe('Real HTTP Network Smoke Test: Deployments, Credentials, and Triggers API Endpoints (Task 3)', () => {
  const userId = `usr-http-${Math.random().toString(36).substring(2)}`;
  const orgId = `org-http-${Math.random().toString(36).substring(2)}`;
  const workflowId = `wf-http-${Math.random().toString(36).substring(2)}`;
  let token: string;
  let server: http.Server;
  let baseURL: string;

  beforeAll(async () => {
    // 1. Seed user, org, and organization membership in DB
    await dbRun(`INSERT OR IGNORE INTO organizations (id, name) VALUES (?, ?)`, [orgId, 'HTTP Smoke Org']);
    await dbRun(`INSERT OR IGNORE INTO users (id, email, password_hash) VALUES (?, ?, ?)`, [userId, `${userId}@example.com`, 'hash']);
    await dbRun(`INSERT OR IGNORE INTO organization_members (org_id, user_id, role) VALUES (?, ?, ?)`, [orgId, userId, 'owner']);

    token = generateSessionToken(userId);

    // 2. Start real listening HTTP server on ephemeral TCP port
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr: any = server.address();
        baseURL = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('sends real HTTP POST and GET requests to /api/credentials over TCP socket', async () => {
    const provider = `openai-${Math.random().toString(36).substring(2)}`;

    // 1. Send real HTTP POST request to listening Express server
    const postRes = await fetch(`${baseURL}/api/credentials`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-org-id': orgId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider, apiKey: 'sk-smoke-secret-key-123' })
    });

    const postData: any = await postRes.json();
    console.log('HTTP POST /api/credentials RESPONSE:', postRes.status, JSON.stringify(postData));

    expect(postRes.status).toBe(200);
    expect(postData.success).toBe(true);

    // 2. Send real HTTP GET request to listening Express server
    const getRes = await fetch(`${baseURL}/api/credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-org-id': orgId
      }
    });

    const getData: any = await getRes.json();
    console.log('HTTP GET /api/credentials RESPONSE:', getRes.status, JSON.stringify(getData));

    expect(getRes.status).toBe(200);
    expect(getData.success).toBe(true);
    expect(Array.isArray(getData.credentials)).toBe(true);

    const match = getData.credentials.find((c: any) => c.provider === provider);
    expect(match).toBeDefined();
    expect(match.provider).toBe(provider);
  });

  it('sends real HTTP POST and GET requests to /api/deployments over TCP socket', async () => {
    // 1. Create a workflow first
    await dbRun(
      `INSERT OR REPLACE INTO workflows (id, name, graph_json, owner_id, org_id) VALUES (?, ?, ?, ?, ?)`,
      [workflowId, 'HTTP Smoke Workflow', JSON.stringify({ nodes: [], edges: [] }), userId, orgId]
    );

    // 2. Send real HTTP POST request to create deployment
    const postRes = await fetch(`${baseURL}/api/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-org-id': orgId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ workflowId })
    });

    const postData: any = await postRes.json();
    console.log('HTTP POST /api/deployments RESPONSE:', postRes.status, JSON.stringify(postData));

    expect(postRes.status).toBe(200);
    expect(postData.success).toBe(true);
    expect(postData.deployment).toBeDefined();
    expect(postData.deployment.workflow_id).toBe(workflowId);
    expect(postData.deployment.status).toBe('active');
    expect(postData.deployment.bearer_token).toBeDefined();
    expect(postData.deployment.workflow_version_id).toBeDefined();

    // 3. Send real HTTP GET request to list deployments
    const getRes = await fetch(`${baseURL}/api/deployments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-org-id': orgId
      }
    });

    const getData: any = await getRes.json();
    console.log('HTTP GET /api/deployments RESPONSE:', getRes.status, JSON.stringify(getData));

    expect(getRes.status).toBe(200);
    expect(getData.success).toBe(true);
    expect(Array.isArray(getData.deployments)).toBe(true);

    const match = getData.deployments.find((d: any) => d.workflow_id === workflowId);
    expect(match).toBeDefined();
    expect(match.workflow_name).toBe('HTTP Smoke Workflow');
    expect(match.status).toBe('active');
  });

  it('sends real HTTP GET requests to /api/triggers over TCP socket', async () => {
    const triggerId = `trig-${Math.random().toString(36).substring(2)}`;
    const configJson = JSON.stringify({ path: '/api/webhooks/http-smoke' });

    // Seed trigger
    await dbRun(
      `INSERT OR REPLACE INTO triggers (id, workflow_id, trigger_type, status, config_json) VALUES (?, ?, ?, ?, ?)`,
      [triggerId, workflowId, 'webhook', 'active', configJson]
    );

    // Send real HTTP GET request to list triggers
    const getRes = await fetch(`${baseURL}/api/triggers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const getData: any = await getRes.json();
    console.log('HTTP GET /api/triggers RESPONSE:', getRes.status, JSON.stringify(getData));

    expect(getRes.status).toBe(200);
    expect(getData.success).toBe(true);
    expect(Array.isArray(getData.triggers)).toBe(true);

    const match = getData.triggers.find((t: any) => t.id === triggerId);
    expect(match).toBeDefined();
    expect(match.trigger_type).toBe('webhook');
    expect(match.config_json).toBe(configJson);
    expect(match.workflow_name).toBe('HTTP Smoke Workflow');
  });
});
