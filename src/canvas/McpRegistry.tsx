import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Shield, Server } from 'lucide-react';

interface McpServerConfig {
  id: string;
  name: string;
  type: 'stdio' | 'sse';
  command: string | null;
  args: string;
  env: string;
  url: string | null;
}

interface McpRegistryProps {
  token: string;
  activeOrg: any;
}

export const McpRegistry = ({ token, activeOrg }: McpRegistryProps) => {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'stdio' | 'sse'>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('[]');
  const [env, setEnv] = useState('{}');
  const [url, setUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp/servers', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setServers(data.servers || []);
      }
    } catch (e) {
      console.error('Failed to fetch MCP servers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleCreate = async () => {
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Server name is required.');
      return;
    }

    try {
      JSON.parse(args);
    } catch {
      setErrorMsg('Arguments must be a valid JSON array, e.g. ["arg1", "arg2"]');
      return;
    }

    try {
      JSON.parse(env);
    } catch {
      setErrorMsg('Environment variables must be a valid JSON object, e.g. {"KEY": "value"}');
      return;
    }

    try {
      const res = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          type,
          command: type === 'stdio' ? command.trim() : null,
          args,
          env,
          url: type === 'sse' ? url.trim() : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddForm(false);
        setName('');
        setCommand('');
        setArgs('[]');
        setEnv('{}');
        setUrl('');
        fetchServers();
      } else {
        setErrorMsg(data.error?.message || 'Failed to create server config.');
      }
    } catch (e) {
      setErrorMsg('Network error.');
    }
  };

  const handleUpdate = async (id: string) => {
    setErrorMsg('');
    const target = servers.find(s => s.id === id);
    if (!target) return;

    try {
      JSON.parse(target.args);
    } catch {
      setErrorMsg('Arguments must be a valid JSON array.');
      return;
    }

    try {
      JSON.parse(target.env);
    } catch {
      setErrorMsg('Environment variables must be a valid JSON object.');
      return;
    }

    try {
      const res = await fetch(`/api/mcp/servers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: target.name,
          type: target.type,
          command: target.command,
          args: target.args,
          env: target.env,
          url: target.url
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchServers();
      } else {
        setErrorMsg(data.error?.message || 'Failed to update server.');
      }
    } catch (e) {
      setErrorMsg('Network error.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this MCP server registry? Workflows utilizing its tools will fail to run.')) return;
    try {
      const res = await fetch(`/api/mcp/servers/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchServers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isViewer = activeOrg?.role === 'viewer';

  return (
    <div className="bg-zinc-900/25 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            Model Context Protocol (MCP) Registry
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1">
            Register and spin up custom MCP servers dynamically to extend your canvas tools.
          </p>
        </div>

        {!isViewer && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-sky-600/10 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Server
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs px-4 py-2.5 rounded-lg font-medium">
          {errorMsg}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-zinc-900/50 border border-zinc-850 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-2">
            <h4 className="text-xs font-bold text-zinc-300">New MCP Server Registration</h4>
            <button onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Server Identifier Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. postgres-mcp"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Transport Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="stdio">Local Process (stdio)</option>
                <option value="sse">HTTP Server (SSE)</option>
              </select>
            </div>
          </div>

          {type === 'stdio' ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Executable Command</label>
                  <input
                    type="text"
                    value={command}
                    onChange={e => setCommand(e.target.value)}
                    placeholder="e.g. npx, python, node"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Arguments (JSON Array)</label>
                  <input
                    type="text"
                    value={args}
                    onChange={e => setArgs(e.target.value)}
                    placeholder='e.g. ["-y", "@modelcontextprotocol/server-postgres"]'
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Environment Variables (JSON Object)</label>
                <input
                  type="text"
                  value={env}
                  onChange={e => setEnv(e.target.value)}
                  placeholder='e.g. {"DATABASE_URL": "postgresql://localhost:5432/db"}'
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">SSE Endpoint URL</label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="e.g. http://localhost:3010/sse"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none font-mono"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-850">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
            >
              Register Server
            </button>
          </div>
        </div>
      )}

      {/* Servers List */}
      <div className="space-y-3">
        {loading && servers.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">Loading registered servers...</div>
        ) : servers.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">No custom MCP servers registered.</div>
        ) : (
          servers.map(server => {
            const isEditing = editingId === server.id;

            return (
              <div
                key={server.id}
                className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl flex flex-col md:flex-row md:items-start gap-4 justify-between"
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={server.name}
                        onChange={e => {
                          setServers(servers.map(s => s.id === server.id ? { ...s, name: e.target.value } : s));
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                      />
                    ) : (
                      <span className="text-xs font-bold text-zinc-200">{server.name}</span>
                    )}
                    <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.2 rounded-full uppercase tracking-wider">
                      {server.type}
                    </span>
                  </div>

                  {server.type === 'stdio' ? (
                    <div className="space-y-1 text-[11px] font-mono">
                      <div className="flex gap-2">
                        <span className="text-zinc-500 w-16">Command:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={server.command || ''}
                            onChange={e => {
                              setServers(servers.map(s => s.id === server.id ? { ...s, command: e.target.value } : s));
                            }}
                            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-300 w-full focus:outline-none"
                          />
                        ) : (
                          <span className="text-zinc-300 font-bold">{server.command}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className="text-zinc-500 w-16">Args:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={server.args}
                            onChange={e => {
                              setServers(servers.map(s => s.id === server.id ? { ...s, args: e.target.value } : s));
                            }}
                            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-300 w-full focus:outline-none"
                          />
                        ) : (
                          <span className="text-zinc-400 text-[10px]">{server.args}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className="text-zinc-500 w-16">Env:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={server.env}
                            onChange={e => {
                              setServers(servers.map(s => s.id === server.id ? { ...s, env: e.target.value } : s));
                            }}
                            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-300 w-full focus:outline-none"
                          />
                        ) : (
                          <span className="text-zinc-400 text-[10px] truncate max-w-md">{server.env}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 text-[11px] font-mono">
                      <span className="text-zinc-500 w-16">URL:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={server.url || ''}
                          onChange={e => {
                            setServers(servers.map(s => s.id === server.id ? { ...s, url: e.target.value } : s));
                          }}
                          className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-300 w-full focus:outline-none"
                        />
                      ) : (
                        <span className="text-zinc-300 font-bold">{server.url}</span>
                      )}
                    </div>
                  )}
                </div>

                {!isViewer && (
                  <div className="flex items-center gap-2 self-end md:self-start">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleUpdate(server.id)}
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg border border-zinc-700 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingId(server.id)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg border border-zinc-700 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(server.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
