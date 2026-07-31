import React from 'react';
import { Bot, Wrench, Globe, Database, Combine } from 'lucide-react';

const NODE_TYPES = [
  {
    type: 'llm-prompt',
    label: 'LLM Prompt',
    description: 'Call OpenAI or Groq LLM model',
    category: 'AI',
    icon: Bot,
    color: 'text-purple-400 border-purple-500/20 bg-purple-500/5'
  },
  {
    type: 'mcp-tool',
    label: 'MCP Tool',
    description: 'Execute a tool on an MCP server',
    category: 'MCP',
    icon: Wrench,
    color: 'text-blue-400 border-blue-500/20 bg-blue-500/5'
  },
  {
    type: 'text-transform',
    label: 'Text Transform',
    description: 'Combine and format parent inputs',
    category: 'Storage',
    icon: Combine,
    color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
  },
  {
    type: 'sqlite-storage',
    label: 'SQLite Storage',
    description: 'Append row to local SQLite DB',
    category: 'Storage',
    icon: Database,
    color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
  },
  {
    type: 'http-webhook',
    label: 'HTTP Webhook',
    description: 'Fire a POST webhook query',
    category: 'Output',
    icon: Globe,
    color: 'text-rose-400 border-rose-500/20 bg-rose-500/5'
  }
];

export const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 border-r border-zinc-800 bg-zinc-950/70 backdrop-blur-md p-5 flex flex-col h-full overflow-y-auto flex-shrink-0">
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Node Library</h3>
        <p className="text-[10px] text-zinc-550 mt-1 leading-normal">
          Drag and drop elements onto the canvas to construct your custom workflow DAG.
        </p>
      </div>

      <div className="space-y-3">
        {NODE_TYPES.map(node => {
          const Icon = node.icon;
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className={`p-3 rounded-xl border cursor-grab hover:scale-[1.02] active:cursor-grabbing hover:bg-zinc-900/30 transition-all duration-150 flex items-start gap-3 bg-zinc-900/10 ${node.color}`}
            >
              <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h4 className="text-[11px] font-bold text-zinc-200">{node.label}</h4>
                <p className="text-[10px] text-zinc-550 leading-normal line-clamp-2">{node.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
