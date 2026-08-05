import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

// Hoisted mock of DB to use in-memory SQLite wrapper
vi.mock('../db', async (importOriginal) => {
  const original = await importOriginal<any>();
  const testDb = new original.DatabaseWrapper(undefined, ':memory:');
  return {
    ...original,
    db: testDb,
  };
});

// Import the mocked db instance
import { db, DatabaseWrapper } from '../db';

// Mock credentials decrypt helper
vi.mock('../crypto', () => ({
  decrypt: (val: string) => `decrypted-${val}`,
}));

// Mock nodemailer
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-123' });
vi.mock('nodemailer', () => {
  return {
    default: {
      createTransport: vi.fn().mockImplementation(() => {
        return {
          sendMail: mockSendMail,
        };
      }),
    },
  };
});

// Mock Tesseract OCR
const mockRecognize = vi.fn();
const mockTerminate = vi.fn();
vi.mock('tesseract.js', () => {
  return {
    createWorker: vi.fn().mockImplementation(() => {
      return {
        recognize: mockRecognize,
        terminate: mockTerminate,
      };
    }),
  };
});

// Mock OpenAI SDK
const mockCreateCompletion = vi.fn();
const mockCreateEmbedding = vi.fn();
vi.mock('openai', () => {
  return {
    OpenAI: class {
      chat = {
        completions: {
          create: mockCreateCompletion,
        },
      };
      embeddings = {
        create: mockCreateEmbedding,
      };
    },
  };
});

// Mock MCP SDK Client & Stdio Transport
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockCallTool = vi.fn();
const mockClose = vi.fn().mockResolvedValue(undefined);
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: class {
      connect = mockConnect;
      callTool = mockCallTool;
    },
  };
});
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
  return {
    StdioClientTransport: class {
      close = mockClose;
    },
  };
});

// Mock fetch for Webhooks
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
  text: async () => JSON.stringify({ success: true })
});
global.fetch = mockFetch;

// Import target systems under test
import { executeRunBackend } from '../engine';
import { seedTemplates } from '../seed-templates';

// In-memory helper to fetch database records directly
const dbGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbRun = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

describe('End-to-End Workflow Templates Integration Tests', () => {
  const userId = 'usr-test-1';
  const orgId = 'org-test-1';

  beforeAll(async () => {
    // Await database creations sequentially
    await dbRun(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS credentials (id TEXT PRIMARY KEY, user_id TEXT, org_id TEXT, provider TEXT, encrypted_key TEXT)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, name TEXT, description TEXT, category TEXT, required_credentials TEXT, is_template BOOLEAN DEFAULT FALSE, thumbnail_url TEXT, graph_json TEXT, owner_id TEXT, org_id TEXT)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, workflow_id TEXT, status TEXT, duration_ms INTEGER DEFAULT 0, started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, finished_at TIMESTAMP)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS run_node_results (id TEXT PRIMARY KEY, run_id TEXT, node_id TEXT, status TEXT, output_json TEXT, error_json TEXT, cost_cents REAL DEFAULT 0, duration_ms INTEGER DEFAULT 0, metadata_json TEXT)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS workflow_versions (id TEXT PRIMARY KEY, workflow_id TEXT, graph_json TEXT)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS deployments (id TEXT PRIMARY KEY, workflow_id TEXT, workflow_version_id TEXT, bearer_token TEXT, status TEXT, org_id TEXT)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS triggers (id TEXT PRIMARY KEY, workflow_id TEXT, trigger_type TEXT, status TEXT, config_json TEXT, org_id TEXT)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS organization_members (org_id TEXT, user_id TEXT, role TEXT, PRIMARY KEY(org_id, user_id))`);
    await dbRun(`CREATE TABLE IF NOT EXISTS mcp_servers (id TEXT PRIMARY KEY, name TEXT, type TEXT, command TEXT, args TEXT, env TEXT, url TEXT)`);
    
    // Seed standard user and credentials
    await dbRun(`INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`, [userId, 'test@example.com', 'hash']);
    await dbRun(`INSERT INTO organizations (id, name) VALUES (?, ?)`, [orgId, 'Test Org']);
    await dbRun(`INSERT INTO organization_members (org_id, user_id, role) VALUES (?, ?, ?)`, [orgId, userId, 'owner']);
    
    // Insert keys
    await dbRun(`INSERT INTO credentials (id, user_id, org_id, provider, encrypted_key) VALUES (?, ?, ?, ?, ?)`, ['c1', userId, orgId, 'openai', 'key1']);
    await dbRun(`INSERT INTO credentials (id, user_id, org_id, provider, encrypted_key) VALUES (?, ?, ?, ?, ?)`, ['c2', userId, orgId, 'groq', 'key2']);
    await dbRun(`INSERT INTO credentials (id, user_id, org_id, provider, encrypted_key) VALUES (?, ?, ?, ?, ?)`, ['c3', userId, orgId, 'smtp_user', 'user']);
    await dbRun(`INSERT INTO credentials (id, user_id, org_id, provider, encrypted_key) VALUES (?, ?, ?, ?, ?)`, ['c4', userId, orgId, 'smtp_pass', 'pass']);

    // Populate all seeded templates
    await seedTemplates();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      db.close(() => resolve());
    });
  });

  it('Template 1: Document Extraction Pipeline should run successfully', async () => {
    // Mock OCR text extraction
    mockRecognize.mockResolvedValue({
      data: {
        text: 'INVOICE FROM ACME CORP\nDate: 2026-08-01\nInvoice #: 12345\nTotal Amount: $120.50',
        confidence: 99.0
      }
    });

    // Mock LLM prompt response
    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"vendor": "Acme Corp", "date": "2026-08-01", "invoiceNumber": "12345", "total": "$120.50"}'
          }
        }
      ]
    });

    const runId = 'run-tmpl-1';
    await dbRun('INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, ?)', [runId, 'tmpl-doc-extraction', 'running']);
    await executeRunBackend(runId, 'tmpl-doc-extraction', orgId, undefined, undefined, {
      filePath: 'sample_invoice.png',
      fileName: 'sample_invoice.png',
      eventType: 'create'
    });

    // Verify run status
    const run = await dbGet('SELECT * FROM runs WHERE id = ?', [runId]);
    expect(run).toBeDefined();
    expect(run.status).toBe('success');

    // Verify OCR node output
    const ocrResult = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'ocr-1']);
    expect(ocrResult.status).toBe('success');
    expect(JSON.parse(ocrResult.output_json)).toEqual({
      text: 'INVOICE FROM ACME CORP\nDate: 2026-08-01\nInvoice #: 12345\nTotal Amount: $120.50',
      confidence: 99.0
    });

    // Verify LLM prompt node output
    const llmResult = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'llm-1']);
    expect(llmResult.status).toBe('success');
    expect(JSON.parse(llmResult.output_json)).toEqual({
      data: {
        text: '{"vendor": "Acme Corp", "date": "2026-08-01", "invoiceNumber": "12345", "total": "$120.50"}'
      }
    });

    // Verify SQLite storage row creation
    const dbPath = path.resolve(process.cwd(), 'database.sqlite');
    const invoiceDb = new DatabaseWrapper(undefined, dbPath);
    const storedRow: any = await new Promise((resolve) => {
      invoiceDb.get('SELECT * FROM extracted_invoices ORDER BY id DESC LIMIT 1', [], (_err, row) => resolve(row));
    });
    invoiceDb.close();
    expect(storedRow).toBeDefined();
    expect(JSON.parse(storedRow.payload)).toEqual({
      text: '{"vendor": "Acme Corp", "date": "2026-08-01", "invoiceNumber": "12345", "total": "$120.50"}'
    });

    // Verify email node sent successfully
    const emailResult = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'email-1']);
    expect(emailResult.status).toBe('success');
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'admin@example.com',
      from: 'noreply@example.com',
      subject: 'Invoice Processed: sample_invoice.png',
      text: expect.stringContaining('File: sample_invoice.png')
    }));
    expect(mockSendMail).toHaveBeenLastCalledWith(expect.objectContaining({
      text: expect.stringContaining('{"vendor": "Acme Corp", "date": "2026-08-01", "invoiceNumber": "12345", "total": "$120.50"}')
    }));
  });

  it('Template 2: Summarize & Notify should run successfully', async () => {
    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: '- Bullet point one summary\n- Bullet point two summary'
          }
        }
      ]
    });

    const runId = 'run-tmpl-2';
    await dbRun('INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, ?)', [runId, 'tmpl-summarize-notify', 'running']);
    await executeRunBackend(runId, 'tmpl-summarize-notify', orgId, undefined, undefined, {
      body: {
        text: 'This is a long article about something that needs summary.'
      }
    });

    const run = await dbGet('SELECT * FROM runs WHERE id = ?', [runId]);
    expect(run.status).toBe('success');

    // Verify Text Transform output matches interpolation
    const transformResult = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'transform-1']);
    expect(transformResult.status).toBe('success');
    expect(JSON.parse(transformResult.output_json)).toEqual({
      data: {
        text: '### Summarized Report\n\n- Bullet point one summary\n- Bullet point two summary'
      }
    });

    // Verify Webhook was triggered with the interpolated report text
    const webhookResult = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'webhook-1']);
    expect(webhookResult.status).toBe('success');
    expect(mockFetch.mock.calls.length).toBeGreaterThan(0);
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    expect(lastCall[0]).toBe('https://hooks.slack.com/services/YOUR/WEBHOOK/URL');
    expect(lastCall[1].method).toBe('POST');
    const parsedBody = JSON.parse(lastCall[1].body);
    expect(parsedBody).toEqual({
      text: '### Summarized Report\n\n- Bullet point one summary\n- Bullet point two summary'
    });
  });

  it('Template 3: MCP Tool Chaining should run successfully', async () => {
    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'mcp, context, protocol'
          }
        }
      ]
    });

    mockCallTool.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            wordCount: 3,
            characterCount: 22,
            uppercaseText: 'MCP, CONTEXT, PROTOCOL'
          })
        }
      ]
    });

    const runId = 'run-tmpl-3';
    await dbRun('INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, ?)', [runId, 'tmpl-mcp-chaining', 'running']);
    await executeRunBackend(runId, 'tmpl-mcp-chaining', orgId, undefined, undefined, {
      body: {
        text: 'Model Context Protocol text string'
      }
    });

    const run = await dbGet('SELECT * FROM runs WHERE id = ?', [runId]);
    expect(run.status).toBe('success');

    const mcpResult = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'mcp-1']);
    expect(mcpResult.status).toBe('success');
    expect(JSON.parse(mcpResult.output_json)).toEqual({
      data: {
        wordCount: 3,
        characterCount: 22,
        uppercaseText: 'MCP, CONTEXT, PROTOCOL'
      }
    });

    const transformResult = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'transform-1']);
    expect(transformResult.status).toBe('success');
    expect(JSON.parse(transformResult.output_json).data.text).toBe(
      'Keywords:\nmcp, context, protocol\n\nAnalysis:\nWord count: 3\nCharacter count: 22'
    );
  });

  it('Template 4: Scheduled Data Logger should run successfully', async () => {
    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Daily server checks: CPU 5%, Memory 45%, Disk 30%'
          }
        }
      ]
    });

    const runId = 'run-tmpl-4';
    await dbRun('INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, ?)', [runId, 'tmpl-scheduled-logger', 'running']);
    await executeRunBackend(runId, 'tmpl-scheduled-logger', orgId, undefined, undefined, {
      triggeredAt: new Date().toISOString(),
      cronPattern: '0 9 * * *'
    });

    const run = await dbGet('SELECT * FROM runs WHERE id = ?', [runId]);
    expect(run.status).toBe('success');

    // Check stored row
    const dbPath = path.resolve(process.cwd(), 'database.sqlite');
    const logDb = new DatabaseWrapper(undefined, dbPath);
    const storedLog: any = await new Promise((resolve) => {
      logDb.get('SELECT * FROM scheduled_logs ORDER BY id DESC LIMIT 1', [], (_err, row) => resolve(row));
    });
    logDb.close();
    expect(storedLog).toBeDefined();
    expect(JSON.parse(storedLog.log_payload)).toEqual({
      text: 'Daily server checks: CPU 5%, Memory 45%, Disk 30%'
    });
  });

  it('Template 5: Conditional Routing - Urgent path should route to Email and skip Storage', async () => {
    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'urgent'
          }
        }
      ]
    });

    const runId = 'run-tmpl-5-urgent';
    await dbRun('INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, ?)', [runId, 'tmpl-conditional-routing', 'running']);
    await executeRunBackend(runId, 'tmpl-conditional-routing', orgId, undefined, undefined, {
      body: {
        text: 'Database down!'
      }
    });

    const run = await dbGet('SELECT * FROM runs WHERE id = ?', [runId]);
    expect(run.status).toBe('success');

    const emailRes = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'email-1']);
    expect(emailRes.status).toBe('success');
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'support@example.com',
      from: 'triage@example.com',
      text: 'An urgent request was flagged by the system:\n\nDatabase down!'
    }));

    const storageRes = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'storage-1']);
    expect(storageRes.status).toBe('skipped-by-branch');
  });

  it('Template 5: Conditional Routing - Normal path should route to Storage and skip Email', async () => {
    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'normal'
          }
        }
      ]
    });

    const runId = 'run-tmpl-5-normal';
    await dbRun('INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, ?)', [runId, 'tmpl-conditional-routing', 'running']);
    await executeRunBackend(runId, 'tmpl-conditional-routing', orgId, undefined, undefined, {
      body: {
        text: 'How do I change my password?'
      }
    });

    const run = await dbGet('SELECT * FROM runs WHERE id = ?', [runId]);
    expect(run.status).toBe('success');

    const emailRes = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'email-1']);
    expect(emailRes.status).toBe('skipped-by-branch');

    const storageRes = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'storage-1']);
    expect(storageRes.status).toBe('success');

    // Check sqlite row
    const dbPath = path.resolve(process.cwd(), 'database.sqlite');
    const triageDb = new DatabaseWrapper(undefined, dbPath);
    const storedRow: any = await new Promise((resolve) => {
      triageDb.get('SELECT * FROM triage_normal_logs ORDER BY id DESC LIMIT 1', [], (_err, row) => resolve(row));
    });
    triageDb.close();
    expect(storedRow).toBeDefined();
    // It stores the input node values
    expect(storedRow.payload).toContain('How do I change my password?');
  });

  it('Template 6: RAG Q&A Starter should run successfully', async () => {
    // Set up dummy vectors file in process workspace
    const vectorFilePath = path.resolve(process.cwd(), '.openflow_vectors.json');
    const dummyEmbedding = Array(1536).fill(0.1);
    dummyEmbedding[0] = 0.9;
    const testDoc = {
      text: 'The secret code to the mainframe is Alpha-Beta-99.',
      metadata: { source: 'mainframe_guide.txt' },
      embedding: dummyEmbedding
    };
    fs.writeFileSync(vectorFilePath, JSON.stringify([testDoc]), 'utf8');

    mockCreateEmbedding.mockResolvedValue({
      data: [{ embedding: dummyEmbedding }]
    });

    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Based on the context, the secret mainframe code is Alpha-Beta-99.'
          }
        }
      ]
    });

    const runId = 'run-tmpl-6';
    await dbRun('INSERT INTO runs (id, workflow_id, status) VALUES (?, ?, ?)', [runId, 'tmpl-rag-starter', 'running']);
    await executeRunBackend(runId, 'tmpl-rag-starter', orgId, undefined, undefined, {
      body: {
        question: 'What is the mainframe code?'
      }
    });

    // Clean up vector file
    if (fs.existsSync(vectorFilePath)) {
      fs.unlinkSync(vectorFilePath);
    }

    const run = await dbGet('SELECT * FROM runs WHERE id = ?', [runId]);
    expect(run.status).toBe('success');

    const retrieveRes = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'retrieve-1']);
    expect(retrieveRes.status).toBe('success');
    expect(JSON.parse(retrieveRes.output_json)).toEqual({
      results: [
        {
          text: 'The secret code to the mainframe is Alpha-Beta-99.',
          metadata: { source: 'mainframe_guide.txt' },
          score: 1 // exactly similar since we returned the same embedding
        }
      ]
    });

    const llmRes = await dbGet('SELECT * FROM run_node_results WHERE run_id = ? AND node_id = ?', [runId, 'llm-1']);
    expect(llmRes.status).toBe('success');
    expect(JSON.parse(llmRes.output_json).data.text).toBe(
      'Based on the context, the secret mainframe code is Alpha-Beta-99.'
    );
  });
});
