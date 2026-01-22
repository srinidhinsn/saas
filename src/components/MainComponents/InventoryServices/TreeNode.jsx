import { ChevronDown, ChevronRight } from "lucide-react";

const TreeNode = ({
  category,
  level = 0,
  hasChildren,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`
        flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer
        transition-all border m-0.5
        ${isSelected
          ? "bg-action-primary text-white shadow-md"
          : "bg-bg-primary hover:bg-bg-tertiary border-border-default"}
      `}
      style={{ marginLeft: level * 16 }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={isSelected ? "text-white" : "text-text-secondary"}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <span className="text-sm font-medium truncate">
          {category.name}
        </span>
      </div>

      {hasChildren && (
        <span
          className={`
            text-xs px-2 py-0.5 rounded-full font-semibold
            ${isSelected
              ? "bg-white text-action-primary"
              : "bg-bg-tertiary text-text-secondary"}
          `}
        >
          {category.children.length}
        </span>
      )}
    </div>
  );
};

export default TreeNode;
