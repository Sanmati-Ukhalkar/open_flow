import React, { useState, useEffect } from 'react';
import { Bot, Wrench, Globe, Database, Combine, Calendar, Package, ShieldAlert, Search, X, Mail, FileUp, Code, GitBranch, RefreshCcw, StickyNote } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  'llm-prompt': Bot,
  'mcp-tool': Wrench,
  'http-webhook': Globe,
  'sqlite-storage': Database,
  'text-transform': Combine,
  'sticky-note': StickyNote,
  'cron-trigger': Calendar,
  'webhook-trigger': Globe,
  'email': Mail,
  'vision-ocr': Search,
  'file-trigger': FileUp,
  'vector-store': Database,
  'vector-retrieve': Database,
  'code-execution': Code,
  'branch': GitBranch,
  'loop': RefreshCcw
};

const COLOR_MAP: Record<string, string> = {
  'llm-prompt': 'text-sky-400 border-sky-500/20 bg-sky-500/5',
  'mcp-tool': 'text-blue-400 border-blue-500/20 bg-blue-500/5',
  'http-webhook': 'text-rose-400 border-rose-500/20 bg-rose-500/5',
  'sqlite-storage': 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
  'text-transform': 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5',
  'sticky-note': 'text-amber-500 border-amber-500/20 bg-amber-500/5',
  'cron-trigger': 'text-sky-300 border-sky-500/20 bg-sky-500/5',
  'webhook-trigger': 'text-blue-300 border-blue-500/20 bg-blue-500/5',
  'email': 'text-orange-400 border-orange-500/20 bg-orange-500/5',
  'vision-ocr': 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
  'file-trigger': 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
  'vector-store': 'text-teal-400 border-teal-500/20 bg-teal-500/5',
  'vector-retrieve': 'text-teal-400 border-teal-500/20 bg-teal-500/5',
  'code-execution': 'text-gray-400 border-gray-500/20 bg-gray-500/5',
  'branch': 'text-pink-400 border-pink-500/20 bg-pink-500/5',
  'loop': 'text-lime-400 border-lime-500/20 bg-lime-500/5'
};

export const Sidebar = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Live filter nodes based on name and description
  const filteredNodes = nodes.filter(node => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const displayName = (node.displayName || '').toLowerCase();
    const description = (node.description || node.manifest?.description || '').toLowerCase();

    return displayName.includes(query) || description.includes(query);
  });

  // Extract categories dynamically from filtered results
  const categories = Array.from(new Set(filteredNodes.map(n => n.category || 'Other')));
  categories.sort((a, b) => {
    if (a === 'Trigger') return -1;
    if (b === 'Trigger') return 1;
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  return (
    <div 
      id="node-library-sidebar" 
      className="hidden md:flex w-64 border-r border-zinc-800 bg-zinc-950 p-5 flex-col h-full overflow-hidden flex-shrink-0 select-none"
    >
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Node Library</h3>
        <p className="text-[10px] text-zinc-550 mt-1 leading-normal">
          Drag elements onto the canvas to construct your custom workflow DAG.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="relative mb-4 flex-shrink-0">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
        <input
          id="node-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search nodes by name, info..."
          className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg py-1.5 pl-8 pr-7 text-xs text-zinc-200 placeholder-zinc-550 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Scrollable list of categories and nodes */}
      <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
        {filteredNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-2">
            <Search className="w-6 h-6 text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-400 font-medium">No nodes match "{searchQuery}"</p>
            <p className="text-[9px] text-zinc-550 mt-1 leading-normal">
              Check spelling or try a different term.
            </p>
          </div>
        ) : (
          categories.map(category => {
            const categoryNodes = filteredNodes.filter(n => (n.category || 'Other') === category);

            return (
              <div key={category} className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 mt-2">
                  {category}
                </h4>
                <div className="space-y-2">
                  {categoryNodes.map(node => {
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
                          <p className="text-[10px] text-zinc-550 leading-normal line-clamp-2">
                            {node.description || (node.manifest && node.manifest.description)}
                          </p>
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
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;
