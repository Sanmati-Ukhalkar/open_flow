import React from 'react';
import { Handle, Position } from 'reactflow';

interface NodeHandleProps {
  type: 'target' | 'source';
  position: Position;
  id?: string;
  dataType?: 'string' | 'object' | 'number' | 'array' | 'trigger';
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

const TYPE_BADGES: Record<string, { icon: string; title: string }> = {
  string: { icon: 'Aa', title: 'String Content' },
  object: { icon: '{}', title: 'Object / JSON Payload' },
  number: { icon: '#', title: 'Numeric Value' },
  array: { icon: '[]', title: 'Array / List' },
  trigger: { icon: '⚡', title: 'Trigger Action Signal' },
};

export const NodeHandle: React.FC<NodeHandleProps> = ({
  type,
  position,
  id,
  dataType = 'object',
  label,
  className = '',
  style = {},
  title,
}) => {
  const badgeInfo = TYPE_BADGES[dataType] || TYPE_BADGES.object;
  const isLeft = position === Position.Left;

  return (
    <div className={`relative flex items-center group ${isLeft ? 'flex-row-reverse' : 'flex-row'}`}>
      <Handle
        type={type}
        position={position}
        id={id}
        title={title || `${type === 'target' ? 'Input' : 'Output'} (${badgeInfo.title})`}
        style={style}
        className={`!w-3 !h-3 !bg-zinc-800 !border-2 !border-zinc-500 hover:!border-indigo-400 transition-all ${className}`}
      />
      {/* Persistent Handle Type Badge Label */}
      <span
        className={`pointer-events-none text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-zinc-900/90 text-zinc-400 border border-zinc-800/80 shadow-xs flex items-center gap-0.5 select-none ${
          isLeft ? 'mr-1.5' : 'ml-1.5'
        }`}
        title={title || `${type === 'target' ? 'Input' : 'Output'} (${badgeInfo.title})`}
      >
        <span className="text-indigo-400 font-sans">{badgeInfo.icon}</span>
        {label && <span className="opacity-75 uppercase tracking-tighter">{label}</span>}
      </span>
    </div>
  );
};

export default NodeHandle;
