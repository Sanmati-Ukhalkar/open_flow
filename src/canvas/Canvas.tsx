import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  BackgroundVariant
} from 'reactflow';
import LLMPromptNode from './LLMPromptNode';
import MCPToolNode from './MCPToolNode';

// Map custom node types
const nodeTypes = {
  'llm-prompt': LLMPromptNode,
  'mcp-tool': MCPToolNode,
};

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onSelectNode: (node: Node | null) => void;
}

export const Canvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode
}: CanvasProps) => {
  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_event, node) => onSelectNode(node)}
        onPaneClick={() => onSelectNode(null)}
        fitView
        className="w-full h-full"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#27272a"
        />
        <Controls showInteractive={false} className="bg-zinc-950 border border-zinc-800 text-zinc-400" />
      </ReactFlow>
    </div>
  );
};

export default Canvas;
