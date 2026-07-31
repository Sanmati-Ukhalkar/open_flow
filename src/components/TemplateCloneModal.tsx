import { useState, useEffect } from 'react';
import { Copy, X, ShieldAlert, Key } from 'lucide-react';

interface TemplateCloneModalProps {
  template: any;
  token: string;
  onClose: () => void;
  onClone: (templateId: string) => void;
}

export const TemplateCloneModal = ({ template, token, onClose, onClone }: TemplateCloneModalProps) => {
  const [missingCapabilities, setMissingCapabilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user credentials and compare with required_credentials
    const checkCredentials = async () => {
      try {
        const res = await fetch('/api/credentials', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          const storedProviders = data.credentials.map((c: any) => c.provider);
          
          let reqCreds: string[] = [];
          try {
            reqCreds = JSON.parse(template.required_credentials || '[]');
          } catch {
            reqCreds = [];
          }

          const missing: string[] = [];
          
          reqCreds.forEach(cap => {
            // Simplified check logic matching what capability means
            if (cap === 'secrets:llm' && !storedProviders.includes('groq') && !storedProviders.includes('openai')) {
              missing.push('LLM API Key (Groq or OpenAI)');
            }
            if (cap === 'secrets:openai' && !storedProviders.includes('openai')) {
              missing.push('OpenAI API Key');
            }
            if (cap === 'secrets:groq' && !storedProviders.includes('groq')) {
              missing.push('Groq API Key');
            }
          });

          setMissingCapabilities(missing);
        }
      } catch (e) {
        console.error('Failed to fetch credentials', e);
      } finally {
        setLoading(false);
      }
    };
    checkCredentials();
  }, [template, token]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-zinc-200">Use Template</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">{template.name}</h3>
            <p className="text-xs text-zinc-400 mt-1">{template.description}</p>
          </div>

          {!loading && missingCapabilities.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-bold">Missing Credentials</span>
              </div>
              <p className="text-[10px] text-zinc-300">
                This template requires credentials you haven't configured yet:
              </p>
              <ul className="list-disc pl-5 text-[10px] text-amber-200/80">
                {missingCapabilities.map((cap, i) => <li key={i}>{cap}</li>)}
              </ul>
              <p className="text-[10px] text-zinc-400 italic">
                You can clone it now, but it will fail to run until you add these in your Credentials panel.
              </p>
            </div>
          )}

          {!loading && missingCapabilities.length === 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-400">
                <Key className="w-4 h-4" />
                <span className="text-xs font-bold">Credentials Ready</span>
              </div>
              <p className="text-[10px] text-emerald-200/70 mt-1">
                You have all required API keys to run this template immediately.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onClone(template.id)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-purple-900/20"
          >
            <Copy className="w-3.5 h-3.5" />
            Clone to My Workflows
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateCloneModal;
