// import React, { useState, useEffect } from 'react';
// import TreeNode from './TreeNode';
// import { injectThemeVars } from '../../utils/injectThemeVars';

// const CategoryTree = ({ categories = [], selectedCategory, onSelectCategory }) => {
//   const [expandedCategories, setExpandedCategories] = useState(['All Categories']);

//   useEffect(() => {
//     // ensure CSS variables are available
//     injectThemeVars();
//   }, []);

//   const toggleCategory = (categoryName) => {
//     setExpandedCategories(prev =>
//       prev.includes(categoryName)
//         ? prev.filter(c => c !== categoryName)
//         : [...prev, categoryName]
//     );
//   };

//   const renderTree = (items, level = 0) => {
//     return items.map((category) => {
//       const isExpanded = expandedCategories.includes(category.name);
//       const isSelected = selectedCategory === category.name;
//       const hasChildren = category.children && category.children.length > 0;

//       return (
//         <div key={category.id || category.name} className="px-1">
//           <TreeNode
//             category={category}
//             isExpanded={isExpanded}
//             onToggle={() => toggleCategory(category.name)}
//             isSelected={isSelected}
//             onSelect={() => onSelectCategory(category.name)}
//             hasChildren={hasChildren}
//             level={level}
//           />
//           {hasChildren && isExpanded && (
//             <div className="mt-1 ml-3">
//               {renderTree(category.children, level + 1)}
//             </div>
//           )}
//         </div>
//       );
//     });
//   };

//   return (
//     <div
//       className="rounded-lg p-4"
//       style={{
//         backgroundColor: 'var(--color-bg-primary)',
//         boxShadow: 'var(--shadow-card)',
//         border: `1px solid var(--color-border-default)`
//       }}
//     >
//       <h3
//         className="text-lg font-semibold mb-3 px-3"
//         style={{ color: 'var(--color-text-primary)' }}
//       >
//         Categories
//       </h3>
//       <div className="space-y-1">
//         {categories && categories.length > 0 ? (
//           renderTree(categories)
//         ) : (
//           <div className="px-3 py-4" style={{ color: 'var(--color-text-secondary)' }}>
//             No categories
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CategoryTree;






// =================================================================== ///////// ===================================================== //
// =================================================================== ///////// ===================================================== //
// =================================================================== ///////// ===================================================== //
// =================================================================== ///////// ===================================================== //
// =================================================================== ///////// ===================================================== //
// =================================================================== ///////// ===================================================== //

import React, { useState, useEffect } from 'react';
import TreeNode from './TreeNode';
import { injectThemeVars } from '../../utils/injectThemeVars';


const CategoryTree = ({
  categories = [],
  selectedCategory,
  onSelectCategory,
  defaultOpenCategoryName = 'Dietery', // <--- only this will be expanded by default
}) => {
  // initialize with only All Categories as before (fallback)
  const [expandedCategories, setExpandedCategories] = useState(['All Categories']);

  useEffect(() => {
    // ensure CSS variables are available
    injectThemeVars();
  }, []);

  // helper: find category names that match target (case-insensitive) and return the full path names to expand
  const findCategoryByName = (items, targetName) => {
    if (!Array.isArray(items) || !targetName) return null;

    // DFS to find the first category whose name matches (case-insensitive)
    const stack = items.map(item => ({ node: item, path: [item.name] }));
    while (stack.length) {
      const { node, path } = stack.pop();
      if (node && node.name && node.name.toLowerCase() === targetName.toLowerCase()) {
        // return the path (array of names) from root to the matching node
        return path;
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => stack.push({ node: child, path: [...path, child.name] }));
      }
    }
    return null;
  };

  // when categories change, expand only the defaultOpenCategoryName branch if found
  useEffect(() => {
    if (!categories || categories.length === 0) {
      setExpandedCategories(['All Categories']);
      return;
    }

    const path = findCategoryByName(categories, defaultOpenCategoryName);

    if (path && path.length > 0) {
      // expand all ancestors + the target node itself (use names as keys, consistent with your existing logic)
      setExpandedCategories(path);
    } else {
      // fallback: keep the old behavior of showing 'All Categories' expanded
      setExpandedCategories(['All Categories']);
    }
  }, [categories, defaultOpenCategoryName]);

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const renderTree = (items, level = 0) => {
    return items.map((category) => {
      const isExpanded = expandedCategories.includes(category.name);
      const isSelected = selectedCategory === category.name;
      const hasChildren = category.children && category.children.length > 0;

      return (
        <div key={category.id || category.name} className="px-1">
          <TreeNode
            category={category}
            isExpanded={isExpanded}
            onToggle={() => toggleCategory(category.name)}
            isSelected={isSelected}
            onSelect={() => onSelectCategory(category.name)}
            hasChildren={hasChildren}
            level={level}
          />
          {hasChildren && isExpanded && (
            <div className="mt-1 ml-3">
              {renderTree(category.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        boxShadow: 'var(--shadow-card)',
        border: `1px solid var(--color-border-default)`
      }}
    >
      <h3
        className="text-lg font-semibold mb-3 px-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Categories
      </h3>
      <div className="space-y-1">
        {categories && categories.length > 0 ? (
          renderTree(categories)
        ) : (
          <div className="px-3 py-4" style={{ color: 'var(--color-text-secondary)' }}>
            No categories
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryTree;
