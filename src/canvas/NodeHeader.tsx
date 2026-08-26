import React, { useState, useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import { Loader2, CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { getNodeCategory } from './categoryUtils';

interface NodeHeaderProps {
  id: string;
  label?: string;
  defaultLabel: string;
  icon: React.ComponentType<any>;
  status: 'idle' | 'running' | 'success' | 'success-with-warning' | 'error' | 'skipped';
  nodeType?: string;
}

export const NodeHeader = ({ id, label, defaultLabel, icon: Icon, status, nodeType }: NodeHeaderProps) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label || defaultLabel);
  const inputRef = useRef<HTMLInputElement>(null);

  const category = getNodeCategory(nodeType || id.split('-')[0]);

  // Sync editValue when label from external sync/undo changes
  useEffect(() => {
    setEditValue(label || defaultLabel);
  }, [label, defaultLabel]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(label || defaultLabel);
    setIsEditing(true);
  };

  const handleCommit = () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== (label || defaultLabel)) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                label: trimmed,
              },
            };
          }
          return node;
        })
      );
    } else {
      setEditValue(label || defaultLabel);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(label || defaultLabel);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3 select-none">
      <div 
        className="flex items-center gap-2 flex-1 min-w-0 h-7" 
        onDoubleClick={handleStartEdit}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${category.iconColor}`} />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            className="nodrag nowheel font-semibold text-sm text-zinc-100 bg-zinc-900 border border-sky-500 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <span 
              className="font-semibold text-sm text-zinc-100 truncate cursor-text" 
              title="Double click to rename"
            >
              {label || defaultLabel}
            </span>
            {/* Category Tag Badge */}
            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border select-none ${category.badgeClass}`}>
              {category.badge}
            </span>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="flex items-center flex-shrink-0 ml-2">
        {status === 'running' && (
          <Loader2 className="w-4 h-4 animate-spin text-status-running" />
        )}
        {status === 'success' && (
          <CheckCircle2 className="w-4 h-4 text-status-success" />
        )}
        {status === 'success-with-warning' && (
          <AlertTriangle className="w-4 h-4 text-status-warning" />
        )}
        {status === 'error' && (
          <AlertCircle className="w-4 h-4 text-status-error" />
        )}
        {status === 'skipped' && (
          <XCircle className="w-4 h-4 text-zinc-600" />
        )}
        {status === 'idle' && (
          <div className="w-2 h-2 rounded-full bg-zinc-600" />
        )}
      </div>
    </div>
  );
};

export default NodeHeader;
