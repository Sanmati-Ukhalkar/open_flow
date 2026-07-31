import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Play, Settings, Wrench } from 'lucide-react';


interface ConfigPanelProps {
  selectedNode: Node<any> | null;
  onChangeConfig: (nodeId: string, updatedConfig: any) => void;
  onRunNode: (nodeId: string) => void;
}

export const ConfigPanel = ({ selectedNode, onChangeConfig, onRunNode }: ConfigPanelProps) => {
  const [availableTools, setAvailableTools] = useState<{ name: string; description: string }[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

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

  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-zinc-800 bg-zinc-950/70 p-6 flex flex-col justify-center items-center text-center text-zinc-500 flex-shrink-0">
        <Settings className="w-8 h-8 mb-2 text-zinc-650" />
        <p className="text-xs">Select a node on the canvas to configure it.</p>
      </div>
    );
  }

  const { data, id, type } = selectedNode;
  const isRunning = data.status === 'running';

  // Render LLM Prompt config
  if (type === 'llm-prompt') {
    const config = data.config || { promptText: '', model: 'gpt-4o-mini' };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChangeConfig(id, {
        ...config,
        promptText: e.target.value,
      });
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChangeConfig(id, {
        ...config,
        model: e.target.value,
      });
    };

    return (
      <div className="w-80 border-l border-zinc-800 bg-zinc-950/50 backdrop-blur-md p-6 flex flex-col justify-between h-full overflow-y-auto flex-shrink-0">
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" />
              Configure LLM Prompt
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">ID: {id}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 block">OpenAI / Groq Model</label>
            <select
              value={config.model}
              onChange={handleModelChange}
              disabled={isRunning}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
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
            <label className="text-xs font-medium text-zinc-400 block">Prompt Template</label>
            <textarea
              value={config.promptText}
              onChange={handlePromptChange}
              disabled={isRunning}
              placeholder="e.g. Write a tagline for an open-source visual automation tool..."
              rows={10}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-zinc-650 disabled:opacity-50 resize-none font-sans leading-relaxed"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-850">
          <button
            onClick={() => onRunNode(id)}
            disabled={isRunning || !config.promptText}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold text-xs transition-all duration-200 ${
              isRunning
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 cursor-not-allowed'
                : !config.promptText
                ? 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-850'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/15 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isRunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run Node
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Render MCP Tool config
  if (type === 'mcp-tool') {
    const config = data.config || { toolName: 'text_analyzer', inputParamName: 'text' };

    const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChangeConfig(id, {
        ...config,
        toolName: e.target.value,
      });
    };

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChangeConfig(id, {
        ...config,
        inputParamName: e.target.value,
      });
    };

    const selectedToolDescription = availableTools.find(t => t.name === config.toolName)?.description || '';

    return (
      <div className="w-80 border-l border-zinc-800 bg-zinc-950/50 backdrop-blur-md p-6 flex flex-col justify-between h-full overflow-y-auto flex-shrink-0">
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-purple-400" />
              Configure MCP Tool
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">ID: {id}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 block">Select MCP Tool</label>
            {loadingTools ? (
              <div className="text-xs text-zinc-500 py-2 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-zinc-655 border-t-transparent rounded-full animate-spin" />
                Loading available tools...
              </div>
            ) : (
              <select
                value={config.toolName}
                onChange={handleToolChange}
                disabled={isRunning}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 font-mono"
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
              <p className="text-[10px] text-zinc-500 italic mt-1 leading-normal">
                {selectedToolDescription}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 block">Map Input to Parameter</label>
            <input
              type="text"
              value={config.inputParamName}
              onChange={handleParamChange}
              disabled={isRunning}
              placeholder="e.g. text"
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 font-mono"
            />
            <p className="text-[10px] text-zinc-500 leading-normal">
              Specifies which tool parameter the upstream node's data should map to.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-850">
          <button
            onClick={() => onRunNode(id)}
            disabled={isRunning || !config.toolName}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold text-xs transition-all duration-200 ${
              isRunning
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/15 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isRunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run Node
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ConfigPanel;
