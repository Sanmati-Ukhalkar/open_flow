import { useRef, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  OnSelectionChangeParams,
  BackgroundVariant,
  useReactFlow,
  useViewport
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
  onSelectionChange?: (params: OnSelectionChangeParams) => void;
  awarenessUsers?: Map<number, any>;
  clientId?: number;
  setCursor?: (cursor: { x: number, y: number } | null) => void;
}

export const Canvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode,
  onDropNode,
  onSelectionChange,
  awarenessUsers,
  clientId,
  setCursor
}: CanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { x, y, zoom } = useViewport();

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!setCursor || !reactFlowWrapper.current || !reactFlowInstance) return;
    
    // Calculate position relative to the wrapper bounds
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });
    setCursor(position);
  }, [setCursor, reactFlowInstance]);

  const handlePointerLeave = useCallback(() => {
    if (setCursor) setCursor(null);
  }, [setCursor]);
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
    [reactFlowInstance, onDropNode]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {awarenessUsers && Array.from(awarenessUsers.entries()).map(([id, state]) => {
        if (id === clientId || !state.user?.cursor) return null;
        
        const screenX = state.user.cursor.x * zoom + x;
        const screenY = state.user.cursor.y * zoom + y;

        return (
          <div
            key={id}
            className="absolute pointer-events-none z-10"
            style={{ left: screenX, top: screenY }}
          >
            <div className="w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1.5 -translate-y-1.5" />
            <div className="text-xs text-white bg-blue-600 px-1 rounded ml-2 whitespace-nowrap">
              {state.user.name || 'User'}
            </div>
          </div>
        );
      })}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_event, node) => onSelectNode(node)}
        onPaneClick={() => onSelectNode(null)}
        onSelectionChange={onSelectionChange}
        // Multi-select: Shift+drag for marquee, Ctrl/Cmd+click to add to selection
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        // We handle Delete ourselves to guard against firing inside text inputs
        deleteKeyCode={null}
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
