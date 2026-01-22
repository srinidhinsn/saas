import { useState } from "react";
import { ChevronDown, ChevronRight, Edit, Trash2, GripVertical } from 'lucide-react';

const MenuTreeNode = ({
  category,
  level = 0,
  isExpanded,
  hasChildren,
  isSelected,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  dragOverPosition,
}) => {
  const [hovered, setHovered] = useState(false);
  const canEdit = category.id !== "dietery" && category.name !== "All Categories";
  const showCount = hasChildren;

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      draggable={canEdit} onDragStart={(e) => canEdit && onDragStart(e, category)} onDragOver={(e) => onDragOver(e, category)}
      onDrop={(e) => onDrop(e, category)} onDragEnd={onDragEnd}>

      {/* Drop Indicator - Above */}
      {dragOverPosition === 'above' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-action-primary z-10" />
      )}

      <div role="button" tabIndex={0} onClick={onSelect} onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer select-none transition-all group
          ${isDragging ? 'opacity-50 bg-blue-100' : ''}
          ${isSelected
            ? "bg-action-primary text-white shadow-md"
            : "bg-bg-primary hover:bg-bg-tertiary border m-0.5 border-border-default"}`} style={{ marginLeft: `${level * 16}px` }}>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          {canEdit && (
            <div className={`flex-shrink-0 cursor-grab active:cursor-grabbing ${isSelected ? "text-white" : "text-text-secondary"}`}>
              <GripVertical size={16} />
            </div>
          )}

          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={`flex-shrink-0 ${isSelected ? "text-white" : "text-text-secondary"}`}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          <span className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-text-primary"}`}>
            {category.name}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showCount && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isSelected ? "bg-white text-action-primary" : "bg-bg-tertiary text-text-secondary"
                }`}
            >
              {category.count}
            </span>
          )}

          {canEdit && hovered && !isSelected && (
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(category);
                }}
                className="p-1 rounded hover:bg-action-primary hover:text-white transition-colors"
              >
                <Edit size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(category);
                }}
                className="p-1 rounded hover:bg-action-danger hover:text-white transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drop Indicator - Below */}
      {dragOverPosition === 'below' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-action-primary z-10" />
      )}

      {/* Drop Indicator - Inside (for nesting) */}
      {dragOverPosition === 'inside' && (
        <div className="absolute inset-0 border-2 border-dashed border-action-primary rounded-lg bg-action-primary bg-opacity-10 z-10" />
      )}
    </div>
  );
};

export default MenuTreeNode;