import sqlite3 from 'sqlite3';
import path from 'path';
import { Pool } from 'pg';

export function translateToPostgres(sql: string, values: any[] = []): { query: string; values: any[] } {
  let query = sql;
  const newValues = [...values];

  // 1. Replace '?' placeholders with '$1', '$2', ...
  let index = 1;
  query = query.replace(/\?/g, () => `$${index++}`);

  // 2. Handle 'INSERT OR IGNORE INTO' -> 'INSERT INTO ... ON CONFLICT DO NOTHING'
  if (query.match(/INSERT\s+OR\s+IGNORE\s+INTO/i)) {
    query = query.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
    if (!query.includes('ON CONFLICT')) {
      query += ' ON CONFLICT DO NOTHING';
    }
  }

  // 3. Handle 'INTEGER PRIMARY KEY AUTOINCREMENT' -> 'SERIAL PRIMARY KEY'
  query = query.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');

  // 4. Handle sqlite_master -> information_schema
  if (query.includes('sqlite_master')) {
    query = query.replace(
      /SELECT\s+name\s+FROM\s+sqlite_master\s+WHERE\s+type='table'\s+AND\s+name\s+NOT\s+LIKE\s+'sqlite_%'\s+ORDER\s+BY\s+name/i,
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE 'sqlite_%' ORDER BY table_name"
    );
  }

  // 5. Convert table_info PRAGMA check:
  // PRAGMA table_info(tableName)
  const pragmaMatch = query.match(/PRAGMA\s+table_info\((\w+)\)/i);
  if (pragmaMatch) {
    const tableName = pragmaMatch[1];
    query = `SELECT column_name AS name FROM information_schema.columns WHERE table_name = '${tableName}'`;
  }

  // 6. Handle BOOLEAN DEFAULT values (0 -> false, 1 -> true)
  query = query.replace(/BOOLEAN\s+DEFAULT\s+0/gi, 'BOOLEAN DEFAULT FALSE');
  query = query.replace(/BOOLEAN\s+DEFAULT\s+1/gi, 'BOOLEAN DEFAULT TRUE');

  // 7. Handle DATETIME type -> TIMESTAMP
  query = query.replace(/\bDATETIME\b/gi, 'TIMESTAMP');

  // 8. If this is an INSERT statement, return id for serial id matching
  if (query.trim().toUpperCase().startsWith('INSERT') && !query.includes('RETURNING')) {
    if (!query.match(/INTO\s+organization_members/i)) {
      query += ' RETURNING id';
    }
  }

  return { query, values: newValues };
}

export class DatabaseWrapper {
  public isPg: boolean;
  private pool: Pool | null = null;
  private sqliteDb: sqlite3.Database | null = null;

  constructor(connectionString: string | undefined, sqlitePath: string) {
    if (connectionString) {
      this.isPg = true;
      this.pool = new Pool({ connectionString });
      console.log(`Connected to PostgreSQL database.`);
    } else {
      this.isPg = false;
      this.sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
        if (err) {
          console.error(`Failed to connect to SQLite at ${sqlitePath}:`, err.message);
        } else {
          console.log(`Connected to SQLite database.`);
          this.sqliteDb?.configure('busyTimeout', 5000);
        }
      });
    }
  }

  serialize(callback: () => void) {
    if (this.isPg) {
      callback();
    } else {
      this.sqliteDb!.serialize(callback);
    }
  }

  run(sql: string, params: any[] | any = [], callback?: (this: any, err: Error | null) => void) {
    let actualParams = params;
    let actualCallback = callback;
    if (typeof params === 'function') {
      actualCallback = params;
      actualParams = [];
    } else if (params === undefined || params === null) {
      actualParams = [];
    }

    if (this.isPg) {
      const { query, values } = translateToPostgres(sql, actualParams);
      this.pool!.query(query, values)
        .then((res) => {
          if (actualCallback) {
            const lastID = res.rows[0]?.id || null;
            actualCallback.call({ lastID, changes: res.rowCount || 0 }, null);
          }
        })
        .catch((err) => {
          if (actualCallback) actualCallback.call({ lastID: null, changes: 0 }, err);
        });
    } else {
      this.sqliteDb!.run(sql, actualParams, actualCallback);
    }
  }

  get(sql: string, params: any[] | any = [], callback?: (err: Error | null, row: any) => void) {
    let actualParams = params;
    let actualCallback = callback;
    if (typeof params === 'function') {
      actualCallback = params;
      actualParams = [];
    } else if (params === undefined || params === null) {
      actualParams = [];
    }

    if (this.isPg) {
      const { query, values } = translateToPostgres(sql, actualParams);
      this.pool!.query(query, values)
        .then((res) => {
          if (actualCallback) actualCallback(null, res.rows[0]);
        })
        .catch((err) => {
          if (actualCallback) actualCallback(err, null);
        });
    } else {
      this.sqliteDb!.get(sql, actualParams, actualCallback);
    }
  }

  all(sql: string, params: any[] | any = [], callback?: (err: Error | null, rows: any[]) => void) {
    let actualParams = params;
    let actualCallback = callback;
    if (typeof params === 'function') {
      actualCallback = params;
      actualParams = [];
    } else if (params === undefined || params === null) {
      actualParams = [];
    }

    if (this.isPg) {
      const { query, values } = translateToPostgres(sql, actualParams);
      this.pool!.query(query, values)
        .then((res) => {
          if (actualCallback) actualCallback(null, res.rows);
        })
        .catch((err) => {
          if (actualCallback) actualCallback(err, []);
        });
    } else {
      this.sqliteDb!.all(sql, actualParams, actualCallback);
    }
  }

  prepare(sql: string) {
    return {
      run: (...args: any[]) => {
        let callback: ((err: any) => void) | undefined;
        let params = args;
        if (typeof args[args.length - 1] === 'function') {
          callback = args[args.length - 1];
          params = args.slice(0, args.length - 1);
        }
        this.run(sql, params, callback);
      },
      finalize: (callback?: () => void) => {
        if (callback) callback();
      }
    };
  }

  close(callback?: (err: any) => void) {
    if (this.isPg) {
      this.pool!.end().then(() => callback && callback(null)).catch(err => callback && callback(err));
    } else {
      this.sqliteDb!.close(callback);
    }
  }
}

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.SQLITE_DB_PATH || path.resolve(__dirname, '../../../metadata.sqlite');
export const db = new DatabaseWrapper(process.env.DATABASE_URL, dbPath);
