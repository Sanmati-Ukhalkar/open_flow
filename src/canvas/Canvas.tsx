import { useRef, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  BackgroundVariant,
  useReactFlow
} from 'reactflow';
import LLMPromptNode from './LLMPromptNode';
import MCPToolNode from './MCPToolNode';
import HTTPWebhookNode from './HTTPWebhookNode';
import SQLiteStorageNode from './SQLiteStorageNode';
import TextTransformNode from './TextTransformNode';

// Map custom node types
const nodeTypes = {
  'llm-prompt': LLMPromptNode,
  'mcp-tool': MCPToolNode,
  'http-webhook': HTTPWebhookNode,
  'sqlite-storage': SQLiteStorageNode,
  'text-transform': TextTransformNode,
};

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onSelectNode: (node: Node | null) => void;
  onDropNode: (type: string, position: { x: number; y: number }) => void;
}

export const Canvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode,
  onDropNode
}: CanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // Verify node type is valid
      if (!type) {
        return;
      }

      if (reactFlowWrapper.current) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        onDropNode(type, position);
      }
    },
    [project, onDropNode]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
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
