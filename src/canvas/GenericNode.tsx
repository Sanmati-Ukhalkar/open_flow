import { Handle, Position } from 'reactflow';
import { Mail, Search, FileUp, Database, Code, GitBranch, RefreshCcw, Layout } from 'lucide-react';
import NodeHeader from './NodeHeader';

export interface GenericNodeData {
  label?: string;
  status: 'idle' | 'running' | 'success' | 'success-with-warning' | 'error' | 'skipped';
  config: Record<string, any>;
  error?: string;
  type: string;
}

const TYPE_CONFIGS: Record<string, { label: string; icon: any }> = {
  'email': { label: 'Email', icon: Mail },
  'vision-ocr': { label: 'Vision / OCR', icon: Search },
  'file-trigger': { label: 'File Trigger', icon: FileUp },
  'vector-store': { label: 'Vector Store', icon: Database },
  'vector-retrieve': { label: 'Vector Retrieve', icon: Database },
  'code-execution': { label: 'Code Execution', icon: Code },
  'branch': { label: 'Branch', icon: GitBranch },
  'loop': { label: 'Loop', icon: RefreshCcw },
};

export const GenericNode = ({ id, type, data, selected }: { id: string; type: string; data: GenericNodeData; selected: boolean }) => {
  const statusColors = {
    idle: 'border-zinc-800 bg-zinc-950 text-zinc-400 shadow-md',
    running: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.25)] bg-zinc-950 text-status-running',
    success: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] bg-zinc-950 text-status-success',
    'success-with-warning': 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] bg-zinc-950 text-status-warning',
    error: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.25)] bg-zinc-950 text-status-error',
    skipped: 'border-zinc-900 bg-zinc-900 text-zinc-650 opacity-50',
  };

  const nodeType = type || data.type;
  const typeConfig = TYPE_CONFIGS[nodeType] || { label: 'Generic Node', icon: Layout };
  const IconComponent = typeConfig.icon;

  return (
    <div
      className={`min-w-[220px] rounded-xl border p-4 backdrop-blur-md transition-all duration-300 ${
        selected ? 'ring-2 ring-purple-500/80 ring-offset-2 ring-offset-black' : ''
      } ${statusColors[data.status] || statusColors.idle}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        title="Input: Accepts incoming data properties (object)"
        className="w-2.5 h-2.5 !bg-zinc-800 !border-zinc-700"
      />

      <NodeHeader
        id={id}
        label={data.label}
        defaultLabel={typeConfig.label}
        icon={IconComponent}
        status={data.status}
      />

      <div className="text-xs text-zinc-400 space-y-2">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5">Configuration</span>
          <p className="truncate max-w-[200px] text-zinc-400 italic">
            {Object.keys(data.config || {}).length > 0 ? 'Configured' : 'Needs configuration'}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        title="Output: Produces node output payload (object)"
        className="w-2.5 h-2.5 !bg-zinc-800 !border-zinc-700"
      />
    </div>
  );
};

export default GenericNode;
