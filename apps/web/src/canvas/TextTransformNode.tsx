import { Position } from 'reactflow';
import { Wrench } from 'lucide-react';
import NodeHeader from './NodeHeader';
import NodeHandle from './NodeHandle';

export interface TextTransformNodeData {
  label?: string;
  status: 'idle' | 'running' | 'success' | 'success-with-warning' | 'error' | 'skipped';
  config: {
    template: string;
  };
  output?: {
    text?: string;
    transformedText?: string;
  } | string;
  error?: string;
}

export const TextTransformNode = ({ id, data, selected }: { id: string; data: TextTransformNodeData; selected: boolean }) => {
  const statusColors = {
    idle: 'border-zinc-800 bg-zinc-950 text-zinc-400 shadow-md',
    running: 'border-sky-500 animate-running-glow bg-zinc-950 text-status-running',
    success: 'border-emerald-500 animate-success-flash bg-zinc-950 text-status-success',
    'success-with-warning': 'border-amber-500 bg-zinc-950 text-status-warning',
    error: 'border-rose-500 bg-zinc-950 text-status-error',
    skipped: 'border-zinc-900 bg-zinc-900 text-zinc-600 opacity-60',
  };

  const outputResult = typeof data.output === 'string' ? data.output : (data.output?.text || data.output?.transformedText || '');

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
        title="Input: Combined templated placeholders (object)"
      />

      <NodeHeader
        id={id}
        nodeType="text-transform"
        label={data.label}
        defaultLabel="Text Transform"
        icon={Wrench}
        status={data.status}
      />

      <div className="text-xs text-zinc-400 space-y-2 mt-2">
        <div>
          <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">Template</span>
          <p className="truncate max-w-[210px] text-zinc-400 italic text-[11px]">
            {data.config?.template ? `"${data.config.template}"` : 'No template configured'}
          </p>
        </div>

        {outputResult && (
          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Transformed Output
            </span>
            <div className="font-mono text-[10px] bg-zinc-900/90 text-zinc-200 px-2 py-1.5 rounded border border-zinc-800 truncate max-w-[210px]" title={outputResult}>
              "{outputResult}"
            </div>
          </div>
        )}
      </div>

      <NodeHandle
        type="source"
        position={Position.Right}
        dataType="string"
        title="Output: Produces formatted text string (string)"
      />
    </div>
  );
};

export default TextTransformNode;
