export function parseSqliteDate(dateVal: any): Date {
  if (!dateVal) return new Date();
  if (typeof dateVal === 'number') return new Date(dateVal);
  if (typeof dateVal === 'string') {
    // Standard SQLite CURRENT_TIMESTAMP format is: YYYY-MM-DD HH:MM:SS
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateVal)) {
      return new Date(dateVal.replace(' ', 'T') + 'Z');
    }
  }
  return new Date(dateVal);
}
