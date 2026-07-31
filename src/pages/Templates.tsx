import { useState, useEffect } from 'react';
import { LayoutTemplate, Filter, FolderPlus, ShieldAlert } from 'lucide-react';
import TemplateCloneModal from '../components/TemplateCloneModal';

interface TemplatesProps {
  token: string;
  onSelectWorkflow: (workflowId: string) => void;
}

export const Templates = ({ token, onSelectWorkflow }: TemplatesProps) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/templates', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setTemplates(data.templates);
        } else {
          setErrorMsg(data.error?.message || 'Failed to fetch templates.');
        }
      } catch (err) {
        setErrorMsg('Failed to connect to backend.');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [token]);

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))];
  const filteredTemplates = selectedCategory === 'All' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const handleClone = async (templateId: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}/clone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedTemplate(null);
        // Automatically navigate to the cloned workflow
        onSelectWorkflow(data.workflowId);
      } else {
        alert(data.error?.message || 'Failed to clone template.');
      }
    } catch (err) {
      alert('Failed to connect to backend.');
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-purple-400" />
            Template Gallery
          </h2>
          <p className="text-[10px] text-zinc-500 mt-1">Start from a working blueprint instead of a blank canvas.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="text-[11px] text-rose-350 bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-lg mb-6">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500 py-16 text-center flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-zinc-650 border-t-transparent rounded-full animate-spin" />
          <span>Loading templates...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
            <Filter className="w-3 h-3 text-zinc-600 ml-1 mr-2" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-zinc-900/40 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map(template => {
              let reqCreds: string[] = [];
              try {
                reqCreds = JSON.parse(template.required_credentials || '[]');
              } catch {}

              return (
                <div
                  key={template.id}
                  className="p-5 border border-zinc-800 bg-zinc-950/40 backdrop-blur-md rounded-2xl flex flex-col justify-between h-56 relative group"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        {template.category || 'General'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-100 line-clamp-1">{template.name}</h3>
                    <p className="text-[10px] text-zinc-400 line-clamp-3 leading-relaxed">
                      {template.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {reqCreds.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] text-zinc-600 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Requires:
                        </span>
                        {reqCreds.map(cap => (
                          <span key={cap} className="text-[8px] font-mono text-orange-300 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                            {cap}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <button
                      onClick={() => setSelectedTemplate(template)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-purple-600 hover:border-purple-500 hover:text-white transition-all duration-200 text-xs font-bold group-hover:shadow-lg group-hover:shadow-purple-900/20"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Use Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedTemplate && (
        <TemplateCloneModal
          template={selectedTemplate}
          token={token}
          onClose={() => setSelectedTemplate(null)}
          onClone={handleClone}
        />
      )}
    </div>
  );
};

export default Templates;
