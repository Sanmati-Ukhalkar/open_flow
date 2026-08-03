import { useState, useEffect } from 'react';
import { Waves, Folder, Plus, Trash2, Key, LogOut, Clock, Globe, Play, Package, Database } from 'lucide-react';
import DeploymentDashboard from './DeploymentDashboard';
import TriggerDashboard from './TriggerDashboard';
import Marketplace from './Marketplace';
import Templates from '../pages/Templates';
import AnalyticsDashboard from './AnalyticsDashboard';
import DatabaseViewer from './DatabaseViewer';
import { parseSqliteDate } from './dateHelper';

import { Users } from 'lucide-react';

interface DashboardProps {
  token: string;
  user: { id: string; email: string };
  activeOrg: any;
  orgs: any[];
  setActiveOrg: (org: any) => void;
  onOpenOrgSettings: () => void;
  onSelectWorkflow: (workflowId: string) => void;
  onCreateWorkflow: () => void;
  onOpenCredentials: () => void;
  onLogout: () => void;
}

export const Dashboard = ({
  token,
  user,
  activeOrg,
  orgs,
  setActiveOrg,
  onOpenOrgSettings,
  onSelectWorkflow,
  onCreateWorkflow,
  onOpenCredentials,
  onLogout
}: DashboardProps) => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates' | 'deployments' | 'triggers' | 'marketplace' | 'analytics' | 'database'>('workflows');

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflows', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkflows(data.workflows);
      }
    } catch {
      setErrorMsg('Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeOrg) {
      fetchWorkflows();
    }
  }, [activeOrg]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid triggering open on click
    if (!confirm('Are you sure you want to delete this workflow and all its execution runs?')) return;

    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchWorkflows();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center py-12 px-4 relative overflow-y-auto select-none">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl space-y-6 z-10">
        {/* Top Navbar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="font-bold text-sm text-zinc-100 uppercase tracking-wider">Open Flow</span>
          </div>

          <div className="flex items-center gap-3">
            {activeOrg && (
              <div className="flex items-center gap-2">
                <select
                  value={activeOrg.id}
                  onChange={(e) => {
                    const org = orgs.find((o) => o.id === e.target.value);
                    if (org) setActiveOrg(org);
                  }}
                  className="bg-zinc-900 border border-zinc-850 text-xs text-zinc-300 rounded px-2 py-1 outline-none"
                >
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={onOpenOrgSettings}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all text-[11px]"
                >
                  <Users className="w-3.5 h-3.5" />
                  Org Settings
                </button>
              </div>
            )}
            <span className="text-[10px] font-mono text-zinc-550 border border-zinc-850 bg-zinc-900/30 px-2 py-1 rounded">
              User: {user.email}
            </span>
            <button
              onClick={onOpenCredentials}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all text-[11px]"
            >
              <Key className="w-3.5 h-3.5" />
              Credentials
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all text-[11px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="text-[11px] text-rose-350 bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Tab Selection Navigation */}
        <div className="flex gap-4 border-b border-zinc-850 pb-2 overflow-x-auto select-none no-scrollbar">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all flex-shrink-0 ${
              activeTab === 'workflows'
                ? 'text-purple-400 border-purple-500'
                : 'text-zinc-505 border-transparent hover:text-zinc-300'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            My Workflows
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all flex-shrink-0 ${
              activeTab === 'templates'
                ? 'text-purple-400 border-purple-500'
                : 'text-zinc-505 border-transparent hover:text-zinc-300'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Templates
          </button>
          <button
            onClick={() => setActiveTab('deployments')}
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all flex-shrink-0 ${
              activeTab === 'deployments'
                ? 'text-purple-400 border-purple-500'
                : 'text-zinc-505 border-transparent hover:text-zinc-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            API Deployments
          </button>
          <button
            onClick={() => setActiveTab('triggers')}
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all flex-shrink-0 ${
              activeTab === 'triggers'
                ? 'text-purple-400 border-purple-500'
                : 'text-zinc-505 border-transparent hover:text-zinc-300'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Automated Triggers
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all flex-shrink-0 ${
              activeTab === 'marketplace'
                ? 'text-purple-400 border-purple-500'
                : 'text-zinc-505 border-transparent hover:text-zinc-300'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Node Marketplace
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all flex-shrink-0 ${
              activeTab === 'analytics'
                ? 'text-purple-400 border-purple-500'
                : 'text-zinc-505 border-transparent hover:text-zinc-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-all flex-shrink-0 ${
              activeTab === 'database'
                ? 'text-purple-400 border-purple-500'
                : 'text-zinc-505 border-transparent hover:text-zinc-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Database
          </button>
        </div>

        {activeTab === 'deployments' ? (
          <DeploymentDashboard token={token} />
        ) : activeTab === 'triggers' ? (
          <TriggerDashboard token={token} />
        ) : activeTab === 'marketplace' ? (
          <Marketplace />
        ) : activeTab === 'templates' ? (
          <Templates token={token} activeOrg={activeOrg} onSelectWorkflow={onSelectWorkflow} />
        ) : activeTab === 'analytics' ? (
          <AnalyticsDashboard token={token} orgId={activeOrg?.id} />
        ) : activeTab === 'database' ? (
          <DatabaseViewer token={token} />
        ) : (
          <>
            {/* Directory & Create button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Folder className="w-4 h-4 text-zinc-400" />
                  My Workflows
                </h2>
                <p className="text-[10px] text-zinc-500 mt-1">Select an existing graph composition or instantiate a new one.</p>
              </div>

              {activeOrg?.role !== 'viewer' && (
                <button
                  onClick={onCreateWorkflow}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-lg font-semibold text-xs transition-all duration-200 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/15 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Create Workflow
                </button>
              )}
            </div>

            {/* Grid directory */}
            {loading ? (
              <div className="text-xs text-zinc-500 py-16 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-zinc-650 border-t-transparent rounded-full animate-spin" />
                <span>Loading workflows...</span>
              </div>
            ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {workflows.length === 0 ? (
              <div className="col-span-full border border-dashed border-zinc-800 p-12 rounded-2xl text-center text-zinc-550 flex flex-col justify-center items-center">
                <Folder className="w-8 h-8 mb-2 text-zinc-700" />
                <p className="text-xs mb-1">No workflows composed yet.</p>
                {activeOrg?.role !== 'viewer' && (
                  <button
                    onClick={onCreateWorkflow}
                    className="text-[10px] text-purple-400 hover:underline mb-2"
                  >
                    Create your first workflow
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('templates')}
                  className="px-4 py-2 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-300 hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
                >
                  Explore Templates
                </button>
              </div>
            ) : (
              workflows.map(wf => {
                const nodeCount = wf.graph?.nodes?.length || 0;
                  const edgeCount = wf.graph?.edges?.length || 0;
                  const date = parseSqliteDate(wf.updated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={wf.id}
                      onClick={() => onSelectWorkflow(wf.id)}
                      className="p-5 border border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 backdrop-blur-md rounded-2xl hover:scale-[1.01] transition-all duration-150 cursor-pointer flex flex-col justify-between h-40 group relative overflow-hidden"
                    >
                      {/* Hover glow */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/0 via-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="space-y-1 z-10">
                        <h3 className="text-xs font-bold text-zinc-200 group-hover:text-purple-400 transition-colors duration-150 truncate max-w-[200px]">
                          {wf.name}
                        </h3>
                        <span className="text-[9px] font-mono text-zinc-600 block">ID: {wf.id}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 z-10 font-mono">
                        <span>Nodes: {nodeCount}</span>
                        <span>Edges: {edgeCount}</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-zinc-900 pt-3 z-10">
                        <span className="text-[9px] text-zinc-650 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {date}
                        </span>

                        {activeOrg?.role !== 'viewer' && (
                          <button
                            onClick={(e) => handleDelete(e, wf.id)}
                            className="flex items-center justify-center p-2 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Delete Workflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
