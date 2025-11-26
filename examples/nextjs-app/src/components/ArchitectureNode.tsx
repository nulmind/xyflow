'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import { NodeKind } from '@/lib/types';

// Colors for different node kinds
const kindColors: Record<NodeKind, { bg: string; border: string; badge: string }> = {
  service: { bg: 'bg-blue-50', border: 'border-blue-400', badge: 'bg-blue-500' },
  class: { bg: 'bg-purple-50', border: 'border-purple-400', badge: 'bg-purple-500' },
  module: { bg: 'bg-green-50', border: 'border-green-400', badge: 'bg-green-500' },
  api: { bg: 'bg-orange-50', border: 'border-orange-400', badge: 'bg-orange-500' },
  queue: { bg: 'bg-yellow-50', border: 'border-yellow-400', badge: 'bg-yellow-600' },
  db: { bg: 'bg-red-50', border: 'border-red-400', badge: 'bg-red-500' },
};

// Icons for different node kinds (simple text-based)
const kindIcons: Record<NodeKind, string> = {
  service: '⚙️',
  class: '📦',
  module: '📁',
  api: '🌐',
  queue: '📬',
  db: '🗄️',
};

export interface ArchitectureNodeData extends Record<string, unknown> {
  label: string;
  kind: NodeKind;
  summary?: string;
  methods?: string[];
  fields?: string[];
  filePath?: string;
  onLabelChange?: (id: string, newLabel: string) => void;
}

export type ArchitectureNode = Node<ArchitectureNodeData, 'architecture'>;

interface ArchitectureNodeProps {
  id: string;
  data: ArchitectureNodeData;
  selected?: boolean;
}

function ArchitectureNode({ id, data, selected }: ArchitectureNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);

  const colors = kindColors[data.kind] || kindColors.service;

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditValue(data.label);
  }, [data.label]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue !== data.label && data.onLabelChange) {
      data.onLabelChange(id, editValue);
    }
  }, [id, editValue, data]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setIsEditing(false);
        if (editValue !== data.label && data.onLabelChange) {
          data.onLabelChange(id, editValue);
        }
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditValue(data.label);
      }
    },
    [id, editValue, data]
  );

  return (
    <div
      className={`
        px-4 py-3 min-w-[180px] max-w-[280px]
        rounded-lg shadow-md border-2
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        transition-all duration-150
      `}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />

      {/* Header with kind badge */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`
            text-xs font-medium text-white px-2 py-0.5 rounded-full
            ${colors.badge}
          `}
        >
          {kindIcons[data.kind]} {data.kind}
        </span>
      </div>

      {/* Label (editable on double-click) */}
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="
            w-full px-2 py-1 text-sm font-semibold
            border border-gray-300 rounded
            focus:outline-none focus:ring-2 focus:ring-blue-500
            bg-white
          "
        />
      ) : (
        <div
          className="font-semibold text-gray-800 cursor-text"
          onDoubleClick={handleDoubleClick}
          title="Double-click to edit"
        >
          {data.label}
        </div>
      )}

      {/* Summary (if present) */}
      {data.summary && (
        <div className="mt-2 text-xs text-gray-600 line-clamp-2">{data.summary}</div>
      )}

      {/* Methods preview (if present) */}
      {data.methods && data.methods.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          <span className="font-medium">Methods:</span>{' '}
          {data.methods.slice(0, 3).join(', ')}
          {data.methods.length > 3 && '...'}
        </div>
      )}

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />
    </div>
  );
}

export default memo(ArchitectureNode);
