import { Position } from 'reactflow';
import { Database } from 'lucide-react';
import NodeHeader from './NodeHeader';
import NodeHandle from './NodeHandle';

export interface SQLiteStorageNodeData {
  label?: string;
  status: 'idle' | 'running' | 'success' | 'success-with-warning' | 'error' | 'skipped';
  config: {
    tableName: string;
    columnName: string;
  };
  output?: {
    rowId?: number;
    insertedCount?: number;
    status?: string;
  };
  error?: string;
}

export const SQLiteStorageNode = ({ id, data, selected }: { id: string; data: SQLiteStorageNodeData; selected: boolean }) => {
  const statusColors = {
    idle: 'border-zinc-800 bg-zinc-950 text-zinc-400 shadow-md',
    running: 'border-sky-500 animate-running-glow bg-zinc-950 text-status-running',
    success: 'border-emerald-500 animate-success-flash bg-zinc-950 text-status-success',
    'success-with-warning': 'border-amber-500 bg-zinc-950 text-status-warning',
    error: 'border-rose-500 bg-zinc-950 text-status-error',
    skipped: 'border-zinc-900 bg-zinc-900 text-zinc-600 opacity-60',
  };

  const rowId = data.output?.rowId;

  return (
    <div
      className={`min-w-[230px] rounded-xl border p-4 backdrop-blur-md transition-all duration-200 ${
        selected ? 'ring-2 ring-indigo-500/80 ring-offset-2 ring-offset-black' : ''
      } ${statusColors[data.status] || statusColors.idle}`}
    >
      <NodeHandle
        type="target"
        position={Position.Left}
        dataType="object"
        title="Input: Data object to insert (object)"
      />

      <NodeHeader
        id={id}
        nodeType="sqlite-storage"
        label={data.label}
        defaultLabel="SQLite Storage"
        icon={Database}
        status={data.status}
      />

      <div className="text-xs text-zinc-400 space-y-2 mt-2">
        <div>
          <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">Table Name</span>
          <div className="font-mono bg-zinc-900/80 p-1.5 rounded border border-zinc-800 truncate max-w-[210px] text-zinc-300">
            {data.config?.tableName || 'workflow_data'}
          </div>
        </div>

        {rowId !== undefined && (
          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Inserted Row ID
            </span>
            <div className="font-mono text-[10px] bg-zinc-900/90 text-emerald-400 font-bold px-2 py-1 rounded border border-zinc-800 inline-block">
              Row #{rowId}
            </div>
          </div>
        )}
      </div>

      <NodeHandle
        type="source"
        position={Position.Right}
        dataType="object"
        title="Output: Produces success status and rowId (object)"
      />
    </div>
  );
};

export default SQLiteStorageNode;
