import { useState, useCallback, useRef, useEffect } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  OnSelectionChangeParams,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import Sidebar from './canvas/Sidebar';
import Canvas from './canvas/Canvas';
import ConfigPanel from './canvas/ConfigPanel';
import OutputPanel from './canvas/OutputPanel';
import RunLogPanel, { WorkflowRunLog } from './canvas/RunLogPanel';
import AuthScreen from './canvas/AuthScreen';
import Dashboard from './canvas/Dashboard';
import CredentialsManager from './canvas/CredentialsManager';
import ShortcutsOverlay from './canvas/ShortcutsOverlay';
import { topoSort } from './engine/topoSort';
import { Play, AlertTriangle, Save, FolderOpen, ShieldCheck, Key, Undo2, Redo2, Keyboard } from 'lucide-react';
import DeployModal from './canvas/DeployModal';

function AppContent() {
  // Session States
  const [token, setToken] = useState<string>(localStorage.getItem('openflow_jwt') || '');
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('openflow_user') || 'null'));
  const [view, setView] = useState<'auth' | 'dashboard' | 'credentials' | 'canvas'>('auth');

  // Active Workflow States
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My Workspace Graph');

  // React Flow canvas states
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Multi-select tracking: all currently selected node IDs
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  // Execution States
  const [executionOutputs, setExecutionOutputs] = useState<Record<string, any>>({});
  const [executionErrors, setExecutionErrors] = useState<Record<string, any>>({});
  const [runLogs, setRunLogs] = useState<WorkflowRunLog[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'running' | 'success' | 'partial' | 'failed'>('idle');
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);

  // Deployment States
  const [activeDeployment, setActiveDeployment] = useState<any>(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // UI overlay state
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Undo/Redo history — stored as snapshots per workflow
  type HistorySnapshot = { nodes: Node[]; edges: Edge[] };
  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyCursorRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Clipboard for copy/paste
  const clipboardRef = useRef<Node[]>([]);

  const { fitView } = useReactFlow();

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
  const pollingIntervalRef = useRef<any>(null);

  // Track node status changes locally to generate chronological timeline logs
  const prevStatusesRef = useRef<Record<string, string>>({});

  // -------------------------------------------
  // History (Undo/Redo) helpers
  // -------------------------------------------

  const pushHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    const cursor = historyCursorRef.current;
    // Trim future states if we're mid-history
    const truncated = historyRef.current.slice(0, cursor + 1);
    truncated.push({ nodes: newNodes, edges: newEdges });
    historyRef.current = truncated;
    historyCursorRef.current = truncated.length - 1;
    setCanUndo(historyCursorRef.current > 0);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyCursorRef.current <= 0) return;
    historyCursorRef.current -= 1;
    const snap = historyRef.current[historyCursorRef.current];
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setCanUndo(historyCursorRef.current > 0);
    setCanRedo(true);
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyCursorRef.current >= historyRef.current.length - 1) return;
    historyCursorRef.current += 1;
    const snap = historyRef.current[historyCursorRef.current];
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setCanUndo(true);
    setCanRedo(historyCursorRef.current < historyRef.current.length - 1);
  }, [setNodes, setEdges]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    historyCursorRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  // Debounced config history push — groups typing into single undo step
  const configDebounceRef = useRef<any>(null);
  const scheduleConfigHistory = useCallback((newNodes: Node[], edgs: Edge[]) => {
    clearTimeout(configDebounceRef.current);
    configDebounceRef.current = setTimeout(() => {
      pushHistory(newNodes, edgs);
    }, 300);
  }, [pushHistory]);

  // Route to auth if token is invalid or missing
  useEffect(() => {
    if (!token) {
      setView('auth');
    } else {
      setView('dashboard');
    }
  }, [token]);

  // Auth Callbacks
  const handleAuthSuccess = (newToken: string, authenticatedUser: { id: string; email: string }) => {
    localStorage.setItem('openflow_jwt', newToken);
    localStorage.setItem('openflow_user', JSON.stringify(authenticatedUser));
    setToken(newToken);
    setUser(authenticatedUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('openflow_jwt');
    localStorage.removeItem('openflow_user');
    setToken('');
    setUser(null);
    setView('auth');
  };

  // Connection Handler — pushes history after connecting
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges(eds => {
        const newEdges = addEdge(
          {
            ...params,
            style: { stroke: '#27272a', strokeWidth: 2 },
            animated: false
          },
          eds
        );
        // Need current nodes for snapshot — get from state via functional update trick
        setNodes(nds => {
          pushHistory(nds, newEdges);
          return nds;
        });
        return newEdges;
      });
    },
    [setEdges, setNodes, pushHistory]
  );

  // Track multi-selection changes from Canvas
  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const ids = params.nodes.map(n => n.id);
    setSelectedNodeIds(ids);
    // When exactly one node is selected, set it as the config panel target
    if (ids.length === 1) {
      setSelectedNodeId(ids[0]);
    } else if (ids.length === 0) {
      // Don't clear selectedNodeId here — paneClick handles full deselect
    }
  }, []);

  const handleSelectNode = (node: Node | null) => {
    setSelectedNodeId(node ? node.id : null);
  };

  const handleSelectNodeById = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setNodes(nds =>
      nds.map(node => ({
        ...node,
        selected: node.id === nodeId,
      }))
    );
  };

  const handleChangeConfig = (nodeId: string, updatedConfig: any) => {
    setNodes(nds => {
      const newNodes = nds.map(node => {
        if (node.id === nodeId) {
          const { isOutputNode, ...configWithoutOutputField } = updatedConfig;
          return {
            ...node,
            data: {
              ...node.data,
              config: configWithoutOutputField,
              isOutputNode: isOutputNode !== undefined ? !!isOutputNode : node.data.isOutputNode
            },
          };
        }
        return node;
      });
      // Debounce config edits into a single undo step per pause in typing
      setEdges(eds => {
        scheduleConfigHistory(newNodes, eds);
        return eds;
      });
      return newNodes;
    });
  };

  // Safe delete node and its connected edges — pushes history
  const handleDeleteNode = (nodeId: string) => {
    setNodes(nds => {
      const newNodes = nds.filter(n => n.id !== nodeId);
      setEdges(eds => {
        const newEdges = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
        pushHistory(newNodes, newEdges);
        return newEdges;
      });
      return newNodes;
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    setSelectedNodeIds(ids => ids.filter(id => id !== nodeId));
  };

  // Bulk delete all currently selected nodes and their edges
  const handleDeleteSelected = useCallback(() => {
    const idsToDelete = new Set(selectedNodeIds);
    if (idsToDelete.size === 0) return;
    setNodes(nds => {
      const newNodes = nds.filter(n => !idsToDelete.has(n.id));
      setEdges(eds => {
        const newEdges = eds.filter(e => !idsToDelete.has(e.source) && !idsToDelete.has(e.target));
        pushHistory(newNodes, newEdges);
        return newEdges;
      });
      return newNodes;
    });
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  }, [selectedNodeIds, setNodes, setEdges, pushHistory]);

  // Copy selected nodes to clipboard
  const handleCopy = useCallback(() => {
    const toCopy = nodes.filter(n => selectedNodeIds.includes(n.id));
    if (toCopy.length > 0) clipboardRef.current = toCopy;
  }, [nodes, selectedNodeIds]);

  // Paste clipboard nodes with offset
  const handlePaste = useCallback(() => {
    const clipboard = clipboardRef.current;
    if (!clipboard || clipboard.length === 0) return;
    const OFFSET = 30;
    const newNodes = clipboard.map(n => ({
      ...n,
      id: `${n.type}-${Math.random().toString(36).substr(2, 4)}`,
      position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
      selected: false,
      data: { ...n.data, status: 'idle' }
    }));
    setNodes(nds => {
      const combined = [...nds, ...newNodes];
      setEdges(eds => { pushHistory(combined, eds); return eds; });
      return combined;
    });
  }, [setNodes, setEdges, pushHistory]);

  // Duplicate selected nodes in place with slight offset
  const handleDuplicate = useCallback(() => {
    const OFFSET = 30;
    const toDuplicate = nodes.filter(n => selectedNodeIds.includes(n.id));
    if (toDuplicate.length === 0) return;
    const newNodes = toDuplicate.map(n => ({
      ...n,
      id: `${n.type}-${Math.random().toString(36).substr(2, 4)}`,
      position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
      selected: false,
      data: { ...n.data, status: 'idle' }
    }));
    setNodes(nds => {
      const combined = [...nds, ...newNodes];
      setEdges(eds => { pushHistory(combined, eds); return eds; });
      return combined;
    });
  }, [nodes, selectedNodeIds, setNodes, setEdges, pushHistory]);

  // Select all nodes
  const handleSelectAll = useCallback(() => {
    setNodes(nds => nds.map(n => ({ ...n, selected: true })));
    setSelectedNodeIds(nodes.map(n => n.id));
  }, [nodes, setNodes]);

  // Nudge selected node(s) by px via arrow keys
  const handleNudge = useCallback((dx: number, dy: number) => {
    if (selectedNodeIds.length === 0) return;
    setNodes(nds => {
      const moved = nds.map(n =>
        selectedNodeIds.includes(n.id)
          ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
          : n
      );
      setEdges(eds => { pushHistory(moved, eds); return eds; });
      return moved;
    });
  }, [selectedNodeIds, setNodes, setEdges, pushHistory]);

  // Drop Node handler — pushes history after adding
  const handleDropNode = (type: string, position: { x: number; y: number }) => {
    const id = `${type.replace('-node', '')}-${Math.random().toString(36).substr(2, 4)}`;
    
    let defaultConfig: any = {};
    switch (type) {
      case 'llm-prompt':
        defaultConfig = { promptText: 'Write a catchy tagline for Open Flow.', model: 'llama-3.1-8b-instant' };
        break;
      case 'mcp-tool':
        defaultConfig = { toolName: 'text_analyzer', inputParamName: 'text' };
        break;
      case 'http-webhook':
        defaultConfig = { url: '', bodyTemplate: '{\n  "text": "{{input}}"\n}' };
        break;
      case 'sqlite-storage':
        defaultConfig = { tableName: 'workflow_data', columnName: 'payload' };
        break;
      case 'text-transform':
        defaultConfig = { template: 'Combined output: {{llm-prompt-1}}' };
        break;
      default:
        break;
    }

    const newNode: Node = {
      id,
      type,
      position,
      data: { status: 'idle', config: defaultConfig },
    };

    setNodes(nds => {
      const updated = nds.concat(newNode);
      setEdges(eds => { pushHistory(updated, eds); return eds; });
      return updated;
    });
  };

  // -------------------------------------------
  // Keyboard shortcuts global handler
  // -------------------------------------------
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // ? — shortcuts overlay (no guard, always available)
      if (e.key === '?' && !mod && !isTyping()) {
        setShowShortcuts(s => !s);
        return;
      }

      // Esc — deselect / close overlay
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        if (!isTyping()) {
          setSelectedNodeId(null);
          setSelectedNodeIds([]);
          setNodes(nds => nds.map(n => ({ ...n, selected: false })));
        }
        return;
      }

      // All remaining shortcuts skip when typing
      if (isTyping()) return;

      // Ctrl/Cmd + Z — Undo
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y — Redo
      if ((mod && e.shiftKey && e.key === 'z') || (mod && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl/Cmd + S — Save
      if (mod && e.key === 's') {
        e.preventDefault();
        handleSaveWorkflow();
        return;
      }

      // Ctrl/Cmd + Enter — Run
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        handleRunWorkflow();
        return;
      }

      // Ctrl/Cmd + A — Select All
      if (mod && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Ctrl/Cmd + C — Copy
      if (mod && e.key === 'c') {
        handleCopy();
        return;
      }

      // Ctrl/Cmd + V — Paste
      if (mod && e.key === 'v') {
        handlePaste();
        return;
      }

      // Ctrl/Cmd + D — Duplicate
      if (mod && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
        return;
      }

      // Ctrl/Cmd + 0 — Fit View
      if (mod && e.key === '0') {
        e.preventDefault();
        fitView({ padding: 0.1 });
        return;
      }

      // Delete / Backspace — delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
        return;
      }

      // Arrow key nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const step = e.shiftKey ? 10 : 1;
        e.preventDefault();
        if (e.key === 'ArrowUp') handleNudge(0, -step);
        else if (e.key === 'ArrowDown') handleNudge(0, step);
        else if (e.key === 'ArrowLeft') handleNudge(-step, 0);
        else if (e.key === 'ArrowRight') handleNudge(step, 0);
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    handleUndo, handleRedo, handleDeleteSelected, handleCopy, handlePaste,
    handleDuplicate, handleSelectAll, handleNudge, fitView,
    // these are referenced in closures — stable refs via useCallback
  ]);

  // Save workflow API call
  const handleSaveWorkflow = async () => {
    if (!token) return;
    const payload = {
      name: workflowName,
      graph: { nodes, edges }
    };

    try {
      let res;
      if (currentWorkflowId) {
        res = await fetch(`/api/workflows/${currentWorkflowId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const result = await res.json();
      if (res.ok && result.success) {
        if (!currentWorkflowId) {
          setCurrentWorkflowId(result.workflow.id);
        }
        alert('Workflow definition successfully saved to metadata database.');
      } else {
        alert(result.error?.message || 'Failed to save workflow.');
      }
    } catch {
      alert('Error connecting to backend database.');
    }
  };

  const handleDeployWorkflow = async () => {
    if (!currentWorkflowId) {
      alert('Please save the workflow definition before deploying.');
      return;
    }

    setDeploying(true);
    try {
      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ workflowId: currentWorkflowId })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setActiveDeployment(data.deployment);
        setDeployModalOpen(true);
      } else {
        alert(data.error?.message || 'Deployment compilation failed.');
      }
    } catch {
      alert('Failed to connect to backend deployments controller.');
    } finally {
      setDeploying(false);
    }
  };

  // Load selected workflow state — clears undo history per spec
  const handleSelectWorkflow = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const wf = data.workflow;
        setCurrentWorkflowId(wf.id);
        setWorkflowName(wf.name);
        setNodes(wf.graph.nodes || []);
        setEdges(wf.graph.edges || []);
        clearHistory();
        
        // Reset execution states
        setExecutionOutputs({});
        setExecutionErrors({});
        setRunLogs([]);
        setWorkflowStatus('idle');
        prevStatusesRef.current = {};
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
        
        setView('canvas');
      } else {
        alert('Failed to retrieve workflow definitions.');
      }
    } catch {
      alert('Error fetching workflow from database.');
    }
  };

  // Instantiates new empty canvas workflow — clears history
  const handleCreateNewWorkflow = () => {
    setCurrentWorkflowId(null);
    setWorkflowName('Untitled Workflow');
    setNodes([]);
    setEdges([]);
    clearHistory();
    setExecutionOutputs({});
    setExecutionErrors({});
    setRunLogs([]);
    setWorkflowStatus('idle');
    prevStatusesRef.current = {};
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setView('canvas');
  };

  // Poll database run status
  const startStatusPolling = (runId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    const localLogs: WorkflowRunLog[] = [];

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();

        if (res.ok && result.success) {
          const run = result.run;
          setWorkflowStatus(run.status);

          const updatedOutputs: Record<string, any> = {};
          const updatedErrors: Record<string, any> = {};

          // Sync database statuses to React Flow canvas nodes
          setNodes(nds =>
            nds.map(node => {
              const nodeRes = run.nodes[node.id];
              if (!nodeRes) return node;

              const prevStatus = prevStatusesRef.current[node.id] || 'idle';
              const currentStatus = nodeRes.status;

              // Generate real-time timeline logs from DB state comparisons
              if (prevStatus !== currentStatus) {
                const timestamp = new Date().toLocaleTimeString();
                if (currentStatus === 'running') {
                  localLogs.push({ timestamp, nodeId: node.id, nodeType: node.type || 'node', event: 'start' });
                } else if (currentStatus === 'success') {
                  localLogs.push({ timestamp, nodeId: node.id, nodeType: node.type || 'node', event: 'end', status: 'success' });
                } else if (currentStatus === 'success-with-warning') {
                  localLogs.push({ timestamp, nodeId: node.id, nodeType: node.type || 'node', event: 'end', status: 'success-with-warning', message: nodeRes.output?.warning });
                } else if (currentStatus === 'error') {
                  localLogs.push({ timestamp, nodeId: node.id, nodeType: node.type || 'node', event: 'end', status: 'error', message: nodeRes.error?.message });
                } else if (currentStatus === 'skipped') {
                  localLogs.push({ timestamp, nodeId: node.id, nodeType: node.type || 'node', event: 'end', status: 'skipped' });
                }
                prevStatusesRef.current[node.id] = currentStatus;
                setRunLogs([...localLogs]);
              }

              if (nodeRes.output) {
                updatedOutputs[node.id] = nodeRes.output;
              }
              if (nodeRes.error) {
                updatedErrors[node.id] = nodeRes.error;
              }

              return {
                ...node,
                data: {
                  ...node.data,
                  status: currentStatus
                }
              };
            })
          );

          // Update execution variables
          setExecutionOutputs(updatedOutputs);
          setExecutionErrors(updatedErrors);

          // Style canvas edges based on polled results
          setEdges(eds =>
            eds.map(e => {
              const targetRes = run.nodes[e.target];
              if (!targetRes) return e;

              if (targetRes.status === 'running') {
                return { ...e, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } };
              }
              if (targetRes.status === 'success') {
                return { ...e, animated: false, style: { stroke: '#10b981', strokeWidth: 2 } };
              }
              if (targetRes.status === 'success-with-warning') {
                return { ...e, animated: false, style: { stroke: '#f59e0b', strokeWidth: 2 } };
              }
              if (targetRes.status === 'error') {
                return { ...e, animated: false, style: { stroke: '#f43f5e', strokeWidth: 2 } };
              }
              if (targetRes.status === 'skipped') {
                return { ...e, animated: false, style: { stroke: '#18181b', strokeWidth: 2 } };
              }
              return e;
            })
          );

          // Stop polling on terminal states
          if (run.status === 'success' || run.status === 'partial' || run.status === 'failed') {
            clearInterval(pollingIntervalRef.current);
            setIsWorkflowRunning(false);
          }
        } else {
          clearInterval(pollingIntervalRef.current);
          setIsWorkflowRunning(false);
        }
      } catch {
        clearInterval(pollingIntervalRef.current);
        setIsWorkflowRunning(false);
      }
    }, 300);
  };

  // Launch execution run server-side
  const handleRunWorkflow = async () => {
    if (isWorkflowRunning || nodes.length === 0 || !currentWorkflowId) {
      if (!currentWorkflowId) {
        alert('Please Save your workflow first before starting execution.');
      }
      return;
    }

    try {
      topoSort(nodes, edges);
    } catch (err: any) {
      alert(err.message);
      return;
    }

    setIsWorkflowRunning(true);
    setWorkflowStatus('running');
    setRunLogs([]);
    setExecutionOutputs({});
    setExecutionErrors({});
    prevStatusesRef.current = {};

    // Visual reset to idle
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));
    setEdges(eds => eds.map(e => ({ ...e, animated: false, style: { stroke: '#27272a', strokeWidth: 2 } })));

    try {
      const res = await fetch(`/api/workflows/${currentWorkflowId}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (res.ok && result.success) {
        startStatusPolling(result.runId);
      } else {
        alert(result.error?.message || 'Failed to initialize execution run.');
        setIsWorkflowRunning(false);
      }
    } catch {
      alert('Error triggering execution on backend.');
      setIsWorkflowRunning(false);
    }
  };

  // Retry failed node execution server-side
  const handleRetryNode = async (nodeId: string) => {
    if (isWorkflowRunning || !currentWorkflowId) return;

    // Find active run ID from logs if any, or retrieve last running run ID.
    // In our polling structure, we poll for the last run. We can trigger retry API directly:
    // Let's retrieve all runs to get the last run ID
    try {
      const runsRes = await fetch(`/api/workflows/${currentWorkflowId}/runs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const runsData = await runsRes.json();
      if (!runsRes.ok || !runsData.success || runsData.runs.length === 0) {
        alert('No previous runs found to retry.');
        return;
      }

      const lastRunId = runsData.runs[0].id;
      setIsWorkflowRunning(true);
      setWorkflowStatus('running');

      const res = await fetch(`/api/runs/${lastRunId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nodeId })
      });
      const result = await res.json();

      if (res.ok && result.success) {
        startStatusPolling(lastRunId);
      } else {
        alert(result.error?.message || 'Failed to retry execution.');
        setIsWorkflowRunning(false);
      }
    } catch {
      alert('Error sending retry request to backend.');
      setIsWorkflowRunning(false);
    }
  };

  // Clear polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // ROUTER RENDERING
  if (view === 'auth') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (view === 'dashboard') {
    return (
      <Dashboard
        token={token}
        user={user}
        onSelectWorkflow={handleSelectWorkflow}
        onCreateWorkflow={handleCreateNewWorkflow}
        onOpenCredentials={() => setView('credentials')}
        onLogout={handleLogout}
      />
    );
  }

  if (view === 'credentials') {
    return (
      <CredentialsManager
        token={token}
        onBack={() => setView('dashboard')}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#09090b]">
      {/* Shortcuts Overlay */}
      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}

      {/* Top Header */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all text-xs font-semibold"
          >
            <FolderOpen className="w-4 h-4" />
            Dashboard
          </button>

          <span className="text-zinc-800">/</span>

          {/* Workflow Name Input */}
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow Name"
            className="bg-transparent border-0 border-b border-transparent hover:border-zinc-800 focus:border-purple-500 focus:ring-0 text-zinc-100 font-bold text-xs px-1.5 py-0.5 max-w-[200px]"
          />

          {/* Undo / Redo buttons */}
          <div className="flex items-center gap-1 border-l border-zinc-850 pl-3">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-3">
          {/* Save Button */}
          <button
            onClick={handleSaveWorkflow}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all text-[11px]"
          >
            <Save className="w-3.5 h-3.5 text-zinc-400" />
            Save Definition
          </button>

          {/* Deploy Button */}
          <button
            onClick={handleDeployWorkflow}
            disabled={deploying || !currentWorkflowId}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border transition-all text-[11px] font-semibold ${
              !currentWorkflowId
                ? 'bg-zinc-950 text-zinc-650 border-zinc-900 cursor-not-allowed'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300'
            }`}
          >
            {deploying ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Key className="w-3.5 h-3.5" />
            )}
            Deploy API
          </button>

          {workflowStatus !== 'idle' && (
            <div className="flex items-center gap-1.5 border-l border-zinc-850 pl-3">
              <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-bold">Run rollup:</span>
              {workflowStatus === 'running' && (
                <span className="text-[9px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 animate-pulse uppercase tracking-wider">
                  Running
                </span>
              )}
              {workflowStatus === 'success' && (
                <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                  Success
                </span>
              )}
              {workflowStatus === 'partial' && (
                <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Partial
                </span>
              )}
              {workflowStatus === 'failed' && (
                <span className="text-[9px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-wider">
                  Failed
                </span>
              )}
            </div>
          )}

          {/* Global Run Workflow Button */}
          <button
            onClick={handleRunWorkflow}
            disabled={isWorkflowRunning || nodes.length === 0}
            className={`flex items-center gap-2 py-1.5 px-4 rounded-lg font-semibold text-xs transition-all duration-200 ${
              isWorkflowRunning || nodes.length === 0
                ? 'bg-zinc-900 text-zinc-500 border border-zinc-850 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/15 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Run Workflow
          </button>

          {/* Shortcuts help button */}
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[9px] text-zinc-550 font-mono uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Server-Side Runs: Active
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left-hand Node Library Sidebar */}
        <Sidebar />

        {/* Center Canvas and Output */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Canvas Wrapper */}
          <div className="flex-1 relative overflow-hidden">
            <Canvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectNode={handleSelectNode}
              onDropNode={handleDropNode}
              onSelectionChange={handleSelectionChange}
            />
          </div>

          {/* Output Panel at the bottom */}
          <OutputPanel
            nodes={nodes}
            outputs={executionOutputs}
            errors={executionErrors}
            selectedNodeId={selectedNodeId}
            onRetryNode={handleRetryNode}
          />

          {/* Collapsible Run Log Panel */}
          <RunLogPanel
            logs={runLogs}
            onSelectNode={handleSelectNodeById}
          />
        </div>

        {/* Right Configuration Panel — shows multi-select summary when >1 node selected */}
        <ConfigPanel
          selectedNode={selectedNodeIds.length > 1 ? null : selectedNode}
          selectedCount={selectedNodeIds.length}
          onChangeConfig={handleChangeConfig}
          onRunNode={handleRunWorkflow}
          onDeleteNode={handleDeleteNode}
          onDeleteSelected={handleDeleteSelected}
          workflowId={currentWorkflowId}
        />
      </div>

      {deployModalOpen && (
        <DeployModal
          deployment={activeDeployment}
          onClose={() => setDeployModalOpen(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}

export default App;
