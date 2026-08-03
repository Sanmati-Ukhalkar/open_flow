import { useState, useEffect } from 'react';
import { Key, Copy, Check, ToggleLeft, ToggleRight, Loader2, RefreshCw, Bell } from 'lucide-react';
import { DeploymentAlertModal } from './DeploymentAlertModal';
import { parseSqliteDate } from './dateHelper';

interface DeploymentDashboardProps {
  token: string;
}

export const DeploymentDashboard = ({ token }: DeploymentDashboardProps) => {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [configuringAlertFor, setConfiguringAlertFor] = useState<string | null>(null);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/deployments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeployments(data.deployments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    setToggling(id);

    try {
      const res = await fetch(`/api/deployments/${id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeployments(prev =>
          prev.map(d => (d.id === id ? { ...d, status: nextStatus } : d))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  const handleRegenerateToken = async (id: string) => {
    if (!confirm('Are you sure you want to invalidate your current API token and generate a new one? External integrations using the old token will break.')) {
      return;
    }

    setRegenerating(id);
    try {
      const res = await fetch(`/api/deployments/${id}/token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`New Bearer API Token generated:\n\n${data.token}\n\nMake sure to copy it now!`);
        fetchDeployments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRegenerating(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="text-xs text-zinc-550 py-16 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span>Fetching deployment stats...</span>
        </div>
      ) : deployments.length === 0 ? (
        <div className="border border-dashed border-zinc-800 p-12 rounded-2xl text-center text-zinc-550 flex flex-col justify-center items-center">
          <Key className="w-8 h-8 mb-2 text-zinc-700" />
          <p className="text-xs mb-1">No API endpoints deployed yet.</p>
          <span className="text-[10px] text-zinc-600">Open a workflow inside the canvas and click "Deploy" to publish a live API URL.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {deployments.map(d => {
            const executeUrl = `${window.location.protocol}//${window.location.host}/api/deployments/${d.id}/execute`;
            const lastCalled = d.last_called_at
              ? parseSqliteDate(d.last_called_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Never called';

            return (
              <div
                key={d.id}
                className="p-5 border border-zinc-850 bg-zinc-950/40 rounded-2xl space-y-4 relative overflow-hidden"
              >
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">{d.workflow_name}</h3>
                    <span className="text-[9px] font-mono text-zinc-550 block">ID: {d.id}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Toggle Button */}
                    <button
                      onClick={() => handleToggleStatus(d.id, d.status)}
                      disabled={toggling === d.id}
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-all"
                    >
                      {d.status === 'active' ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">Active</span>
                          <ToggleRight className="w-6 h-6 text-emerald-500" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-rose-500 uppercase tracking-widest font-bold font-mono">Paused</span>
                          <ToggleLeft className="w-6 h-6 text-zinc-650" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Body Metrics & Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Public URL */}
                  <div className="md:col-span-2 space-y-1">
                    <span className="text-[9px] font-semibold text-zinc-550 uppercase tracking-wider block">Callable URL Endpoint</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={executeUrl}
                        className="w-full bg-zinc-900/50 border border-zinc-850 rounded-lg px-2.5 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(executeUrl, d.id)}
                        className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-all"
                      >
                        {copiedId === d.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* API Token Actions */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold text-zinc-550 uppercase tracking-wider block">API Authentication Token</span>
                    <button
                      onClick={() => handleRegenerateToken(d.id)}
                      disabled={regenerating === d.id}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-850 bg-zinc-900/50 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all"
                    >
                      {regenerating === d.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      Regenerate Token
                    </button>
                  </div>
                  
                  {/* Alert Settings */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold text-zinc-550 uppercase tracking-wider block">Monitoring & Alerts</span>
                    <button
                      onClick={() => setConfiguringAlertFor(d.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-850 bg-zinc-900/50 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all"
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      Configure Alerts
                    </button>
                  </div>
                </div>

                {/* Call stats */}
                <div className="flex items-center gap-6 border-t border-zinc-900 pt-3 text-[10px] text-zinc-500 font-mono">
                  <div>
                    <span>Total Request Calls: </span>
                    <span className="font-bold text-zinc-350">{d.request_count}</span>
                  </div>
                  <div>
                    <span>Last Call: </span>
                    <span className="text-zinc-350">{lastCalled}</span>
                  </div>
                  <div>
                    <span>Deployment Version ID: </span>
                    <span className="text-zinc-350 text-[9px]">{d.workflow_version_id}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
      
      {configuringAlertFor && (
        <DeploymentAlertModal 
          deploymentId={configuringAlertFor} 
          token={token} 
          onClose={() => setConfiguringAlertFor(null)} 
        />
      )}
    </div>
  );
};

export default DeploymentDashboard;
