import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { StickyNote } from 'lucide-react';

export interface StickyNoteNodeData {
  label?: string;
  config?: {
    noteTitle?: string;
    noteText?: string;
    colorTheme?: 'yellow' | 'sky' | 'emerald' | 'rose' | 'paper';
  };
}

const COLOR_MAP = {
  yellow: 'bg-amber-100 border-amber-300 text-amber-950',
  sky: 'bg-sky-100 border-sky-300 text-sky-950',
  emerald: 'bg-emerald-100 border-emerald-300 text-emerald-950',
  rose: 'bg-rose-100 border-rose-300 text-rose-950',
  paper: 'bg-zinc-200 border-zinc-300 text-zinc-900',
};

export const StickyNoteNode = memo(({ data, selected }: { data: StickyNoteNodeData; selected: boolean }) => {
  const theme = data.config?.colorTheme || 'yellow';
  const colorClass = COLOR_MAP[theme] || COLOR_MAP.yellow;
  const title = data.config?.noteTitle || data.label || 'Note';
  const content = data.config?.noteText || 'Double click to edit note content...';

  return (
    <div
      className={`w-64 p-3.5 rounded-xl border-2 shadow-sm transition-all duration-200 ${colorClass} ${
        selected ? 'ring-2 ring-sky-500 shadow-md' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 font-bold text-xs mb-2 border-b border-black/10 pb-1.5 select-none">
        <StickyNote className="w-3.5 h-3.5 opacity-70" />
        <span className="truncate">{title}</span>
      </div>
      <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans opacity-90 break-words">
        {content}
      </p>

      {/* Optional pass-through handles */}
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-zinc-400 opacity-30" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-zinc-400 opacity-30" />
    </div>
  );
});

StickyNoteNode.displayName = 'StickyNoteNode';
export default StickyNoteNode;
