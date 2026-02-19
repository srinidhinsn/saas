import { useState, useEffect, useCallback,useMemo } from "react";
import { createPortal } from "react-dom";
import MenuTreeNode from "./MenuTreeNode";
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const isRootCategory = (cat, root) => {
  if (!cat || !root) return false;

  return (
    String(cat.id).toLowerCase() === String(root).toLowerCase() ||
    String(cat.name).toLowerCase() === String(root).toLowerCase()
  );
};
    
const MenuCategoryTree = ({
  categories = [],
  selectedCategoryId,
  onSelectCategory,
  clientId,
  token,
  onCategoriesUpdate,
  menuConfig
}) => {
  // const [expandedCategories, setExpandedCategories] = useState(['All Categories']);
  const [expandedCategories, setExpandedCategories] = useState([]);

  // Drag & Drop states
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);

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
  const getDisplayCategories = () => {
    if (!categories?.length || !menuConfig) return [];
  
    const { root } = menuConfig;
  
    // find configured root
    const findRoot = (nodes) => {
      for (const node of nodes) {
        if (
          String(node.id).toLowerCase() === String(root).toLowerCase() ||
          String(node.name).toLowerCase() === String(root).toLowerCase()
        ) {
          return node;
        }
        if (node.children?.length) {
          const found = findRoot(node.children);
          if (found) return found;
        }
      }
      return null;
    };
  
    const rootNode = findRoot(categories);
    if (!rootNode) return categories;
  
    // 🔥 KEY LOGIC:
    // Skip one level
    const flattenedGrandChildren = (rootNode.children || [])
      .flatMap(child => child.children || []);
  
    // Add a virtual "All Categories" node
    return [
      {
        ...rootNode,
        id: rootNode.id,
        name: "All Categories",
        children: flattenedGrandChildren,
        isVirtualRoot: true
      }
    ];
  };
  
  const displayCategories = useMemo(() => getDisplayCategories(), [categories, menuConfig]);

  

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
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
      + "_" + timestamp
    );
  };
  const getCategoriesAtLevel = (nodes, targetLevel, level = 1) => {
    let result = [];
  
    for (const node of nodes) {
      if (level === targetLevel) {
        result.push(node);
      }
      if (node.children?.length) {
        result = result.concat(
          getCategoriesAtLevel(node.children, targetLevel, level + 1)
        );
      }
    }
  
    return result;
  };
  
  const findPathById = (nodes, targetId, path = []) => {const quickMenuCategories = getCategoriesAtLevel(
    categories,
    MENU_HIERARCHY_LEVEL
  );
  
    for (const node of nodes) {
      const newPath = [...path, node.id];
      if (node.id === targetId) return newPath;
      if (node.children?.length) {
        const found = findPathById(node.children, targetId, newPath);
        if (found) return found;
      }
    }
    return null;
  };
  useEffect(() => {
    if (!selectedCategoryId || !displayCategories.length) return;
  
    const expandParents = (nodes, targetId, parents = []) => {
      for (const node of nodes) {
        if (node.id === targetId) return parents;
  
        if (node.children?.length) {
          const found = expandParents(node.children, targetId, [...parents, node.id]);
          if (found) return found;
        }
      }
      return null;
    };
  
    const parents = expandParents(displayCategories, selectedCategoryId);
  
    setExpandedCategories(prev => {
      const same =
        prev.length === (parents?.length || 0) &&
        prev.every((v, i) => v === parents[i]);
  
      return same ? prev : parents || [];
    });
  
  }, [selectedCategoryId, displayCategories]);
  
  
  useEffect(() => {
    if (!displayCategories.length) return;
  
    setExpandedCategories([displayCategories[0].id]);
  }, [displayCategories]);
  
  
  const buildLocalParentMap = (cats) => {
    const map = {};
    const traverse = (nodes, parentId = null) => {
      nodes.forEach(n => {
        if (parentId && n.id !== "all") {
          map[n.id] = parentId;
        }
        if (n.children?.length) {
          traverse(n.children, n.id);
        }
      });
    };
    traverse(cats);
    return map;
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
    if (categoryId === "dietery" && subcategoryIds.length === 0) return;

    const category = await fetchCategoryById(categoryId);
    if (!category) return;

    await axios.post(
      `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category`,
      {
        id: categoryId,
        client_id: clientId,
        name: category.name,
        description: category.description || "",
        sub_categories: [...new Set(subcategoryIds)],
        overwrite_subcategories: true, // ✅ ONLY THIS
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  };

  const updateSlugsRecursively = async (categoryId) => {
    const slug = generateHierarchicalSlug(categoryId, categories);

    const category = await fetchCategoryById(categoryId);
    if (!category) return;

    await axios.post(
      `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category`,
      {
        id: categoryId,
        client_id: clientId,
        name: category.name,
        description: category.description || "",
        slug,
        overwrite_subcategories: false,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const findNode = (nodes) => {
      for (const n of nodes) {
        if (n.id === categoryId) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(categories);
    for (const child of node?.children || []) {
      await updateSlugsRecursively(child.id);
    }
  };

  const findParentIdFromTree = (nodes, childId, parentId = null) => {
    for (const node of nodes) {
      if (node.id === childId) return parentId;
      if (node.children?.length) {
        const found = findParentIdFromTree(node.children, childId, node.id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleCategoryReorder = async (draggedCat, targetCat, position) => {
    const draggedParentId = findParentIdFromTree(categories, draggedCat.id);
    const targetParentId =
      position === "inside"
        ? targetCat.id
        : findParentIdFromTree(categories, targetCat.id);

    if (!draggedParentId || !targetParentId) return;

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
      return findNode(categories)?.children?.map(c => c.id) || [];
    };

    let oldSubs = getChildrenIds(draggedParentId).filter(id => id !== draggedCat.id);
    let newSubs = getChildrenIds(targetParentId).filter(id => id !== draggedCat.id);

    if (position === "inside") {
      newSubs.push(draggedCat.id);
    } else {
      const idx = newSubs.indexOf(targetCat.id);
      newSubs.splice(position === "above" ? idx : idx + 1, 0, draggedCat.id);
    }

    // update backend
    await updateCategorySubcategories(draggedParentId, oldSubs);

    if (draggedParentId !== targetParentId) {
      await updateCategorySubcategories(targetParentId, newSubs);
    }


    // refresh UI tree
    onCategoriesUpdate?.();
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

  const normalizeSlugPart = (name) => {
    return name
      ?.trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");
  };

  const generateHierarchicalSlug = (categoryId, categories) => {
    const categoryMap = {};
    const parentMap = buildLocalParentMap(categories);

    const buildMap = (nodes) => {
      nodes.forEach(cat => {
        categoryMap[cat.id] = cat;
        if (cat.children?.length) buildMap(cat.children);
      });
    };
    buildMap(categories);

    const path = [];
    let currentId = categoryId;
    const visited = new Set();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const cat = categoryMap[currentId];
      if (!cat) break;

      path.unshift(
        cat.name
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "")
      );

      currentId = parentMap[currentId];
    }

    return "_" + path.join("_");
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
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
    if (!newCategoryName.trim()) return;
  
    let userId = "system";
    try {
      userId = jwtDecode(token)?.user_id || userId;
    } catch {}
  
    const newId = generateCategoryIdFromName(newCategoryName);
  
    try {
  
      // 1️⃣ create category
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create_category`,
        {
          id: newId,
          client_id: clientId,
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim(),
          sub_categories: [],
          created_by: userId,
          updated_by: userId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      // 2️⃣ fetch REAL root from backend
      const rootId = menuConfig.root;
      const root = await fetchCategoryById(rootId);
  
      const existingSubs = root?.subCategories?.map(c => c.id) || [];
  
      // 3️⃣ append (NOT overwrite)
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category`,
        {
          id: rootId,
          client_id: clientId,
          name: root.name,
          description: root.description || "",
          sub_categories: [...new Set([...existingSubs, newId])],
          overwrite_subcategories: true,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      closeAddModal();
      onCategoriesUpdate?.();
  
    } catch (err) {
      console.error(err);
      alert("Failed to add category");
    }
  };
  

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    let userId = "system";
    try {
      userId = jwtDecode(token)?.user_id || userId;
    } catch { }

    try {
      let finalSubs = editingCategory.children?.map(c => c.id) || [];

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
            created_by: userId,
            updated_by: userId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        finalSubs.push(newSubId);
      }

      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update_category`,
        {
          id: editingCategory.id,
          client_id: clientId,
          name: editName.trim(),
          description: editDescription.trim(),
          sub_categories: finalSubs,
          overwrite_subcategories: true,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // regenerate slugs
      await updateSlugsRecursively(editingCategory.id);

      closeEditModal();
      onCategoriesUpdate?.();
    } catch (err) {
      console.error(err);
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
      const isSelected = selectedCategoryId === category.id;
      const canEdit = category.id !== 'dietery' && category.name !== 'All Categories';

      return (
        <div
          key={category.id || category.name}
          className="relative flex-shrink-0"
        >
          <button
            onClick={() => {
              onSelectCategory(category.id);
              // if (category.children?.length) {
              //   setSidebarCategories(category.children);
              // }
            }}

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
              ${isSelected
                ? 'bg-action-primary text-text-white shadow-md'
                : 'bg-bg-primary  border-2 border-border-default hover:border-action-primary'
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
      const isDragging = draggedItem?.id === category.id;
      const isDragOver = dragOverItem?.id === category.id;

      return (
        <div key={category.id} className="space-y-1">
          <MenuTreeNode
            category={category}
            level={level}
            hasChildren={hasChildren}
            isLast={index === items.length - 1}
            isExpanded={expandedCategories.includes(category.id)}
            isSelected={
              selectedCategoryId === category.id ||
              (selectedCategoryId === null && isRootCategory(category, menuConfig?.root))
            }
            onSelect={() => onSelectCategory(category.id)}
            onToggle={() => toggleCategory(category.id)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isDragging={isDragging}
            dragOverPosition={isDragOver ? dragOverPosition : null}
          />

          {hasChildren && expandedCategories.includes(category.id) && (
            <div className="mt-1">
              {renderTree(category.children, level + 1)}
            </div>
          )}
        </div>
      );
    });


  return (
    <>
      <div className="hidden lg:block rounded-xl p-4 h-[88.5vh] overflow-auto bg-bg-primary border border-border-default shadow-sm">
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
            renderTree(displayCategories)

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
              // renderMobileCategories(categories)
              renderMobileCategories(displayCategories)
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