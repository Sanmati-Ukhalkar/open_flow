import { useState, useCallback } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection
} from 'reactflow';
import Canvas from './canvas/Canvas';
import ConfigPanel from './canvas/ConfigPanel';
import OutputPanel from './canvas/OutputPanel';
import { topoSort } from './engine/topoSort';
import { Waves, Play } from 'lucide-react';

const initialNodes: Node<any>[] = [
  {
    id: 'llm-node-1',
    type: 'llm-prompt',
    position: { x: 80, y: 150 },
    data: {
      status: 'idle',
      config: {
        promptText: 'Write a catchy tagline for Open Flow, an open-source visual workflow composer for AI and MCP.',
        model: 'llama-3.1-8b-instant',
      },
    },
  },
  {
    id: 'mcp-node-1',
    type: 'mcp-tool',
    position: { x: 420, y: 150 },
    data: {
      status: 'idle',
      config: {
        toolName: 'text_analyzer',
        inputParamName: 'text',
      },
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'edge-1',
    source: 'llm-node-1',
    target: 'mcp-node-1',
    animated: false,
    style: { stroke: '#27272a', strokeWidth: 2 },
  },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
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

  // Run topological graph workflow execution
  const handleRunWorkflow = async () => {
    if (isWorkflowRunning) return;

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
        // Style outgoing edge to inactive state
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
      if (parents.length > 0) {
        const parentId = parents[0];
        nodeInput = currentOutputs[parentId] || {};
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

      // Animate incoming edge to show active data flow
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

          // Change incoming edge to green done state
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

        // Change incoming edge to red failed state
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
          <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-mono">v0.2</span>
        </div>

        {/* Global Run Workflow Button */}
        <button
          onClick={handleRunWorkflow}
          disabled={isWorkflowRunning}
          className={`flex items-center gap-2 py-1.5 px-4 rounded-lg font-semibold text-xs transition-all duration-200 ${
            isWorkflowRunning
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 cursor-not-allowed'
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
        {/* Left Side Canvas and Output */}
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
        />
      </div>
    </div>
  );
}

export default App;
