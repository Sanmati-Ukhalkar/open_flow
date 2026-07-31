import { useState, useCallback } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Connection,
  ReactFlowProvider
} from 'reactflow';
import Sidebar from './canvas/Sidebar';
import Canvas from './canvas/Canvas';
import ConfigPanel from './canvas/ConfigPanel';
import OutputPanel from './canvas/OutputPanel';
import { topoSort } from './engine/topoSort';
import { Waves, Play } from 'lucide-react';

function AppContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executionOutputs, setExecutionOutputs] = useState<Record<string, any>>({});
  const [executionErrors, setExecutionErrors] = useState<Record<string, any>>({});
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

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
          promptText: 'Write a catchy tagline for Open Flow, an open-source visual workflow composer.',
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
          template: 'Combined output template.',
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

  // Run topological graph workflow execution
  const handleRunWorkflow = async () => {
    if (isWorkflowRunning || nodes.length === 0) return;

    setIsWorkflowRunning(true);
    setExecutionOutputs({});
    setExecutionErrors({});

    // Reset edges and set all nodes to idle
    setEdges(eds => eds.map(e => ({ ...e, animated: false, style: { stroke: '#27272a', strokeWidth: 2 } })));
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));

    let sortedNodes: Node[] = [];
    try {
      sortedNodes = topoSort(nodes, edges);
    } catch (err: any) {
      alert(err.message);
      setIsWorkflowRunning(false);
      return;
    }

    const currentOutputs: Record<string, any> = {};
    const currentErrors: Record<string, any> = {};

    // Sequentially execute nodes in topological order
    for (const node of sortedNodes) {
      const incomingEdges = edges.filter(e => e.target === node.id);
      const parents = incomingEdges.map(e => e.source);

      // Check if any upstream parent failed or was skipped
      const parentFailedOrSkipped = parents.some(pId => {
        return currentErrors[pId] !== undefined || sortedNodes.find(n => n.id === pId)?.data.status === 'skipped';
      });

      if (parentFailedOrSkipped) {
        // Cascade failure: Skip execution of this node
        setNodes(nds =>
          nds.map(n => {
            if (n.id === node.id) {
              return { ...n, data: { ...n.data, status: 'skipped' } };
            }
            return n;
          })
        );
        // Style outgoing edges to inactive state
        setEdges(eds =>
          eds.map(e => {
            if (e.source === node.id) {
              return { ...e, style: { stroke: '#18181b', strokeWidth: 2 } };
            }
            return e;
          })
        );
        await new Promise(r => setTimeout(r, 200));
        continue;
      }

      // Resolve node inputs
      let nodeInput: any = {};
      if (parents.length === 1) {
        // Single parent input
        nodeInput = currentOutputs[parents[0]] || {};
      } else if (parents.length > 1) {
        // Multi-parent inputs: compile a dictionary keyed by parent node ID
        nodeInput = parents.reduce((acc, pId) => {
          acc[pId] = currentOutputs[pId] || {};
          return acc;
        }, {} as Record<string, any>);
      }

      // Mark active node as running
      setNodes(nds =>
        nds.map(n => {
          if (n.id === node.id) {
            return { ...n, data: { ...n.data, status: 'running' } };
          }
          return n;
        })
      );

      // Animate incoming edges to show active data flow
      setEdges(eds =>
        eds.map(e => {
          if (e.target === node.id) {
            return { ...e, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }; // Blue flowing edge
          }
          return e;
        })
      );

      // Brief delay to showcase sequencing visuals
      await new Promise(r => setTimeout(r, 850));

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

        const result = await response.json();

        if (response.ok && result.success) {
          currentOutputs[node.id] = result.output;
          setExecutionOutputs({ ...currentOutputs });

          // Set node to success
          setNodes(nds =>
            nds.map(n => {
              if (n.id === node.id) {
                return { ...n, data: { ...n.data, status: 'success' } };
              }
              return n;
            })
          );

          // Change incoming edges to green done state
          setEdges(eds =>
            eds.map(e => {
              if (e.target === node.id) {
                return { ...e, animated: false, style: { stroke: '#10b981', strokeWidth: 2 } }; // Green done edge
              }
              return e;
            })
          );
        } else {
          throw result.error || {
            code: 'SERVER_ERROR',
            message: 'An error occurred during node execution.',
          };
        }
      } catch (err: any) {
        currentErrors[node.id] = {
          code: err.code || 'CONNECTION_ERROR',
          message: err.message || 'Failed to connect to execution server.',
        };
        setExecutionErrors({ ...currentErrors });

        // Set node to error
        setNodes(nds =>
          nds.map(n => {
            if (n.id === node.id) {
              return { ...n, data: { ...n.data, status: 'error' } };
            }
            return n;
          })
        );

        // Change incoming edges to red failed state
        setEdges(eds =>
          eds.map(e => {
            if (e.target === node.id) {
              return { ...e, animated: false, style: { stroke: '#f43f5e', strokeWidth: 2 } }; // Red failed edge
            }
            return e;
          })
        );
      }

      await new Promise(r => setTimeout(r, 400));
    }

    setIsWorkflowRunning(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b]">
      {/* Top Header */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="font-bold text-xs tracking-wider text-zinc-100 uppercase font-sans">Open Flow</span>
          <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-mono">v0.3</span>
        </div>

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

        <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
          DAG Engine: Active
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
