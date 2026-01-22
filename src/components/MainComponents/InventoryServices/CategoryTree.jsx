import { useState, useEffect } from "react";
import TreeNode from "./TreeNode";

const CategoryTree = ({
  categories = [],
  selectedCategory,
  onSelectCategory,
  defaultOpenCategoryName = "Dietery",
}) => {
  const [expandedCategories, setExpandedCategories] = useState(["All Categories"]);

  /* ---------- auto expand default category ---------- */
  const findCategoryPath = (nodes, target, path = []) => {
    for (const node of nodes) {
      const currentPath = [...path, node.name];
      if (node.name === target) return currentPath;
      if (node.children?.length) {
        const found = findCategoryPath(node.children, target, currentPath);
        if (found) return found;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!categories.length) return;

    const path = findCategoryPath(categories, defaultOpenCategoryName);
    setExpandedCategories(path?.length ? path : ["All Categories"]);
  }, [categories, defaultOpenCategoryName]);

  /* ---------- handlers ---------- */
  const toggleCategory = (name) => {
    setExpandedCategories((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  };

  /* ---------- desktop tree ---------- */
  const renderTree = (nodes, level = 0) =>
    nodes.map((category) => {
      const hasChildren = category.children?.length > 0;
      const isExpanded = expandedCategories.includes(category.name);

      return (
        <div key={category.id} className="space-y-1">
          <TreeNode
            category={category}
            level={level}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            isSelected={selectedCategory === category.name}
            onToggle={() => toggleCategory(category.name)}
            onSelect={() => onSelectCategory(category.name)}
          />

          {hasChildren && isExpanded && (
            <div className="ml-4">
              {renderTree(category.children, level + 1)}
            </div>
          )}
        </div>
      );
    });

  /* ---------- mobile pills ---------- */
  const flattenCategories = (nodes, list = []) => {
    nodes.forEach((c) => {
      list.push(c);
      if (c.children?.length) flattenCategories(c.children, list);
    });
    return list;
  };

  const mobileCategories = flattenCategories(categories);

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block rounded-xl p-4 bg-bg-primary border border-border-default shadow-sm">
        <h3 className="text-lg font-bold mb-3 text-text-primary">
          Categories
        </h3>
        <div className="space-y-1">
          {renderTree(categories)}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden mb-4">
        <h3 className="text-base font-semibold px-2 mb-2 text-text-primary">
          Categories
        </h3>

        <div className="overflow-x-auto scrollbar-hide px-2">
          <div className="flex gap-2 pb-2 min-w-max">
            {mobileCategories.map((cat) => {
              const selected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.name)}
                  className={`
                    px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap
                    ${selected
                      ? "bg-action-primary text-white shadow-md"
                      : "bg-bg-primary border border-border-default hover:border-action-primary"}
                  `}
                >
                  {cat.name}
                  {cat.children?.length > 0 && (
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full
                        ${selected
                          ? "bg-white text-action-primary"
                          : "bg-bg-tertiary text-text-secondary"}`}
                    >
                      {cat.children.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryTree;
