import { useState } from 'react';
import { Key, Copy, Check, X, ShieldAlert } from 'lucide-react';

interface DeployModalProps {
  deployment: {
    id: string;
    bearer_token: string;
    workflow_name: string;
  } | null;
  onClose: () => void;
}

export const DeployModal = ({ deployment, onClose }: DeployModalProps) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!deployment) return null;

  const deployUrl = `${window.location.protocol}//${window.location.host}/api/deployments/${deployment.id}/execute`;

  const copyToClipboard = (text: string, setCopiedFlag: (flag: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedFlag(true);
    setTimeout(() => setCopiedFlag(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg border border-zinc-800 bg-zinc-950 p-6 rounded-2xl shadow-2xl relative space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg border border-zinc-850 bg-zinc-900 text-zinc-550 hover:text-zinc-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Key className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Workflow Deployed!</h2>
            <span className="text-[9px] font-mono text-zinc-550">Target: {deployment.workflow_name}</span>
          </div>
        </div>

        {/* Security Warning */}
        <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-900/30 p-3 rounded-lg text-xs text-amber-300 leading-normal">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p>
            Make sure to copy the Bearer API Token below. For security reasons, it cannot be displayed again. Store it securely.
          </p>
        </div>

        <div className="space-y-4">
          {/* Public Endpoint URL */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Public HTTP POST URL</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={deployUrl}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-300 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(deployUrl, setCopiedUrl)}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-all flex-shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Bearer Token */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Bearer API Token</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={deployment.bearer_token}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-sky-400 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(deployment.bearer_token, setCopiedToken)}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-all flex-shrink-0"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* cURL Example */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">cURL Request Example</span>
          <pre className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg font-mono text-[9px] text-zinc-400 overflow-x-auto select-text leading-relaxed">
{`curl -X POST "${deployUrl}" \\
  -H "Authorization: Bearer ${deployment.bearer_token || 'YOUR_TOKEN'}" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'`}
          </pre>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 px-4 rounded-lg font-semibold text-xs transition-all duration-200 bg-sky-600 hover:bg-sky-500 text-white shadow-lg"
        >
          I have copied the details
        </button>

      </div>
    </div>
  );
};

export default DeployModal;
