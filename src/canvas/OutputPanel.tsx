import { useState } from 'react';
import { Terminal, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface OutputPanelProps {
  status: 'idle' | 'running' | 'success' | 'error';
  output: { text?: string } | null;
  error: { code?: string; message?: string } | null;
}

export const OutputPanel = ({ status, output, error }: OutputPanelProps) => {
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  return (
    <div className="h-60 border-t border-zinc-800 bg-zinc-950/70 backdrop-blur-md flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center gap-2 border-b border-zinc-850 px-6 py-2">
        <Terminal className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Execution Output</span>

        {/* Visual status pill in header */}
        <div className="ml-auto flex items-center gap-1.5">
          {status === 'running' && (
            <span className="flex items-center gap-1 text-[9px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
              Running
            </span>
          )}
          {status === 'success' && (
            <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Success
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 text-[9px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              <AlertCircle className="w-2.5 h-2.5" />
              Failed
            </span>
          )}
          {status === 'idle' && (
            <span className="flex items-center gap-1 text-[9px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-850">
              Idle
            </span>
          )}
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 p-5 overflow-y-auto font-sans">
        {status === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
            <p>Select the node and configure it, then click "Run Workflow" to execute.</p>
          </div>
        )}

        {status === 'running' && (
          <div className="space-y-2">
            <div className="h-3 bg-zinc-900 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-zinc-900 rounded w-1/2 animate-pulse" />
            <div className="h-3 bg-zinc-900 rounded w-5/6 animate-pulse" />
          </div>
        )}

        {status === 'success' && output?.text && (
          <div className="space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Response Text</span>
            <div className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-900/30 border border-zinc-900 p-4 rounded-lg">
              {output.text}
            </div>
          </div>
        )}

        {status === 'error' && error && (
          <div className="space-y-4">
            {/* Inline plain-language error */}
            <div className="flex items-start gap-3 bg-rose-950/20 border border-rose-900/30 p-4 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-rose-200">Execution Failed</h4>
                <p className="text-[11px] text-rose-300 leading-relaxed">
                  {error.message || 'An unexpected error occurred during node execution.'}
                </p>
              </div>
            </div>

            {/* Click-to-expand details */}
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
                  <div><span className="text-zinc-500">Error Code:</span> {error.code || 'UNKNOWN_ERROR'}</div>
                  <div><span className="text-zinc-500">Message:</span> {error.message}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
