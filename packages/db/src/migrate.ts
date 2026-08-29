import { db } from './db';
import * as migration1 from './migrations/001_initial_schema';
import * as migration2 from './migrations/002_add_queue_job_id';

export async function runMigrations() {
  console.log('[DB] Running database migrations...');
  try {
    await migration1.up(db);
    await migration2.up(db);
    console.log('[DB] Database migrations applied successfully.');
  } catch (error) {
    console.error('[DB] Error executing database migrations:', error);
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
