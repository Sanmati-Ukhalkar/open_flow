export async function up(db: any) {
  await new Promise<void>((resolve, reject) => {
    db.all("PRAGMA table_info(runs)", (err: any, rows: any[]) => {
      if (err) return reject(err);
      const hasColumn = Array.isArray(rows) && rows.some(r => r.name === 'queue_job_id');
      if (!hasColumn) {
        db.run("ALTER TABLE runs ADD COLUMN queue_job_id TEXT", (alterErr: any) => {
          if (alterErr) reject(alterErr);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  });
}
