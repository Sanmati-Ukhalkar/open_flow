import React, { useState, useEffect } from 'react';
import { Bot, Wrench, Globe, Database, Combine, Calendar, Package, ShieldAlert } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  'llm-prompt': Bot,
  'mcp-tool': Wrench,
  'http-webhook': Globe,
  'sqlite-storage': Database,
  'text-transform': Combine,
  'cron-trigger': Calendar,
  'webhook-trigger': Globe
};

const COLOR_MAP: Record<string, string> = {
  'llm-prompt': 'text-purple-400 border-purple-500/20 bg-purple-500/5',
  'mcp-tool': 'text-blue-400 border-blue-500/20 bg-blue-500/5',
  'http-webhook': 'text-rose-400 border-rose-500/20 bg-rose-500/5',
  'sqlite-storage': 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
  'text-transform': 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5',
  'cron-trigger': 'text-purple-300 border-purple-500/20 bg-purple-500/5',
  'webhook-trigger': 'text-blue-300 border-blue-500/20 bg-blue-500/5'
};

export const Sidebar = () => {
  const [nodes, setNodes] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/node-definitions')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.nodes) {
          setNodes(data.nodes);
        }
      })
      .catch(err => console.error("Failed to load node definitions", err));
  }, []);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 border-r border-zinc-800 bg-zinc-950/70 backdrop-blur-md p-5 flex flex-col h-full overflow-y-auto flex-shrink-0 select-none no-scrollbar">
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Node Library</h3>
        <p className="text-[10px] text-zinc-550 mt-1 leading-normal">
          Drag elements onto the canvas to construct your custom workflow DAG.
        </p>
      </div>

      <div className="space-y-3">
        {nodes.map(node => {
          const Icon = ICON_MAP[node.id] || Package;
          const colorClass = COLOR_MAP[node.id] || 'text-orange-400 border-orange-500/20 bg-orange-500/5';
          const isCommunity = !!node.isCommunity;

          return (
            <div
              key={node.id}
              draggable
              onDragStart={(e) => onDragStart(e, node.id)}
              className={`p-3 rounded-xl border cursor-grab hover:scale-[1.02] active:cursor-grabbing hover:bg-zinc-900/30 transition-all duration-150 flex items-start gap-3 bg-zinc-900/10 ${colorClass}`}
            >
              <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg flex-shrink-0 relative">
                <Icon className="w-3.5 h-3.5" />
                {isCommunity && (
                  <span className="absolute -top-1.5 -right-1.5 p-0.5 bg-zinc-950 border border-orange-500/30 rounded-full text-orange-400">
                    <ShieldAlert className="w-2 h-2" />
                  </span>
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[11px] font-bold text-zinc-200 truncate">{node.displayName}</h4>
                  {isCommunity && (
                    <span className="text-[8px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.2 rounded-full uppercase tracking-wider scale-[0.9]">
                      3rd-Party
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-550 leading-normal line-clamp-2">{node.description || (node.manifest && node.manifest.description)}</p>
                {isCommunity && node.capabilities && node.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(node.capabilities as string[]).map((cap: string) => (
                      <span key={cap} className="text-[8px] font-mono text-orange-300 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
