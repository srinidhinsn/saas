
// MenuCategoryTree.jsx - Updated with Drag & Drop
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import MenuTreeNode from "./MenuTreeNode";
import { Plus, X,Edit,Trash2 } from 'lucide-react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const MenuCategoryTree = ({ 
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
  
  // Drag & Drop states
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null); // 'above', 'below', 'inside'
  
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


  const generateCategoryIdFromName = (name) => {
    const now = new Date();
  
    const timestamp =
      now.getFullYear().toString().slice(-2) +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");
  
    return (
      name
        .toLowerCase()                 // ✅ lowercase
        .trim()
        .replace(/\s+/g, "_")          // ✅ spaces → _
        .replace(/[^a-z0-9_]/g, "")    // ✅ remove symbols
        .replace(/_+/g, "_")           // ✅ collapse ___
        .replace(/^_|_$/g, "")         // ✅ no leading/trailing _
      + "_" + timestamp                // ✅ uniqueness
    );
  };
  
  // Drag & Drop Handlers
  const handleDragStart = (e, category) => {
    e.stopPropagation();
    setDraggedItem(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || draggedItem.id === category.id) return;
    
    // Prevent dropping parent into its own child
    if (isDescendant(category, draggedItem)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const height = rect.height;
    
    // Determine drop position
    if (mouseY < height * 0.25) {
      setDragOverPosition('above');
    } else if (mouseY > height * 0.75) {
      setDragOverPosition('below');
    } else {
      // Only allow "inside" if category can have children
      setDragOverPosition(category.id !== 'all' ? 'inside' : 'below');
    }
    
    setDragOverItem(category);
  };

  const handleDrop = async (e, targetCategory) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || draggedItem.id === targetCategory.id) {
      resetDragState();
      return;
    }

    // Prevent dropping parent into child
    if (isDescendant(targetCategory, draggedItem)) {
      alert("Cannot move a parent category into its own child");
      resetDragState();
      return;
    }

    try {
      await handleCategoryReorder(draggedItem, targetCategory, dragOverPosition);
      resetDragState();
    } catch (error) {
      console.error("Drop failed:", error);
      alert("Failed to reorder categories");
      resetDragState();
    }
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    setDragOverPosition(null);
  };

  // Check if targetCat is a descendant of sourceCat
  const isDescendant = (targetCat, sourceCat) => {
    const checkChildren = (cat) => {
      if (cat.id === sourceCat.id) return true;
      if (cat.children) {
        return cat.children.some(child => checkChildren(child));
      }
      return false;
    };
    return checkChildren(targetCat);
  };
  const handleCategoryReorder = async (draggedCat, targetCat, position) => {
    const draggedParentId = parentMap[draggedCat.id];
    const targetParentId =
      position === "inside"
        ? targetCat.id
        : parentMap[targetCat.id];
  
    if (!draggedParentId || !targetParentId) return;
  
    // ✅ BUILD FROM UI TREE (SOURCE OF TRUTH)
    const getChildrenIds = (parentId) => {
      const findNode = (nodes) => {
        for (const n of nodes) {
          if (n.id === parentId) return n;
          if (n.children) {
            const found = findNode(n.children);
            if (found) return found;
          }
        }
        return null;
      };
  
      const node = findNode(categories);
      return node?.children?.map(c => c.id) || [];
    };
  
    let oldSubs = getChildrenIds(draggedParentId);
    let newSubs = getChildrenIds(targetParentId);
  
    // ❌ remove dragged from old parent
    oldSubs = oldSubs.filter(id => id !== draggedCat.id);
  
    // ➕ insert into new parent
    if (position === "inside") {
      if (!newSubs.includes(draggedCat.id)) {
        newSubs.push(draggedCat.id);
      }
    } else {
      const idx = newSubs.indexOf(targetCat.id);
      const insertAt = position === "above" ? idx : idx + 1;
  
      newSubs = newSubs.filter(id => id !== draggedCat.id);
      newSubs.splice(insertAt, 0, draggedCat.id);
    }
  
    // 🔒 NEVER EMPTY DIETERY
    if (draggedParentId === "dietery" && oldSubs.length === 0) {
      console.warn("Blocked empty overwrite for Dietery");
      return;
    }
  
    // ✅ UPDATE SOURCE PARENT
    await updateCategorySubcategories(draggedParentId, oldSubs);
  
    // ✅ UPDATE TARGET PARENT (ONLY IF DIFFERENT)
    if (draggedParentId !== targetParentId) {
      await updateCategorySubcategories(targetParentId, newSubs);
    }
  
    onCategoriesUpdate?.();
  };
  
  
  

  const fetchCategoryById = async (categoryId) => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${categoryId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  
    const category = response?.data?.data?.[0];
  
    if (!category) {
      console.error("Category not found in backend:", categoryId);
      return null;
    }
  
    return category;
  };
  

  const updateCategorySubcategories = async (categoryId, subcategoryIds) => {
    if (categoryId === "dietery" && subcategoryIds.length === 0) {
      console.warn("Blocked empty overwrite for Dietery");
      return;
    }
  
    const category = await fetchCategoryById(categoryId);
  
    const payload = {
      id: categoryId,
      client_id: clientId,
      name: category.name,
      description: category.description || "",
      sub_categories: [...new Set(subcategoryIds)], // ✅ FULL LIST
      slug: category.slug,
      overwrite_subcategories: true,
    };
  
    await axios.post(
      `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  };
  
  const regenerateSlugForCategory = async (categoryId, newParentId) => {
    const category = await fetchCategoryById(categoryId);
  
    const newSlug = generateSlugFromParents(
      categoryId,
      category.name,
      { [categoryId]: newParentId }
    );
  
    const payload = {
      id: categoryId,
      client_id: clientId,
      name: category.name,
      description: category.description || "",
      slug: newSlug,
  
      // ❌ DO NOT TOUCH SUBCATEGORIES HERE
      overwrite_subcategories: false,
    };
  
    await axios.post(
      `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  };
  

  // Helper functions (keep your existing ones)
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

  // const generateCategoryIdFromName = (name) => {
  //   const now = new Date();
  //   const day = String(now.getDate()).padStart(2, "0");
  //   const month = String(now.getMonth() + 1).padStart(2, "0");
  //   const minutes = String(now.getMinutes()).padStart(2, "0");
  //   return `${name.trim().replace(/\s+/g, "_")}_${day}_${month}_${minutes}`;
  // };



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
      alert("Cannot delete 'All Categories'");
      return;
    }
    setDeleteTarget(category);
    setShowDeleteModal(true);
  };

  // Add the missing callback handlers
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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Category name is required");
      return;
    }
  
    let createdBy = null;
    let updatedBy = null;
  
    try {
      const decoded = jwtDecode(token);
      createdBy = String(decoded.user_id);
      updatedBy = String(decoded.user_id);
    } catch (err) {
      console.error("Token decode failed:", err);
    }
  
    // ✅ FRONTEND GENERATED ID (ONLY ONCE)
    const newId = generateCategoryIdFromName(newCategoryName);
  
    try {
      // 1️⃣ CREATE CATEGORY
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create_category`,
        {
          id: newId,
          client_id: clientId,
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim(),
          sub_categories: [],
          created_by: createdBy,
          updated_by: updatedBy,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      // 2️⃣ GET EXISTING DIETERY SUBS FROM UI TREE (SAFE)
      const dieteryNode = categories.find(cat => cat.id === "dietery");
      const existingSubs = dieteryNode?.children?.map(child => child.id) || [];
  
      // 3️⃣ UPDATE DIETERY WITH FULL LIST
      const updatePayload = {
        id: "dietery",
        client_id: clientId,
        name: "Dietery",
        description: "",
        sub_categories: [...new Set([...existingSubs, newId])],
        slug: "_Dietery",
        overwrite_subcategories: true,
      };
  
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category`,
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
      onCategoriesUpdate?.();
    } catch (err) {
      console.error("❌ Error adding category:", err.response?.data || err);
      alert("Failed to add category");
    }
  };
  
  const handleEditCategory = async () => {
    if (!editingCategory) return;
  
    let createdBy = null;
    let updatedBy = null;
  
    try {
      const decoded = jwtDecode(token);
      createdBy = String(decoded.user_id);
      updatedBy = String(decoded.user_id);
    } catch (err) {
      console.error("Token decode failed:", err);
    }
  
    try {
      // ✅ SOURCE OF TRUTH = UI TREE, NOT BACKEND
      let finalSubcategories =
        editingCategory.children?.map(child => child.id) || [];
  
      // ➕ CREATE NEW SUBCATEGORY
      if (editNewSubcategoryName.trim()) {
        const newSubId = generateCategoryIdFromName(editNewSubcategoryName);
  
        await axios.post(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create_category`,
          {
            id: newSubId,
            client_id: clientId,
            name: editNewSubcategoryName.trim(),
            description: "",
            sub_categories: [],
            created_by: createdBy,
            updated_by: updatedBy,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
  
        // ✅ APPEND LOCALLY
        finalSubcategories.push(newSubId);
      }
  
      const slug = generateSlugFromParents(
        editingCategory.id,
        editName.trim()
      );
  
      // 🔥 FULL OVERWRITE WITH COMPLETE LIST
      const payload = {
        id: editingCategory.id,
        client_id: clientId,
        name: editName.trim(),
        description: editDescription.trim(),
        sub_categories: finalSubcategories,
        slug,
        overwrite_subcategories: true,
      };
  
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category`,
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
  
      onCategoriesUpdate?.();
    } catch (err) {
      console.error("Error editing category:", err.response?.data || err);
      alert("Failed to update category");
    }
  };
  

  // Add missing handleDeleteCategory function
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

  // Add missing mobile categories render function
  const flattenAllCategories = (cats) => {
    let flat = [];
    const traverse = (items) => {
      items.forEach(cat => {
        const hasChildren = cat.children && cat.children.length > 0;
        flat.push({
          ...cat,
          count: hasChildren ? cat.children.length : 0,
          showCount: hasChildren
        });
        if (hasChildren) {
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
      const canEdit = category.id !== 'dietery' && category.name !== 'All Categories';
      
      return (
        <div
          key={category.id || category.name}
          className="relative flex-shrink-0"
        >
          <button
            onClick={() => onSelectCategory(category.name)}
            className={`
              flex items-center justify-between gap-2
              px-3 py-2
              rounded-full
              font-semibold text-sm
              transition-all shadow-sm
              whitespace-nowrap
              flex-shrink-0
              w-[140px]
              h-9
              ${
                isSelected
                  ? 'bg-action-primary text-white shadow-md'
                  : 'bg-bg-primary text-text-primary border-2 border-border-default hover:border-action-primary'
              }
            `}
          >
            <span className="truncate">{category.name}</span>
            {category.showCount && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold 
                ${isSelected ? 'bg-white text-action-primary' : 'bg-bg-tertiary text-text-secondary'}`}>
                {category.count}
              </span>
            )}
          </button>
          
          {canEdit && (
            <div className="absolute -top-1 -right-1 flex gap-1 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(category);
                }}
                className="w-6 h-6 rounded-full bg-action-primary text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Edit category"
              >
                <Edit size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(category);
                }}
                className="w-6 h-6 rounded-full bg-action-danger text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Delete category"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      );
    });
  };

  const renderTree = (items, level = 0) =>
    items.map((category, index) => {
      const hasChildren = category.children?.length > 0;
      const isExpanded = expandedCategories.includes(category.name);
      const isDragging = draggedItem?.id === category.id;
      const isDragOver = dragOverItem?.id === category.id;
      
      const categoryWithCount = {
        ...category,
        count: hasChildren ? category.children.length : 0
      };

      return (
        <div key={category.id} className="space-y-1">
          <MenuTreeNode
            category={categoryWithCount}
            level={level}
            hasChildren={hasChildren}
            isLast={index === items.length - 1}
            isExpanded={isExpanded}
            isSelected={selectedCategory === category.name}
            onSelect={() => onSelectCategory(category.name)}
            onToggle={() => toggleCategory(category.name)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isDragging={isDragging}
            dragOverPosition={isDragOver ? dragOverPosition : null}
          />

          {hasChildren && isExpanded && (
            <div className="mt-1">
              {renderTree(category.children, level + 1)}
            </div>
          )}
        </div>
      );
    });

  return (
    <>
      <div className="hidden lg:block rounded-xl p-4 bg-bg-primary border border-border-default shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-default">
          <h3 className="text-lg font-bold text-text-primary">Categories</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 rounded-lg bg-action-primary text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="space-y-1.5">
          {categories && categories.length > 0 ? (
            renderTree(categories)
          ) : (
            <div className="px-3 py-8 text-center text-text-secondary text-sm">
              No categories available
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
            className="p-1.5 rounded-lg bg-action-primary text-white hover:opacity-90 transition-opacity shadow-md flex-shrink-0"
            title="Add new category"
          >
            <Plus size={16} />
          </button>
        </div>
        
        <div
  className="
    relative
    overflow-x-auto
    overflow-y-hidden
    scrollbar-hide
    px-2
  "
>
<div
    className="
      flex gap-2 pb-2
      min-w-full
    "
  >
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

      {/* Add Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="rounded-xl max-w-md w-full p-6 bg-bg-primary shadow-2xl border border-border-default">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary">Add New Category</h3>
              <button onClick={closeAddModal} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-text-primary">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={handleNewCategoryNameChange}
                  placeholder="Enter category name"
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-text-primary">
                  Description (optional)
                </label>
                <textarea
                  value={newCategoryDescription}
                  onChange={handleNewCategoryDescriptionChange}
                  placeholder="Enter description"
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary resize-none"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-action-primary text-white hover:opacity-90 transition-opacity font-semibold shadow-md"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {showEditModal && editingCategory && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="rounded-xl max-w-md w-full p-6 bg-bg-primary shadow-2xl border border-border-default">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary">Edit Category</h3>
              <button onClick={closeEditModal} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-text-primary">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={handleEditNameChange}
                  placeholder="Enter category name"
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-text-primary">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={handleEditDescriptionChange}
                  placeholder="Enter description"
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary resize-none"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-text-primary">
                  Add New Subcategory (optional)
                </label>
                <input
                  type="text"
                  value={editNewSubcategoryName}
                  onChange={handleEditNewSubcategoryNameChange}
                  placeholder="New subcategory name"
                  className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditCategory}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-action-primary text-white hover:opacity-90 transition-opacity font-semibold shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="rounded-xl max-w-md w-full p-6 bg-bg-primary shadow-2xl border border-border-default">
            <h3 className="text-xl font-bold mb-4 text-text-primary">Confirm Delete</h3>
            <p className="mb-6 text-text-secondary">
              Are you sure you want to delete <strong className="text-text-primary">{deleteTarget?.name}</strong>? 
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                className="flex-1 px-4 py-2.5 rounded-lg bg-action-danger text-white hover:opacity-90 transition-opacity font-semibold shadow-md"
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

export default MenuCategoryTree;


//  ------------         =========================    ----------------------------- ====================================== //
//  ------------         =========================    ----------------------------- ====================================== //
//  ------------         =========================    ----------------------------- ====================================== //
//  ------------         =========================    ----------------------------- ====================================== //
//  ------------         =========================    ----------------------------- ====================================== //


// import { useState, useEffect } from "react";
// import MenuTreeNode from "./MenuTreeNode";
// import { Plus, X } from 'lucide-react';
// import axios from 'axios';
// import { v4 as uuidv4 } from 'uuid';
// import { jwtDecode } from 'jwt-decode';

// const MenuCategoryTree = ({ 
//   categories = [], 
//   selectedCategory, 
//   onSelectCategory, 
//   defaultOpenCategoryName = 'Dietery',
//   clientId,
//   token,
//   onCategoriesUpdate
// }) => {
//   const [expandedCategories, setExpandedCategories] = useState(['All Categories']);
//   const [parentMap, setParentMap] = useState({});
  
//   // Modal states
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
  
//   // Form states
//   const [newCategoryName, setNewCategoryName] = useState("");
//   const [newCategoryDescription, setNewCategoryDescription] = useState("");
//   const [editingCategory, setEditingCategory] = useState(null);
//   const [editName, setEditName] = useState("");
//   const [editDescription, setEditDescription] = useState("");
//   const [editNewSubcategoryName, setEditNewSubcategoryName] = useState("");
//   const [deleteTarget, setDeleteTarget] = useState(null);

//   const findCategoryByName = (items, targetName) => {
//     if (!Array.isArray(items) || !targetName) return null;

//     const stack = items.map(item => ({ node: item, path: [item.name] }));
//     while (stack.length) {
//       const { node, path } = stack.pop();
//       if (node && node.name && node.name.toLowerCase() === targetName.toLowerCase()) {
//         return path;
//       }
//       if (node.children && node.children.length > 0) {
//         node.children.forEach(child => stack.push({ node: child, path: [...path, child.name] }));
//       }
//     }
//     return null;
//   };

//   useEffect(() => {
//     if (!categories || categories.length === 0) {
//       setExpandedCategories(['All Categories']);
//       return;
//     }

//     const path = findCategoryByName(categories, defaultOpenCategoryName);

//     if (path && path.length > 0) {
//       setExpandedCategories(path);
//     } else {
//       setExpandedCategories(['All Categories']);
//     }

//     // Build parent map
//     buildParentMapFromCategories(categories);
//   }, [categories, defaultOpenCategoryName]);

//   const buildParentMapFromCategories = (cats) => {
//     const tempMap = {};
//     const traverse = (items, parentId = null) => {
//       items.forEach(cat => {
//         if (parentId && cat.id !== 'all') tempMap[cat.id] = parentId;
//         if (cat.children && cat.children.length > 0) {
//           traverse(cat.children, cat.id);
//         }
//       });
//     };
//     traverse(cats);
//     setParentMap(tempMap);
//   };

//   const toggleCategory = (categoryName) => {
//     setExpandedCategories(prev =>
//       prev.includes(categoryName)
//         ? prev.filter(c => c !== categoryName)
//         : [...prev, categoryName]
//     );
//   };

//   const generateSlugFromParents = (categoryId, currentName, overrideParentMap = null) => {
//     const path = [];
//     const categoryMap = {};
    
//     const buildMap = (cats) => {
//       for (const cat of cats) {
//         categoryMap[cat.id] = cat;
//         if (cat.children) buildMap(cat.children);
//       }
//     };
//     buildMap(categories);

//     const mapToUse = { ...parentMap, ...(overrideParentMap || {}) };
//     let currentId = categoryId;
//     const ancestors = [];

//     while (mapToUse[currentId]) {
//       const parentId = mapToUse[currentId];
//       ancestors.unshift(parentId);
//       currentId = parentId;
//     }

//     ancestors.forEach(id => {
//       const cat = categoryMap[id];
//       if (cat && cat.id !== 'all') path.push(cat.name.trim().replace(/\s+/g, " "));
//     });

//     if (currentName) {
//       path.push(currentName.trim().replace(/\s+/g, " "));
//     } else {
//       const cat = categoryMap[categoryId];
//       if (cat) path.push(cat.name.trim().replace(/\s+/g, " "));
//     }

//     return "_" + path.join(" _");
//   };

//   const handleAddCategory = async () => {
//     if (!newCategoryName.trim()) {
//       alert("Category name is required");
//       return;
//     }

//     const newId = uuidv4();
//     let createdBy = "null";
//     let updatedBy = "null";

//     try {
//       const decoded = jwtDecode(token);
//       createdBy = String(decoded.user_id);
//       updatedBy = String(decoded.user_id);
//     } catch (err) {
//       console.error("Token decode failed:", err);
//     }

//     const tempParentMap = { [newId]: "dietery" };
//     const slug = generateSlugFromParents(newId, newCategoryName.trim(), tempParentMap);

//     const newCategoryPayload = {
//       id: newId,
//       client_id: clientId,
//       name: newCategoryName.trim(),
//       description: newCategoryDescription.trim(),
//       sub_categories: [],
//       created_by: createdBy,
//       updated_by: updatedBy,
//       slug,
//     };

//     try {
//       await axios.post(
//         `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create_category`,
//         newCategoryPayload,
//         { headers: { Authorization:  `Bearer ${token}` } }
//       );

//       const parentRes = await axios.get(
//         `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`,
//         { headers: { Authorization:  `Bearer ${token}` } }
//       );

//       const dietaryCategory = parentRes.data.data[0];
//       const existingSubs = dietaryCategory?.sub_categories || dietaryCategory?.subCategories?.map(sub => sub.id) || [];

//       const updatePayload = {
//         id: "dietery",
//         client_id: clientId,
//         name: dietaryCategory.name,
//         description: dietaryCategory.description || "",
//         sub_categories: [...existingSubs, newId],
//         slug: "_Dietery",
//         overwrite_subcategories: true,
//       };

//       await axios.post(
//         `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category?client_id=${clientId}`,
//         updatePayload,
//         {
//           headers: {
//             Authorization:  `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       setNewCategoryName("");
//       setNewCategoryDescription("");
//       setShowAddModal(false);
//       alert("✅ New category added successfully!");
      
//       if (onCategoriesUpdate) onCategoriesUpdate();
//     } catch (err) {
//       console.error("❌ Error adding category:", err.response?.data || err);
//       alert("Failed to add category");
//     }
//   };

//   const handleEditCategory = async () => {
//     if (!editingCategory) return;

//     let finalSubcategories = editingCategory.children?.map(c => c.id) || [];
//     let createdBy = "null";
//     let updatedBy = "null";

//     try {
//       const decoded = jwtDecode(token);
//       createdBy = String(decoded.user_id);
//       updatedBy = String(decoded.user_id);
//     } catch (err) {
//       console.error("Token decode failed:", err);
//     }

//     if (editNewSubcategoryName.trim()) {
//       const newSubId = uuidv4();
//       const tempParentMap = { [newSubId]: editingCategory.id };

//       const newSubPayload = {
//         id: newSubId,
//         client_id: clientId,
//         name: editNewSubcategoryName.trim(),
//         description: "",
//         sub_categories: [],
//         created_by: createdBy,
//         updated_by: updatedBy,
//         slug: generateSlugFromParents(newSubId, editNewSubcategoryName.trim(), tempParentMap),
//       };

//       try {
//         const subRes = await axios.post(
//          ` ${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create_category`,
//           newSubPayload,
//           { headers: { Authorization:  `Bearer ${token}` } }
//         );
//         finalSubcategories.push(newSubId);
//       } catch (err) {
//         console.error("Error creating subcategory:", err.response?.data || err);
//         alert("Failed to create subcategory");
//         return;
//       }
//     }

//     const slug = generateSlugFromParents(editingCategory.id, editName.trim());

//     const payload = {
//       id: editingCategory.id,
//       client_id: clientId,
//       name: editName.trim(),
//       description: editDescription.trim(),
//       sub_categories: finalSubcategories,
//       slug,
//       overwrite_subcategories: true,
//     };

//     try {
//       await axios.post(
//         `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category?client_id=${clientId}`,
//         payload,
//         {
//           headers: {
//             Authorization:  `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       setEditingCategory(null);
//       setEditNewSubcategoryName("");
//       setShowEditModal(false);
//       alert("✅ Category updated successfully!");
      
//       if (onCategoriesUpdate) onCategoriesUpdate();
//     } catch (err) {
//       console.error("Error editing category:", err.response?.data || err);
//       alert("Failed to update category");
//     }
//   };

//   const handleDeleteCategory = async () => {
//     if (!deleteTarget) return;

//     try {
//       await axios.post(
//       `  ${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete_category`,
//         { id: deleteTarget.id },
//         {
//           headers: {
//             Authorization:  `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       setDeleteTarget(null);
//       setShowDeleteModal(false);
//       alert("✅ Category deleted successfully!");
      
//       if (onCategoriesUpdate) onCategoriesUpdate();
//     } catch (err) {
//       console.error("Delete error:", err.response?.data || err);
//       alert(err.response?.data?.detail || "Failed to delete category");
//     }
//   };

//   const handleEdit = (category) => {
//     if (category.id === 'all') {
//       alert("Cannot edit 'All Categories'");
//       return;
//     }
//     setEditingCategory(category);
//     setEditName(category.name);
//     setEditDescription(category.description || "");
//     setEditNewSubcategoryName("");
//     setShowEditModal(true);
//   };

//   const handleDelete = (category) => {
//     if (category.id === 'all') {
//       alert("Cannot delete 'All Categories'");
//       return;
//     }
//     setDeleteTarget(category);
//     setShowDeleteModal(true);
//   };

//   const renderTree = (items, level = 0) => {
//     return items.map((category) => {
//       const isExpanded = expandedCategories.includes(category.name);
//       const isSelected = selectedCategory === category.name;
//       const hasChildren = category.children && category.children.length > 0;

//       return (
//         <div key={category.id || category.name} className="px-1">
//           <MenuTreeNode
//             category={category}
//             isExpanded={isExpanded}
//             onToggle={() => toggleCategory(category.name)}
//             isSelected={isSelected}
//             onSelect={() => onSelectCategory(category.name)}
//             hasChildren={hasChildren}
//             level={level}
//             onEdit={handleEdit}
//             onDelete={handleDelete}
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
//     <>
//       <div className="rounded-lg p-4 bg-bg-primary shadow-md border border-border-default">
//         <div className="flex items-center justify-between mb-3 px-3">
//           <h3 className="text-lg font-semibold text-text-primary">
//             Categories
//           </h3>
//           <button
//             onClick={() => setShowAddModal(true)}
//             className="p-1.5 rounded-lg bg-action-primary text-white hover:opacity-90 transition-opacity"
//             title="Add new category"
//           >
//             <Plus size={18} />
//           </button>
//         </div>
//         <div className="space-y-1">
//           {categories && categories.length > 0 ? (
//             renderTree(categories)
//           ) : (
//             <div className="px-3 py-4 text-text-secondary">
//               No categories
//             </div>
//           )}
//         </div>
//       </div>
  
//       {/* Add Modal */}
//       {showAddModal && (
//         <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black bg-opacity-50">
//           <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary shadow-xl">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-xl font-semibold text-text-primary">Add New Category</h3>
//               <button
//                 onClick={() => {
//                   setShowAddModal(false);
//                   setNewCategoryName("");
//                   setNewCategoryDescription("");
//                 }}
//                 className="text-text-secondary hover:text-text-primary"
//               >
//                 <X size={24} />
//               </button>
//             </div>
  
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium mb-2 text-text-primary">
//                   Category Name *
//                 </label>
//                 <input
//                   type="text"
//                   value={newCategoryName}
//                   onChange={(e) => setNewCategoryName(e.target.value)}
//                   placeholder="Enter category name"
//                   className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                   required
//                 />
//               </div>
  
//               <div>
//                 <label className="block text-sm font-medium mb-2 text-text-primary">
//                   Description (optional)
//                 </label>
//                 <textarea
//                   value={newCategoryDescription}
//                   onChange={(e) => setNewCategoryDescription(e.target.value)}
//                   placeholder="Enter description"
//                   className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                   rows="3"
//                 />
//               </div>
  
//               <div className="flex gap-3 pt-4">
//                 <button
//                   onClick={() => {
//                     setShowAddModal(false);
//                     setNewCategoryName("");
//                     setNewCategoryDescription("");
//                   }}
//                   className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleAddCategory}
//                   className="flex-1 px-4 py-2 rounded-lg bg-action-primary text-white hover:opacity-90 transition-opacity"
//                 >
//                   Add Category
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
  
//       {/* Edit Modal */}
//       {showEditModal && editingCategory && (
//         <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black bg-opacity-50">
//           <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary shadow-xl">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-xl font-semibold text-text-primary">Edit Category</h3>
//               <button
//                 onClick={() => {
//                   setShowEditModal(false);
//                   setEditingCategory(null);
//                 }}
//                 className="text-text-secondary hover:text-text-primary"
//               >
//                 <X size={24} />
//               </button>
//             </div>
  
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium mb-2 text-text-primary">
//                   Category Name *
//                 </label>
//                 <input
//                   type="text"
//                   value={editName}
//                   onChange={(e) => setEditName(e.target.value)}
//                   placeholder="Enter category name"
//                   className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                   required
//                 />
//               </div>
  
//               <div>
//                 <label className="block text-sm font-medium mb-2 text-text-primary">
//                   Description
//                 </label>
//                 <textarea
//                   value={editDescription}
//                   onChange={(e) => setEditDescription(e.target.value)}
//                   placeholder="Enter description"
//                   className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                   rows="3"
//                 />
//               </div>
  
//               <div>
//                 <label className="block text-sm font-medium mb-2 text-text-primary">
//                   Add New Subcategory (optional)
//                 </label>
//                 <input
//                   type="text"
//                   value={editNewSubcategoryName}
//                   onChange={(e) => setEditNewSubcategoryName(e.target.value)}
//                   placeholder="New subcategory name"
//                   className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                 />
//               </div>
  
//               <div className="flex gap-3 pt-4">
//                 <button
//                   onClick={() => {
//                     setShowEditModal(false);
//                     setEditingCategory(null);
//                   }}
//                   className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleEditCategory}
//                   className="flex-1 px-4 py-2 rounded-lg bg-action-primary text-white hover:opacity-90 transition-opacity"
//                 >
//                   Save Changes
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
  
//       {/* Delete Modal */}
//       {showDeleteModal && deleteTarget && (
//         <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black bg-opacity-50">
//           <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary shadow-xl">
//             <h3 className="text-xl font-semibold mb-4 text-text-primary">Confirm Delete</h3>
//             <p className="mb-6 text-text-secondary">
//               Are you sure you want to delete <strong className="text-text-primary">{deleteTarget.name}</strong>? 
//               This action cannot be undone.
//             </p>
  
//             <div className="flex gap-3">
//               <button
//                 onClick={() => {
//                   setShowDeleteModal(false);
//                   setDeleteTarget(null);
//                 }}
//                 className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleDeleteCategory}
//                 className="flex-1 px-4 py-2 rounded-lg bg-action-danger text-white hover:opacity-90 transition-opacity"
//               >
//                 Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
  
// };

// export default MenuCategoryTree;
