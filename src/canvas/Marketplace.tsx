import { useState, useEffect } from 'react';
import { Package, Download, ExternalLink, ShieldAlert, Check, Loader2 } from 'lucide-react';

export const Marketplace = () => {
  const [registry, setRegistry] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [installedNodes, setInstalledNodes] = useState<string[]>([]);

  const fetchRegistry = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/node-definitions');
      const data = await res.json();
      if (res.ok && data.success) {
        // Find community nodes that are already installed
        const commIds = data.nodes.filter((n: any) => n.isCommunity).map((n: any) => n.id);
        setInstalledNodes(commIds);
      }
      
      // Load registry curated list
      const regRes = await fetch('/src/nodes/registry.json');
      const regData = await regRes.json();
      setRegistry(regData);
    } catch (e) {
      console.error("Failed to load registry catalog:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  return (
    <div className="space-y-6">
      {/* Alert Header */}
      <div className="flex items-start gap-3 bg-rose-950/10 border border-rose-900/30 p-4 rounded-xl text-xs text-rose-300 leading-normal">
        <ShieldAlert className="w-5 h-5 text-rose-455 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-zinc-200">Community Node Trust Boundary Notice</h4>
          <p>
            Community extensions run arbitrary code (`run.ts`) on your host machine without sandboxing boundaries. 
            Only install and load nodes from repositories and authors you fully trust.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">Curated Community Library</h3>
        <p className="text-[10px] text-zinc-550 mb-4">Manual copy contribution path. Place packages in `src/nodes/community/` and restart dev servers.</p>
      </div>

      {loading ? (
        <div className="text-zinc-550 text-xs py-12 text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          Loading marketplace registry...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {registry.map(node => {
            const isInstalled = installedNodes.includes(node.id);
            return (
              <div
                key={node.id}
                className="p-5 border border-zinc-850 bg-zinc-950/40 rounded-2xl flex flex-col justify-between h-44 relative group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-purple-400">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-200">{node.name}</h4>
                        <span className="text-[9px] text-zinc-550 block font-mono">v{node.version} • by {node.author}</span>
                      </div>
                    </div>

                    <a
                      href={node.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <p className="text-[10px] text-zinc-500 leading-normal line-clamp-3">
                    {node.description}
                  </p>
                </div>

                <div className="border-t border-zinc-900 pt-3 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-zinc-600 block uppercase">Package ID: {node.id}</span>
                  {isInstalled ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-450 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">
                      <Check className="w-3 h-3" />
                      Installed
                    </span>
                  ) : (
                    <button
                      onClick={() => alert(`Installation Guide:\n\n1. Clone the package from ${node.repo}\n2. Place files into: src/nodes/community/${node.id}/\n3. Restart your dev server to load.`)}
                      className="flex items-center gap-1.5 py-1 px-3 rounded-lg border border-zinc-800 bg-zinc-900/50 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install Details
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
