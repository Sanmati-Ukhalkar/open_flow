import { DatabaseWrapper } from '@open-flow/db';
import path from 'path';

interface SQLiteStorageConfig {
  tableName: string;
  columnName: string;
}

class NodeExecutionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'NodeExecutionError';
    this.code = code;
  }
}

export async function run(
  input: any,
  config: SQLiteStorageConfig
): Promise<{ data: { success: boolean; rowId: number } }> {
  const tableName = config.tableName || 'workflow_data';
  const columnName = config.columnName || 'payload';

  // Sanitize identifiers to prevent SQL injection on table/column names
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new NodeExecutionError(
      'INVALID_TABLE_NAME',
      'Table name must contain only alphanumeric characters and underscores, and start with a letter.'
    );
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
    throw new NodeExecutionError(
      'INVALID_COLUMN_NAME',
      'Column name must contain only alphanumeric characters and underscores, and start with a letter.'
    );
  }

  // Resolve input data payload
  let dataToStore = '';
  if (input !== null && input !== undefined) {
    const actualData = input.data !== undefined ? input.data : input;
    dataToStore = typeof actualData === 'object' ? JSON.stringify(actualData) : String(actualData);
  }

  const dbPath = process.env.STORAGE_DB_PATH || path.resolve(process.cwd(), 'database.sqlite');
  
  return new Promise((resolve, reject) => {
    const db = new DatabaseWrapper(process.env.DATABASE_URL, dbPath);

    db.serialize(() => {
      // Create table if not exists
      db.run(
        `CREATE TABLE IF NOT EXISTS ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          ${columnName} TEXT
        )`,
        (err: Error | null) => {
          if (err) {
            db.close();
            return reject(new NodeExecutionError('CREATE_TABLE_ERROR', `Failed to create database table: ${err.message}`));
          }
        }
      );

      // Insert record
      db.run(
        `INSERT INTO ${tableName} (${columnName}) VALUES (?)`,
        [dataToStore],
        function (this: any, err: Error | null) {
          db.close();
          if (err) {
            return reject(new NodeExecutionError('INSERT_ROW_ERROR', `Failed to insert record: ${err.message}`));
          }
          
          resolve({
            data: {
              success: true,
              rowId: this.lastID,
            },
          });
        }
      );
    });
  });
}
