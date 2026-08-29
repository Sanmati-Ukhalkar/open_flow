import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, History, RotateCcw, Save } from 'lucide-react';
import { Node, Edge } from 'reactflow';

interface WorkflowVersion {
  id: string;
  workflow_id: string;
  created_at: string;
}

interface HistoryPanelProps {
  workflowId: string | null;
  token: string;
  orgId: string;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}

export const HistoryPanel = ({
  workflowId,
  token,
  orgId,
  setNodes,
  setEdges
}: HistoryPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchVersions = async () => {
    if (!workflowId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/versions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Org-Id': orgId
        }
      });
      const data = await res.json();
      if (data.success) {
        setVersions(data.versions || []);
      }
    } catch (e) {
      console.error('Failed to fetch versions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workflowId) {
      fetchVersions();
    }
  }, [isOpen, workflowId]);

  const handleSaveVersion = async () => {
    if (!workflowId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/versions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Org-Id': orgId
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchVersions();
      }
    } catch (e) {
      console.error('Failed to save version:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!workflowId) return;
    if (!window.confirm('Are you sure you want to restore this version? Unsaved changes will be overwritten.')) return;
    try {
      const res = await fetch(`/api/workflows/${workflowId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Org-Id': orgId
        }
      });
      const data = await res.json();
      if (data.success && data.graph_json) {
        const graph = JSON.parse(data.graph_json);
        setNodes(graph.nodes || []);
        setEdges(graph.edges || []);
        alert('Workflow version restored successfully.');
      }
    } catch (e) {
      console.error('Failed to restore version:', e);
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 flex flex-col flex-shrink-0 z-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-2 w-full border-b border-zinc-850 bg-zinc-950">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-grow text-left hover:bg-zinc-900/30 transition-colors duration-150 py-1"
        >
          <History className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Version History</span>
          <span className="text-[9px] font-mono text-zinc-500">({versions.length} versions)</span>
          <div className="ml-auto">
            {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronUp className="w-4 h-4 text-zinc-500" />}
          </div>
        </button>

        {isOpen && workflowId && (
          <button
            onClick={handleSaveVersion}
            disabled={saving}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-all duration-150 disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving...' : 'Save Snapshot'}
          </button>
        )}
      </div>

      {/* Version List */}
      {isOpen && (
        <div className="h-32 md:h-40 overflow-y-auto p-4 font-mono text-[10px] space-y-1.5 bg-zinc-950 select-text leading-relaxed">
          {!workflowId ? (
            <div className="text-zinc-600 text-center py-6">Select a workflow to view history.</div>
          ) : loading && versions.length === 0 ? (
            <div className="text-zinc-600 text-center py-6">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-zinc-600 text-center py-6">No saved versions. Click "Save Snapshot" to create one.</div>
          ) : (
            versions.map((ver) => (
              <div
                key={ver.id}
                className="flex items-center justify-between hover:bg-zinc-900/50 p-1.5 rounded transition-colors duration-100 border border-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">[{new Date(ver.created_at).toLocaleString()}]</span>
                  <span className="text-zinc-400 font-semibold">{ver.id}</span>
                </div>
                <button
                  onClick={() => handleRestoreVersion(ver.id)}
                  className="flex items-center gap-1 px-2 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
