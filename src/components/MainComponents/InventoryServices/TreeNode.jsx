import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const TreeNode = ({ category, isExpanded, onToggle, isSelected, onSelect, hasChildren, level = 0 }) => {
  const [hover, setHover] = useState(false);


  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all  text-text-primary 
       ${isSelected ? "bg-action-primary" : "bg-bg-primary"}`}

      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="focus:outline-none"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
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

      </div>
    </div>
  );
};

export default TreeNode;