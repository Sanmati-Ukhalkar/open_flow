import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

export interface WorkflowRunLog {
  timestamp: string;
  nodeId: string;
  nodeType: string;
  event: 'start' | 'end';
  status?: 'success' | 'success-with-warning' | 'error' | 'skipped';
  message?: string;
}

interface RunLogPanelProps {
  logs: WorkflowRunLog[];
  onSelectNode: (nodeId: string) => void;
}

export const RunLogPanel = ({ logs, onSelectNode }: RunLogPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getLogColor = (log: WorkflowRunLog) => {
    if (log.event === 'start') return 'text-blue-400';
    if (log.status === 'success') return 'text-emerald-400';
    if (log.status === 'success-with-warning') return 'text-amber-400';
    if (log.status === 'error') return 'text-rose-400';
    if (log.status === 'skipped') return 'text-zinc-500';
    return 'text-zinc-300';
  };

  const getEventText = (log: WorkflowRunLog) => {
    const nodeLabel = `${log.nodeType} [${log.nodeId}]`;
    if (log.event === 'start') {
      return `Node ${nodeLabel} started execution`;
    }
    if (log.status === 'success') {
      return `Node ${nodeLabel} executed successfully`;
    }
    if (log.status === 'success-with-warning') {
      return `Node ${nodeLabel} completed with warning: ${log.message}`;
    }
    if (log.status === 'error') {
      return `Node ${nodeLabel} failed: ${log.message}`;
    }
    if (log.status === 'skipped') {
      return `Node ${nodeLabel} execution skipped`;
    }
    return '';
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex flex-col flex-shrink-0 z-10">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-6 py-2 w-full hover:bg-zinc-900/30 transition-colors duration-150 border-b border-zinc-850"
      >
        <Clock className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Workflow Run Timeline</span>
        <span className="text-[9px] font-mono text-zinc-500">({logs.length} entries)</span>
        
        <div className="ml-auto">
          {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronUp className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {/* Log list */}
      {isOpen && (
        <div className="h-40 overflow-y-auto p-4 font-mono text-[10px] space-y-1.5 bg-zinc-950 select-text leading-relaxed">
          {logs.length === 0 ? (
            <div className="text-zinc-600 text-center py-6">No logs. Click "Run Workflow" to execute your DAG graph.</div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                onClick={() => onSelectNode(log.nodeId)}
                className="flex items-start gap-2 hover:bg-zinc-900/50 p-1 rounded cursor-pointer transition-colors duration-100"
              >
                <span className="text-zinc-500 flex-shrink-0">[{log.timestamp}]</span>
                <span className={`${getLogColor(log)} flex-grow`}>
                  {getEventText(log)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RunLogPanel;
