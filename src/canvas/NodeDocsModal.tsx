import React from 'react';
import { X, BookOpen, Key, ShieldCheck, ArrowRightLeft } from 'lucide-react';

interface NodeDocsModalProps {
  nodeType: string;
  definition?: any;
  onClose: () => void;
}

export const NodeDocsModal: React.FC<NodeDocsModalProps> = ({
  nodeType,
  definition,
  onClose,
}) => {
  const displayName = definition?.displayName || nodeType;
  const description = definition?.description || 'No description available for this node.';
  const requiredCredentials = definition?.requiredCredentials || [];
  const inputSchema = definition?.inputSchema;
  const outputSchema = definition?.outputSchema;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-zinc-200 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">{displayName} Documentation</h3>
              <p className="text-xs text-zinc-400 font-mono">Type: {nodeType}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Node Overview */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Overview</h4>
          <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-850">
            {description}
          </p>
        </div>

        {/* Credentials */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            Required Credentials
          </h4>
          {requiredCredentials.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {requiredCredentials.map((cred: string) => (
                <span
                  key={cred}
                  className="text-xs font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg"
                >
                  {cred}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-sans bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
              <span>No credentials required for this node.</span>
            </div>
          )}
        </div>

        {/* Input & Output Schemas */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
            Data Contracts (Input / Output)
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Input Schema */}
            <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-850 space-y-1.5">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Expects (Input)</span>
              <pre className="font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-32">
                {JSON.stringify(inputSchema?.properties || inputSchema || { type: 'object' }, null, 2)}
              </pre>
            </div>

            {/* Output Schema */}
            <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-850 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Produces (Output)</span>
              <pre className="font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-32">
                {JSON.stringify(outputSchema?.properties || outputSchema || { type: 'object' }, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeDocsModal;
