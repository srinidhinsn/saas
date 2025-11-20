import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const TreeNode = ({ category, isExpanded, onToggle, isSelected, onSelect, hasChildren, level = 0 }) => {
  const [hover, setHover] = useState(false);

  const paddingLeft = `${level * 1.5 + 0.75}rem`;
  const backgroundColor = isSelected
    ? 'var(--color-action-primary)'
    : hover
      ? 'var(--color-bg-hover)'
      : 'transparent';
  const textColor = isSelected ? 'var(--color-text-white)' : 'var(--color-text-primary)';
  const badgeBg = isSelected ? 'var(--color-bg-primary)' : 'var(--color-primary-50)';
  const badgeText = isSelected ? 'var(--color-action-primary)' : 'var(--color-action-primary)';

  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
        style={{
          paddingLeft,
          backgroundColor,
          color: textColor,
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="focus:outline-none"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            style={{ color: 'inherit' }}
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : (
          <span className="w-[18px]" />
        )}

        <span className="flex-1" style={{ color: textColor }}>
          {category.name}
        </span>

        {typeof category.count !== 'undefined' && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: badgeBg,
              color: badgeText,
            }}
          >
            {category.count}
          </span>
        )}
      </div>
    </div>
  );
};

export default TreeNode;
 