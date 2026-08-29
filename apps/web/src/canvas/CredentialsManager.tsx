import { useState, useEffect } from 'react';
import { Key, Loader2, Plus, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface CredentialsManagerProps {
  token: string;
  onBack: () => void;
}

export const CredentialsManager = ({ token, onBack }: CredentialsManagerProps) => {
  const [credentials, setCredentials] = useState<{ provider: string }[]>([]);
  const [provider, setProvider] = useState('groq');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credentials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCredentials(data.credentials);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;
    setSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ provider, apiKey })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setApiKey('');
        fetchCredentials();
      } else {
        setErrorMsg(data.error?.message || 'Failed to save credentials.');
      }
    } catch {
      setErrorMsg('Failed to connect to backend.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (providerToDelete: string) => {
    if (!confirm(`Are you sure you want to remove credentials for ${providerToDelete}?`)) return;

    try {
      const res = await fetch(`/api/credentials/${providerToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchCredentials();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center py-12 px-4 relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-sky-600/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl space-y-6 z-10">
        {/* Navigation header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-sky-400" />
            Credentials Manager
          </h1>
        </div>

        {errorMsg && (
          <div className="text-[11px] text-rose-350 bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-lg">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add credentials Form */}
          <div className="border border-zinc-800 bg-zinc-950/50 backdrop-blur-md p-5 rounded-xl space-y-4 h-fit">
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Configure API Key</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="groq">Groq (Llama 3, Mixtral)</option>
                  <option value="openai">OpenAI (GPT-4o, mini)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">API Secret Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={saving}
                  placeholder="Paste your key here..."
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !apiKey}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg font-semibold text-xs transition-all duration-200 bg-sky-600 hover:bg-sky-500 text-white disabled:bg-zinc-900 disabled:text-zinc-500"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Save Credential
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Saved Credentials List */}
          <div className="border border-zinc-800 bg-zinc-950/50 backdrop-blur-md p-5 rounded-xl space-y-4">
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Active Credentials</h2>
            
            {loading ? (
              <div className="text-xs text-zinc-500 py-6 text-center flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading credentials...
              </div>
            ) : (
              <div className="space-y-3">
                {credentials.length === 0 ? (
                  <div className="text-[11px] text-zinc-600 text-center py-6">
                    No custom keys saved. Nodes will use global `.env` fallback keys by default.
                  </div>
                ) : (
                  credentials.map(c => (
                    <div
                      key={c.provider}
                      className="p-3 border border-zinc-850 bg-zinc-900/20 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-zinc-200 uppercase font-mono">{c.provider}</h4>
                          <span className="text-[9px] text-zinc-500">Encrypted at rest</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(c.provider)}
                        className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-900 text-zinc-500 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all duration-150"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialsManager;
