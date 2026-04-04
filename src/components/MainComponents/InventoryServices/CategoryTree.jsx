// import { useState, useEffect, useCallback } from "react";
// import { createPortal } from "react-dom";
// import MenuTreeNode from "./TreeNode";
// import { Plus, X } from 'lucide-react';
// import axios from 'axios';
// import { v4 as uuidv4 } from 'uuid';
// import { jwtDecode } from 'jwt-decode';

// const CategoryTree = ({
//   categories = [],
//   selectedCategoryId,
//   onSelectCategory,
//   defaultOpenCategoryName = 'Dietery',
//   clientId,
//   token,
//   onCategoriesUpdate
// }) => {
//   const [expandedCategories, setExpandedCategories] = useState([]);
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

//   // Stabilize handlers with useCallback
//   const handleNewCategoryNameChange = useCallback((e) => {
//     setNewCategoryName(e.target.value);
//   }, []);

//   const handleNewCategoryDescriptionChange = useCallback((e) => {
//     setNewCategoryDescription(e.target.value);
//   }, []);

//   const handleEditNameChange = useCallback((e) => {
//     setEditName(e.target.value);
//   }, []);

//   const handleEditDescriptionChange = useCallback((e) => {
//     setEditDescription(e.target.value);
//   }, []);

//   const handleEditNewSubcategoryNameChange = useCallback((e) => {
//     setEditNewSubcategoryName(e.target.value);
//   }, []);

//   const closeAddModal = useCallback(() => {
//     setShowAddModal(false);
//     setNewCategoryName("");
//     setNewCategoryDescription("");
//   }, []);

//   const closeEditModal = useCallback(() => {
//     setShowEditModal(false);
//     setEditingCategory(null);
//   }, []);

//   const closeDeleteModal = useCallback(() => {
//     setShowDeleteModal(false);
//     setDeleteTarget(null);
//   }, []);

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
//     if (!categories || !selectedCategoryId) return;

//     const findPathById = (nodes, targetId, path = []) => {
//       for (const node of nodes) {
//         const newPath = [...path, node.id];

//         if (node.id === targetId) {
//           return newPath;
//         }

//         if (node.children?.length) {
//           const result = findPathById(node.children, targetId, newPath);
//           if (result) return result;
//         }
//       }
//       return null;
//     };

//     const path = findPathById(categories, selectedCategoryId);

//     if (path) {
//       setExpandedCategories(path); // opens parents automatically
//     }

//     buildParentMapFromCategories(categories);

//   }, [selectedCategoryId, categories]);


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

//   const toggleCategory = (categoryId) => {
//     setExpandedCategories(prev =>
//       prev.includes(categoryId)
//         ? prev.filter(id => id !== categoryId)
//         : [...prev, categoryId]
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
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const parentRes = await axios.get(
//         `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`,
//         { headers: { Authorization: `Bearer ${token}` } }
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
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       closeAddModal();

//       if (onCategoriesUpdate) onCategoriesUpdate();
//     } catch (err) {
//       console.error("❌ Error adding category:", err.response?.data || err);
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
//         await axios.post(
//           `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create_category`,
//           newSubPayload,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         finalSubcategories.push(newSubId);
//       } catch (err) {
//         console.error("Error creating subcategory:", err.response?.data || err);
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
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       setEditNewSubcategoryName("");
//       closeEditModal();

//       if (onCategoriesUpdate) onCategoriesUpdate();
//     } catch (err) {
//       console.error("Error editing category:", err.response?.data || err);
//     }
//   };

//   const handleDeleteCategory = async () => {
//     if (!deleteTarget) return;

//     try {
//       await axios.post(
//         `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete_category`,
//         { id: deleteTarget.id },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       closeDeleteModal();

//       if (onCategoriesUpdate) onCategoriesUpdate();
//     } catch (err) {
//       console.error("Delete error:", err.response?.data || err);
//     }
//   };

//   const handleEdit = (category) => {
//     if (category.id === 'all' || category.id === 'dietery' || category.name === 'All Categories') {
//       return;
//     }
//     setEditingCategory(category);
//     setEditName(category.name);
//     setEditDescription(category.description || "");
//     setEditNewSubcategoryName("");
//     setShowEditModal(true);
//   };

//   const handleDelete = (category) => {
//     if (category.id === 'all' || category.id === 'dietery' || category.name === 'All Categories') {
//       return;
//     }
//     setDeleteTarget(category);
//     setShowDeleteModal(true);
//   };

//   const renderTree = (items, level = 0) => {
//     return items.map((category) => {
//       const isExpanded = expandedCategories.includes(category.id);
//       const isSelected = selectedCategoryId === category.id;
//       const hasChildren = category.children && category.children.length > 0;

//       return (
//         <div key={category.id || category.name} className="px-1">
//           <MenuTreeNode
//             category={category}
//             isExpanded={isExpanded}
//             onToggle={() => toggleCategory(category.id)}
//             isSelected={isSelected}
//             onSelect={() => onSelectCategory(category.id)}
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
//   // Flatten all categories recursively for mobile view
//   const flattenAllCategories = (cats) => {
//     let flat = [];
//     const traverse = (items) => {
//       items.forEach(cat => {
//         // Only include categories with items (count > 0)
//         if (cat.count > 0) {
//           flat.push(cat);
//         }
//         if (cat.children && cat.children.length > 0) {
//           traverse(cat.children);
//         }
//       });
//     };
//     traverse(cats);
//     return flat;
//   };

//   const renderMobileCategories = (items) => {
//     const flatCategories = flattenAllCategories(items);

//     return flatCategories.map((category) => {
//       const isSelected = selectedCategoryId === category.id;


//       return (
//         <button
//           key={category.id || category.name}
//           onClick={() => onSelectCategory(category.id)}
//           className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-semibold text-sm transition-all shadow-sm flex-shrink-0 ${isSelected
//             ? 'bg-action-primary text-white shadow-md'
//             : 'bg-bg-primary text-text-primary border-2 border-border-default hover:border-action-primary hover:bg-bg-tertiary'
//             }`}
//         >
//           <span>{category.name}</span>
//           {typeof category.count !== 'undefined' && (
//             <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isSelected
//               ? 'bg-white text-action-primary'
//               : 'bg-bg-tertiary text-text-secondary'
//               }`}>
//               {category.count}
//             </span>
//           )}
//         </button>
//       );
//     });
//   };
//   return (
//     <>
//       {/* Desktop: Tree View */}
//       <div className="hidden lg:block rounded-lg p-4 bg-bg-primary shadow-md border border-border-default">
//         <div className="flex items-center justify-between mb-3 px-3">
//           <h3 className="text-lg font-semibold text-text-primary">
//             All  Categories
//           </h3>

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
//       {/* Mobile: Horizontal Scrollable List */}
//       <div className="lg:hidden mb-4">
//         <div className="flex items-center justify-between mb-3 px-2">
//           <h3 className="text-base font-semibold text-text-primary">
//             Categories
//           </h3>
//           <button
//             onClick={() => setShowAddModal(true)}
//             className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity shadow-md flex-shrink-0"
//             title="Add new category"
//           >
//             <Plus size={16} />
//           </button>
//         </div>

//         <div
//           className="overflow-x-auto max-w-[350px] overflow-y-hidden scrollbar-hide px-2 touch-pan-x"
//           style={{
//             WebkitOverflowScrolling: 'touch',
//             scrollbarWidth: 'none',
//             msOverflowStyle: 'none'
//           }}
//         >
//           <div className="flex gap-2 pb-2 w-max">
//             {categories && categories.length > 0 ? (
//               renderMobileCategories(categories)
//             ) : (
//               <div className="text-text-secondary text-sm py-2">
//                 No categories
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Modals remain the same */}
//       {showAddModal && createPortal(
//         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
//           <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary shadow-xl">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-xl font-semibold text-text-primary">Add New Category</h3>
//               <button onClick={closeAddModal} className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity">
//                 <X className="h-5 w-5" />
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
//                   onChange={handleNewCategoryNameChange}
//                   placeholder="Enter category name"
//                   className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                   autoFocus
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium mb-2 text-text-primary">
//                   Description (optional)
//                 </label>
//                 <textarea
//                   value={newCategoryDescription}
//                   onChange={handleNewCategoryDescriptionChange}
//                   placeholder="Enter description"
//                   className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                   rows="3"
//                 />
//               </div>

//               <div className="flex gap-3 pt-4">
//                 <button
//                   onClick={closeAddModal}
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
//         </div>,
//         document.body
//       )}

//       {showEditModal && editingCategory && createPortal(
//         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
//           <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary shadow-xl">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-xl font-semibold text-text-primary">Edit Category</h3>
//               <button onClick={closeEditModal} className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity">
//                 <X className="h-5 w-5" />
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
//                   onChange={handleEditNameChange}
//                   placeholder="Enter category name"
//                   className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium mb-2 text-text-primary">
//                   Description
//                 </label>
//                 <textarea
//                   value={editDescription}
//                   onChange={handleEditDescriptionChange}
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
//                   onChange={handleEditNewSubcategoryNameChange}
//                   placeholder="New subcategory name"
//                   className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                 />
//               </div>

//               <div className="flex gap-3 pt-4">
//                 <button
//                   onClick={closeEditModal}
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
//         </div>,
//         document.body
//       )}

//       {showDeleteModal && deleteTarget && createPortal(
//         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
//           <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary shadow-xl">
//             <h3 className="text-xl font-semibold mb-4 text-text-primary">Confirm Delete</h3>
//             <p className="mb-6 text-text-secondary">
//               Are you sure you want to delete <strong className="text-text-primary">{deleteTarget?.name}</strong>?
//               This action cannot be undone.
//             </p>

//             <div className="flex gap-3">
//               <button
//                 onClick={closeDeleteModal}
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
//         </div>,
//         document.body
//       )}
//     </>
//   );
// };

// export default CategoryTree;



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