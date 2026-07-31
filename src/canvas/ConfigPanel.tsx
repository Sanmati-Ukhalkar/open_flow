import React from 'react';
import { Node } from 'reactflow';
import { Play, Settings } from 'lucide-react';
import { LLMPromptNodeData } from './LLMPromptNode';

interface ConfigPanelProps {
  selectedNode: Node<LLMPromptNodeData> | null;
  onChangeConfig: (nodeId: string, updatedConfig: LLMPromptNodeData['config']) => void;
  onRunNode: (nodeId: string) => void;
}

export const ConfigPanel = ({ selectedNode, onChangeConfig, onRunNode }: ConfigPanelProps) => {
  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-zinc-800 bg-zinc-950/70 p-6 flex flex-col justify-center items-center text-center text-zinc-500">
        <Settings className="w-8 h-8 mb-2 text-zinc-650" />
        <p className="text-xs">Select a node on the canvas to configure it.</p>
      </div>
    );
  }

  const { data, id } = selectedNode;
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

  const handleRun = () => {
    onRunNode(id);
  };

  const isRunning = data.status === 'running';

  return (
    <div className="w-80 border-l border-zinc-800 bg-zinc-950/50 backdrop-blur-md p-6 flex flex-col justify-between h-full overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-400" />
            Configure Node
          </h2>
          <p className="text-[10px] text-zinc-500 mt-1 font-mono">ID: {id}</p>
        </div>

        {/* Model Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 block">OpenAI Model</label>
          <select
            value={config.model}
            onChange={handleModelChange}
            disabled={isRunning}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
          >
            <option value="gpt-4o-mini">gpt-4o-mini (Recommended)</option>
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          </select>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 block">Prompt Template</label>
          <textarea
            value={config.promptText}
            onChange={handlePromptChange}
            disabled={isRunning}
            placeholder="e.g. Write a tagline for an open-source visual automation tool..."
            rows={10}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-zinc-655 disabled:opacity-50 resize-none font-sans leading-relaxed"
          />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-850">
        <button
          onClick={handleRun}
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
              Run Workflow
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
