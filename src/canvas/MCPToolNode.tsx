import { Handle, Position } from 'reactflow';
import { Wrench, Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export interface MCPToolNodeData {
  label?: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'skipped';
  config: {
    toolName: string;
    inputParamName: string;
  };
  error?: string;
}

export const MCPToolNode = ({ data, selected }: { data: MCPToolNodeData; selected: boolean }) => {
  const statusColors = {
    idle: 'border-zinc-800 bg-zinc-950/90 text-zinc-400 shadow-md',
    running: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.25)] bg-zinc-950/90 text-blue-400',
    success: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] bg-zinc-950/90 text-emerald-400',
    error: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.25)] bg-zinc-950/90 text-rose-400',
    skipped: 'border-zinc-900 bg-zinc-950/45 text-zinc-600 opacity-50',
  };

  return (
    <div
      className={`min-w-[220px] rounded-xl border p-4 backdrop-blur-md transition-all duration-300 ${
        selected ? 'ring-2 ring-purple-500/80 ring-offset-2 ring-offset-black' : ''
      } ${statusColors[data.status] || statusColors.idle}`}
    >
      {/* Target handle - input */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 !bg-zinc-800 !border-zinc-700"
      />

      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-zinc-300" />
          <span className="font-semibold text-sm text-zinc-100">MCP Tool</span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center">
          {data.status === 'running' && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          )}
          {data.status === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          {data.status === 'error' && (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          {data.status === 'skipped' && (
            <XCircle className="w-4 h-4 text-zinc-650" />
          )}
          {data.status === 'idle' && (
            <div className="w-2 h-2 rounded-full bg-zinc-600" />
          )}
        </div>
      </div>

      <div className="text-xs text-zinc-400 space-y-2">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5">Selected Tool</span>
          <div className="font-mono bg-zinc-900/80 p-1.5 rounded border border-zinc-800 truncate max-w-[200px] text-zinc-300">
            {data.config?.toolName || 'Not Selected'}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5">Input Parameter</span>
          <div className="font-mono bg-zinc-900/80 p-1.5 rounded border border-zinc-800 truncate max-w-[200px] text-zinc-450">
            {data.config?.inputParamName || 'text'}
          </div>
        </div>
      </div>

      {/* Source handle - output */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 !bg-zinc-800 !border-zinc-700"
      />
    </div>
  );
};

export default MCPToolNode;
