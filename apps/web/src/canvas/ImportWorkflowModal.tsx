import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { exportWorkflowBundle, validateWorkflowBundle } from '@open-flow/engine';

interface ImportWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (name: string, nodes: any[], edges: any[]) => void;
}

export const ImportWorkflowModal: React.FC<ImportWorkflowModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [bundleData, setBundleData] = useState<any | null>(null);
  const [workflowName, setWorkflowName] = useState<string>('');
  const [secretBindings, setSecretBindings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validation = validateWorkflowBundle(parsed);

        if (!validation.valid) {
          setError(validation.error || 'Invalid workflow bundle format');
          return;
        }

        setError(null);
        setFileContent(text);
        setBundleData(parsed);
        setWorkflowName(parsed.name || file.name.replace('.json', ''));

        // Initialize secret placeholders
        const placeholders: string[] = parsed.secretPlaceholders || [];
        const initialBindings: Record<string, string> = {};
        placeholders.forEach((p) => {
          initialBindings[p] = '';
        });
        setSecretBindings(initialBindings);
      } catch (err: any) {
        setError('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!bundleData) return;

    // Apply secret bindings to node configs
    const nodes = JSON.parse(JSON.stringify(bundleData.graph.nodes || []));
    for (const node of nodes) {
      if (node.data?.config) {
        for (const [key, val] of Object.entries(node.data.config)) {
          if (typeof val === 'string' && val in secretBindings) {
            node.data.config[key] = secretBindings[val] || val;
          }
        }
      }
    }

    onImport(workflowName || 'Imported Workflow', nodes, bundleData.graph.edges || []);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            Import Workflow Bundle
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="my-4 space-y-4">
          {!bundleData ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-lg p-8 cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-all">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm text-slate-300 font-medium">Click to select workflow JSON file</span>
              <span className="text-xs text-slate-500 mt-1">.json bundle exported from OpenFlow</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-800 p-3 rounded-lg flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="text-sm font-medium">{bundleData.name || 'Untitled Workflow'}</div>
                  <div className="text-xs text-slate-400">
                    {bundleData.graph?.nodes?.length || 0} nodes, {bundleData.graph?.edges?.length || 0} edges
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Workflow Name</label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {Object.keys(secretBindings).length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Credential Mapping Required
                  </div>
                  {Object.keys(secretBindings).map((placeholder) => (
                    <div key={placeholder} className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/50">
                      <label className="text-xs font-mono text-indigo-300 block mb-1">{placeholder}</label>
                      <input
                        type="password"
                        placeholder="Enter secret / API key value..."
                        value={secretBindings[placeholder]}
                        onChange={(e) => setSecretBindings({ ...secretBindings, [placeholder]: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-950/50 border border-red-800/80 text-red-300 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg">
            Cancel
          </button>
          {bundleData && (
            <button
              onClick={handleConfirmImport}
              className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
            >
              <CheckCircle className="w-4 h-4" />
              Import Workflow
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
