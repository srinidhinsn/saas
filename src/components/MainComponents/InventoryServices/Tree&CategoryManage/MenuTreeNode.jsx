import { useState } from "react";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";
import { RiArrowDropRightLine } from "react-icons/ri";
import { Edit, Trash2 } from 'lucide-react';

const MenuTreeNode = ({
  category,
  isExpanded,
  onToggle,
  isSelected,
  onSelect,
  hasChildren,
  level,
  onEdit,
  onDelete
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-text-primary 
       ${isSelected ? "bg-action-primary text-text-white" : "bg-bg-primary"} hover:bg-bg-secondary group`}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="focus:outline-none text-text-white hover:text-action-primary transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ?
              <MdOutlineKeyboardArrowDown size={18} /> :
              <RiArrowDropRightLine size={18} />
            }
          </button>
        ) : (
          <span className="w-[18px]" />
        )}

        <span className={`flex-1 text-sm ${isSelected ? "text-text-white" : "text-text-primary"}`}>
          {category.name}
        </span>
        {category.children && category.children.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-bg-tertiary text-text-primary">
            {category.children.length}
          </span>
        )}

        {/* Action buttons - only show on hover and if callbacks are provided, but hide for "All Categories" */}
        {(onEdit || onDelete) && category.id !== 'dietery' && category.name !== 'All Categories' && (
          <div className={`flex gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(category);
                }}
                className="p-1 hover:bg-action-primary hover:text-white text-text-secondary rounded transition-colors"
                title="Edit category"
              >
                <Edit size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(category);
                }}
                className="p-1 hover:bg-action-danger hover:text-white text-text-secondary rounded transition-colors"
                title="Delete category"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuTreeNode;
