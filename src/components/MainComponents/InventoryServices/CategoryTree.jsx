import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight } from 'lucide-react';

// ── Single tree node (read-only, no drag/edit/delete) ──────────────────────
const OrderTreeNode = ({ category, level = 0, isExpanded, hasChildren, isSelected, onToggle, onSelect }) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer
        select-none transition-all border m-0.5
        ${isSelected
          ? "bg-action-primary text-white shadow-md"
          : "bg-bg-primary hover:bg-bg-tertiary border-border-default"}`}
      style={{ marginLeft: `${level * 16}px` }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
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
    </div>
  );
};

// ── Main CategoryTree (orders) ─────────────────────────────────────────────
const CategoryTree = ({
  categories = [],
  selectedCategoryId,
  onSelectCategory,
  dietaryOptions = [],
  dietaryColorMap = {},
  selectedDietary,
  onSelectDietary,
}) => {
  const [expandedCategories, setExpandedCategories] = useState([]);


useEffect(() => {
  if (!categories.length) return;
  setExpandedCategories(categories.map(c => c.id));
  // Select the root node (All Categories) if nothing is selected yet
  if (!selectedCategoryId) {
    const rootNode = categories.find(
      c => c.name?.toLowerCase() === 'all categories' || c.isVirtualRoot
    );
    if (rootNode) onSelectCategory(rootNode.id);
  }
}, [categories]);

  // Auto-expand parents when selection changes
  useEffect(() => {
    if (!selectedCategoryId || !categories.length) return;
    const findPath = (nodes, targetId, path = []) => {
      for (const node of nodes) {
        const newPath = [...path, node.id];
        if (node.id === targetId) return newPath;
        if (node.children?.length) {
          const found = findPath(node.children, targetId, newPath);
          if (found) return found;
        }
      }
      return null;
    };
    const path = findPath(categories, selectedCategoryId);
    if (path) {
      setExpandedCategories(prev => [...new Set([...prev, ...path])]);
    }
  }, [selectedCategoryId, categories]);

  const toggleCategory = (id) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const renderTree = (items, level = 0) =>
    items.map(category => {
      const hasChildren = category.children?.length > 0;
      return (
        <div key={category.id} className="space-y-0.5">
          <OrderTreeNode
            category={category}
            level={level}
            hasChildren={hasChildren}
            isExpanded={expandedCategories.includes(category.id)}
            isSelected={selectedCategoryId === category.id}
            onSelect={() => onSelectCategory(category.id)}
            onToggle={() => toggleCategory(category.id)}
          />
          {hasChildren && expandedCategories.includes(category.id) && (
            <div className="mt-0.5">
              {renderTree(category.children, level + 1)}
            </div>
          )}
        </div>
      );
    });

  // Mobile: flatten all categories
  const flattenAll = (cats) => {
    let flat = [];
    const traverse = (items) => {
      items.forEach(cat => {
        flat.push(cat);
        if (cat.children?.length) traverse(cat.children);
      });
    };
    traverse(cats);
    return flat;
  };

  return (
    <>
      {/* ── Desktop tree ── */}
      <div className="hidden lg:block rounded-xl p-4 h-[88.5vh] overflow-auto bg-bg-primary border border-border-default shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-default">
          <h3 className="text-lg font-bold text-text-primary">Categories</h3>
        </div>

        {/* Dietary pills on desktop sidebar */}
        {/* {dietaryOptions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => onSelectDietary?.(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition
                ${!selectedDietary ? 'bg-action-primary text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-gray-100'}`}
            >
              All
            </button>
            {dietaryOptions.map(type => {
              const key = type.toLowerCase().replace(/[-_\s]/g, '');
              return (
                <button
                  key={key}
                  onClick={() => onSelectDietary?.(key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition
                    ${selectedDietary === key ? 'bg-action-primary text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-gray-100'}`}
                >
                  {dietaryColorMap[key] && (
                    <span className={`w-2 h-2 rounded-full ${dietaryColorMap[key]}`} />
                  )}
                  {type}
                </button>
              );
            })}
          </div>
        )} */}

        <div className="space-y-1">
          {categories.length > 0
            ? renderTree(categories)
            : <div className="px-3 py-8 text-center text-text-secondary text-sm">No categories</div>
          }
        </div>
      </div>

      <div className="lg:hidden mb-2">
        {dietaryOptions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-2 px-1">
            <button
              onClick={() => onSelectDietary?.(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition
                ${!selectedDietary ? 'bg-action-primary text-white' : 'bg-bg-primary border-2 border-border-default'}`}
            >
              All
            </button>
            {dietaryOptions.map(type => {
              const key = type.toLowerCase().replace(/[-_\s]/g, '');
              return (
                <button
                  key={key}
                  onClick={() => onSelectDietary?.(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 flex items-center gap-1 transition
                    ${selectedDietary === key ? 'bg-action-primary text-white' : 'bg-bg-primary border-2 border-border-default'}`}
                >
                  {dietaryColorMap[key] && (
                    <span className={`w-2 h-2 rounded-full ${dietaryColorMap[key]}`} />
                  )}
                  {type}
                </button>
              );
            })}
          </div>
        )}

        {/* Category pills row */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 px-1">
          {flattenAll(categories).map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition
                ${selectedCategoryId === cat.id
                  ? 'bg-action-primary text-white'
                  : 'bg-bg-primary border-2 border-border-default hover:border-action-primary'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CategoryTree;
