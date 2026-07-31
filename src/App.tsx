import { useState } from 'react';
import { useNodesState, Node } from 'reactflow';
import Canvas from './canvas/Canvas';
import ConfigPanel from './canvas/ConfigPanel';
import OutputPanel from './canvas/OutputPanel';
import { LLMPromptNodeData } from './canvas/LLMPromptNode';
import { Waves } from 'lucide-react';

const initialNodes: Node<LLMPromptNodeData>[] = [
  {
    id: 'llm-node-1',
    type: 'llm-prompt',
    position: { x: 250, y: 180 },
    data: {
      status: 'idle',
      config: {
        promptText: 'Write a catchy tagline for Open Flow, an open-source visual workflow composer for AI and MCP.',
        model: 'gpt-4o-mini',
      },
    },
  },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<LLMPromptNodeData>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executionOutput, setExecutionOutput] = useState<{ text?: string } | null>(null);
  const [executionError, setExecutionError] = useState<{ code?: string; message?: string } | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const handleSelectNode = (node: Node | null) => {
    setSelectedNodeId(node ? node.id : null);
  };

  const handleChangeConfig = (nodeId: string, updatedConfig: LLMPromptNodeData['config']) => {
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

  const handleRunNode = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Set node status to running
    setNodes(nds =>
      nds.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: { ...n.data, status: 'running' },
          };
        }
        return n;
      })
    );
    setExecutionOutput(null);
    setExecutionError(null);

    try {
      const response = await fetch('/api/run-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeType: node.type,
          config: node.data.config,
          input: {},
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update node status to success
        setNodes(nds =>
          nds.map(n => {
            if (n.id === nodeId) {
              return {
                ...n,
                data: { ...n.data, status: 'success' },
              };
            }
            return n;
          })
        );
        setExecutionOutput(result.output);
      } else {
        const errorDetail = result.error || {
          code: 'SERVER_ERROR',
          message: 'An error occurred on the server while executing the node.',
        };
        throw errorDetail;
      }
    } catch (err: any) {
      // Update node status to error
      setNodes(nds =>
        nds.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: { ...n.data, status: 'error' },
            };
          }
          return n;
        })
      );
      setExecutionError({
        code: err.code || 'CONNECTION_ERROR',
        message: err.message || 'Failed to connect to the execution server.',
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b]">
      {/* Top Header */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="font-bold text-xs tracking-wider text-zinc-100 uppercase">Open Flow</span>
          <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-mono">v0.1</span>
        </div>
        <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
          Canvas Engine: Active
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
              onNodesChange={onNodesChange}
              onSelectNode={handleSelectNode}
            />
          </div>

          {/* Output Panel at the bottom */}
          <OutputPanel
            status={selectedNode ? selectedNode.data.status : 'idle'}
            output={executionOutput}
            error={executionError}
          />
        </div>

        {/* Right Configuration Panel */}
        <ConfigPanel
          selectedNode={selectedNode}
          onChangeConfig={handleChangeConfig}
          onRunNode={handleRunNode}
        />
      </div>
    </div>
  );
}

export default App;
