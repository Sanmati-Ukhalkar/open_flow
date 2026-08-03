import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TableProperties,
  Inbox,
  ChevronDown,
  ChevronRight as ChevronRightSmall,
} from 'lucide-react';

interface DatabaseViewerProps {
  token: string;
}

interface RowData {
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// JSON Cell — collapses/expands JSON payload values inline
// ---------------------------------------------------------------------------
function JsonCell({ value }: { value: any }) {
  const [expanded, setExpanded] = useState(false);

  // Try to parse as JSON
  let parsed: any = null;
  let isJson = false;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
      isJson = typeof parsed === 'object' && parsed !== null;
    } catch {
      // Not JSON — render as plain text
    }
  }

  if (!isJson) {
    return (
      <span className="font-mono text-xs text-zinc-300 break-all">
        {value === null || value === undefined ? (
          <span className="text-zinc-600 italic">null</span>
        ) : (
          String(value)
        )}
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1 text-[10px] font-semibold text-purple-400 hover:text-purple-300 transition-colors mb-1"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRightSmall className="w-3 h-3" />
        )}
        {expanded ? 'Collapse JSON' : 'Expand JSON'}
      </button>
      {expanded && (
        <pre className="text-[11px] font-mono text-emerald-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-x-auto max-w-[480px] leading-relaxed">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
      {!expanded && (
        <span className="font-mono text-xs text-zinc-500 truncate block max-w-[200px]">
          {value.slice(0, 60)}{value.length > 60 ? '…' : ''}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DatabaseViewer component
// ---------------------------------------------------------------------------
export const DatabaseViewer = ({ token }: DatabaseViewerProps) => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [rows, setRows] = useState<RowData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');
  const LIMIT = 50;

  // -----------------------------------------------------------------------
  // Fetch table list
  // -----------------------------------------------------------------------
  const fetchTables = useCallback(async () => {
    setLoadingTables(true);
    setError('');
    try {
      const res = await fetch('/api/db/tables', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTables(data.tables);
        if (data.tables.length > 0 && !selectedTable) {
          setSelectedTable(data.tables[0]);
        }
      } else {
        setError(data.error?.message || 'Failed to load tables.');
      }
    } catch {
      setError('Could not connect to backend.');
    } finally {
      setLoadingTables(false);
    }
  }, [token, selectedTable]);

  // -----------------------------------------------------------------------
  // Fetch rows for the selected table
  // -----------------------------------------------------------------------
  const fetchRows = useCallback(
    async (tableName: string, pageNum: number) => {
      setLoadingRows(true);
      setError('');
      try {
        const res = await fetch(
          `/api/db/tables/${encodeURIComponent(tableName)}/rows?page=${pageNum}&limit=${LIMIT}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
          setRows(data.rows);
          setTotal(data.total);
          setTotalPages(data.totalPages || 1);
          // Infer columns from the first row
          if (data.rows.length > 0) {
            setColumns(Object.keys(data.rows[0]));
          } else {
            setColumns([]);
          }
        } else {
          setError(data.error?.message || 'Failed to load rows.');
        }
      } catch {
        setError('Could not connect to backend.');
      } finally {
        setLoadingRows(false);
      }
    },
    [token]
  );

  // Initial load
  useEffect(() => {
    fetchTables();
  }, []);

  // Reload rows when table or page changes
  useEffect(() => {
    if (selectedTable) {
      fetchRows(selectedTable, page);
    }
  }, [selectedTable, page]);

  const handleSelectTable = (name: string) => {
    setSelectedTable(name);
    setPage(1);
    setRows([]);
    setColumns([]);
  };

  const handleRefresh = () => {
    fetchTables();
    if (selectedTable) fetchRows(selectedTable, page);
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <Database className="w-6 h-6 text-purple-400" />
            Database Viewer
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Browse all tables and rows stored by SQLite Storage nodes in{' '}
            <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">
              database.sqlite
            </code>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all text-xs font-medium"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingTables || loadingRows ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 text-xs text-rose-300 bg-rose-950/20 border border-rose-900/30 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* ---- Left: Table List Sidebar ---- */}
        <div className="w-44 flex-shrink-0 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center gap-1.5">
            <TableProperties className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tables</span>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {loadingTables ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-zinc-700 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : tables.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Inbox className="w-5 h-5 text-zinc-700 mx-auto mb-2" />
                <p className="text-[10px] text-zinc-600">No tables yet.</p>
                <p className="text-[9px] text-zinc-700 mt-1">
                  Run a workflow with a SQLite Storage node first.
                </p>
              </div>
            ) : (
              tables.map((t) => (
                <button
                  key={t}
                  onClick={() => handleSelectTable(t)}
                  className={`w-full text-left px-3 py-2 text-xs font-mono transition-all ${
                    selectedTable === t
                      ? 'bg-purple-600/15 text-purple-300 border-l-2 border-purple-500'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border-l-2 border-transparent'
                  }`}
                >
                  {t}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ---- Right: Row Table Panel ---- */}
        <div className="flex-1 flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden min-w-0">
          {/* Table header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-xs font-bold text-zinc-300 font-mono">
                {selectedTable ?? 'No table selected'}
              </span>
              {selectedTable && (
                <span className="text-[10px] font-mono bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                  {total} row{total !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="text-[10px] font-mono">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Row content */}
          <div className="flex-1 overflow-auto">
            {!selectedTable ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <Database className="w-8 h-8 mb-3 opacity-40" />
                <p className="text-sm">Select a table from the left to view its rows.</p>
              </div>
            ) : loadingRows ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-zinc-700 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <Inbox className="w-8 h-8 mb-3 opacity-40" />
                <p className="text-sm">This table has no rows yet.</p>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-3 align-top max-w-[320px]"
                        >
                          <JsonCell value={row[col]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer pagination (bottom bar for convenience) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 flex-shrink-0 bg-zinc-950/40">
              <span className="text-[10px] font-mono text-zinc-600">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} rows
              </span>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3 h-3" />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseViewer;
