import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './run';

const { mockDbRun, mockDbClose } = vi.hoisted(() => ({
  mockDbRun: vi.fn(),
  mockDbClose: vi.fn(),
}));

vi.mock('sqlite3', () => {
  class Database {
    constructor(_path: string, cb: any) {
      if (cb) cb(null);
    }
    serialize(fn: any) {
      fn();
    }
    run(sql: string, paramsOrCb?: any, cb?: any) {
      let actualCb = cb;
      let params: any[] = [];
      if (typeof paramsOrCb === 'function') {
        actualCb = paramsOrCb;
      } else if (paramsOrCb) {
        params = paramsOrCb;
      }
      const p = mockDbRun(sql, params);
      if (p && typeof p.then === 'function') {
        p.then(
          (_res: any) => {
            if (actualCb) actualCb.call({ lastID: 100 }, null);
          },
          (err: any) => {
            if (actualCb) actualCb(err);
          }
        );
      } else {
        if (actualCb) actualCb.call({ lastID: 100 }, null);
      }
    }
    all(_sql: string, paramsOrCb?: any, cb?: any) {
      let actualCb = cb;
      if (typeof paramsOrCb === 'function') {
        actualCb = paramsOrCb;
      }
      if (actualCb) actualCb(null, []);
    }
    get(_sql: string, paramsOrCb?: any, cb?: any) {
      let actualCb = cb;
      if (typeof paramsOrCb === 'function') {
        actualCb = paramsOrCb;
      }
      if (actualCb) actualCb(null, {});
    }
    close = mockDbClose;
  }
  return {
    default: { Database },
    Database,
  };
});

describe('SQLite Storage Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create table and insert row successfully', async () => {
    mockDbRun.mockResolvedValue({});

    const input = { data: 'my text' };
    const config = {
      tableName: 'user_logs',
      columnName: 'log_msg',
    };

    const result = await run(input, config);

    expect(result).toEqual({
      data: {
        success: true,
        rowId: 100,
      },
    });

    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS user_logs'),
      []
    );

    expect(mockDbRun).toHaveBeenCalledWith(
      'INSERT INTO user_logs (log_msg) VALUES (?)',
      ['my text']
    );

    expect(mockDbClose).toHaveBeenCalled();
  });

  it('should validate table name patterns to prevent SQL injections', async () => {
    const config = {
      tableName: 'user_logs; DROP TABLE users;',
      columnName: 'payload',
    };

    await expect(run({}, config)).rejects.toThrow('Table name must contain only alphanumeric characters');
  });

  it('should validate column name patterns to prevent SQL injections', async () => {
    const config = {
      tableName: 'logs',
      columnName: 'payload; --',
    };

    await expect(run({}, config)).rejects.toThrow('Column name must contain only alphanumeric characters');
  });

  it('should handle arbitrary object input gracefully (serializes to JSON)', async () => {
    mockDbRun.mockResolvedValue({});

    const input = { data: { user: 'Alice', score: 99 } };
    const config = {
      tableName: 'workflow_data',
      columnName: 'payload',
    };

    const result = await run(input, config);
    expect(result.data.success).toBe(true);
    // Verifies arbitrary objects are JSON-stringified (not silently dropped)
    expect(mockDbRun).toHaveBeenCalledWith(
      'INSERT INTO workflow_data (payload) VALUES (?)',
      [JSON.stringify({ user: 'Alice', score: 99 })]
    );
  });

  it('should reject with INSERT_ROW_ERROR if database insert fails', async () => {
    // First call (CREATE TABLE) succeeds, second (INSERT) fails
    mockDbRun
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('disk full'));

    const config = {
      tableName: 'logs',
      columnName: 'payload',
    };

    await expect(run({ data: 'test' }, config)).rejects.toThrow('Failed to insert record');
  });
});
