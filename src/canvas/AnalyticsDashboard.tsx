import { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle, Activity, DollarSign, Loader2 } from 'lucide-react';

interface AnalyticsDashboardProps {
  token: string;
  orgId?: string;
}

export const AnalyticsDashboard = ({ token, orgId }: AnalyticsDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [costData, setCostData] = useState<any[]>([]);
  const [errorStats, setErrorStats] = useState<any[]>([]);
  const [runStats, setRunStats] = useState<any[]>([]);
  const [, setUsageData] = useState<any[]>([]);

  useEffect(() => {
    if (token && orgId) {
      fetchData();
    }
  }, [token, orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-org-id': orgId || ''
      };

      const [costRes, errorRes, usageRes] = await Promise.all([
        fetch('/api/analytics/cost', { headers }).then(res => res.json()),
        fetch('/api/analytics/errors', { headers }).then(res => res.json()),
        fetch('/api/analytics/usage', { headers }).then(res => res.json())
      ]);

      if (!costRes.error) setCostData(costRes);
      if (!errorRes.error) {
        setErrorStats(errorRes.errorStats || []);
        setRunStats(errorRes.runStats || []);
      }
      if (!usageRes.error) setUsageData(usageRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
      </div>
    );
  }

  // Calculate totals
  const totalCost = costData.reduce((sum, item) => sum + (item.totalCostCents || 0), 0);
  const totalErrors = errorStats.reduce((sum, item) => sum + (item.errorCount || 0), 0);
  const totalRuns = runStats.reduce((sum, item) => sum + (item.count || 0), 0);
  
  const errorCount = runStats.find(r => r.status === 'error' || r.status === 'failed')?.count || 0;
  const successRate = totalRuns > 0 ? (((totalRuns - errorCount) / totalRuns) * 100).toFixed(1) : '100.0';

  return (
    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <Activity className="w-6 h-6 text-sky-400" />
            Observability & Analytics
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Monitor workflow execution costs, error rates, and usage metrics across your team.
          </p>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-400">Total Spend</h3>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-zinc-100">${(totalCost / 100).toFixed(4)}</div>
            <p className="text-xs text-zinc-500 mt-2">All-time execution cost</p>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-400">Total Executions</h3>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-zinc-100">{totalRuns}</div>
            <p className="text-xs text-zinc-500 mt-2">Total workflow runs</p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-400">Success Rate</h3>
              <BarChart3 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-bold text-zinc-100">{successRate}%</div>
            <p className="text-xs text-zinc-500 mt-2">Overall pass rate</p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-400">Node Failures</h3>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-bold text-zinc-100">{totalErrors}</div>
            <p className="text-xs text-zinc-500 mt-2">Individual node errors</p>
          </div>
        </div>

        {/* Detailed Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost by Workflow */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-zinc-500" />
              Cost by Workflow
            </h3>
            {costData.length === 0 ? (
              <div className="text-zinc-500 text-sm text-center py-8">No cost data available yet.</div>
            ) : (
              <div className="space-y-4">
                {costData.map((item) => (
                  <div key={item.workflowId} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300 truncate pr-4">{item.workflowName || item.workflowId}</span>
                    <span className="text-sm font-mono text-zinc-400">${((item.totalCostCents || 0) / 100).toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Failing Nodes */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Top Failing Nodes
            </h3>
            {errorStats.length === 0 ? (
              <div className="text-zinc-500 text-sm text-center py-8">No errors recorded! Perfect score.</div>
            ) : (
              <div className="space-y-4">
                {errorStats.map((stat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded truncate pr-4 max-w-[200px]">{stat.nodeId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-400">{stat.errorCount} fails</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsDashboard;
