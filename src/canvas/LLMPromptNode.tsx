import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';
import NodeHeader from './NodeHeader';

export interface LLMPromptNodeData {
  label?: string;
  status: 'idle' | 'running' | 'success' | 'success-with-warning' | 'error' | 'skipped';
  config: {
    promptText: string;
    model: string;
  };
  error?: string;
}

export const LLMPromptNode = ({ id, data, selected }: { id: string; data: LLMPromptNodeData; selected: boolean }) => {
  const statusColors = {
    idle: 'border-zinc-800 bg-zinc-950 text-zinc-400 shadow-md',
    running: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.25)] bg-zinc-950 text-status-running',
    success: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] bg-zinc-950 text-status-success',
    'success-with-warning': 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] bg-zinc-950 text-status-warning',
    error: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.25)] bg-zinc-950 text-status-error',
    skipped: 'border-zinc-900 bg-zinc-900 text-zinc-650 opacity-50',
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
        title="Input: Accepts templated references (e.g. {{parent-node-id.property}})"
        className="w-2.5 h-2.5 !bg-zinc-800 !border-zinc-700"
      />

      <NodeHeader
        id={id}
        label={data.label}
        defaultLabel="LLM Prompt"
        icon={Bot}
        status={data.status}
      />

      <div className="text-xs text-zinc-400 space-y-2">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5">Model</span>
          <div className="font-mono bg-zinc-900/80 p-1.5 rounded border border-zinc-800 truncate max-w-[200px] text-zinc-300">
            {data.config?.model || 'gpt-4o-mini'}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5">Prompt</span>
          <p className="truncate max-w-[200px] text-zinc-400 italic">
            {data.config?.promptText ? `"${data.config.promptText}"` : 'No prompt configured'}
          </p>
        </div>
      </div>

      {/* Source handle - output */}
      <Handle
        type="source"
        position={Position.Right}
        title="Output: Produces data.text (string)"
        className="w-2.5 h-2.5 !bg-zinc-800 !border-zinc-700"
      />
    </div>
  );
};

export default LLMPromptNode;
