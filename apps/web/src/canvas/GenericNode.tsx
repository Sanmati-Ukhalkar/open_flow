import { Position } from 'reactflow';
import { Mail, Search, FileUp, Database, Code, GitBranch, RefreshCcw, Layout } from 'lucide-react';
import NodeHeader from './NodeHeader';
import NodeHandle from './NodeHandle';

export interface GenericNodeData {
  label?: string;
  status: 'idle' | 'running' | 'success' | 'success-with-warning' | 'error' | 'skipped';
  config: Record<string, any>;
  output?: any;
  error?: string;
  type: string;
}

const TYPE_CONFIGS: Record<string, { label: string; icon: any; inputType: any; outputType: any }> = {
  'email': { label: 'Email', icon: Mail, inputType: 'object', outputType: 'object' },
  'vision-ocr': { label: 'Vision / OCR', icon: Search, inputType: 'string', outputType: 'string' },
  'file-trigger': { label: 'File Trigger', icon: FileUp, inputType: 'trigger', outputType: 'object' },
  'vector-store': { label: 'Vector Store', icon: Database, inputType: 'string', outputType: 'object' },
  'vector-retrieve': { label: 'Vector Retrieve', icon: Database, inputType: 'string', outputType: 'array' },
  'code-execution': { label: 'Code Execution', icon: Code, inputType: 'object', outputType: 'object' },
  'branch': { label: 'Branch', icon: GitBranch, inputType: 'object', outputType: 'object' },
  'loop': { label: 'Loop', icon: RefreshCcw, inputType: 'array', outputType: 'array' },
};

function formatPreview(output: any): string {
  if (output === undefined || output === null) return '';
  if (typeof output === 'string') return output;
  if (typeof output === 'object') {
    if (output.text) return String(output.text);
    if (output.data?.text) return String(output.data.text);
    if (output.messageId) return `Sent ID: ${output.messageId}`;
    if (output.results) return `[${output.results.length} items]`;
    if (output.rowId) return `Row #${output.rowId}`;
    try {
      const json = JSON.stringify(output);
      return json.length > 50 ? `${json.slice(0, 50)}...` : json;
    } catch {
      return '[Object]';
    }
  }
  return String(output);
}

export const GenericNode = ({ id, type, data, selected }: { id: string; type: string; data: GenericNodeData; selected: boolean }) => {
  const statusColors = {
    idle: 'border-zinc-800 bg-zinc-950 text-zinc-400 shadow-md',
    running: 'border-sky-500 animate-running-glow bg-zinc-950 text-status-running',
    success: 'border-emerald-500 animate-success-flash bg-zinc-950 text-status-success',
    'success-with-warning': 'border-amber-500 bg-zinc-950 text-status-warning',
    error: 'border-rose-500 bg-zinc-950 text-status-error',
    skipped: 'border-zinc-900 bg-zinc-900 text-zinc-600 opacity-60',
  };

  const nodeType = type || data.type;
  const typeConfig = TYPE_CONFIGS[nodeType] || { label: 'Generic Node', icon: Layout, inputType: 'object', outputType: 'object' };
  const IconComponent = typeConfig.icon;
  const outputPreview = formatPreview(data.output);

  return (
    <div
      className={`min-w-[230px] rounded-xl border p-4 backdrop-blur-md transition-all duration-200 ${
        selected ? 'ring-2 ring-sky-500/80 ring-offset-2 ring-offset-black' : ''
      } ${statusColors[data.status] || statusColors.idle}`}
    >
      <NodeHandle
        type="target"
        position={Position.Left}
        dataType={typeConfig.inputType}
      />

      <NodeHeader
        id={id}
        nodeType={nodeType}
        label={data.label}
        defaultLabel={typeConfig.label}
        icon={IconComponent}
        status={data.status}
      />

      <div className="text-xs text-zinc-400 space-y-2 mt-2">
        <div>
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-0.5 font-semibold">Configuration</span>
          <p className="truncate max-w-[210px] text-zinc-400 italic text-[11px]" title={Object.keys(data.config || {}).length > 0 ? JSON.stringify(data.config) : 'Needs configuration'}>
            {Object.keys(data.config || {}).length > 0 ? 'Configured' : 'Needs configuration'}
          </p>
        </div>

        {/* Live Output Result Preview on Node Card Face */}
        {data.status !== 'idle' && (
          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Last Output Result
            </span>
            {outputPreview ? (
              <div className="font-mono text-[10px] bg-zinc-900/90 text-zinc-200 px-2 py-1.5 rounded border border-zinc-800 truncate max-w-[210px]" title={outputPreview}>
                {outputPreview}
              </div>
            ) : (
              <div className="text-[10px] italic text-zinc-500">Not run yet</div>
            )}
          </div>
        )}
      </div>

      <NodeHandle
        type="source"
        position={Position.Right}
        dataType={typeConfig.outputType}
      />
    </div>
  );
};

export default GenericNode;
