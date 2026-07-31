import { useState, useCallback, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  ReactFlowProvider
} from 'reactflow';
import Sidebar from './canvas/Sidebar';
import Canvas from './canvas/Canvas';
import ConfigPanel from './canvas/ConfigPanel';
import OutputPanel from './canvas/OutputPanel';
import RunLogPanel, { WorkflowRunLog } from './canvas/RunLogPanel';
import { topoSort } from './engine/topoSort';
import { Waves, Play, AlertTriangle } from 'lucide-react';

function AppContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executionOutputs, setExecutionOutputs] = useState<Record<string, any>>({});
  const [executionErrors, setExecutionErrors] = useState<Record<string, any>>({});
  const [runLogs, setRunLogs] = useState<WorkflowRunLog[]>([]);
  
  // workflowStatus tracks the overall run rollup state
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'running' | 'success' | 'partial' | 'failed'>('idle');
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  // Ref to hold log events for sync access during execution steps
  const logEventsRef = useRef<WorkflowRunLog[]>([]);

  // Add event logger helper
  const addLog = useCallback((nodeId: string, nodeType: string, event: 'start' | 'end', status?: WorkflowRunLog['status'], message?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: WorkflowRunLog = { timestamp, nodeId, nodeType, event, status, message };
    logEventsRef.current = [...logEventsRef.current, newLog];
    setRunLogs([...logEventsRef.current]);
  }, []);

  // Connection Handler
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges(eds =>
        addEdge(
          {
            ...params,
            style: { stroke: '#27272a', strokeWidth: 2 },
            animated: false
          },
          eds
        )
      ),
    [setEdges]
  );

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
    setNodes(nds =>
      nds.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config: updatedConfig,
            },
          };
        }
        return node;
      })
    );
  };

  // Helper to trace descendant nodes downstream in the DAG
  const getDescendants = (nodeId: string, currentEdges: Edge[]): string[] => {
    const visited = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = currentEdges.filter(e => e.source === current).map(e => e.target);
      for (const child of children) {
        if (!visited.has(child)) {
          visited.add(child);
          queue.push(child);
        }
      }
    }
    return Array.from(visited);
  };

  // Safe delete node and its connected edges
  const handleDeleteNode = (nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  // Drop Node handler
  const handleDropNode = (type: string, position: { x: number; y: number }) => {
    const id = `${type.replace('-node', '')}-${Math.random().toString(36).substr(2, 4)}`;
    
    let defaultConfig: any = {};
    switch (type) {
      case 'llm-prompt':
        defaultConfig = {
          promptText: 'Write a catchy tagline for Open Flow.',
          model: 'llama-3.1-8b-instant',
        };
        break;
      case 'mcp-tool':
        defaultConfig = {
          toolName: 'text_analyzer',
          inputParamName: 'text',
        };
        break;
      case 'http-webhook':
        defaultConfig = {
          url: '',
          bodyTemplate: '{\n  "text": "{{input}}"\n}',
        };
        break;
      case 'sqlite-storage':
        defaultConfig = {
          tableName: 'workflow_data',
          columnName: 'payload',
        };
        break;
      case 'text-transform':
        defaultConfig = {
          template: 'Combined output: {{llm-prompt-1}}',
        };
        break;
      default:
        break;
    }

    const newNode: Node = {
      id,
      type,
      position,
      data: {
        status: 'idle',
        config: defaultConfig,
      },
    };

    setNodes(nds => nds.concat(newNode));
  };

  // Asynchronous Event-Driven DAG Scheduler
  const runScheduler = async (
    initialOutputs: Record<string, any>,
    initialErrors: Record<string, any>,
    nodesToReset: string[] = []
  ) => {
    setIsWorkflowRunning(true);
    setWorkflowStatus('running');

    // Create a mutable copy of outputs and errors
    const currentOutputs = { ...initialOutputs };
    const currentErrors = { ...initialErrors };

    // Create mapping of active status in memory to resolve concurrent dependencies safely
    const nodeStatuses = new Map<string, 'idle' | 'running' | 'success' | 'success-with-warning' | 'error' | 'skipped'>();
    
    nodes.forEach(node => {
      if (nodesToReset.includes(node.id)) {
        nodeStatuses.set(node.id, 'idle');
      } else {
        nodeStatuses.set(node.id, node.data.status);
      }
    });

    const triggerNextSchedulerStep = async () => {
      // Find all idle nodes whose parents have all finished execution
      const readyNodes = nodes.filter(node => {
        if (nodeStatuses.get(node.id) !== 'idle') {
          return false;
        }

        const incomingEdges = edges.filter(e => e.target === node.id);
        const parents = incomingEdges.map(e => e.source);

        // Check if all parent nodes have completed execution
        const allParentsFinished = parents.every(pId => {
          const pStatus = nodeStatuses.get(pId);
          return (
            pStatus === 'success' ||
            pStatus === 'success-with-warning' ||
            pStatus === 'error' ||
            pStatus === 'skipped'
          );
        });

        return allParentsFinished;
      });

      // Done checking if no nodes are running or idle
      if (readyNodes.length === 0) {
        const statuses = Array.from(nodeStatuses.values());
        const hasRunning = statuses.some(s => s === 'running');
        
        if (!hasRunning) {
          // Rollup workflow status
          const hasSuccess = statuses.some(s => s === 'success' || s === 'success-with-warning');
          const hasFailure = statuses.some(s => s === 'error');
          const hasSkipped = statuses.some(s => s === 'skipped');

          if (hasFailure) {
            if (hasSuccess) {
              setWorkflowStatus('partial');
            } else {
              setWorkflowStatus('failed');
            }
          } else if (hasSkipped) {
            if (hasSuccess) {
              setWorkflowStatus('partial');
            } else {
              setWorkflowStatus('failed');
            }
          } else {
            setWorkflowStatus('success');
          }
          setIsWorkflowRunning(false);
        }
        return;
      }

      // Execute ready nodes concurrently
      await Promise.all(
        readyNodes.map(async node => {
          const incomingEdges = edges.filter(e => e.target === node.id);
          const parents = incomingEdges.map(e => e.source);

          // Check if any upstream parent failed or was skipped
          const parentFailedOrSkipped = parents.some(pId => {
            const pStatus = nodeStatuses.get(pId);
            return pStatus === 'error' || pStatus === 'skipped';
          });

          if (parentFailedOrSkipped) {
            // Mark node as skipped (Skip propagation)
            nodeStatuses.set(node.id, 'skipped');
            setNodes(nds =>
              nds.map(n => {
                if (n.id === node.id) {
                  return { ...n, data: { ...n.data, status: 'skipped' } };
                }
                return n;
              })
            );
            setEdges(eds =>
              eds.map(e => {
                if (e.source === node.id) {
                  return { ...e, style: { stroke: '#18181b', strokeWidth: 2 } };
                }
                return e;
              })
            );
            addLog(node.id, node.type || 'unknown', 'end', 'skipped');
            
            // Recurse instantly to propagate cascade skips
            await triggerNextSchedulerStep();
            return;
          }

          // Compile outputs from parents
          let nodeInput: any = {};
          if (parents.length === 1) {
            nodeInput = currentOutputs[parents[0]] || {};
          } else if (parents.length > 1) {
            nodeInput = parents.reduce((acc, pId) => {
              acc[pId] = currentOutputs[pId] || {};
              return acc;
            }, {} as Record<string, any>);
          }

          // Mark node as running
          nodeStatuses.set(node.id, 'running');
          setNodes(nds =>
            nds.map(n => {
              if (n.id === node.id) {
                return { ...n, data: { ...n.data, status: 'running' } };
              }
              return n;
            })
          );
          setEdges(eds =>
            eds.map(e => {
              if (e.target === node.id) {
                return { ...e, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } };
              }
              return e;
            })
          );
          addLog(node.id, node.type || 'unknown', 'start');

          // Artificial delay for sequential/concurrency visualizations
          await new Promise(r => setTimeout(r, 750));

          try {
            const response = await fetch('/api/run-node', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                nodeType: node.type,
                config: node.data.config,
                input: nodeInput,
              }),
            });

            if (!response.ok) {
              const responseText = await response.text();
              let errorMsg = responseText;
              try {
                const parsed = JSON.parse(responseText);
                errorMsg = parsed.error?.message || parsed.message || responseText;
              } catch {}
              throw {
                code: 'SERVER_ERROR',
                message: errorMsg || `HTTP error ${response.status}`
              };
            }

            const result = await response.json();

            if (result.success) {
              currentOutputs[node.id] = result.output;
              setExecutionOutputs({ ...currentOutputs });

              if (result.warning) {
                // Warning status matching Output Schema mismatches
                nodeStatuses.set(node.id, 'success-with-warning');
                setNodes(nds =>
                  nds.map(n => {
                    if (n.id === node.id) {
                      return { ...n, data: { ...n.data, status: 'success-with-warning' } };
                    }
                    return n;
                  })
                );
                setEdges(eds =>
                  eds.map(e => {
                    if (e.target === node.id) {
                      return { ...e, animated: false, style: { stroke: '#f59e0b', strokeWidth: 2 } }; // Amber warning edge
                    }
                    return e;
                  })
                );
                addLog(node.id, node.type || 'unknown', 'end', 'success-with-warning', result.warning);
              } else {
                // Success status
                nodeStatuses.set(node.id, 'success');
                setNodes(nds =>
                  nds.map(n => {
                    if (n.id === node.id) {
                      return { ...n, data: { ...n.data, status: 'success' } };
                    }
                    return n;
                  })
                );
                setEdges(eds =>
                  eds.map(e => {
                    if (e.target === node.id) {
                      return { ...e, animated: false, style: { stroke: '#10b981', strokeWidth: 2 } }; // Green success edge
                    }
                    return e;
                  })
                );
                addLog(node.id, node.type || 'unknown', 'end', 'success');
              }
            } else {
              throw result.error || {
                code: 'SERVER_ERROR',
                message: 'An error occurred during node execution.',
              };
            }
          } catch (err: any) {
            const errorPayload = {
              code: err.code || 'CONNECTION_ERROR',
              message: err.message || 'Failed to connect to execution server.',
            };
            currentErrors[node.id] = errorPayload;
            setExecutionErrors({ ...currentErrors });

            nodeStatuses.set(node.id, 'error');
            setNodes(nds =>
              nds.map(n => {
                if (n.id === node.id) {
                  return { ...n, data: { ...n.data, status: 'error' } };
                }
                return n;
              })
            );
            setEdges(eds =>
              eds.map(e => {
                if (e.target === node.id) {
                  return { ...e, animated: false, style: { stroke: '#f43f5e', strokeWidth: 2 } }; // Red failed edge
                }
                return e;
              })
            );
            addLog(node.id, node.type || 'unknown', 'end', 'error', errorPayload.message);
          }

          // Recurse to check for ready descendants
          await triggerNextSchedulerStep();
        })
      );
    };

    await triggerNextSchedulerStep();
  };

  // Run Workflow entry point
  const handleRunWorkflow = async () => {
    if (isWorkflowRunning || nodes.length === 0) return;

    try {
      // Topologically sort to ensure there are no cycles
      topoSort(nodes, edges);
    } catch (err: any) {
      alert(err.message);
      return;
    }

    logEventsRef.current = [];
    setRunLogs([]);
    setExecutionOutputs({});
    setExecutionErrors({});

    // Reset nodes to idle
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));
    setEdges(eds => eds.map(e => ({ ...e, animated: false, style: { stroke: '#27272a', strokeWidth: 2 } })));

    // Reset reset Node ID lists
    const allNodeIds = nodes.map(n => n.id);
    await runScheduler({}, {}, allNodeIds);
  };

  // Retry Node implementation
  const handleRetryNode = async (nodeId: string) => {
    if (isWorkflowRunning) return;

    // Find all descendants of the retried node to clear stale values
    const descendants = getDescendants(nodeId, edges);
    const resetNodeIds = [nodeId, ...descendants];

    // Mark retried node and descendants as idle
    setNodes(nds =>
      nds.map(n => {
        if (resetNodeIds.includes(n.id)) {
          return { ...n, data: { ...n.data, status: 'idle' } };
        }
        return n;
      })
    );

    // Filter outputs and errors to preserve parent cache
    const newOutputs = { ...executionOutputs };
    const newErrors = { ...executionErrors };
    resetNodeIds.forEach(id => {
      delete newOutputs[id];
      delete newErrors[id];
    });
    setExecutionOutputs(newOutputs);
    setExecutionErrors(newErrors);

    // Reset edges styles
    setEdges(eds =>
      eds.map(e => {
        if (resetNodeIds.includes(e.source) || resetNodeIds.includes(e.target)) {
          return { ...e, animated: false, style: { stroke: '#27272a', strokeWidth: 2 } };
        }
        return e;
      })
    );

    // Run scheduler using cached variables
    await runScheduler(newOutputs, newErrors, resetNodeIds);
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b]">
      {/* Top Header */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="font-bold text-xs tracking-wider text-zinc-100 uppercase font-sans">Open Flow</span>
          <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-mono">v0.4</span>
        </div>

        {/* Global Rollup Status indicator */}
        <div className="flex items-center gap-4">
          {workflowStatus !== 'idle' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-bold">Run Status:</span>
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
            {isWorkflowRunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Running Workflow...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run Workflow
              </>
            )}
          </button>
        </div>

        <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
          Concurrency Engine: Active
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

        {/* Right Configuration Panel */}
        <ConfigPanel
          selectedNode={selectedNode}
          onChangeConfig={handleChangeConfig}
          onRunNode={handleRunWorkflow}
          onDeleteNode={handleDeleteNode}
        />
      </div>
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
