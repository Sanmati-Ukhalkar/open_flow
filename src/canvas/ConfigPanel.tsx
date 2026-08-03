import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Play, Settings, Wrench, Globe, Database, Combine, Trash2, Bot, Calendar, Package, ShieldAlert } from 'lucide-react';

interface ConfigPanelProps {
  selectedNode: Node<any> | null;
  selectedCount?: number;
  onChangeConfig: (nodeId: string, updatedConfig: any) => void;
  onRunNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteSelected?: () => void;
  workflowId?: string | null;
  awarenessUsers?: Map<number, any>;
  clientId?: number;
  setEditingNode?: (nodeId: string | null) => void;
  readOnly?: boolean;
  isBottomSheet?: boolean;
}

export const ConfigPanel = ({
  selectedNode,
  selectedCount = 0,
  onChangeConfig,
  onRunNode,
  onDeleteNode,
  onDeleteSelected,
  awarenessUsers,
  clientId,
  setEditingNode,
  readOnly = false,
  isBottomSheet = false
}: ConfigPanelProps) => {
  const [availableTools, setAvailableTools] = useState<{ name: string; description: string }[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [definitions, setDefinitions] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/node-definitions')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.nodes) {
          setDefinitions(data.nodes);
        }
      })
      .catch(err => console.error("Failed to load definitions", err));
  }, []);

  useEffect(() => {
    if (selectedNode && selectedNode.type === 'mcp-tool') {
      setLoadingTools(true);
      fetch('/api/mcp/tools')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.tools) {
            setAvailableTools(data.tools);
          }
        })
        .catch(err => console.error("Failed to fetch MCP tools", err))
        .finally(() => setLoadingTools(false));
    }
  }, [selectedNode?.id]);

  useEffect(() => {
    if (setEditingNode && !readOnly) {
      setEditingNode(selectedNode?.id || null);
    }
  }, [selectedNode?.id, setEditingNode, readOnly]);

  // Determine if this panel is locked by another user
  const lockedBy = awarenessUsers ? Array.from(awarenessUsers.entries()).find(
    ([id, state]) => id !== clientId && state.user?.editingNodeId === selectedNode?.id
  ) : null;

  const isLocked = !!lockedBy && !readOnly;
  const lockedUser = lockedBy ? lockedBy[1].user?.email : null;

  const containerClasses = isBottomSheet
    ? "w-full flex flex-col justify-between relative bg-zinc-950 p-4 h-full"
    : "w-80 border-l border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between h-full overflow-y-auto flex-shrink-0 relative hidden md:flex";

  // Multi-select summary panel
  if (!selectedNode) {
    if (selectedCount > 1) {
      return (
        <div 
          id="config-panel"
          className={containerClasses}
        >
          <div className="flex flex-col justify-center items-center text-center space-y-4 my-auto">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
              <Settings className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-200">{selectedCount} nodes selected</p>
              <p className="text-[10px] text-zinc-550 mt-1">Bulk actions apply to all selected nodes.</p>
            </div>
            {onDeleteSelected && !readOnly && (
              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-1.5 py-1.5 px-4 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {selectedCount} nodes
              </button>
            )}
            <p className="text-[9px] text-zinc-650 leading-relaxed">
              Tip: Hold <kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono">Ctrl</kbd> and click to add/remove nodes from selection.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div 
        id="config-panel"
        className={containerClasses}
      >
        <div className="flex flex-col justify-center items-center text-center text-zinc-550 my-auto">
          <Settings className="w-8 h-8 mb-2 text-zinc-650" />
          <p className="text-xs">Select a node on the canvas to configure it.</p>
        </div>
      </div>
    );
  }

  const { data, id, type } = selectedNode;
  const isRunning = data.status === 'running';

  const handleRun = () => {
    onRunNode(id);
  };

  const handleDelete = () => {
    onDeleteNode(id);
  };

  const renderFormFields = () => {
    switch (type) {
      case 'llm-prompt': {
        const config = data.config || { promptText: '', model: 'llama-3.1-8b-instant' };
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Model</label>
              <select
                value={config.model}
                onChange={(e) => onChangeConfig(id, { ...config, model: e.target.value })}
                disabled={isRunning || readOnly}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              >
                <option value="llama-3.1-8b-instant">Llama 3.1 8B (Groq - Recommended)</option>
                <option value="llama3-8b-8192">Llama 3 8B (Groq)</option>
                <option value="llama3-70b-8192">Llama 3 70B (Groq)</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B (Groq)</option>
                <option value="gemma2-9b-it">Gemma 2 9B (Groq)</option>
                <option value="gpt-4o-mini">gpt-4o-mini (OpenAI)</option>
                <option value="gpt-4o">gpt-4o (OpenAI)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Prompt Template</label>
              <textarea
                value={config.promptText}
                onChange={(e) => onChangeConfig(id, { ...config, promptText: e.target.value })}
                disabled={isRunning || readOnly}
                placeholder="e.g. Write a tagline for Open Flow..."
                rows={isBottomSheet ? 5 : 8}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-zinc-650 disabled:opacity-50 resize-none font-sans leading-relaxed"
              />
            </div>
          </div>
        );
      }

      case 'mcp-tool': {
        const config = data.config || { toolName: 'text_analyzer', inputParamName: 'text' };
        const selectedToolDescription = availableTools.find(t => t.name === config.toolName)?.description || '';
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Select Tool</label>
              {loadingTools ? (
                <div className="text-xs text-zinc-500 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-zinc-650 border-t-transparent rounded-full animate-spin" />
                  Loading tools...
                </div>
              ) : (
                <select
                  value={config.toolName}
                  onChange={(e) => onChangeConfig(id, { ...config, toolName: e.target.value })}
                  disabled={isRunning || readOnly}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 font-mono"
                >
                  {availableTools.map(tool => (
                    <option key={tool.name} value={tool.name}>
                      {tool.name}
                    </option>
                  ))}
                  {availableTools.length === 0 && (
                    <option value="text_analyzer">text_analyzer</option>
                  )}
                </select>
              )}
              {selectedToolDescription && (
                <p className="text-[10px] text-zinc-550 italic leading-normal">{selectedToolDescription}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Parameter Mapping</label>
              <input
                type="text"
                value={config.inputParamName}
                onChange={(e) => onChangeConfig(id, { ...config, inputParamName: e.target.value })}
                disabled={isRunning || readOnly}
                placeholder="text"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 font-mono"
              />
              <p className="text-[10px] text-zinc-550 leading-normal">
                Maps the upstream incoming connection string to this parameter name.
              </p>
            </div>
          </div>
        );
      }

      case 'http-webhook': {
        const config = data.config || { url: '', bodyTemplate: '{\n  "text": "{{input}}"\n}' };
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Webhook URL</label>
              <input
                type="text"
                value={config.url}
                onChange={(e) => onChangeConfig(id, { ...config, url: e.target.value })}
                disabled={isRunning || readOnly}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Body Template (JSON)</label>
              <textarea
                value={config.bodyTemplate}
                onChange={(e) => onChangeConfig(id, { ...config, bodyTemplate: e.target.value })}
                disabled={isRunning || readOnly}
                placeholder="{\n  &quot;text&quot;: &quot;{{input}}&quot;\n}"
                rows={isBottomSheet ? 5 : 8}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-zinc-650 disabled:opacity-50 resize-none font-mono leading-relaxed"
              />
              <p className="text-[10px] text-zinc-550 leading-normal">
                Replaces `{"{{input}}"}` with the string resolved from your upstream connection.
              </p>
            </div>
          </div>
        );
      }

      case 'sqlite-storage': {
        const config = data.config || { tableName: 'workflow_data', columnName: 'payload' };
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Table Name</label>
              <input
                type="text"
                value={config.tableName}
                onChange={(e) => onChangeConfig(id, { ...config, tableName: e.target.value })}
                disabled={isRunning || readOnly}
                placeholder="workflow_data"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Data Column Name</label>
              <input
                type="text"
                value={config.columnName}
                onChange={(e) => onChangeConfig(id, { ...config, columnName: e.target.value })}
                disabled={isRunning || readOnly}
                placeholder="payload"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 font-mono"
              />
              <p className="text-[10px] text-zinc-550 leading-normal">
                Appends the upstream data under this SQL column name.
              </p>
            </div>
          </div>
        );
      }

      case 'text-transform': {
        const config = data.config || { template: 'Combined text: {{llm-node-1}}' };
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Text Template</label>
              <textarea
                value={config.template}
                onChange={(e) => onChangeConfig(id, { ...config, template: e.target.value })}
                disabled={isRunning || readOnly}
                placeholder="Result: {{llm-node-1}} and {{mcp-node-1.uppercaseText}}"
                rows={isBottomSheet ? 5 : 10}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-zinc-650 disabled:opacity-50 resize-none font-mono leading-relaxed"
              />
              <p className="text-[10px] text-zinc-550 leading-normal">
                Reference parent nodes like `{"{{llm-node-1}}"}` or property indices like `{"{{mcp-node-1.uppercaseText}}"}`.
              </p>
            </div>
          </div>
        );
      }

      case 'cron-trigger': {
        const config = data.config || { cronExpression: '*/5 * * * *', cronMode: 'basic', basicType: 'minutes', basicValue: '5' };
        
        const updateBasicCron = (type: string, value: string) => {
          let expr = '*/5 * * * *';
          if (type === 'minutes') expr = `*/${value} * * * *`;
          if (type === 'hourly') expr = `0 * * * *`;
          if (type === 'daily') expr = `0 ${value} * * *`;
          
          onChangeConfig(id, { ...config, cronMode: 'basic', basicType: type, basicValue: value, cronExpression: expr });
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Schedule</label>
              <button 
                onClick={() => onChangeConfig(id, { ...config, cronMode: config.cronMode === 'advanced' ? 'basic' : 'advanced' })}
                disabled={isRunning || readOnly}
                className="text-[9px] text-purple-400 hover:text-purple-300 uppercase tracking-wider font-bold"
              >
                {config.cronMode === 'advanced' ? 'Basic UI' : 'Advanced (Raw)'}
              </button>
            </div>
            
            {config.cronMode === 'advanced' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={config.cronExpression}
                  onChange={(e) => onChangeConfig(id, { ...config, cronExpression: e.target.value })}
                  disabled={isRunning || readOnly}
                  placeholder="*/5 * * * *"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 font-mono"
                />
                <p className="text-[10px] text-zinc-550 leading-normal">
                  Standard crontab format representing execution frequency.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 uppercase tracking-wider">Frequency</label>
                  <select
                    value={config.basicType || 'minutes'}
                    onChange={(e) => updateBasicCron(e.target.value, config.basicValue || '5')}
                    disabled={isRunning || readOnly}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="minutes">Every X Minutes</option>
                    <option value="hourly">Every Hour</option>
                    <option value="daily">Daily at Hour</option>
                  </select>
                </div>
                
                {config.basicType === 'minutes' && (
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider">Minutes</label>
                    <input
                      type="number"
                      min="1" max="59"
                      value={config.basicValue || '5'}
                      onChange={(e) => updateBasicCron('minutes', e.target.value)}
                      disabled={isRunning || readOnly}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                )}
                
                {config.basicType === 'daily' && (
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider">Hour (0-23)</label>
                    <input
                      type="number"
                      min="0" max="23"
                      value={config.basicValue || '9'}
                      onChange={(e) => updateBasicCron('daily', e.target.value)}
                      disabled={isRunning || readOnly}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      default: {
        // Fallback for custom community nodes using dynamic form fields
        const schema = definitions.find(d => d.id === type);
        const fields = schema?.configFields || [];

        return (
          <div className="space-y-4">
            <div className="p-3 border border-zinc-800 rounded-xl bg-orange-500/5 text-orange-400 text-[10px] space-y-1">
              <p>
                <b>Third-Party Node Warning:</b> This node executes code directly on your host machine. Make sure you trust this code before running.
              </p>
            </div>
            
            {fields.map((f: any) => {
              const isFileField = f.name.toLowerCase().includes('image') || f.name.toLowerCase().includes('file');
              return (
                <div key={f.name} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      {f.displayName}
                    </label>
                    {isFileField && (
                      <label className="text-[9px] text-purple-400 hover:text-purple-350 cursor-pointer font-semibold uppercase tracking-wider select-none">
                        Upload File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                onChangeConfig(id, { ...(data.config || {}), [f.name]: base64 });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <input
                    type="text"
                    value={data.config?.[f.name] ?? f.defaultValue ?? ''}
                    onChange={(e) => onChangeConfig(id, { ...(data.config || {}), [f.name]: e.target.value })}
                    disabled={isRunning || readOnly}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                  />
                </div>
              );
            })}
          </div>
        );
      }
    }
  };

  const getHeaderDetails = () => {
    switch (type) {
      case 'llm-prompt':
        return { label: 'LLM Prompt', icon: Bot, color: 'text-purple-400' };
      case 'mcp-tool':
        return { label: 'MCP Tool', icon: Wrench, color: 'text-blue-400' };
      case 'http-webhook':
        return { label: 'HTTP Webhook', icon: Globe, color: 'text-rose-400' };
      case 'sqlite-storage':
        return { label: 'SQLite Storage', icon: Database, color: 'text-emerald-400' };
      case 'text-transform':
        return { label: 'Text Transform', icon: Combine, color: 'text-yellow-400' };
      case 'cron-trigger':
        return { label: 'Cron Trigger', icon: Calendar, color: 'text-purple-300' };
      case 'webhook-trigger':
        return { label: 'Webhook Trigger', icon: Globe, color: 'text-blue-300' };
      default:
        return { label: 'Community Node', icon: Package, color: 'text-orange-400' };
    }
  };

  const header = getHeaderDetails();
  const HeaderIcon = header.icon;

  return (
    <div 
      id="config-panel"
      className={containerClasses}
    >
      {isLocked && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200 mb-1">Node Locked</h3>
          <p className="text-xs text-zinc-400">
            Currently being edited by<br/>
            <strong className="text-zinc-200">{lockedUser}</strong>
          </p>
        </div>
      )}
      <div className="space-y-5 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <HeaderIcon className={`w-4 h-4 ${header.color} flex-shrink-0`} />
              <span className="truncate max-w-[160px]" title={data.label || header.label}>
                {data.label || header.label}
              </span>
            </h2>
            <p className="text-[10px] text-zinc-550 mt-1 font-mono">ID: {id}</p>
          </div>

          {!readOnly && (
            <button
              onClick={handleDelete}
              title="Delete Node"
              className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-900 text-zinc-550 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all duration-150"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Output Node Switch */}
        <div className="flex items-center justify-between p-3 border border-zinc-850 bg-zinc-900/20 rounded-xl">
          <div>
            <h4 className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">Workflow Output</h4>
            <span className="text-[9px] text-zinc-550 block">Include in deployment response</span>
          </div>
          <input
            type="checkbox"
            checked={!!data.isOutputNode}
            onChange={() => onChangeConfig(id, { ...(data.config || {}), isOutputNode: !data.isOutputNode })}
            disabled={readOnly}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-zinc-800 bg-zinc-900 accent-purple-500 cursor-pointer disabled:opacity-50"
          />
        </div>

        {/* Dynamic form field section */}
        {renderFormFields()}
      </div>

      {!readOnly && (
        <div className="mt-6 pt-4 border-t border-zinc-850 flex-shrink-0">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold text-xs transition-all duration-200 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/15 disabled:bg-zinc-900 disabled:text-zinc-500 disabled:border disabled:border-zinc-850 disabled:shadow-none hover:scale-[1.01] active:scale-[0.99]"
          >
            {isRunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Running Workflow...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run Workflow
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ConfigPanel;
