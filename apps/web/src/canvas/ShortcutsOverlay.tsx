import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsOverlayProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], description: 'Undo last action' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Ctrl', 'Y'], description: 'Redo (alternate)' },
  { keys: ['Delete', 'Backspace'], description: 'Delete selected node(s) / edge(s)' },
  { keys: ['Ctrl', 'C'], description: 'Copy selected node(s)' },
  { keys: ['Ctrl', 'V'], description: 'Paste copied node(s)' },
  { keys: ['Ctrl', 'D'], description: 'Duplicate selected node(s)' },
  { keys: ['Ctrl', 'A'], description: 'Select all nodes' },
  { keys: ['Ctrl', 'S'], description: 'Save workflow' },
  { keys: ['Ctrl', 'Enter'], description: 'Run workflow' },
  { keys: ['Ctrl', '0'], description: 'Fit view / reset zoom' },
  { keys: ['Esc'], description: 'Deselect all / close panels' },
  { keys: ['?'], description: 'Open this shortcut reference' },
  { keys: ['Shift', 'Drag'], description: 'Marquee / box select nodes' },
  { keys: ['Ctrl', 'Click'], description: 'Add/remove node from selection' },
  { keys: ['↑ ↓ ← →'], description: 'Nudge selected node ±1px' },
  { keys: ['Shift', '↑ ↓ ← →'], description: 'Nudge selected node ±10px' },
  { keys: ['+', '-'], description: 'Zoom in / out' },
];

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
const MOD = isMac ? '⌘' : 'Ctrl';

function formatKey(key: string) {
  return key === 'Ctrl' ? MOD : key;
}

export const ShortcutsOverlay = ({ onClose }: ShortcutsOverlayProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-zinc-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut List */}
        <div className="overflow-y-auto max-h-[70vh] p-4 space-y-1">
          {SHORTCUTS.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-900/60 transition-colors group"
            >
              <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                {s.description}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                {s.keys.map((k, ki) => (
                  <span key={ki} className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-md shadow-sm">
                      {formatKey(k)}
                    </kbd>
                    {ki < s.keys.length - 1 && (
                      <span className="text-[9px] text-zinc-600">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-zinc-800 px-6 py-3 text-[10px] text-zinc-600 flex items-center gap-2">
          <span>Shortcuts are disabled when focus is inside a text field.</span>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsOverlay;
