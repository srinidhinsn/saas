import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, X, Search, Edit, Trash2, Upload, Download } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import MenuCategoryTree from './Tree&CategoryManage/MenuCategoryTree';
import MenuImagePreview from './Tree&CategoryManage/MenuImagePreview';
import UniversalAddModal from '../../utils/Modals/UniversalAddModal';
import UniversalEditModal from '../../utils/Modals/UniversalEditModal';
import UniversalBulkUpdateModal from '../../utils/Modals/UniversalBulkUpdateModal';
import { jwtDecode } from "jwt-decode";


// Main Menu Management Component
const MenuManagement = ({ clientId, token, realm }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [screenId, setScreenId] = useState();
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dietaryFilter, setDietaryFilter] = useState("All");

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
    code: ' ',
    dietary_type: '',
    serving_quantity: "",
    serving_unit: "",
    line_item_id: []
  });
  // add near your other state declarations
  const [categoriesFlat, setCategoriesFlat] = useState([]);

  // Bulk operations
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});
  // realm + user metadata
  const [currentUserId, setCurrentUserId] = useState(null);

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
  const getDietaryDotColor = (type) => {
    switch ((type || "").toLowerCase()) {
      case "veg":
        return "bg-green-700";
      case "non-veg":
      case "non veg":
        return "bg-action-primary";
      case "egg":
        return "bg-yellow-600";
      default:
        return "bg-gray-300";
    }
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
    if (!categoryName || categoryName === 'All Categories' || categoryName === 'All') return null;

    const name = categoryName.trim().toLowerCase();

    const match = categoriesFlat.find(
      c => c.name.toLowerCase() === name
    );

    return match ? match.id : null;
  };



  // Updated handleAddItem function
  const handleAddItem = async () => {
    try {
      let imageId = null;

      if (newItemImage) {
        imageId = await uploadImageToDocumentService(newItemImage);
      }

      // Prefer category from newItem (modal) first, then from selectedCategory,
      // and only as a last resort generate an id (legacy behavior).
      const categoryIdFromNewItem = newItem?.category_id || null;
      const categoryIdFromSelected = (typeof selectedCategory === 'object' && selectedCategory?.id)
        ? selectedCategory.id
        : getCategoryIdByName(selectedCategory);

      const resolvedCategoryId = categoryIdFromNewItem || categoryIdFromSelected || null;

      const generateCategoryId = (parentId = null) => {
        const timestamp = Date.now();
        return parentId ? `subcat_${timestamp}` : `cat_${timestamp}`;
      };

      const finalCategoryId = resolvedCategoryId
        ? resolvedCategoryId
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
        updated_by: created_by,
        inventory_id: 1
      };
      console.log("Payload", payload)
      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchData({ silent: true });

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

      const categoryId =
        editingItem.category_id ||
        (typeof selectedCategory === 'object'
          ? selectedCategory.id
          : getCategoryIdByName(selectedCategory));

      const finalCategoryId = categoryId || null;
      const slug = generateSlug(finalCategoryId, editingItem.name);

      const updated_by =
        currentUserId || localStorage.getItem('user_id') || 'system';

      const payload = {
        ...editingItem,
        dietary_type: normalizeDietary(editingItem.dietary_type),
        code: editingItem.code ? String(editingItem.code).trim() : null,
        client_id: clientId,
        category_id: finalCategoryId,
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

      await fetchData({ silent: true });

      setShowEditModal(false);
      setEditingItem(null);
      setEditItemImage(null);
      setEditItemImageUrl('');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };
  const normalizeDietary = (value) => {
    if (!value) return "";

    const v = value.toString().toLowerCase().replace(/[-_\s]/g, "");

    if (v === "veg") return "Veg";
    if (v === "nonveg") return "Non-Veg";
    if (v === "egg") return "Egg";

    return "";
  };


  const fetchData = useCallback(async (options = { silent: false }) => {
    const { silent = false } = options;

    if (!clientId || !token) {
      console.error('Missing clientId or token');
      if (!silent) setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);

      const [catRes, itemRes] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?realm=${realm}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);

      const fullTree = (catRes.data.data || []).filter(c => c.name?.toLowerCase() !== "all");
      const subcategoryIds = new Set();
      fullTree.forEach(cat => {
        if (cat.subCategories && cat.subCategories.length > 0) {
          cat.subCategories.forEach(sub => subcategoryIds.add(sub.id));
        }
      });

      const topLevelCategories = fullTree.filter(cat => !subcategoryIds.has(cat.id));
      const flatCategories = flattenCategoryTree(topLevelCategories);
      const normalizedFlat = flatCategories.map(cat => ({
        id: cat.id,
        name: (cat.name || '').trim(),
        parentId: cat.parentId ?? cat.parent_id ?? null
      }));
      setCategoriesFlat(normalizedFlat);

      const enrichedItems = (itemRes.data.data || []).map(item => {
        const cat = flatCategories.find(c => c.id === item.category_id);
        return {
          ...item,
          category: cat ? cat.name : "Uncategorized"
        };
      });

      setMenuItems(enrichedItems);

      const getCategoryCount = (categoryName) => {
        return enrichedItems.filter(it => {
          if (categoryName === 'All Categories') return true;
          return it.category === categoryName;
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

      const categoryTree = buildCategoryTree(flatCategories).map(cat => {
        if (cat.id === 'dietery' || cat.name.toLowerCase() === 'dietery') {
          return {
            ...cat,
            name: 'All Categories',
            count: enrichedItems.length  // Total count of all items
          };
        }
        return cat;
      });

      setCategories(categoryTree);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {


    fetchData();
  }, [fetchData]);

  const getFilteredItems = () => {
    const q = (searchQuery || '').trim().toLowerCase();

    let items = menuItems;

    // 🔍 Search
    if (q.length > 0) {
      items = items.filter(item => {
        const name = (item.name || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const code = String(item.code || '').toLowerCase();
        return name.includes(q) || category.includes(q) || code.includes(q);
      });
    }

    // 📂 Category
    if (selectedCategory && selectedCategory !== 'All Categories') {
      items = items.filter(item => item.category === selectedCategory);
    }

    // 🟢🔴🟡 Dietary Filter
    if (dietaryFilter !== "All") {
      items = items.filter(
        item =>
          normalizeDietary(item.dietary_type) === dietaryFilter

      );
    }

    return items;
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
            dietary_type:
              editedData.dietary_type !== undefined
                ? normalizeDietary(editedData.dietary_type)
                : normalizeDietary(originalItem.dietary_type),
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
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?realm=${realm}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMenuItems(itemRes.data.data);

      setShowBulkModal(false);
      setSelectedRows([]);
      setBulkEditData({});
      setSelectAllChecked(false);
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

        const formattedRecipe = item.recipe
          ? JSON.stringify(item.recipe, null, 2)
          : "";

        return {
          ID: item.id ?? item.inventory_id ?? "",
          Inventory_Id: item.inventory_id,
          Name: item.name ?? "",
          Description: item.description ?? "",
          Category: catNameById(item.category_id) || item.category || "Unknown",
          Image: item.image_id,
          Code: item.code ?? "",
          Dietary_type: item.dietary_type ?? "",
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
          Serving_Quantity: item.serving_quantity,
          Serving_Unit: item.serving_unit,
          Realm: item.realm ?? realm ?? "",
          Slug: item.slug ?? "",
          Line_Item_IDs: lineItemStr,
          Recipe: formattedRecipe,
        };
      });

      // Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData, {
        header: [
          "ID", "Inventory_Id", "Name", "Description", "Category", "Image", "Unit", "Unit_Price", "Unit_CST", "Unit_GST", "Total_Unit_Price", "Total_Price",
          "CST", "GST", "Discount", "Availability", "Serving_Quantity", "Serving_Unit", "Realm", "Dietary", "Slug", "Line_Item_IDs"
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

  const handleImportFromExcel = (e) => {
    if (!categoriesFlat.length) {
      alert("Categories not loaded yet. Please wait 2 seconds and try again.");
      e.target.value = "";
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    let created_by = "system";
    let updated_by = "system";

    try {
      const decoded = jwtDecode(token);
      created_by = decoded?.user_id || created_by;
      updated_by = decoded?.user_id || updated_by;
    } catch {
      console.warn("JWT decode failed, using system user");
    }

    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!parsedData.length) {
          alert("Excel file is empty");
          return;
        }

        // 🔍 VALIDATE BEFORE DELETE
        const validationErrors = [];
        parsedData.forEach((row, index) => {
          if (!row.Name) {
            validationErrors.push(`Row ${index + 2}: Name missing`);
          }
          if (!getCategoryIdByName(row.Category)) {
            validationErrors.push(`Row ${index + 2}: Invalid category "${row.Category}"`);
          }
        });

        if (validationErrors.length) {
          alert(
            `❌ Import blocked due to errors:\n\n${validationErrors
              .slice(0, 5)
              .join("\n")}${validationErrors.length > 5 ? "\n..." : ""}`
          );
          return;
        }

        const confirmReplace = window.confirm(
          `This will DELETE all ${menuItems.length} existing menu items and import ${parsedData.length} new items.\n\nContinue?`
        );

        if (!confirmReplace) {
          e.target.value = "";
          return;
        }

        // 🧹 DELETE OLD ITEMS
        await Promise.all(
          menuItems.map(item =>
            axios.post(
              `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
              { id: item.id },
              { headers: { Authorization: `Bearer ${token}` } }
            )
          )
        );

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        // 📥 IMPORT NEW ITEMS
        for (const [index, row] of parsedData.entries()) {
          try {
            let recipe = null;
            if (row.Recipe) {
              try {
                recipe = JSON.parse(row.Recipe);
              } catch {
                recipe = null;
              }
            }

            const categoryId = getCategoryIdByName(row.Category);
            if (!categoryId) throw new Error("Invalid category");

            const payload = {
              client_id: clientId,
              inventory_id: row.Inventory_Id || null,
              name: row.Name,
              description: row.Description || "",
              category_id: categoryId,
              realm: row.Realm || realm || "",
              code: row.Code || "",
              dietary_type: normalizeDietary(row.Dietary || row.dietary_type || ""),
              availability: Number(row.Availability || 0),
              serving_quantity: row.Serving_Quantity || null,
              serving_unit: row.Serving_Unit || null,
              unit: row.Unit || "",
              image_id: row.Image || null,
              unit_price: Number(row.Unit_Price || 0),
              unit_cst: Number(row.Unit_CST || 0),
              unit_gst: Number(row.Unit_GST || 0),
              unit_total_price: Number(row.Total_Unit_Price || 0),
              cst: Number(row.CST || 0),
              gst: Number(row.GST || 0),
              discount: Number(row.Discount || 0),
              total_price: Number(row.Total_Price || 0),
              slug: row.Slug || "",
              line_item_id: row.Line_Item_IDs
                ? row.Line_Item_IDs.split(",").map(v => Number(v.trim())).filter(Boolean)
                : [],
              recipe,
              created_by,
              updated_by
            };

            await axios.post(
              `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
              payload,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            successCount++;
          } catch (err) {
            failCount++;
            errors.push(`Row ${index + 2}: ${err.message}`);
          }
        }

        // 🔄 REFRESH
        const itemRes = await axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?realm=${realm}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMenuItems(itemRes.data.data);

        // 📊 RESULT
        alert(
          `✅ Import completed\n\n` +
          `✔ Success: ${successCount}\n` +
          `✖ Failed: ${failCount}` +
          (errors.length ? `\n\nErrors:\n${errors.slice(0, 5).join("\n")}` : "")
        );

        e.target.value = "";
      } catch (err) {
        console.error("Import Error:", err);
        alert("Import failed. Check console.");
        e.target.value = "";
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

  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 border-action-primary"></div>
  //         <p className="text-text-secondary">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-bg-primary">


      <div className="mx-auto px-4 py-2">
        {/* Action Buttons */}


        <div className="grid lg:grid-cols-4 gap-2">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
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
          <div className="lg:col-span-3 border-default border-border-default p-3 rounded-lg">
            <div className="mb-4 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">


              <div className="lg:col-span-1 space-y-2">
                {/* Category title */}
                <h2 className="text-xl lg:text-2xl font-semibold text-text-primary">
                  {selectedCategory}
                  <span className="text-sm ml-2 text-text-primary">
                    ({filteredItems.length} items)
                  </span>
                </h2>
              </div>



              <div className="lg:col-span-1">
                <div className="relative w-full">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="
      w-full
      h-9
      pl-10 pr-3
      rounded-lg
      bg-bg-tertiary
      border border-border-default
      focus:ring-2 focus:ring-action-primary
    "
                  />
                </div>

              </div>

              <div className="
  flex flex-wrap
  items-center justify-end
  gap-2
  md:justify-start
  lg:justify-end
">


                <button
                  onClick={() => setShowAddModal(true)}
                  className="
    h-9 px-3
    flex items-center gap-2
    rounded-lg
    bg-action-primary
    text-white
    text-sm font-semibold
    shadow-sm
    hover:opacity-90
  "
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>


                <button
                  onClick={() => setShowBulkModal(true)}
                  className="
    h-9 px-3
    flex items-center gap-2
    rounded-lg
    bg-bg-tertiary
    border border-border-default
    text-sm font-semibold
    hover:border-action-primary
    hover:bg-bg-secondary
  "
                >
                  <Edit size={14} />
                  <span className="hidden sm:inline">Bulk</span>
                </button>
                <button
                  onClick={handleExportToExcel}
                  className="
    h-9 px-3
    flex items-center gap-2
    rounded-lg
    bg-bg-tertiary
    border border-border-default
    text-sm font-semibold
    hover:border-action-primary
    hover:bg-bg-secondary
  "
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Export</span>
                </button>


                <button
                  onClick={() => document.getElementById('excelInput').click()}
                  className="
    h-9 px-3
    flex items-center gap-2
    rounded-lg
    bg-bg-tertiary
    border border-border-default
    text-sm font-semibold
    hover:border-action-primary
    hover:bg-bg-secondary
  "
                >
                  <Upload size={14} />
                  <span className="hidden sm:inline">Import</span>
                </button>


                <input
                  type="file"
                  id="excelInput"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleImportFromExcel}
                />
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5">
              {filteredItems.map(item => {
                const discountPercent = item.discount && item.unit_price && Number(item.discount) > 0
                  ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(1).replace(/\.0$/, '')
                  : null;

                return (
                  <div key={item.id} className="bg-bg-primary rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group relative">
                    <div className="relative h-20 sm:h-20 md:h-24 lg:h-28 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {discountPercent && (
                        <div className="absolute top-2 left-2 bg-action-danger text-text-white text-xs font-bold px-2 py-1 rounded-md z-10 shadow-md">
                          {discountPercent}% OFF
                        </div>
                      )}

                      {item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0 && (
                        <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-[8px] p-1 rounded-md z-10 shadow-md flex items-center gap-1">
                          <Plus size={10} />
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
                            setEditingItem({
                              ...item,
                              dietary_type: normalizeDietary(item.dietary_type)
                            });
                            setShowEditModal(true);
                          }}

                          className="bg-action-primary text-text-white p-1 rounded-full hover:bg-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl z-10 hover:scale-110 active:scale-95"
                          aria-label="Edit item"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(item);
                            setShowDeleteModal(true);
                          }}
                          className="bg-action-danger text-text-white p-1  rounded-full hover:bg-red-600 transition-all duration-300 shadow-lg hover:shadow-xl z-10 hover:scale-110 active:scale-95"
                          aria-label="Delete item"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${getDietaryDotColor(normalizeDietary(item.dietary_type))}`}
                      title={item.dietary_type || "Unknown"}
                    />
                    <div className="p-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[12px] line-clamp-2 min-h-[1.2rem] text-text-primary">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-action-primary font-bold text-base sm:text-md">
                          ₹{(item.unit_price - (item.discount || 0)).toFixed(2)}
                        </p>
                        {discountPercent && (
                          <span className="text-xs text-text-secondary line-through">
                            ₹{item.unit_price?.toFixed(2)}
                          </span>
                        )}

                        {/* 
                        <span className="text-xs text-text-secondary truncate max-w-[100px]">
                          {item.category}
                        </span> */}
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

      <UniversalAddModal
        showModal={showAddModal}
        setShowModal={setShowAddModal}
        modalType="menu"

        // Menu-specific props
        newItem={newItem}
        setNewItem={setNewItem}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        menuItems={menuItems}
        newItemImage={newItemImage}
        setNewItemImage={setNewItemImage}
        newItemImageUrl={newItemImageUrl}
        setNewItemImageUrl={setNewItemImageUrl}
        handleAddItem={handleAddItem}
        getCategoryIdByName={getCategoryIdByName}
      />
      <UniversalEditModal
        showModal={showEditModal}
        setShowModal={setShowEditModal}
        modalType="menu"

        // Menu-specific props
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        categories={categories}
        menuItems={menuItems}
        editItemImage={editItemImage}
        setEditItemImage={setEditItemImage}
        editItemImageUrl={editItemImageUrl}
        setEditItemImageUrl={setEditItemImageUrl}
        handleEditItem={handleEditItem}
        clientId={clientId}
        token={token}
      />
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

      <UniversalBulkUpdateModal
        showModal={showBulkModal}
        setShowModal={setShowBulkModal}
        modalType="menu"

        // Menu-specific props
        filteredItems={filteredItems}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        selectAllChecked={selectAllChecked}
        setSelectAllChecked={setSelectAllChecked}
        bulkEditData={bulkEditData}
        setBulkEditData={setBulkEditData}
        handleBulkUpdate={handleBulkUpdate}
        handleBulkDelete={handleBulkDelete}
      />
    </div>
  );
};

export default MenuManagement;
