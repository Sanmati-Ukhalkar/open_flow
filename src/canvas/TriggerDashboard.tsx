import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Loader2, Play, Calendar, Globe, AlertCircle, Clock } from 'lucide-react';

interface TriggerDashboardProps {
  token: string;
}

export const TriggerDashboard = ({ token }: TriggerDashboardProps) => {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchTriggers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/triggers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTriggers(data.triggers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTriggers();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    setToggling(id);

    try {
      const res = await fetch(`/api/triggers/${id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTriggers(prev =>
          prev.map(t => (t.id === id ? { ...t, status: nextStatus } : t))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="text-xs text-zinc-550 py-16 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span>Fetching automated trigger rules...</span>
        </div>
      ) : triggers.length === 0 ? (
        <div className="border border-dashed border-zinc-800 p-12 rounded-2xl text-center text-zinc-550 flex flex-col justify-center items-center">
          <Play className="w-8 h-8 mb-2 text-zinc-700" />
          <p className="text-xs mb-1">No automated trigger nodes saved.</p>
          <span className="text-[10px] text-zinc-650 max-w-sm">
            Drag a **Cron Trigger** or **Webhook Trigger** node onto your workspace, configure it, and save the definition to register it.
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          {triggers.map(t => {
            let config;
            try {
              config = JSON.parse(t.config_json);
            } catch {
              config = {};
            }

            const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhooks/${t.workflow_id}`;
            const lastTriggered = t.last_triggered_at
              ? new Date(t.last_triggered_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Never triggered';

            return (
              <div
                key={t.id}
                className="p-5 border border-zinc-850 bg-zinc-950/40 rounded-2xl space-y-4 relative overflow-hidden"
              >
                {/* Header Section */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2.5">
                    {t.trigger_type === 'cron' ? (
                      <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                        <Calendar className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                        <Globe className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xs font-bold text-zinc-200">
                        {t.workflow_name} — {t.trigger_type === 'cron' ? 'Cron Schedule' : 'Webhook Endpoint'}
                      </h3>
                      <span className="text-[9px] font-mono text-zinc-550 block">Trigger ID: {t.id}</span>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggleStatus(t.id, t.status)}
                    disabled={toggling === t.id}
                    className="flex items-center gap-1.5 text-xs transition-all disabled:opacity-50"
                  >
                    {t.status === 'active' ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-emerald-450 uppercase font-bold tracking-widest">Active</span>
                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-rose-500 uppercase font-bold tracking-widest">Paused</span>
                        <ToggleLeft className="w-6 h-6 text-zinc-650" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Configuration details */}
                <div className="space-y-2 text-xs">
                  {t.trigger_type === 'cron' ? (
                    <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-850 p-3 rounded-xl">
                      <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Cron Schedule Pattern</span>
                        <span className="font-mono text-zinc-200 text-xs font-bold">{config.cronExpression || '*/5 * * * *'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Webhook HTTP POST Trigger URL</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={webhookUrl}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-300 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                        <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
                        <span>Webhooks require v0.6 Bearer Token set in authorization headers.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metric Footer */}
                <div className="flex items-center justify-between border-t border-zinc-900 pt-3 text-[10px] text-zinc-500 font-mono">
                  <span>Last Automated Execution Trigger: <b className="text-zinc-350">{lastTriggered}</b></span>
                  <span>Status: <b className={t.status === 'active' ? 'text-emerald-450' : 'text-rose-500'}>{t.status.toUpperCase()}</b></span>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TriggerDashboard;
