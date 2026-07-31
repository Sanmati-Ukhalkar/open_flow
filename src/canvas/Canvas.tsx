import ReactFlow, { Background, Controls, Node, OnNodesChange, BackgroundVariant } from 'reactflow';
import LLMPromptNode from './LLMPromptNode';

// Map the custom node type 'llm-prompt' to its React component
const nodeTypes = {
  'llm-prompt': LLMPromptNode,
};

interface CanvasProps {
  nodes: Node[];
  onNodesChange: OnNodesChange;
  onSelectNode: (node: Node | null) => void;
}

export const Canvas = ({ nodes, onNodesChange, onSelectNode }: CanvasProps) => {
  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
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
