import { useState, useEffect } from 'react';
import { Terminal, AlertCircle, ChevronDown, ChevronUp, XCircle, AlertTriangle } from 'lucide-react';
import { Node } from 'reactflow';

interface OutputPanelProps {
  nodes: Node[];
  outputs: Record<string, any>;
  errors: Record<string, any>;
  selectedNodeId: string | null;
  onRetryNode?: (nodeId: string) => void;
}

export const OutputPanel = ({
  nodes,
  outputs,
  errors,
  selectedNodeId,
  onRetryNode
}: OutputPanelProps) => {
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Sync active tab with canvas selection
  useEffect(() => {
    if (selectedNodeId && nodes.some(n => n.id === selectedNodeId)) {
      setActiveTabId(selectedNodeId);
    } else if (nodes.length > 0 && !activeTabId) {
      setActiveTabId(nodes[0].id);
    }
  }, [selectedNodeId, nodes]);

  const activeNode = nodes.find(n => n.id === activeTabId);
  const activeOutput = activeTabId ? outputs[activeTabId] : null;
  const activeError = activeTabId ? errors[activeTabId] : null;
  const activeStatus = activeNode ? activeNode.data.status : 'idle';

  return (
    <div className="h-60 border-t border-zinc-800 bg-zinc-950/70 backdrop-blur-md flex flex-col flex-shrink-0">
      {/* Panel Header */}
      <div className="flex items-center gap-4 border-b border-zinc-850 px-6 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Execution Output</span>
        </div>

        {/* Node Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-md">
          {nodes.map(node => {
            const isTabActive = node.id === activeTabId;
            const nodeStatus = node.data.status;
            
            const tabStatusColors = {
              idle: 'border-zinc-850 text-zinc-500 hover:text-zinc-300',
              running: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
              success: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
              'success-with-warning': 'border-amber-500/30 text-amber-400 bg-amber-500/5',
              error: 'border-rose-500/30 text-rose-400 bg-rose-500/5',
              skipped: 'border-zinc-900 text-zinc-600 bg-zinc-950/10',
            };

            return (
              <button
                key={node.id}
                onClick={() => setActiveTabId(node.id)}
                className={`px-3 py-1 text-[10px] font-mono border rounded-md transition-all duration-150 flex items-center gap-1.5 ${
                  isTabActive
                    ? 'border-purple-500 text-purple-300 bg-purple-500/5 font-semibold'
                    : tabStatusColors[nodeStatus as keyof typeof tabStatusColors] || tabStatusColors.idle
                }`}
              >
                <span>
                  {node.type === 'llm-prompt' ? 'LLM' :
                   node.type === 'mcp-tool' ? 'MCP' :
                   node.type === 'http-webhook' ? 'HTTP' :
                   node.type === 'sqlite-storage' ? 'SQL' :
                   node.type === 'text-transform' ? 'TXT' : 'NODE'}
                  :{node.id}
                </span>
                <span className={`w-1 h-1 rounded-full ${
                  nodeStatus === 'running' ? 'bg-blue-400 animate-pulse' :
                  nodeStatus === 'success' ? 'bg-emerald-400' :
                  nodeStatus === 'success-with-warning' ? 'bg-amber-400' :
                  nodeStatus === 'error' ? 'bg-rose-400' :
                  nodeStatus === 'skipped' ? 'bg-zinc-650' : 'bg-zinc-550'
                }`} />
              </button>
            );
          })}
        </div>

        {/* Active Node Status Indicator */}
        {activeNode && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[9px] text-zinc-500 font-mono">{activeNode.id} status:</span>
            {activeStatus === 'running' && (
              <span className="text-[9px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 animate-pulse">
                Running
              </span>
            )}
            {activeStatus === 'success' && (
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Success
              </span>
            )}
            {activeStatus === 'success-with-warning' && (
              <span className="text-[9px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Warning
              </span>
            )}
            {activeStatus === 'error' && (
              <span className="text-[9px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                Failed
              </span>
            )}
            {activeStatus === 'skipped' && (
              <span className="text-[9px] text-zinc-500 bg-zinc-900/50 px-2 py-0.5 rounded-full border border-zinc-900">
                Skipped
              </span>
            )}
            {activeStatus === 'idle' && (
              <span className="text-[9px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-850">
                Idle
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="flex-1 p-5 overflow-y-auto font-sans">
        {!activeNode ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
            <p>Select a node to inspect its execution output.</p>
          </div>
        ) : (
          <div>
            {activeStatus === 'idle' && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs py-8">
                <p>Node has not run yet. Click "Run Workflow" to execute.</p>
              </div>
            )}

            {activeStatus === 'skipped' && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs py-8">
                <p className="text-zinc-500 font-mono flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-zinc-650" />
                  Node was skipped because an upstream dependency failed.
                </p>
              </div>
            )}

            {activeStatus === 'running' && (
              <div className="space-y-2">
                <div className="h-3 bg-zinc-900 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-zinc-900 rounded w-1/2 animate-pulse" />
              </div>
            )}

            {activeStatus === 'success' && activeOutput && (
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Result Payload</span>
                <div className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-900/30 border border-zinc-900 p-4 rounded-lg overflow-x-auto max-w-full">
                  {typeof activeOutput.data === 'string' ? activeOutput.data : JSON.stringify(activeOutput.data, null, 2)}
                </div>
              </div>
            )}

            {activeStatus === 'success-with-warning' && activeOutput && (
              <div className="space-y-4">
                {/* Warning message */}
                <div className="flex items-start gap-3 bg-amber-955/20 border border-amber-900/30 p-4 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-amber-200">Execution Warning</h4>
                    <p className="text-[11px] text-amber-300 leading-relaxed">
                      {activeOutput.warning || 'Output completed successfully but did not conform to the expected schema.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Result Payload</span>
                  <div className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-900/30 border border-zinc-900 p-4 rounded-lg overflow-x-auto max-w-full">
                    {typeof activeOutput.data === 'string' ? activeOutput.data : JSON.stringify(activeOutput.data, null, 2)}
                  </div>
                </div>
              </div>
            )}

            {activeStatus === 'error' && activeError && (
              <div className="space-y-4">
                {/* Inline error description */}
                <div className="flex items-start gap-3 bg-rose-950/20 border border-rose-900/30 p-4 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-grow">
                    <h4 className="text-xs font-semibold text-rose-200">Execution Failed</h4>
                    <p className="text-[11px] text-rose-300 leading-relaxed">
                      {activeError.message || 'An unexpected error occurred during execution.'}
                    </p>
                  </div>
                  {onRetryNode && (
                    <button
                      onClick={() => onRetryNode(activeTabId!)}
                      className="ml-auto bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shadow transition-colors duration-150 flex items-center gap-1 flex-shrink-0"
                    >
                      Retry Node
                    </button>
                  )}
                </div>

                {/* Click-to-expand error log */}
                <div className="border border-zinc-850 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="w-full flex items-center justify-between bg-zinc-900/40 px-3 py-1.5 text-[10px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors duration-150"
                  >
                    <span>Error Details</span>
                    {showErrorDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showErrorDetails && (
                    <div className="bg-zinc-950 p-3 border-t border-zinc-850 font-mono text-[10px] text-rose-400 overflow-x-auto space-y-1">
                      <div><span className="text-zinc-500">Error Code:</span> {activeError.code || 'UNKNOWN_ERROR'}</div>
                      <div><span className="text-zinc-500">Message:</span> {activeError.message}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
