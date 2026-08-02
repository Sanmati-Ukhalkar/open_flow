import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock DB
const mockDbGet = vi.fn();
const mockDbAll = vi.fn();
const mockDbRun = vi.fn();

vi.mock('../db', () => ({
  db: {
    get: (sql: string, params: any[], cb: any) => {
      mockDbGet(sql, params).then(
        (res: any) => cb(null, res),
        (err: any) => cb(err, null)
      );
    },
    all: (sql: string, params: any[], cb: any) => {
      mockDbAll(sql, params).then(
        (res: any) => cb(null, res),
        (err: any) => cb(err, null)
      );
    },
    run: (sql: string, params: any[], cb: any) => {
      mockDbRun(sql, params).then(
        (_res: any) => {
          if (cb) cb.call({ lastID: 1, changes: 1 }, null);
        },
        (err: any) => {
          if (cb) cb(err);
        }
      );
    }
  }
}));

// Mock credentials decrypt helper
vi.mock('../crypto', () => ({
  decrypt: (val: string) => `decrypted-${val}`,
}));

// Mock the node runners to keep tests fast and isolated
const mockLLMRun = vi.fn();
const mockTextTransformRun = vi.fn();
const mockSQLiteRun = vi.fn();

vi.mock('../../nodes/llm-prompt/run', () => ({
  run: (input: any, config: any) => mockLLMRun(input, config),
}));
vi.mock('../../nodes/text-transform/run', () => ({
  run: (input: any, config: any) => mockTextTransformRun(input, config),
}));
vi.mock('../../nodes/sqlite-storage/run', () => ({
  run: (input: any, config: any) => mockSQLiteRun(input, config),
}));

// Import the engine functions to test
import { executeRunBackend } from '../engine';

describe('Workflow Engine Core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbGet.mockReset();
    mockDbAll.mockReset();
    mockDbRun.mockReset();

    // Default DB mock implementations
    mockDbRun.mockResolvedValue({ changes: 1 });
    mockDbAll.mockResolvedValue([]); // run_node_results is initially empty
  });

  it('should run a simple DAG node successfully', async () => {
    const workflowId = 'wf-1';
    const runId = 'run-1';
    const orgId = 'org-1';

    // Mock workflow definition (1 node)
    const graphJson = JSON.stringify({
      nodes: [
        { id: 'node-1', type: 'text-transform', data: { config: { template: 'hello' } } }
      ],
      edges: []
    });

    mockDbGet.mockImplementation((sql: string, _params: any[]) => {
      if (sql.includes('SELECT * FROM workflows')) {
        return Promise.resolve({ id: workflowId, graph_json: graphJson });
      }
      return Promise.resolve(null);
    });

    mockTextTransformRun.mockResolvedValue({ data: { text: 'hello' } });

    await executeRunBackend(runId, workflowId, orgId);

    // Verify database status updates
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP'),
      expect.arrayContaining(['success', expect.any(Number), runId])
    );
  });

  it('should propagate skips downstream when a parent node fails', async () => {
    const workflowId = 'wf-2';
    const runId = 'run-2';
    const orgId = 'org-1';

    // 1 -> 2
    const graphJson = JSON.stringify({
      nodes: [
        { id: 'node-1', type: 'llm-prompt', data: { config: { promptText: 'hello' } } },
        { id: 'node-2', type: 'text-transform', data: { config: { template: 'result: {{node-1}}' } } }
      ],
      edges: [
        { id: 'e1-2', source: 'node-1', target: 'node-2' }
      ]
    });

    mockDbGet.mockImplementation((sql: string, _params: any[]) => {
      if (sql.includes('SELECT * FROM workflows')) {
        return Promise.resolve({ id: workflowId, graph_json: graphJson });
      }
      return Promise.resolve(null);
    });

    // Make node-1 fail
    mockLLMRun.mockRejectedValue(new Error('OpenAI API Error'));

    await executeRunBackend(runId, workflowId, orgId);

    // Verify node-1 gets 'error' status
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE run_node_results SET status = ?, error_json = ?'),
      expect.arrayContaining(['error', expect.any(String), expect.any(Number), runId, 'node-1'])
    );

    // Verify node-2 gets 'skipped' status due to cascade skip
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE run_node_results SET status = ? WHERE run_id = ? AND node_id = ?'),
      ['skipped', runId, 'node-2']
    );

    // Overall run is marked as failed since no success occurred
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE runs SET status = ?, finished_at = CURRENT_TIMESTAMP'),
      expect.arrayContaining(['failed', expect.any(Number), runId])
    );
  });

  it('should wait for all parents in multi-input nodes before execution', async () => {
    const workflowId = 'wf-3';
    const runId = 'run-3';
    const orgId = 'org-1';

    // 1 -> 3, 2 -> 3
    const graphJson = JSON.stringify({
      nodes: [
        { id: 'node-1', type: 'text-transform', data: { config: { template: 'A' } } },
        { id: 'node-2', type: 'text-transform', data: { config: { template: 'B' } } },
        { id: 'node-3', type: 'text-transform', data: { config: { template: '{{node-1}} + {{node-2}}' } } }
      ],
      edges: [
        { id: 'e1-3', source: 'node-1', target: 'node-3' },
        { id: 'e2-3', source: 'node-2', target: 'node-3' }
      ]
    });

    mockDbGet.mockImplementation((sql: string, _params: any[]) => {
      if (sql.includes('SELECT * FROM workflows')) {
        return Promise.resolve({ id: workflowId, graph_json: graphJson });
      }
      return Promise.resolve(null);
    });

    mockTextTransformRun.mockImplementation(async (input, config) => {
      if (config.template === 'A') return { data: { text: 'A' } };
      if (config.template === 'B') return { data: { text: 'B' } };
      return { data: { text: `${input['node-1']?.data?.text} + ${input['node-2']?.data?.text}` } };
    });

    await executeRunBackend(runId, workflowId, orgId);

    // Verify node-3 is called with inputs from both parent nodes
    expect(mockTextTransformRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        'node-1': expect.objectContaining({ data: { text: 'A' } }),
        'node-2': expect.objectContaining({ data: { text: 'B' } })
      }),
      expect.objectContaining({ template: '{{node-1}} + {{node-2}}' })
    );
  });

  it('should support retrying workflow by reusing cached upstream output', async () => {
    const workflowId = 'wf-4';
    const runId = 'run-4';
    const orgId = 'org-1';

    // 1 -> 2
    const graphJson = JSON.stringify({
      nodes: [
        { id: 'node-1', type: 'text-transform', data: { config: { template: 'A' } } },
        { id: 'node-2', type: 'text-transform', data: { config: { template: 'B: {{node-1}}' } } }
      ],
      edges: [
        { id: 'e1-2', source: 'node-1', target: 'node-2' }
      ]
    });

    mockDbGet.mockImplementation((sql: string, _params: any[]) => {
      if (sql.includes('SELECT * FROM workflows')) {
        return Promise.resolve({ id: workflowId, graph_json: graphJson });
      }
      return Promise.resolve(null);
    });

    // Mock existing results: node-1 was already success, node-2 failed previously
    mockDbAll.mockResolvedValue([
      { id: 'res-1', run_id: runId, node_id: 'node-1', status: 'success', output_json: JSON.stringify({ data: { text: 'Cached A' } }), error_json: null },
      { id: 'res-2', run_id: runId, node_id: 'node-2', status: 'error', output_json: null, error_json: JSON.stringify({ message: 'failed' }) }
    ]);

    mockTextTransformRun.mockResolvedValue({ data: { text: 'B: Cached A' } });

    // Execute run starting from node-2 (retrying it)
    await executeRunBackend(runId, workflowId, orgId, 'node-2');

    // Node-1 (upstream) should NOT run again
    expect(mockTextTransformRun).toHaveBeenCalledTimes(1); // Only node-2 should run
    expect(mockTextTransformRun).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { text: 'Cached A' } }), // Reused cached output
      expect.objectContaining({ template: 'B: {{node-1}}' })
    );
  });
});
