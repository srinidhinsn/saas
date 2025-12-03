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
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import MenuTreeNode from "./TreeNode";
import { Plus, X } from 'lucide-react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { jwtDecode } from 'jwt-decode';

const CategoryTree = ({ 
  categories = [], 
  selectedCategory, 
  onSelectCategory, 
  defaultOpenCategoryName = 'Dietery',
  clientId,
  token,
  onCategoriesUpdate
}) => {
  const [expandedCategories, setExpandedCategories] = useState(['All Categories']);
  const [parentMap, setParentMap] = useState({});
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNewSubcategoryName, setEditNewSubcategoryName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Stabilize handlers with useCallback
  const handleNewCategoryNameChange = useCallback((e) => {
    setNewCategoryName(e.target.value);
  }, []);

  const handleNewCategoryDescriptionChange = useCallback((e) => {
    setNewCategoryDescription(e.target.value);
  }, []);

  const handleEditNameChange = useCallback((e) => {
    setEditName(e.target.value);
  }, []);

  const handleEditDescriptionChange = useCallback((e) => {
    setEditDescription(e.target.value);
  }, []);

  const handleEditNewSubcategoryNameChange = useCallback((e) => {
    setEditNewSubcategoryName(e.target.value);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewCategoryName("");
    setNewCategoryDescription("");
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingCategory(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  }, []);

  const findCategoryByName = (items, targetName) => {
    if (!Array.isArray(items) || !targetName) return null;

    const stack = items.map(item => ({ node: item, path: [item.name] }));
    while (stack.length) {
      const { node, path } = stack.pop();
      if (node && node.name && node.name.toLowerCase() === targetName.toLowerCase()) {
        return path;
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => stack.push({ node: child, path: [...path, child.name] }));
      }
    }
    return null;
  };

  useEffect(() => {
    if (!categories || categories.length === 0) {
      setExpandedCategories(['All Categories']);
      return;
    }

    const path = findCategoryByName(categories, defaultOpenCategoryName);

    if (path && path.length > 0) {
      setExpandedCategories(path);
    } else {
      setExpandedCategories(['All Categories']);
    }

    buildParentMapFromCategories(categories);
  }, [categories, defaultOpenCategoryName]);

  const buildParentMapFromCategories = (cats) => {
    const tempMap = {};
    const traverse = (items, parentId = null) => {
      items.forEach(cat => {
        if (parentId && cat.id !== 'all') tempMap[cat.id] = parentId;
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children, cat.id);
        }
      });
    };
    traverse(cats);
    setParentMap(tempMap);
  };

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const generateSlugFromParents = (categoryId, currentName, overrideParentMap = null) => {
    const path = [];
    const categoryMap = {};
    
    const buildMap = (cats) => {
      for (const cat of cats) {
        categoryMap[cat.id] = cat;
        if (cat.children) buildMap(cat.children);
      }
    };
    buildMap(categories);

    const mapToUse = { ...parentMap, ...(overrideParentMap || {}) };
    let currentId = categoryId;
    const ancestors = [];

    while (mapToUse[currentId]) {
      const parentId = mapToUse[currentId];
      ancestors.unshift(parentId);
      currentId = parentId;
    }

    ancestors.forEach(id => {
      const cat = categoryMap[id];
      if (cat && cat.id !== 'all') path.push(cat.name.trim().replace(/\s+/g, " "));
    });

    if (currentName) {
      path.push(currentName.trim().replace(/\s+/g, " "));
    } else {
      const cat = categoryMap[categoryId];
      if (cat) path.push(cat.name.trim().replace(/\s+/g, " "));
    }

    return "_" + path.join(" _");
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Category name is required");
      return;
    }

    const newId = uuidv4();
    let createdBy = "null";
    let updatedBy = "null";

    try {
      const decoded = jwtDecode(token);
      createdBy = String(decoded.user_id);
      updatedBy = String(decoded.user_id);
    } catch (err) {
      console.error("Token decode failed:", err);
    }

    const tempParentMap = { [newId]: "dietery" };
    const slug = generateSlugFromParents(newId, newCategoryName.trim(), tempParentMap);

    const newCategoryPayload = {
      id: newId,
      client_id: clientId,
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim(),
      sub_categories: [],
      created_by: createdBy,
      updated_by: updatedBy,
      slug,
    };

    try {
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create_category`,
        newCategoryPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const parentRes = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const dietaryCategory = parentRes.data.data[0];
      const existingSubs = dietaryCategory?.sub_categories || dietaryCategory?.subCategories?.map(sub => sub.id) || [];

      const updatePayload = {
        id: "dietery",
        client_id: clientId,
        name: dietaryCategory.name,
        description: dietaryCategory.description || "",
        sub_categories: [...existingSubs, newId],
        slug: "_Dietery",
        overwrite_subcategories: true,
      };

      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category?client_id=${clientId}`,
        updatePayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      closeAddModal();
      alert("✅ New category added successfully!");
      
      if (onCategoriesUpdate) onCategoriesUpdate();
    } catch (err) {
      console.error("❌ Error adding category:", err.response?.data || err);
      alert("Failed to add category");
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    let finalSubcategories = editingCategory.children?.map(c => c.id) || [];
    let createdBy = "null";
    let updatedBy = "null";

    try {
      const decoded = jwtDecode(token);
      createdBy = String(decoded.user_id);
      updatedBy = String(decoded.user_id);
    } catch (err) {
      console.error("Token decode failed:", err);
    }

    if (editNewSubcategoryName.trim()) {
      const newSubId = uuidv4();
      const tempParentMap = { [newSubId]: editingCategory.id };

      const newSubPayload = {
        id: newSubId,
        client_id: clientId,
        name: editNewSubcategoryName.trim(),
        description: "",
        sub_categories: [],
        created_by: createdBy,
        updated_by: updatedBy,
        slug: generateSlugFromParents(newSubId, editNewSubcategoryName.trim(), tempParentMap),
      };

      try {
        await axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create_category`,
          newSubPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        finalSubcategories.push(newSubId);
      } catch (err) {
        console.error("Error creating subcategory:", err.response?.data || err);
        alert("Failed to create subcategory");
        return;
      }
    }

    const slug = generateSlugFromParents(editingCategory.id, editName.trim());

    const payload = {
      id: editingCategory.id,
      client_id: clientId,
      name: editName.trim(),
      description: editDescription.trim(),
      sub_categories: finalSubcategories,
      slug,
      overwrite_subcategories: true,
    };

    try {
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category?client_id=${clientId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setEditNewSubcategoryName("");
      closeEditModal();
      alert("✅ Category updated successfully!");
      
      if (onCategoriesUpdate) onCategoriesUpdate();
    } catch (err) {
      console.error("Error editing category:", err.response?.data || err);
      alert("Failed to update category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete_category`,
        { id: deleteTarget.id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      closeDeleteModal();
      alert("✅ Category deleted successfully!");
      
      if (onCategoriesUpdate) onCategoriesUpdate();
    } catch (err) {
      console.error("Delete error:", err.response?.data || err);
      alert(err.response?.data?.detail || "Failed to delete category");
    }
  };

  const handleEdit = (category) => {
    if (category.id === 'all' || category.id === 'dietery' || category.name === 'All Categories') {
      alert("Cannot edit 'All Categories'");
      return;
    }
    setEditingCategory(category);
    setEditName(category.name);
    setEditDescription(category.description || "");
    setEditNewSubcategoryName("");
    setShowEditModal(true);
  };

  const handleDelete = (category) => {
    if (category.id === 'all' || category.id === 'dietery' || category.name === 'All Categories') {
      alert("Cannot edit 'All Categories'");
      return;
    }
    setDeleteTarget(category);
    setShowDeleteModal(true);
  };

  const renderTree = (items, level = 0) => {
    return items.map((category) => {
      const isExpanded = expandedCategories.includes(category.name);
      const isSelected = selectedCategory === category.name;
      const hasChildren = category.children && category.children.length > 0;

      return (
        <div key={category.id || category.name} className="px-1">
          <MenuTreeNode
            category={category}
            isExpanded={isExpanded}
            onToggle={() => toggleCategory(category.name)}
            isSelected={isSelected}
            onSelect={() => onSelectCategory(category.name)}
            hasChildren={hasChildren}
            level={level}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
// Flatten all categories recursively for mobile view
const flattenAllCategories = (cats) => {
  let flat = [];
  const traverse = (items) => {
    items.forEach(cat => {
      // Only include categories with items (count > 0)
      if (cat.count > 0) {
        flat.push(cat);
      }
      if (cat.children && cat.children.length > 0) {
        traverse(cat.children);
      }
    });
  };
  traverse(cats);
  return flat;
};

const renderMobileCategories = (items) => {
  const flatCategories = flattenAllCategories(items);
  
  return flatCategories.map((category) => {
    const isSelected = selectedCategory === category.name;
    
    return (
      <button
        key={category.id || category.name}
        onClick={() => onSelectCategory(category.name)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-semibold text-sm transition-all shadow-sm flex-shrink-0 ${
          isSelected 
            ? 'bg-action-primary text-white shadow-md' 
            : 'bg-bg-primary text-text-primary border-2 border-border-default hover:border-action-primary hover:bg-bg-tertiary'
        }`}
      >
        <span>{category.name}</span>
        {typeof category.count !== 'undefined' && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            isSelected 
              ? 'bg-white text-action-primary' 
              : 'bg-bg-tertiary text-text-secondary'
          }`}>
            {category.count}
          </span>
        )}
      </button>
    );
  });
};
  return (
    <>
      {/* Desktop: Tree View */}
      <div className="hidden lg:block rounded-lg p-4 bg-bg-primary shadow-md border border-border-default">
        <div className="flex items-center justify-between mb-3 px-3">
          <h3 className="text-lg font-semibold text-text-primary">
            Categories
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
            title="Add new category"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="space-y-1">
          {categories && categories.length > 0 ? (
            renderTree(categories)
          ) : (
            <div className="px-3 py-4 text-text-secondary">
              No categories
            </div>
          )}
        </div>
      </div>
     {/* Mobile: Horizontal Scrollable List */}
<div className="lg:hidden mb-4">
  <div className="flex items-center justify-between mb-3 px-2">
    <h3 className="text-base font-semibold text-text-primary">
      Categories
    </h3>
    <button
      onClick={() => setShowAddModal(true)}
      className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity shadow-md flex-shrink-0"
      title="Add new category"
    >
      <Plus size={16} />
    </button>
  </div>
  
  <div 
    className="overflow-x-auto max-w-[350px] overflow-y-hidden scrollbar-hide px-2 touch-pan-x"
    style={{ 
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}
  >
    <div className="flex gap-2 pb-2 w-max">
      {categories && categories.length > 0 ? (
        renderMobileCategories(categories)
      ) : (
        <div className="text-text-secondary text-sm py-2">
          No categories
        </div>
      )}
    </div>
  </div>
</div>
  
      {/* Modals remain the same */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-text-primary">Add New Category</h3>
              <button onClick={closeAddModal} className="text-text-secondary hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
  
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={handleNewCategoryNameChange}
                  placeholder="Enter category name"
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  autoFocus
                />
              </div>
  
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">
                  Description (optional)
                </label>
                <textarea
                  value={newCategoryDescription}
                  onChange={handleNewCategoryDescriptionChange}
                  placeholder="Enter description"
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  rows="3"
                />
              </div>
  
              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  className="flex-1 px-4 py-2 rounded-lg bg-action-primary text-white hover:opacity-90 transition-opacity"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
  
      {showEditModal && editingCategory && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-text-primary">Edit Category</h3>
              <button onClick={closeEditModal} className="text-text-secondary hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
  
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={handleEditNameChange}
                  placeholder="Enter category name"
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                />
              </div>
  
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={handleEditDescriptionChange}
                  placeholder="Enter description"
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  rows="3"
                />
              </div>
  
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">
                  Add New Subcategory (optional)
                </label>
                <input
                  type="text"
                  value={editNewSubcategoryName}
                  onChange={handleEditNewSubcategoryNameChange}
                  placeholder="New subcategory name"
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                />
              </div>
  
              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditCategory}
                  className="flex-1 px-4 py-2 rounded-lg bg-action-primary text-white hover:opacity-90 transition-opacity"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
  
      {showDeleteModal && deleteTarget && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-text-primary">Confirm Delete</h3>
            <p className="mb-6 text-text-secondary">
              Are you sure you want to delete <strong className="text-text-primary">{deleteTarget?.name}</strong>? 
              This action cannot be undone.
            </p>
  
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                className="flex-1 px-4 py-2 rounded-lg bg-action-danger text-white hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CategoryTree;