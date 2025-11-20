// import React, { useState } from 'react';
// import TreeNode from './TreeNode';

// // Category Tree (renders a tree of TreeNode)
// const CategoryTree = ({ categories, selectedCategory, onSelectCategory }) => {
//   const [expandedCategories, setExpandedCategories] = useState(['All']);

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
//         <div key={category.name}>
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
//             <div className="mt-1">
//               {renderTree(category.children, level + 1)}
//             </div>
//           )}
//         </div>
//       );
//     });
//   };

//   return (
//     <div className="bg-white rounded-lg shadow-md p-4">
//       <h3 className="text-lg font-semibold mb-3 px-3">Categories</h3>
//       <div className="space-y-1">
//         {renderTree(categories)}
//       </div>
//     </div>
//   );
// };

// export default CategoryTree;



// 



// src/components/CategoryTree.jsx

import React, { useState, useEffect } from 'react';
import TreeNode from './TreeNode';
import { injectThemeVars } from './utils/injectThemeVars';

const CategoryTree = ({ categories = [], selectedCategory, onSelectCategory }) => {
  const [expandedCategories, setExpandedCategories] = useState(['All Categories']);

  useEffect(() => {
    // ensure CSS variables are available
    injectThemeVars();
  }, []);

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
