import { useState, useEffect } from 'react';
import { ShieldAlert, X, Save, Loader2 } from 'lucide-react';

interface DeploymentAlertModalProps {
  deploymentId: string;
  token: string;
  onClose: () => void;
}

export const DeploymentAlertModal = ({ deploymentId, token, onClose }: DeploymentAlertModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [errorThresholdPercent, setErrorThresholdPercent] = useState<number>(10);
  const [windowRuns, setWindowRuns] = useState<number>(10);
  const [webhookUrl, setWebhookUrl] = useState<string>('');

  useEffect(() => {
    fetchAlert();
  }, [deploymentId]);

  const fetchAlert = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/deployment/${deploymentId}/alert`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data) {
        setErrorThresholdPercent(data.error_threshold_percent);
        setWindowRuns(data.window_runs);
        setWebhookUrl(data.webhook_url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/analytics/deployment/${deploymentId}/alert`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          errorThresholdPercent,
          windowRuns,
          webhookUrl
        })
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6 rounded-2xl shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg border border-zinc-850 bg-zinc-900 text-zinc-550 hover:text-zinc-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-200">Deployment Alert Config</h2>
            <span className="text-[10px] text-zinc-500">Alert when error rates spike</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-medium">Error Threshold (%)</label>
              <input 
                type="number"
                value={errorThresholdPercent}
                onChange={(e) => setErrorThresholdPercent(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500/50"
                placeholder="e.g. 10"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-medium">Evaluation Window (Runs)</label>
              <input 
                type="number"
                value={windowRuns}
                onChange={(e) => setWindowRuns(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500/50"
                placeholder="e.g. 10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-medium">Alert Webhook URL</label>
              <input 
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500/50"
                placeholder="https://..."
              />
              <p className="text-[10px] text-zinc-500">We'll send a POST request with error details to this URL.</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !webhookUrl}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Alert Config
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
