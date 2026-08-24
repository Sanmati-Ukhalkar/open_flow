import React, { useState } from 'react';
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow';

export const CustomDataEdge: React.FC<EdgeProps> = ({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  // Extract actual data payload flowing from source output if available
  const payload = data?.payload !== undefined ? data?.payload : data?.sourceOutput;
  const status = data?.status || 'idle';
  const hasPayload = payload !== undefined && payload !== null;

  // Determine line style and stroke based on status & hover state
  let strokeColor = style.stroke || 'var(--border-strong)';
  let strokeWidth = isHovered ? 3.5 : (style.strokeWidth as number) || 2;

  if (status === 'running') {
    strokeColor = 'var(--status-running-text)';
  } else if (status === 'success') {
    strokeColor = 'var(--status-success-text)';
  } else if (status === 'success-with-warning') {
    strokeColor = 'var(--status-warning-text)';
  } else if (status === 'error') {
    strokeColor = 'var(--status-error-text)';
  } else if (status === 'skipped') {
    strokeColor = 'var(--status-skipped-text)';
  }

  // Format payload for tooltip display
  const formatPayloadPreview = (raw: any): string => {
    if (raw === undefined || raw === null) return 'No output payload';
    if (typeof raw === 'string') return raw.length > 80 ? `${raw.slice(0, 80)}...` : raw;
    if (typeof raw === 'object') {
      try {
        const json = JSON.stringify(raw);
        return json.length > 90 ? `${json.slice(0, 90)}...` : json;
      } catch {
        return String(raw);
      }
    }
    return String(raw);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isHovered ? 'var(--accent-primary)' : strokeColor,
          strokeWidth,
          transition: 'stroke 150ms ease, stroke-width 150ms ease',
          cursor: 'pointer',
        }}
      />

      {/* Invisible wider interaction path for easy hover targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="cursor-pointer"
      />

      {/* Floating Hover Payload Tooltip */}
      <EdgeLabelRenderer>
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 8}px)`,
              pointerEvents: 'all',
            }}
            className="z-50 shadow-xl rounded-lg border border-zinc-700 bg-zinc-950/95 text-zinc-200 px-3 py-2 text-[11px] font-mono max-w-[280px] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-1 mb-1 text-[9px] uppercase tracking-wider font-sans text-zinc-400">
              <span className="flex items-center gap-1 font-bold text-indigo-400">
                <span>⚡</span> Edge Data Stream
              </span>
              <span className="font-mono text-zinc-500">source: {source}</span>
            </div>

            <div className="text-zinc-300 break-words font-mono text-[10px] leading-relaxed">
              {formatPayloadPreview(payload)}
            </div>

            {hasPayload && (
              <div className="mt-1 text-[8px] text-emerald-400 font-sans font-semibold">
                ✓ Data payload available
              </div>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomDataEdge;
