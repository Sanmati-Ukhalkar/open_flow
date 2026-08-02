import { useRef, useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
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
import { Map } from 'lucide-react';
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
  isMobile?: boolean;
  theme?: 'light' | 'dark';
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
  setCursor,
  isMobile = false,
  theme = 'dark'
}: CanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { x, y, zoom } = useViewport();
  const [showMiniMap, setShowMiniMap] = useState(true);

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
      if (isMobile) return; // Prevent drag drops on mobile

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
    [reactFlowInstance, onDropNode, isMobile]
  );

  const getNodeColor = useCallback((node: Node) => {
    const status = node.data?.status;
    switch (status) {
      case 'running': return '#3b82f6';
      case 'success': return '#10b981';
      case 'success-with-warning': return '#f59e0b';
      case 'error': return '#f43f5e';
      case 'skipped': return '#6b7280';
      default: return theme === 'dark' ? '#18181b' : '#d4d4d8';
    }
  }, [theme]);

  // Custom MiniMap Node for hover Tooltips using standard SVG <title> elements
  const MiniMapNode = useCallback((props: any) => {
    const node = nodes.find(n => n.id === props.id);
    const label = node?.data?.label || node?.type || 'Node';
    const fill = getNodeColor(node as Node);
    
    return (
      <rect
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        rx={props.borderRadius || 4}
        ry={props.borderRadius || 4}
        className={props.className}
        fill={fill}
        stroke={props.strokeColor || (theme === 'dark' ? '#27272a' : '#e4e4e7')}
        strokeWidth={props.strokeWidth || 1.5}
      >
        <title>{label}</title>
      </rect>
    );
  }, [nodes, theme, getNodeColor]);

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
        nodesDraggable={!isMobile}
        nodesConnectable={!isMobile}
        elementsSelectable={true}
        className="w-full h-full"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color={theme === 'dark' ? "#27272a" : "#d4d4d8"}
        />
        <Controls showInteractive={false} className="bg-zinc-950 border border-zinc-800 text-zinc-400" />
        
        {showMiniMap && (
          <MiniMap
            nodeComponent={MiniMapNode}
            nodeStrokeWidth={2}
            maskColor={theme === 'dark' ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.4)"}
            className="!bg-zinc-950/80 !border-zinc-800 !rounded-xl !shadow-2xl backdrop-blur-md transition-all duration-300"
            style={{
              width: 150,
              height: 100,
            }}
          />
        )}
      </ReactFlow>

      {/* MiniMap Toggle Button */}
      <button
        onClick={() => setShowMiniMap(prev => !prev)}
        className={`absolute z-20 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all shadow-md backdrop-blur-md ${
          showMiniMap ? 'bottom-[120px]' : 'bottom-4'
        } right-4`}
        title={showMiniMap ? "Hide Minimap" : "Show Minimap"}
      >
        <Map className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Canvas;
