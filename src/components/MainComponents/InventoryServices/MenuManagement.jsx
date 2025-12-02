

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, X, Search, Edit, Trash2, Upload, Download } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import MenuCategoryTree from './Tree&CategoryManage/MenuCategoryTree';
import { jwtDecode } from "jwt-decode";
import MenuImagePreview from './Tree&CategoryManage/MenuImagePreview';



// Dropdown Checkbox Component
const DropdownCheckbox = ({ selected = [], options = [], onChange, label = "Select Add-ons" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSelect = (id) => {
    const newSelected = selected.includes(id)
      ? selected.filter(val => val !== id)
      : [...selected, id];
    onChange(newSelected);
  };

  return (
    <div ref={ref} className="relative w-full">
      <div
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2 rounded-lg bg-bg-primary border border-border-default text-text-primary cursor-pointer flex items-center justify-between"
      >
        <span className="text-sm">
          {selected.length > 0 ? `${selected.length} ${label} selected` : label}
        </span>
        <span className="text-text-secondary">▾</span>
      </div>
      {open && (
        <div className="absolute z-10 w-full mt-1 bg-bg-primary border border-border-default rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.map(option => (
            <label key={option.id} className="flex items-center px-4 py-2 hover:bg-bg-secondary cursor-pointer text-text-primary">
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => toggleSelect(option.id)}
                className="mr-3"
              />
              <span className="text-sm">{option.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Menu Management Component
const MenuManagement = ({ clientId, token }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  //Image Picker
  const [newItemImage, setNewItemImage] = useState(null);
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  // Add these states
  const [editItemImage, setEditItemImage] = useState(null);
  const [editItemImageUrl, setEditItemImageUrl] = useState('');
  // Form states
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category_id: '',
    unit_price: '',
    discount: '',
    availability: '',
    unit: '',
    serving_quantity:"",
    serving_unit:"",
    line_item_id: []
  });
  // add near your other state declarations
  const [categoriesFlat, setCategoriesFlat] = useState([]);

  // Bulk operations
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});
  // realm + user metadata
  const [realm, setRealm] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  // decode token once to extract realm & user id
  useEffect(() => {
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setRealm(decoded.realm || '');
      setCurrentUserId(decoded.user_id || decoded.sub || null);
    } catch (err) {
      console.warn('Failed to decode token for realm/user:', err);
    }
  }, [token]);
  // Robust flatten for your current category-tree shape (handles `children` or `subCategories`)
  const flattenCategoriesGeneric = (tree) => {
    const flat = [];
    const recurse = (nodes, parentId = null) => {
      (nodes || []).forEach(node => {
        if (!node) return;
        // unify fields (some components use subCategories, some use children)
        const children = node.subCategories || node.children || [];
        flat.push({
          id: node.id,
          name: (node.name || '').trim(),
          parent_id: node.parentId ?? node.parent_id ?? parentId ?? null
        });
        if (children && children.length) recurse(children, node.id);
      });
    };
    recurse(tree);
    return flat;
  };

  // returns array of category names from root -> the given categoryId (works with UUID or cat_... ids)
  const buildCategoryPath = (categoryId) => {
    if (!categoryId) return [];

    // categories is an array of { id, name, parent_id } from your fetch
    const path = [];
    let currentId = categoryId;

    // Avoid infinite loop
    const visited = new Set();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const current = categories.find(cat => cat && cat.id === currentId);
      if (!current) break;
      // normalize name and replace whitespace with underscore
      path.unshift((current.name || '').trim().replace(/\s+/g, '_'));
      // support both parent_id and parentId fields
      currentId = current.parent_id ?? current.parentId ?? null;
    }

    return path; // e.g. ['Dietery','Non_Veg','Gravies']
  };

  // generate slug from categoryId (or category object or name) + item name
  const generateSlug = (categoryIdOrObjOrName, itemName) => {
    // If caller passed a category object, extract id
    let catId = null;
    if (!categoryIdOrObjOrName) {
      catId = null;
    } else if (typeof categoryIdOrObjOrName === 'object' && categoryIdOrObjOrName.id) {
      catId = categoryIdOrObjOrName.id;
    } else {
      catId = categoryIdOrObjOrName;
    }

    const parts = buildCategoryPath(catId);

    const itemPart = (itemName || '')
      .trim()
      .replace(/\s+/g, '_')         // spaces -> underscore
      .replace(/[^a-zA-Z0-9_]/g, ''); // remove special chars

    if (itemPart) parts.push(itemPart);

    // join with single underscore, no leading underscore
    return parts.filter(Boolean).join(' _'); // e.g. Dietery_Non_Veg_Gravies_Mutton_Gravy
  };



  const flattenCategoryTree = (tree, level = 0, parentId = null) => {
    let flatList = [];
    tree.forEach(category => {
      flatList.push({
        id: category.id,
        name: category.name,
        level: level,
        parentId: parentId,
        hasChildren: category.subCategories && category.subCategories.length > 0,
      });
      if (category.subCategories && category.subCategories.length > 0) {
        flatList = flatList.concat(
          flattenCategoryTree(category.subCategories, level + 1, category.id)
        );
      }
    });
    return flatList;
  };
  // Add this helper function after your state declarations and before fetchData

  // Helper function to get category ID from name
  const getCategoryIdByName = (categoryName) => {
    if (!categoryName || categoryName === 'All Categories' || categoryName === 'All') return '';
    // search tree style first
    const findInTree = (nodes) => {
      for (const n of nodes || []) {
        if (!n) continue;
        if ((n.name || '').toLowerCase() === (categoryName || '').toLowerCase()) return n.id;
        const children = n.subCategories || n.children;
        if (children && children.length) {
          const found = findInTree(children);
          if (found) return found;
        }
      }
      return null;
    };
    const byTree = findInTree(categories);
    if (byTree) return byTree;
    // fallback: search flattened list (if you've stored flattened categories elsewhere)
    const flat = Array.isArray(categories) ? categories : [];
    const matched = flat.find(c => c && (c.name || '').toLowerCase() === (categoryName || '').toLowerCase());
    return matched ? matched.id : null;
  };


  // Updated handleAddItem function
  const handleAddItem = async () => {
    try {
      let imageId = null;

      if (newItemImage) {
        imageId = await uploadImageToDocumentService(newItemImage);
      }

      const categoryId = typeof selectedCategory === 'object' && selectedCategory?.id
        ? selectedCategory.id
        : getCategoryIdByName(selectedCategory);

      // (optional) legacy generator kept — used only if you intentionally want to generate a new category id
      const generateCategoryId = (parentId = null) => {
        const timestamp = Date.now();
        return parentId ? `subcat_${timestamp}` : `cat_${timestamp}`;
      };

      // Choose category_id for DB (use existing if present; if you really want to generate a new category id, use generateCategoryId)
      const finalCategoryId = categoryId
        ? categoryId
        : generateCategoryId(typeof selectedCategory === 'object' ? selectedCategory.id : null);

      // Build slug using category name path (not the raw id)
      const slug = generateSlug(finalCategoryId, newItem.name);


      // who created this?
      const created_by = currentUserId || localStorage.getItem('user_id') || 'system';

      const payload = {
        ...newItem,
        client_id: clientId,
        category_id: finalCategoryId,
        image_id: imageId,
        realm: realm || newItem.realm || '',
        slug,
        unit_price: parseFloat(newItem.unit_price) || 0,
        discount: parseFloat(newItem.discount) || 0,
        availability: parseInt(newItem.availability) || 0,
        created_by,
        updated_by: created_by
      };

      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchData();
      setShowAddModal(false);
      setNewItem({
        name: '',
        description: '',
        category_id: '',
        unit_price: '',
        discount: '',
        availability: '',
        unit: '',
        line_item_id: []
      });
      setNewItemImage(null);
      setNewItemImageUrl('');
      alert('Item added successfully!');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };
  const handleEditItem = async () => {
    try {
      let imageId = editingItem.image_id;

      if (editItemImage) {
        imageId = await uploadImageToDocumentService(editItemImage);
      }
      const categoryId = editingItem.category_id || (typeof selectedCategory === 'object' ? selectedCategory.id : getCategoryIdByName(selectedCategory));
      const finalCategoryId = categoryId || (editingItem.parent_id ? editingItem.parent_id : null); // fallback if you want

      // Build readable slug from names (not raw id)
      const slug = generateSlug(finalCategoryId, editingItem.name);


      const updated_by = currentUserId || localStorage.getItem('user_id') || 'system';

      const payload = {
        ...editingItem,
        client_id: clientId,
        category_id: finalCategoryId, // unchanged (UUID)
        image_id: imageId,
        realm: editingItem.realm || realm || '',
        slug,
        unit_price: parseFloat(editingItem.unit_price) || 0,
        discount: parseFloat(editingItem.discount) || 0,
        availability: parseInt(editingItem.availability) || 0,
        updated_by
      };

      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchData();

      setShowEditModal(false);
      setEditingItem(null);
      setEditItemImage(null);
      setEditItemImageUrl('');
      alert('Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const fetchData = useCallback(async () => {
    if (!clientId || !token) {
      console.error('Missing clientId or token');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [catRes, itemRes] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);

      const fullTree = catRes.data.data.filter(c => c.name?.toLowerCase() !== "all");
      const subcategoryIds = new Set();
      fullTree.forEach(cat => {
        if (cat.subCategories && cat.subCategories.length > 0) {
          cat.subCategories.forEach(sub => subcategoryIds.add(sub.id));
        }
      });

      const topLevelCategories = fullTree.filter(cat => !subcategoryIds.has(cat.id));
      const flatCategories = flattenCategoryTree(topLevelCategories);
      // normalize flatCategories for lookup (ensure parent property name is consistent)
      const normalizedFlat = flatCategories.map(cat => ({
        id: cat.id,
        name: (cat.name || '').trim(),
        parentId: cat.parentId ?? cat.parent_id ?? null
      }));
      setCategoriesFlat(normalizedFlat);

      const enrichedItems = itemRes.data.data.map(item => {
        const cat = flatCategories.find(c => c.id === item.category_id);
        return {
          ...item,
          category: cat ? cat.name : "Uncategorized"
        };
      });

      setMenuItems(enrichedItems);

      const getCategoryCount = (categoryName) => {
        return enrichedItems.filter(item => {
          if (categoryName === 'All Categories') return true;
          return item.category === categoryName;
        }).length;
      };

      const buildCategoryTree = (flatCats) => {
        const categoryMap = new Map();
        flatCats.forEach(cat => {
          categoryMap.set(cat.id, {
            ...cat,
            count: getCategoryCount(cat.name),
            children: []
          });
        });

        const tree = [];
        categoryMap.forEach(cat => {
          if (cat.parentId && categoryMap.has(cat.parentId)) {
            categoryMap.get(cat.parentId).children.push(cat);
          } else {
            tree.push(cat);
          }
        });

        return tree;
      };

      const categoryTree = [
        {
          id: 'all',
          name: 'All Categories',
          count: enrichedItems.length,
          children: []
        },
        ...buildCategoryTree(flatCategories)
      ];

      setCategories(categoryTree);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, token]); // important dependencies

  useEffect(() => {


    fetchData();
  }, [fetchData]);

  const getFilteredItems = () => {
    const q = (searchQuery || '').trim().toLowerCase();

    let items = menuItems;
    if (selectedCategory && selectedCategory !== 'All Categories') {
      items = items.filter(item => item.category === selectedCategory);
    }

    if (q.length === 0) return items;

    return items.filter(item =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q)
    );
  };
  // Add these functions after your existing handleDrag, handleDrop, etc.
  const handleEditDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleEditDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleEditImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleEditImageFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setEditItemImage(file);
      setEditItemImageUrl(URL.createObjectURL(file));
    } else {
      alert('Please upload a valid image file');
    }
  };

  const handleEditImageUrlPaste = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'pasted-image.jpg', { type: blob.type });
      handleEditImageFile(file);
    } catch (error) {
      alert('Failed to load image from URL');
    }
  };
  const filteredItems = getFilteredItems();
  const uploadImageToDocumentService = async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("description", "Menu item image");
      formData.append("category_id", "menu_images");
      formData.append("realm", "menu");
      formData.append("created_by", localStorage.getItem("user_id") || "system");

      const response = await axios.post(
        `${import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}/${clientId}/document/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data.data.id; // Returns document ID
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleImageFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setNewItemImage(file);
      setNewItemImageUrl(URL.createObjectURL(file));
    } else {
      alert('Please upload a valid image file');
    }
  };

  const handleImageUrlPaste = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'pasted-image.jpg', { type: blob.type });
      handleImageFile(file);
    } catch (error) {
      alert('Failed to load image from URL');
    }
  };

  // Delete Item
  const handleDeleteItem = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
        { id: deleteTarget.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMenuItems(menuItems.filter(item => item.id !== deleteTarget.id));
      setShowDeleteModal(false);
      setDeleteTarget(null);
      alert('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      alert('No items selected');
      return;
    }

    const confirm = window.confirm(`Delete ${selectedRows.length} selected items?`);
    if (!confirm) return;

    try {
      await Promise.all(
        selectedRows.map(id =>
          axios.post(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
            { id },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      setMenuItems(menuItems.filter(item => !selectedRows.includes(item.id)));
      setSelectedRows([]);
      setSelectAllChecked(false);
      alert('Selected items deleted successfully!');
    } catch (error) {
      console.error('Error deleting items:', error);
      alert('Failed to delete some items');
    }
  };

  // Bulk Update
  const handleBulkUpdate = async () => {
    if (selectedRows.length === 0) {
      alert('No items selected');
      return;
    }

    try {
      await Promise.all(
        selectedRows.map(id => {
          const editedData = bulkEditData[id] || {};
          const originalItem = menuItems.find(item => item.id === id);
          const payload = {
            ...originalItem,
            ...editedData,
            client_id: clientId
          };

          return axios.post(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        })
      );

      // Refresh items
      const itemRes = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMenuItems(itemRes.data.data);

      setShowBulkModal(false);
      setSelectedRows([]);
      setBulkEditData({});
      setSelectAllChecked(false);
      alert('Selected items updated successfully!');
    } catch (error) {
      console.error('Error updating items:', error);
      alert('Failed to update some items');
    }
  };

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      // Map category id -> name quickly (categoriesFlat set in fetchData)
      const catNameById = (id) => {
        if (!id) return "Uncategorized";
        // categoriesFlat entries: { id, name, parentId }
        const found = (categoriesFlat || []).find(c => c && c.id === id);
        return found ? found.name : ((typeof id === 'string' && id.startsWith('cat_')) ? id : "Unknown");
      };

      const exportData = filteredItems.map(item => {
        // make sure line_item_id stored as array or string; normalize to comma-separated ids
        let lineItemStr = "";
        if (Array.isArray(item.line_item_id)) {
          lineItemStr = item.line_item_id.join(", ");
        } else if (typeof item.line_item_id === "string") {
          lineItemStr = item.line_item_id;
        } else if (item.line_item_id == null) {
          lineItemStr = "";
        } else {
          // fallback: attempt JSON stringify
          try { lineItemStr = JSON.stringify(item.line_item_id); } catch { lineItemStr = String(item.line_item_id); }
        }

        return {
          ID: item.id ?? item.inventory_id ?? "",
          Name: item.name ?? "",
          Description: item.description ?? "",
          Category: catNameById(item.category_id) || item.category || "Unknown",
          Unit: item.unit ?? "",
          Unit_Price: typeof item.unit_price === "number" ? item.unit_price : (item.unit_price ? parseFloat(item.unit_price) : 0),
          Unit_CST: typeof item.unit_cst === "number" ? item.unit_cst : (item.unit_cst ? parseFloat(item.unit_cst) : 0),
          Unit_GST: typeof item.unit_gst === "number" ? item.unit_gst : (item.unit_gst ? parseFloat(item.unit_gst) : 0),
          Total_Unit_Price: typeof item.unit_total_price === "number" ? item.unit_total_price : (item.unit_total_price ? parseFloat(item.unit_total_price) : 0),
          Total_Price: typeof item.total_price === "number" ? item.total_price : (item.total_price ? parseFloat(item.total_price) : 0),
          CST: typeof item.cst === "number" ? item.cst : (item.cst ? parseFloat(item.cst) : 0),
          GST: typeof item.gst === "number" ? item.gst : (item.gst ? parseFloat(item.gst) : 0),
          Discount: typeof item.discount === "number" ? item.discount : (item.discount ? parseFloat(item.discount) : 0),
          Availability: typeof item.availability === "number" ? item.availability : (item.availability ? parseInt(item.availability) : 0),
          Realm: item.realm ?? realm ?? "",
          Dietary: item.dietary_type ?? item.dietary ?? "",
          Slug: item.slug ?? "",
          Line_Item_IDs: lineItemStr
        };
      });

      // Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData, {
        header: [
          "ID", "Name", "Description", "Category", "Unit", "Unit_Price", "Unit_CST", "Unit_GST", "Total_Unit_Price", "Total_Price",
          "CST", "GST", "Discount", "Availability", "Realm", "Dietary", "Slug", "Line_Item_IDs"
        ]
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "MenuItems");

      // Use a descriptive filename
      const filename = `menu_items_${(new Date()).toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export to Excel failed — check console for details.");
    }
  };


  // Import from Excel
  // Import from Excel
  const handleImportFromExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet);

        // Ask user if they want to replace all existing items
        const confirmReplace = window.confirm(
          `This will DELETE all ${menuItems.length} existing menu items and import ${parsedData.length} new items from the Excel file.\n\nDo you want to continue?`
        );

        if (!confirmReplace) {
          e.target.value = ''; // Reset file input
          return;
        }

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        // Step 1: Delete all existing items
        try {
          await Promise.all(
            menuItems.map(item =>
              axios.post(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
                { id: item.id },
                { headers: { Authorization: `Bearer ${token}` } }
              )
            )
          );
          console.log(`Deleted ${menuItems.length} existing items`);
        } catch (deleteErr) {
          console.error('Error deleting existing items:', deleteErr);
          alert('Failed to delete existing items. Import cancelled.');
          e.target.value = '';
          return;
        }

        // Step 2: Import new items from Excel
        for (let i = 0; i < parsedData.length; i++) {
          const row = parsedData[i];

          try {
            // Match the exact column names from export
            const newItem = {
              client_id: clientId,
              name: row.Name || row.name || "",
              description: row.Description || row.description || "",
              category_id: row.Category_ID || row.category_id || "",
              unit_price: parseFloat(row.Unit_Price || row.unit_price || 0),
              discount: parseFloat(row.Discount || row.discount || 0),
              availability: parseInt(row.Availability || row.availability || 0),
              unit: row.Unit || row.unit || "",
              line_item_id: row.Line_Item_ID
                ? (typeof row.Line_Item_ID === 'string'
                  ? row.Line_Item_ID.split(',').filter(Boolean)
                  : row.Line_Item_ID)
                : []
            };

            // Validate required fields
            if (!newItem.name) {
              throw new Error('Name is required');
            }

            await axios.post(
              `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
              newItem,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            successCount++;
          } catch (itemErr) {
            failCount++;
            errors.push(`Row ${i + 2}: ${itemErr.response?.data?.message || itemErr.message}`);
            console.error(`Error importing row ${i + 2}:`, itemErr.response?.data || itemErr);
          }
        }

        // Step 3: Refresh items
        const itemRes = await axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMenuItems(itemRes.data.data);

        // Step 4: Show detailed results
        if (failCount > 0) {
          alert(`Import completed with errors:\n✓ Success: ${successCount}\n✗ Failed: ${failCount}\n\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`);
        } else {
          alert(`✅ Import successful!\n\nDeleted: ${menuItems.length} old items\nImported: ${successCount} new items`);
        }

        // Reset file input
        e.target.value = '';
      } catch (err) {
        console.error('Import Error:', err);
        alert(`Import failed: ${err.message}\n\nPlease check the console for details.`);
        e.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const toggleSelectAll = () => {
    if (!selectAllChecked) {
      setSelectedRows(filteredItems.map(item => item.id));
      setSelectAllChecked(true);
    } else {
      setSelectedRows([]);
      setSelectAllChecked(false);
    }
  };

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      const t = setTimeout(() => searchInputRef.current.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 border-action-primary"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Search Bar */}
      <div className={`fixed top-36 right-5 z-50 flex items-center transition-all duration-300 ease-in-out ${searchOpen ? 'w-80' : 'w-12'}`}>
        <div className={`flex items-center gap-2 rounded-full shadow-lg overflow-hidden transition-colors duration-200 ${searchOpen ? 'bg-action-primary px-3 py-2' : 'bg-action-primary p-2'}`}>
          <button
            onClick={() => setSearchOpen(s => !s)}
            className={`flex items-center justify-center border-none p-0 h-6 w-6 ${searchOpen ? 'text-text-primary' : 'text-text-white'}`}
          >
            <Search size={20} />
          </button>

          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className={`transition-all duration-200 bg-action-primary text-text-white outline-none text-sm ${searchOpen ? 'opacity-100 w-full' : 'opacity-0 w-0 pointer-events-none'}`}
          />

          {searchOpen && (
            <button
              onClick={() => {
                if (searchQuery.trim() !== "") {
                  setSearchQuery("");
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                } else {
                  setSearchOpen(false);
                }
              }}
              className="ml-1 text-xs px-2 py-1 rounded border-border-default bg-transparent text-text-secondary"
            >
              {searchQuery.trim() === "" ? "Close" : "Clear"}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto px-4 py-2">
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
          >
            <Plus size={20} />
            Add Item
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
          >
            <Edit size={20} />
            Bulk Update
          </button>

          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
          >
            <Download size={20} />
            Export
          </button>

          <button
            onClick={() => document.getElementById('excelInput').click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
          >
            <Upload size={20} />
            Import
          </button>

          <input
            type="file"
            id="excelInput"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={handleImportFromExcel}
          />
        </div>

        <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <MenuCategoryTree
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                defaultOpenCategoryName="Dietery"
                clientId={clientId}
                token={token}
                onCategoriesUpdate={() => {
                  // Refresh categories after add/edit/delete
                  fetchData();
                }}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <h2 className="text-xl lg:text-2xl font-semibold text-text-primary">
                {selectedCategory}
                <span className="text-sm ml-2 text-text-primary">
                  ({filteredItems.length} items)
                </span>
              </h2>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5">
              {filteredItems.map(item => {
                const discountPercent = item.discount && item.unit_price && Number(item.discount) > 0
                  ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(1).replace(/\.0$/, '')
                  : null;

                return (
                  <div key={item.id} className="bg-bg-primary rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group relative">
                    <div className="relative h-36 sm:h-40 md:h-44 lg:h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {discountPercent && (
                        <div className="absolute top-2 left-2 bg-action-danger text-text-white text-xs font-bold px-2 py-1 rounded-md z-10 shadow-md">
                          {discountPercent}% OFF
                        </div>
                      )}

                      {item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0 && (
                        <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-md z-10 shadow-md flex items-center gap-1">
                          <Plus size={12} />
                          <span>{item.line_item_id.length} add-ons</span>
                        </div>
                      )}

                      <MenuImagePreview
                        clientId={clientId}
                        imageId={item.image_id}
                        token={token}
                        alt={item.name}
                        baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                        urlBuilder={({ baseUrl, clientId, imageId }) =>
                          `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
                        }
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />

                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setShowEditModal(true);
                          }}
                          className="bg-action-primary text-text-white p-2 rounded-full hover:bg-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl z-10 hover:scale-110 active:scale-95"
                          aria-label="Edit item"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(item);
                            setShowDeleteModal(true);
                          }}
                          className="bg-action-danger text-text-white p-2 rounded-full hover:bg-red-600 transition-all duration-300 shadow-lg hover:shadow-xl z-10 hover:scale-110 active:scale-95"
                          aria-label="Delete item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3">
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-1 min-h-[2.5rem] sm:min-h-[3rem] text-text-primary">
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-action-primary font-bold text-base sm:text-lg">
                          ₹{item.unit_price?.toFixed(2)}
                        </span>
                        <span className="text-xs text-text-secondary truncate max-w-[100px]">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12 rounded-lg bg-bg-primary">
                <p className="text-text-secondary text-base">No items found in this category</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
          <div className="rounded-lg max-w-2xl w-full p-6 bg-bg-primary max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-text-primary">Add New Menu Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Category *</label>
                <select
                  value={getCategoryIdByName(selectedCategory) || ''}
                  onChange={(e) => {
                    const selectedCatId = e.target.value;
                    const findCategoryName = (items, targetId) => {
                      for (const item of items) {
                        if (item.id === targetId) return item.name;
                        if (item.children) {
                          const found = findCategoryName(item.children, targetId);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    const categoryName = findCategoryName(categories, selectedCatId);
                    if (categoryName) {
                      setSelectedCategory(categoryName);
                    }
                    setNewItem({ ...newItem, category_id: selectedCatId });
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  required
                >
                  <option value="">Select a category</option>
                  {(() => {
                    const flattenCategories = (items, level = 0) => {
                      let result = [];
                      items.forEach(item => {
                        if (item.id !== 'all') {
                          result.push({ ...item, level });
                          if (item.children) {
                            result = result.concat(flattenCategories(item.children, level + 1));
                          }
                        }
                      });
                      return result;
                    };
                    return flattenCategories(categories).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {'—'.repeat(cat.level)} {cat.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Item Name *</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  placeholder="Enter item description"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">Unit Price *</label>
                  <input
                    type="number"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">Discount</label>
                  <input
                    type="number"
                    value={newItem.discount}
                    onChange={(e) => setNewItem({ ...newItem, discount: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">Availability</label>
                  <input
                    type="number"
                    value={newItem.availability}
                    onChange={(e) => setNewItem({ ...newItem, availability: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">Unit</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                    placeholder="kg, pcs, etc."
                  />
                </div>

                <input
                  value={newItem.serving_quantity || ""}
                  onChange={(e) => setNewItem({ ...newItem, serving_quantity: e.target.value })}
                  placeholder="Serving Quantity"
                  type="number"
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"

                />
                <select
                  value={newItem.serving_unit || ""}
                  onChange={(e) => setNewItem({ ...newItem, serving_unit: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  >
                  <option value="">Select Unit</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="litre">litre</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Item Image</label>

                <div
                  className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${dragActive ? 'border-action-primary bg-bg-secondary' : 'border-border-default'
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {newItemImageUrl ? (
                    <div className="relative">
                      <img
                        src={newItemImageUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemImage(null);
                          setNewItemImageUrl('');
                        }}
                        className="absolute top-2 right-2 bg-action-danger text-text-white p-2 rounded-full hover:opacity-90"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Upload className="mx-auto mb-2 text-text-secondary" size={32} />
                      <p className="text-sm text-text-secondary mb-2">
                        Drag & drop an image here, or click to browse
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && handleImageFile(e.target.files[0])}
                        className="hidden"
                        id="imageUpload"
                      />
                      <label
                        htmlFor="imageUpload"
                        className="inline-block px-4 py-2 bg-action-primary text-text-white rounded-lg cursor-pointer hover:opacity-90"
                      >
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
                {/* <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Or paste image URL here"
                    onPaste={(e) => {
                      const url = e.clipboardData.getData('text');
                      if (url.startsWith('http')) {
                        handleImageUrlPaste(url);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  />
                </div> */}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Add-ons</label>
                <DropdownCheckbox
                  selected={newItem.line_item_id}
                  options={menuItems}
                  onChange={(selected) => setNewItem({ ...newItem, line_item_id: selected })}
                  label="Select Add-ons"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  className="flex-1 px-4 py-2 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
          <div className="rounded-lg max-w-2xl w-full p-6 bg-bg-primary max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-text-primary">Edit Menu Item</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Category *</label>
                <select
                  value={editingItem.category_id || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  required
                >
                  <option value="">Select a category</option>
                  {(() => {
                    const flattenCategories = (items, level = 0) => {
                      let result = [];
                      items.forEach(item => {
                        if (item.id !== 'all') {
                          result.push({ ...item, level });
                          if (item.children) {
                            result = result.concat(flattenCategories(item.children, level + 1));
                          }
                        }
                      });
                      return result;
                    };
                    return flattenCategories(categories).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {'—'.repeat(cat.level)} {cat.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Item Name *</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Description</label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">Unit Price *</label>
                  <input
                    type="number"
                    value={editingItem.unit_price}
                    onChange={(e) => setEditingItem({ ...editingItem, unit_price: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">Discount</label>
                  <input
                    type="number"
                    value={editingItem.discount}
                    onChange={(e) => setEditingItem({ ...editingItem, discount: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">Availability</label>
                  <input
                    type="number"
                    value={editingItem.availability}
                    onChange={(e) => setEditingItem({ ...editingItem, availability: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">Unit</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-text-primary">Item Image</label>

                {editItemImageUrl || editingItem.image_id ? (
                  <div className="mb-3">
                    <label className="block text-xs text-text-secondary mb-1">Current Image:</label>
                    {editItemImageUrl ? (
                      <div className="relative">
                        <img
                          src={editItemImageUrl}
                          alt="New Preview"
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditItemImage(null);
                            setEditItemImageUrl('');
                          }}
                          className="absolute top-2 right-2 bg-action-danger text-text-white p-2 rounded-full hover:opacity-90"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <MenuImagePreview
                        clientId={clientId}
                        imageId={editingItem.image_id}
                        token={token}
                        alt={editingItem.name}
                        baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                        urlBuilder={({ baseUrl, clientId, imageId }) =>
                          `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
                        }
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    )}
                  </div>
                ) : null}

                <div
                  className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${dragActive ? 'border-action-primary bg-bg-secondary' : 'border-border-default'
                    }`}
                  onDragEnter={handleEditDrag}
                  onDragLeave={handleEditDrag}
                  onDragOver={handleEditDrag}
                  onDrop={handleEditDrop}
                >
                  <div className="text-center ">
                    <Upload className="mx-auto mb-2 text-text-secondary" size={32} />
                    <p className="text-sm text-text-secondary mb-2">
                      {editingItem.image_id ? 'Upload new image to replace' : 'Drag & drop an image here'}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleEditImageFile(e.target.files[0])}
                      className="hidden"
                      id="editImageUpload"
                    />
                    <label
                      htmlFor="editImageUpload"
                      className="inline-block px-4 py-2 bg-action-primary text-text-white rounded-lg cursor-pointer hover:opacity-90"
                    >
                      Choose File
                    </label>
                  </div>
                </div>

                {/* <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Or paste image URL here"
                    onPaste={(e) => {
                      const url = e.clipboardData.getData('text');
                      if (url.startsWith('http')) {
                        handleEditImageUrlPaste(url);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  />
                </div> */}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Add-ons</label>
                <DropdownCheckbox
                  selected={Array.isArray(editingItem.line_item_id) ? editingItem.line_item_id : []}
                  options={menuItems.filter(item => item.id !== editingItem.id)}
                  onChange={(selected) => setEditingItem({ ...editingItem, line_item_id: selected })}
                  label="Select Add-ons"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditItem}
                  className="flex-1 px-4 py-2 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
          <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary">
            <h3 className="text-xl font-semibold mb-4 text-text-primary">Confirm Delete</h3>
            <p className="mb-6 text-text-secondary">
              Are you sure you want to delete <strong className="text-text-primary">{deleteTarget.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                className="flex-1 px-4 py-2 rounded-lg bg-action-danger text-text-white hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
          <div className="rounded-lg max-w-2xl w-full p-6 bg-bg-primary max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-text-primary">Bulk Update & Delete</h3>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setSelectedRows([]);
                  setBulkEditData({});
                  setSelectAllChecked(false);
                }}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAllChecked}
                    onChange={toggleSelectAll}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </label>
                <span className="text-sm text-text-secondary">
                  {selectedRows.length} item(s) selected
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBulkUpdate}
                  disabled={selectedRows.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit size={18} />
                  Update Selected
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedRows.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-action-danger text-text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={18} />
                  Delete Selected
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectAllChecked}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Discount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const isSelected = selectedRows.includes(item.id);
                    const editData = bulkEditData[item.id] || {};

                    return (
                      <tr key={item.id} className={`border-b border-border-default ${isSelected ? 'bg-bg-secondary' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedRows(selectedRows.filter(id => id !== item.id));
                              } else {
                                setSelectedRows([...selectedRows, item.id]);
                              }
                            }}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {isSelected ? (
                            <input
                              type="text"
                              value={editData.name !== undefined ? editData.name : item.name}
                              onChange={(e) => setBulkEditData({
                                ...bulkEditData,
                                [item.id]: { ...editData, name: e.target.value }
                              })}
                              className="w-full px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-primary text-sm"
                            />
                          ) : (
                            <span className="text-sm text-text-primary">{item.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isSelected ? (
                            <input
                              type="text"
                              value={editData.description !== undefined ? editData.description : item.description}
                              onChange={(e) => setBulkEditData({
                                ...bulkEditData,
                                [item.id]: { ...editData, description: e.target.value }
                              })}
                              className="w-full px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-primary text-sm"
                            />
                          ) : (
                            <span className="text-sm text-text-secondary truncate block max-w-xs">{item.description}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isSelected ? (
                            <input
                              type="number"
                              value={editData.unit_price !== undefined ? editData.unit_price : item.unit_price}
                              onChange={(e) => setBulkEditData({
                                ...bulkEditData,
                                [item.id]: { ...editData, unit_price: e.target.value }
                              })}
                              className="w-full px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-primary text-sm"
                            />
                          ) : (
                            <span className="text-sm text-text-primary">₹{item.unit_price}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isSelected ? (
                            <input
                              type="number"
                              value={editData.discount !== undefined ? editData.discount : item.discount}
                              onChange={(e) => setBulkEditData({
                                ...bulkEditData,
                                [item.id]: { ...editData, discount: e.target.value }
                              })}
                              className="w-full px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-primary text-sm"
                            />
                          ) : (
                            <span className="text-sm text-text-primary">₹{item.discount || 0}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isSelected ? (
                            <input
                              type="number"
                              value={editData.availability !== undefined ? editData.availability : item.availability}
                              onChange={(e) => setBulkEditData({
                                ...bulkEditData,
                                [item.id]: { ...editData, availability: e.target.value }
                              })}
                              className="w-full px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-primary text-sm"
                            />
                          ) : (
                            <span className="text-sm text-text-primary">{item.availability || 0}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
