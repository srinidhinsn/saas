import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Upload, Download, CloudUpload, ArrowDown } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import MenuCategoryTree from './Tree&CategoryManage/MenuCategoryTree';
import MenuImagePreview from './Tree&CategoryManage/MenuImagePreview';
import UniversalAddModal from '../../utils/Modals/UniversalAddModal';
import UniversalEditModal from '../../utils/Modals/UniversalEditModal';
import UniversalBulkUpdateModal from '../../utils/Modals/UniversalBulkUpdateModal';
import { jwtDecode } from "jwt-decode";
import { getMenuConfig } from '../../utils/menuConfigResolver';

// Main Menu Management Component
const MenuManagement = ({ clientId, token, realm }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [screenId, setScreenId] = useState();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dietaryFilter, setDietaryFilter] = useState("All");
  const [inventoryIds, setInventoryIds] = useState([]);

  // ✅ UPDATED: Store addon subcategories and all addon items
  const [addonSubcategories, setAddonSubcategories] = useState([]);
  const [allAddonItems, setAllAddonItems] = useState([]);

  const [addonItems, setAddonItems] = useState([]); // ✅ Store addon items
  const [addonsCategoryId, setAddonsCategoryId] = useState(null); // ✅ Store addons category ID
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [dieterySubCategories, setDieterySubCategories] = useState([]);
  const [sidebarCategories, setSidebarCategories] = useState([]);
  // const MENU_ROOT = import.meta.env.VITE_MENU_DEFAULT_ROOT || "dietery";
  // const MENU_LEVEL = Number(import.meta.env.VITE_MENU_HIERARCHY_LEVEL || 2);

  const menuConfig = React.useMemo(() => {
    if (!clientId) return null;
    return getMenuConfig(clientId);
  }, [clientId]);


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
    code: '',
    unit: '',
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
  const [quickCatOpen, setQuickCatOpen] = useState(false);
  const quickCatRef = useRef(null);

  // realm + user metadata
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    try {
      const decoded = jwtDecode(token);
      setCurrentUserId(decoded?.user_id || null);
    } catch {
      console.warn("JWT decode failed");
    }
  }, [token]);

  // useEffect(() => {
  //   console.log("CLIENT ID RAW =", JSON.stringify(clientId));
  // }, [clientId]);

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
    return parts.filter(Boolean).join('_'); // e.g. Dietery_Non_Veg_Gravies_Mutton_Gravy
  };

  // ✅ NEW: Helper function to determine appropriate addon category ID
  const getAddonCategoryId = (itemCategoryId) => {
    if (!itemCategoryId || !categoriesFlat.length) return 'addons_ac'; // default fallback

    // Find the item's category path
    const findCategoryPath = (catId) => {
      const path = [];
      let currentId = catId;
      const visited = new Set();

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const cat = categoriesFlat.find(c => c.id === currentId);
        if (!cat) break;
        path.unshift(cat.name?.toLowerCase() || '');
        currentId = cat.parentId || cat.parent_id;
      }
      return path;
    };

    const path = findCategoryPath(itemCategoryId);

    // Check if item belongs to AC or Non-AC hierarchy
    if (path.includes('ac') || path.some(p => p.includes('ac'))) {
      return 'addons_ac';
    } else if (path.includes('non_ac') || path.includes('non ac') || path.some(p => p.includes('non') && p.includes('ac'))) {
      return 'addons_non_ac';
    }

    // Default to AC if unclear
    return 'addons_ac';
  };

  const openAddModal = () => {

    // Use the currently selected category in sidebar
    const initialCategoryId = selectedCategoryId || null;

    setNewItem({
      name: '',
      description: '',
      category_id: initialCategoryId || '',
      unit_price: '',
      discount: '',
      code: '',
      unit: '',
      serving_quantity: "",
      serving_unit: "",
      line_item_id: [],
      inventory_id: ''
    });

    setNewItemImage(null);
    setNewItemImageUrl('');

    setShowAddModal(true);
  };

  const handleItemClick = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
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



  const findCategoryNode = (tree, matcher) => {
    for (const cat of tree) {
      if (
        cat.id?.toLowerCase() === matcher.toLowerCase() ||
        cat.name?.toLowerCase() === matcher.toLowerCase()
      ) {
        return cat;
      }
      if (cat.children?.length) {
        const found = findCategoryNode(cat.children, matcher);
        if (found) return found;
      }
    }
    return null;
  };
  const getCategoriesAtLevel = (node, targetLevel, currentLevel = 0) => {
    if (!node) return [];

    if (currentLevel === targetLevel) {
      return [node];
    }

    let result = [];
    for (const child of node.children || []) {
      result = result.concat(
        getCategoriesAtLevel(child, targetLevel, currentLevel + 1)
      );
    }

    return result;
  };

  // Helper function to get category ID from name
  const getCategoryIdByName = (categoryName) => {
    if (!categoryName || categoryName === 'All Categories' || categoryName === 'All') return null;

    const name = categoryName.trim().toLowerCase();

    const match = categoriesFlat.find(
      c => c.name.toLowerCase() === name
    );

    return match ? match.id : null;
  };


  const fetchInventoryIds = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=inventory`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const subcategories = res.data.data[0];
      const subcats = subcategories.subCategories;

      setInventoryIds(subcats);

    } catch (error) {
      console.error("Error fetching inventory IDs:", error);
    }
  };
  const getModalCategories = () => {
    if (!categories?.length || !menuConfig) return [];

    const { root } = menuConfig;

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

    const flattenedGrandChildren = (rootNode.children || [])
      .flatMap(child => child.children || []);

    return [
      {
        ...rootNode,
        id: rootNode.id,
        name: "All Categories",
        children: flattenedGrandChildren,
      }
    ];
  };

  // ✅ UPDATED: Fetch addon data dynamically based on category structure
  const fetchAddonData = useCallback(async (addonCategoryId = 'addons_ac') => {
    try {

      // First, get the addons category with subcategories
      const catRes = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${addonCategoryId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const addonsCategory = catRes.data.data?.[0];
      if (!addonsCategory) {
        return { subcategories: [], items: [] };
      }

      // Store subcategories (can be empty)
      const subcats = addonsCategory.subCategories || [];

      // Fetch all menu items
      const itemRes = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?inventory_id=menu`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const allItems = itemRes.data.data || [];

      // ✅ FIXED: Include items that belong to the main addon category OR its subcategories
      const subcategoryIds = subcats.map(sub => sub.id);
      const filteredAddons = allItems.filter(item => {
        // Include items directly under addons category
        if (item.category_id === addonCategoryId) return true;
        // Include items under any subcategory
        if (subcategoryIds.includes(item.category_id)) return true;
        return false;
      });

      return { subcategories: subcats, items: filteredAddons };
    } catch (error) {
      console.error(`❌ Error fetching addon data for ${addonCategoryId}:`, error);
      return { subcategories: [], items: [] };
    }
  }, [clientId, token]);

  // ✅ UPDATED: Initial fetch with default AC addons
  useEffect(() => {
    const initializeData = async () => {
      await fetchInventoryIds();
      const { subcategories, items } = await fetchAddonData('addons_ac');
      setAddonSubcategories(subcategories);
      setAllAddonItems(items);
    };

    initializeData();
  }, [fetchInventoryIds, fetchAddonData]);

  const handleAddItem = async () => {
    try {
      let imageId = null;

      if (newItemImage) {
        imageId = await uploadImageToDocumentService(newItemImage);
      }

      const finalCategoryId = newItem?.category_id || null;

      if (!finalCategoryId) {
        return;
      }

      const slug = generateSlug(finalCategoryId, newItem.name);
      const created_by = currentUserId || localStorage.getItem('user_id') || 'system';

      const { dietary_type, ...cleanNewItem } = newItem;

      const payload = {
        ...cleanNewItem,
        client_id: clientId,
        category_id: finalCategoryId,
        image_id: imageId,
        realm: realm || newItem.realm || '',
        slug,
        unit_price: parseFloat(newItem.unit_price) || 0,
        discount: parseFloat(newItem.discount) || 0,
        code: newItem.code ? String(newItem.code).trim() : null,
        serving_quantity: newItem.serving_quantity ? parseFloat(newItem.serving_quantity) : null,
        serving_unit: newItem.serving_unit || null,
        created_by,
        updated_by: created_by,
        inventory_id: newItem.inventory_id
      };


      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      await fetchData({ silent: true });

      // ✅ Refresh addon data for the appropriate category
      const addonCatId = getAddonCategoryId(finalCategoryId);
      const { subcategories, items } = await fetchAddonData(addonCatId);
      setAddonSubcategories(subcategories);
      setAllAddonItems(items);

      setShowAddModal(false);
      setNewItem({
        name: '',
        description: '',
        category_id: '',
        unit_price: '',
        discount: '',
        code: '',
        unit: '',
        line_item_id: []
      });
      setNewItemImage(null);
      setNewItemImageUrl('');
    } catch (error) {
      console.error('Error adding item:', error);
      console.error('Full error response:', error.response);
      console.error('Error data:', JSON.stringify(error.response?.data, null, 2));

      let errorMsg = 'Failed to add item\n\n';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMsg += error.response.data.detail.map(err =>
            `Field: ${err.loc?.join('.')}\nError: ${err.msg}`
          ).join('\n\n');
        } else {
          errorMsg += error.response.data.detail;
        }
      } else {
        errorMsg += error.message;
      }

      alert(errorMsg);
    }
  }

  const handleEditItem = async () => {
    try {
      let imageId = editingItem.image_id;

      if (editItemImage) {
        imageId = await uploadImageToDocumentService(editItemImage);
      }

      const finalCategoryId = editingItem.category_id || null;

      const slug = generateSlug(finalCategoryId, editingItem.name);
      const updated_by = currentUserId || localStorage.getItem('user_id') || 'system';

      const { dietary_type, ...cleanEditingItem } = editingItem;

      const payload = {
        id: Number(editingItem.id),
        ...cleanEditingItem,
        code: editingItem.code ? String(editingItem.code).trim() : null,
        client_id: clientId,
        category_id: finalCategoryId,
        image_id: imageId,
        realm: editingItem.realm || realm || '',
        slug,
        unit_price: parseFloat(editingItem.unit_price) || 0,
        discount: parseFloat(editingItem.discount) || 0,
        serving_quantity: editingItem.serving_quantity ? parseFloat(editingItem.serving_quantity) : null,
        serving_unit: editingItem.serving_unit || null,
        updated_by
      };


      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchData({ silent: true });

      // ✅ Refresh addon data for the appropriate category
      const addonCatId = getAddonCategoryId(finalCategoryId);
      const { subcategories, items } = await fetchAddonData(addonCatId);
      setAddonSubcategories(subcategories);
      setAllAddonItems(items);

      setShowEditModal(false);
      setEditingItem(null);
      setEditItemImage(null);
      setEditItemImageUrl('');
    } catch (error) {
      console.error('Error updating item:', error);
      console.error('Error response:', error.response?.data);
    }
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (quickCatRef.current && !quickCatRef.current.contains(event.target)) {
        setQuickCatOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const getQuickCategoryName = () => {
    if (!selectedCategoryId) return "All Categories";
    const found = dieterySubCategories.find(c => c.id === selectedCategoryId);
    return found?.name || "All Categories";
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
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.root}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?inventory_id=menu`,
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
          category: cat?.name ?? "Uncategorized"
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

        categoryMap.forEach(cat => {
          cat.count = cat.children.length;
        });

        return tree;
      };

      const categoryTree = buildCategoryTree(flatCategories).map(cat => {
        if (cat.id === 'dietery' || cat.name.toLowerCase() === 'dietery') {
          return {
            ...cat,
            name: 'All Categories',
            count: cat.children.length
          };
        }
        return cat;
      });

      setCategories(categoryTree);

      const rootNode = findCategoryNode(categoryTree, menuConfig.root);

      let quickCategories = [];

      if (rootNode) {

        let level = menuConfig.level;

        // fallback search: go upwards until categories exist
        while (level >= 0) {
          quickCategories = getCategoriesAtLevel(rootNode, level);

          if (quickCategories.length > 0) {
        
            break;
          }

          level--;
        }
      }


      // 3️⃣ Set them
      setDieterySubCategories(quickCategories);

      // Sidebar should still show full tree
      setSidebarCategories(categoryTree);

    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientId, token, realm, menuConfig]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ NEW: Get all descendant category IDs (not names)
  const getAllDescendantCategoryIds = (categoryId, categoryTree) => {
    if (!categoryId) return [];

    const descendants = [categoryId];

    const findCategory = (cats, id) => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategory(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const collectDescendants = (cat) => {
      if (cat.children && cat.children.length > 0) {
        cat.children.forEach(child => {
          descendants.push(child.id);
          collectDescendants(child);
        });
      }
    };

    const category = findCategory(categoryTree, categoryId);
    if (category) {
      collectDescendants(category);
    }

    return descendants;
  };

  // ✅ UPDATED: Filter by category ID instead of category name
  const getFilteredItems = () => {
    if (!menuItems.length) {
      return [];
    }

    const q = (searchQuery || '').trim().toLowerCase();
    let items = menuItems;

    if (q.length > 0) {
      items = items.filter(item => {
        const name = (item.name || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const code = String(item.code || '').toLowerCase();
        return (
          name.includes(q) ||
          category.includes(q) ||
          code.includes(q)
        );
      });
    }

    if (!selectedCategoryId) {
      return items;
    }

    const allowedCategoryIds = getAllDescendantCategoryIds(
      selectedCategoryId,
      categories
    );

    items = items.filter(item =>
      allowedCategoryIds.includes(item.category_id)
    );


    if (categories.length > 0 && categoriesFlat.length > 0) {
      const allowedCategoryIds = getAllDescendantCategoryIds(
        selectedCategoryId,
        categories
      );

      items = items.filter(item =>
        allowedCategoryIds.includes(item.category_id)
      );

    }

    return items;
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

      return response.data.data.id;
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
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

  // ✅ UPDATED: Auto-unlink deleted addon from all items
  const handleDeleteItem = async () => {
    try {
      const deletedItemId = deleteTarget.id;

      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
        { id: deletedItemId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ Find all items that have this addon linked
      const itemsToUpdate = menuItems.filter(item =>
        Array.isArray(item.line_item_id) && item.line_item_id.includes(deletedItemId)
      );

      // ✅ Update each item to remove the deleted addon
      if (itemsToUpdate.length > 0) {
        await Promise.all(
          itemsToUpdate.map(item => {
            const updatedLineItemIds = item.line_item_id.filter(id => id !== deletedItemId);

            return axios.post(
              `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
              {
                ...item,
                line_item_id: updatedLineItemIds,
                client_id: clientId
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          })
        );
      }

      // Refresh data
      await fetchData({ silent: true });

      // ✅ Refresh addon data
      const addonCatId = getAddonCategoryId(deleteTarget.category_id);
      const { subcategories, items } = await fetchAddonData(addonCatId);
      setAddonSubcategories(subcategories);
      setAllAddonItems(items);

      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      alert('No items selected');
      return;
    }

    const confirm = window.confirm(`Delete ${selectedRows.length} selected items?`);
    if (!confirm) return;

    try {
      // ✅ Delete all selected items
      await Promise.all(
        selectedRows.map(id =>
          axios.post(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/delete`,
            { id },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      // ✅ Find all items that have any of the deleted items linked as addons
      const itemsToUpdate = menuItems.filter(item =>
        Array.isArray(item.line_item_id) &&
        item.line_item_id.some(addonId => selectedRows.includes(addonId))
      );

      // ✅ Update each item to remove the deleted addons
      if (itemsToUpdate.length > 0) {
        await Promise.all(
          itemsToUpdate.map(item => {
            const updatedLineItemIds = item.line_item_id.filter(id => !selectedRows.includes(id));

            return axios.post(
              `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
              {
                ...item,
                line_item_id: updatedLineItemIds,
                client_id: clientId
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          })
        );

      }

      // Refresh data
      await fetchData({ silent: true });

      // ✅ Refresh addon data for currently selected category
      if (selectedCategoryId) {
        const addonCatId = getAddonCategoryId(selectedCategoryId);
        const { subcategories, items } = await fetchAddonData(addonCatId);
        setAddonSubcategories(subcategories);
        setAllAddonItems(items);
      }

      setSelectedRows([]);
      setSelectAllChecked(false);
    } catch (error) {
      console.error('Error deleting items:', error);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedRows.length === 0) {
      return;
    }

    try {
      await Promise.all(
        selectedRows.map(id => {
          const editedData = bulkEditData[id] || {};
          const originalItem = menuItems.find(item => item.id === id);

          const { dietary_type: editedDietary, ...cleanEditedData } = editedData;
          const { dietary_type: originalDietary, ...cleanOriginalItem } = originalItem;

          const payload = {
            ...cleanOriginalItem,
            ...cleanEditedData,
            client_id: clientId
          };

          return axios.post(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        })
      );

      await fetchData({ silent: true });

      // ✅ Refresh addon data
      if (selectedCategoryId) {
        const addonCatId = getAddonCategoryId(selectedCategoryId);
        const { subcategories, items } = await fetchAddonData(addonCatId);
        setAddonSubcategories(subcategories);
        setAllAddonItems(items);
      }

      setShowBulkModal(false);
      setSelectedRows([]);
      setBulkEditData({});
      setSelectAllChecked(false);
    } catch (error) {
      console.error('Error updating items:', error);
    }
  };

  const handleExportToExcel = () => {
    try {
      const catNameById = (id) => {
        if (!id) return "Uncategorized";
        const found = (categoriesFlat || []).find(c => c && c.id === id);
        return found ? found.name : ((typeof id === 'string' && id.startsWith('cat_')) ? id : "Unknown");
      };

      const exportData = filteredItems.map(item => {
        let lineItemStr = "";
        if (Array.isArray(item.line_item_id)) {
          lineItemStr = item.line_item_id.join(", ");
        } else if (typeof item.line_item_id === "string") {
          lineItemStr = item.line_item_id;
        } else if (item.line_item_id == null) {
          lineItemStr = "";
        } else {
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
          Unit: item.unit ?? "",
          Unit_Price: typeof item.unit_price === "number" ? item.unit_price : (item.unit_price ? parseFloat(item.unit_price) : 0),
          Unit_CST: typeof item.unit_cst === "number" ? item.unit_cst : (item.unit_cst ? parseFloat(item.unit_cst) : 0),
          Unit_GST: typeof item.unit_gst === "number" ? item.unit_gst : (item.unit_gst ? parseFloat(item.unit_gst) : 0),
          Total_Unit_Price: typeof item.unit_total_price === "number" ? item.unit_total_price : (item.unit_total_price ? parseFloat(item.unit_total_price) : 0),
          Total_Price: typeof item.total_price === "number" ? item.total_price : (item.total_price ? parseFloat(item.total_price) : 0),
          CST: typeof item.cst === "number" ? item.cst : (item.cst ? parseFloat(item.cst) : 0),
          GST: typeof item.gst === "number" ? item.gst : (item.gst ? parseFloat(item.gst) : 0),
          Discount: typeof item.discount === "number" ? item.discount : (item.discount ? parseFloat(item.discount) : 0),
          Code: item.code != null ? String(item.code) : "",
          Serving_Quantity: item.serving_quantity,
          Serving_Unit: item.serving_unit,
          Realm: item.realm ?? realm ?? "",
          Slug: item.slug ?? "",
          Line_Item_IDs: lineItemStr,
          Recipe: formattedRecipe,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData, {
        header: [
          "ID", "Inventory_Id", "Name", "Description", "Category", "Image", "Unit", "Unit_Price", "Unit_CST", "Unit_GST", "Total_Unit_Price", "Total_Price",
          "CST", "GST", "Discount", "Code", "Serving_Quantity", "Serving_Unit", "Realm", "Dietary", "Slug", "Line_Item_IDs"
        ]
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "MenuItems");

      const filename = `menu_items_${(new Date()).toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };
  const clean = (v) => {
    if (
      v === "" ||
      v === undefined ||
      v === null ||
      (typeof v === "number" && isNaN(v))
    ) {
      return null;
    }
    return v;
  };
  
  
  const num = (v) => {
    if (
      v === "" ||
      v === undefined ||
      v === null ||
      (typeof v === "number" && isNaN(v))
    ) {
      return 0;
    }
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };
  
  
  const handleImportFromExcel = (e) => {
    if (!categoriesFlat.length) {
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
          return;
        }

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
          return;
        }

        const confirmReplace = window.confirm(
          `This will replace ${filteredItems.length} items in "${getSelectedCategoryNameById()}" category.
Other categories will NOT be affected.`
        );

        if (!confirmReplace) {
          e.target.value = "";
          return;
        }

        // delete ONLY selected category items
        const itemsToDelete = filteredItems;

        await Promise.all(
          itemsToDelete.map(item =>
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

            const categoryId = selectedCategoryId;

            if (!categoryId) throw new Error("Invalid category");

            const generatedSlug = generateSlug(categoryId, row.Name);

            const payload = {
              client_id: clientId,
              inventory_id: clean(row.Inventory_Id),
            
              name: row.Name?.trim(),
              description: clean(row.Description),
            
              category_id: categoryId,
              realm: clean(row.Realm) || realm || null,
            
              code: row.Code != null && !isNaN(row.Code)
              ? String(row.Code)
              : clean(row.Code),
            
            
              serving_quantity: clean(row.Serving_Quantity),
              serving_unit: clean(row.Serving_Unit),
              unit: clean(row.Unit),
              image_id: clean(row.Image),
            
              unit_price: num(row.Unit_Price),
              unit_cst: num(row.Unit_CST),
              unit_gst: num(row.Unit_GST),
              unit_total_price: num(row.Total_Unit_Price),
            
              cst: num(row.CST),
              gst: num(row.GST),
              discount: num(row.Discount),
              total_price: num(row.Total_Price),
            
              slug: generatedSlug,   // ⭐⭐⭐ THIS FIXES 422
            
              line_item_id: row.Line_Item_IDs
              ? row.Line_Item_IDs
                  .split(",")
                  .map(v => parseInt(v.trim(), 10))
                  .filter(v => !isNaN(v))
              : null,
            
            
                recipe: recipe && typeof recipe === "object" && !Array.isArray(recipe)
                ? recipe
                : null,              
              created_by,
              updated_by
            };
            

           await axios.post(
  `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
  payload,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }
);


            successCount++;
          } catch (err) {
            failCount++;
            errors.push(`Row ${index + 2}: ${err.message}`);
          }
        }

        await fetchData({ silent: true });

        // ✅ Refresh addon data
        if (selectedCategoryId) {
          const addonCatId = getAddonCategoryId(selectedCategoryId);
          const { subcategories, items } = await fetchAddonData(addonCatId);
          setAddonSubcategories(subcategories);
          setAllAddonItems(items);
        }



        e.target.value = "";
      } catch (err) {
        console.error("Import Error:", err);
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
  const getSelectedCategoryNameById = () => {
    if (!selectedCategoryId) return 'All Categories';
    const found = categoriesFlat.find(c => c.id === selectedCategoryId);
    return found?.name || 'All Categories';
  };
  // const quickDieteryCategories = dieterySubCategories.slice(0, 2);
  const quickDieteryCategories = dieterySubCategories;
  const getCategoryWithParent = (catId) => {
    const cat = categoriesFlat.find(c => c.id === catId);
    if (!cat) return { name: "", parent: "" };

    const parent = categoriesFlat.find(p => p.id === cat.parentId);

    return {
      name: cat.name,
      parent: parent?.name || null
    };
  };

  const getTopSectionName = (categoryId) => {
    if (!categoryId) return null;

    const rootNode = categoriesFlat.find(
      c => c.name.toLowerCase() === menuConfig.root.toLowerCase()
        || c.id.toLowerCase() === menuConfig.root.toLowerCase()
    );

    if (!rootNode) return null;

    let current = categoriesFlat.find(c => c.id === categoryId);

    // climb up until direct child of root
    while (current && current.parentId) {

      if (current.parentId === rootNode.id) {
        return current.name; // FOUND the 1st subcategory under dietery
      }

      current = categoriesFlat.find(c => c.id === current.parentId);
    }

    return null;
  };


  const findNodeAndChildren = (nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node;

      if (node.children?.length) {
        const found = findNodeAndChildren(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!selectedCategoryId) {
      setSidebarCategories(categories);
    }
  }, [selectedCategoryId, categories]);

  return (
    <div className="h-[90vh] bg-bg-primary overflow-hidden">
      <div className="mx-auto p-2">
        <div className="lg:grid lg:grid-cols-4 gap-2">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-2">
              <MenuCategoryTree
                categories={sidebarCategories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
                clientId={clientId}
                token={token}
                onCategoriesUpdate={() => fetchData({ silent: true })}
                menuConfig={menuConfig}
              />

            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 border-default border-border-default p-3 rounded-lg h-[88.5vh] flex flex-col">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide lg:overflow-visible pb-2">
              {quickDieteryCategories.map(cat => (
                <button key={cat.id} onClick={() => {
                  setSelectedCategoryId(cat.id);

                  const selectedNode = findNodeAndChildren(categories, cat.id);

                  if (selectedNode) {
                    setSidebarCategories([selectedNode]);
                  }
                }}

                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border whitespace-nowrap transition-all flex-shrink-0`}>
                  {(() => {
                    const section = getTopSectionName(cat.id);

                    return (
                      <div className="flex flex-col leading-tight text-left">
                        {section && (
                          <span className="text-[10px] opacity-60">
                            {section}
                          </span>
                        )}
                        <span className="text-sm font-semibold">
                          {cat.name}
                        </span>
                      </div>
                    );
                  })()}

                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">

              {/* LEFT: Title */}
              <div className="flex-shrink-0">
                <h2 className="text-lg lg:text-2xl font-semibold text-text-primary leading-tight">
                  {getSelectedCategoryNameById() || 'All Categories'}
                  <span className="text-sm ml-2 text-text-secondary">
                    ({filteredItems.length})
                  </span>
                </h2>
              </div>

              {/* RIGHT: Search + Actions */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:flex-nowrap lg:gap-2">

                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items…"
                    className="
          w-full h-9 pl-10 pr-3 rounded-lg
          bg-bg-tertiary border border-border-default
          text-sm text-text-primary placeholder:text-text-secondary
          focus:outline-none focus:ring-2 focus:ring-action-primary/30
        "
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={openAddModal}
                    className="
          h-9 px-3 flex items-center gap-2
          rounded-lg bg-action-primary text-white
          text-sm font-semibold shadow-sm
          hover:opacity-90
        "
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>

                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="
          h-9 px-3 flex items-center gap-2
          rounded-lg bg-bg-tertiary border border-border-default
          text-sm font-semibold
          hover:border-action-primary hover:bg-bg-secondary
        "
                  >
                    <Edit size={14} />
                    <span className="hidden sm:inline">Bulk Update</span>
                  </button>

                  {/* Import / Export */}
                  <div className="relative group">
                    <button
                      className="
            h-9 px-3 flex items-center gap-2
            rounded-lg bg-bg-tertiary border border-border-default
            text-sm font-semibold
            hover:border-action-primary hover:bg-bg-secondary
          "
                    >
                      <CloudUpload size={14} />
                    </button>

                    <div
                      className="
            absolute right-0 mt-1 w-36
            bg-bg-primary border border-border-default rounded-lg shadow-lg
            opacity-0 invisible group-hover:opacity-100 group-hover:visible
            transition-all duration-200 z-50
          "
                    >
                      <button
                        onClick={() => document.getElementById('excelInput').click()}
                        className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-bg-secondary"
                      >
                        <Upload size={14} />
                        Import
                      </button>

                      <button
                        onClick={handleExportToExcel}
                        className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-bg-secondary"
                      >
                        <Download size={14} />
                        Export
                      </button>
                    </div>
                  </div>

                  <input
                    type="file"
                    id="excelInput"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleImportFromExcel}
                  />
                </div>
              </div>
            </div>


            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {filteredItems.map((item) => {
                  const discountPercent = item.discount && item.unit_price && Number(item.discount) > 0
                    ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(0) : null;

                  return (
                    <div key={item.id}
                      className="relative flex gap-2 items-center bg-bg-primary border border-border-default rounded-xl p-1
                                    shadow-sm hover:shadow-md transition group overflow-hidden">
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 pointer-events-none z-10
                                      group-hover:animate-overlayFade"/>
                      {item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0 && (
                        <div className="absolute bottom-2 right-2 bg-orange-500 text-white text-[7px] p-1 rounded-md z-10 shadow-md flex items-center gap-1">
                          <Plus size={10} />
                          <span>{item.line_item_id.length} add-ons</span>
                        </div>
                      )}

                      <div className="relative w-10 h-12 md:h-16 md:w-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {discountPercent && (
                          <div className="absolute top-1 left-1 bg-action-danger text-white text-[7px] md:text-[10px] px-1 rounded z-10">
                            {discountPercent}% OFF
                          </div>
                        )}

                        <MenuImagePreview clientId={clientId} imageId={item.image_id} token={token} alt={item.name}
                          baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL} className="w-full h-full object-cover"
                          urlBuilder={({ baseUrl, clientId, imageId }) =>
                            `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`} />
                      </div>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleItemClick(item)}>
                        <h3 className="text-[10px] md:text-[16px] font-semibold text-text-primary">
                          {item.name}
                        </h3>

                        {item.description && (
                          <p className="text-[8px] md:text-[13px] text-text-secondary line-clamp-1">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          {discountPercent ? (
                            <>
                              <span className="text-sm font-bold text-action-primary">
                                ₹{(item.unit_price - item.discount).toFixed(0)}
                              </span>
                              <span className="text-xs line-through text-text-secondary">
                                ₹{item.unit_price}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-action-primary">
                              ₹{item.unit_price}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity
                       duration-200 z-20">
                        <button className="bg-action-primary text-white p-1 rounded-full hover:scale-110"
                          onClick={(e) => { e.stopPropagation(); setEditingItem(item); setShowEditModal(true); }}>
                          <Edit size={10} />
                        </button>

                        <button className="bg-action-danger text-white p-1 rounded-full hover:scale-110"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); setShowDeleteModal(true); }} >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

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

      <UniversalAddModal
        showModal={showAddModal}
        setShowModal={setShowAddModal}
        modalType="menu"
        newItem={newItem}
        setNewItem={setNewItem}
        selectedCategoryId={selectedCategoryId}
        categories={getModalCategories()}
        addonSubcategories={addonSubcategories}
        allAddonItems={allAddonItems}
        newItemImage={newItemImage}
        setNewItemImage={setNewItemImage}
        newItemImageUrl={newItemImageUrl}
        setNewItemImageUrl={setNewItemImageUrl}
        handleAddItem={handleAddItem}
        getCategoryIdByName={getCategoryIdByName}
        inventoryIds={inventoryIds}
        getAddonCategoryId={getAddonCategoryId}
        fetchAddonData={fetchAddonData}
        setAddonSubcategories={setAddonSubcategories}
        setAllAddonItems={setAllAddonItems}
      />

      <UniversalEditModal
        showModal={showEditModal}
        setShowModal={setShowEditModal}
        modalType="menu"
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        categories={categories}
        addonSubcategories={addonSubcategories}
        allAddonItems={allAddonItems}
        editItemImage={editItemImage}
        setEditItemImage={setEditItemImage}
        editItemImageUrl={editItemImageUrl}
        setEditItemImageUrl={setEditItemImageUrl}
        handleEditItem={handleEditItem}
        clientId={clientId}
        token={token}
        inventoryIds={inventoryIds}
        getAddonCategoryId={getAddonCategoryId}
        fetchAddonData={fetchAddonData}
        setAddonSubcategories={setAddonSubcategories}
        setAllAddonItems={setAllAddonItems}
      />

      <UniversalBulkUpdateModal
        showModal={showBulkModal}
        setShowModal={setShowBulkModal}
        modalType="menu"
        filteredItems={filteredItems}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        selectAllChecked={selectAllChecked}
        setSelectAllChecked={setSelectAllChecked}
        bulkEditData={bulkEditData}
        setBulkEditData={setBulkEditData}
        handleBulkUpdate={handleBulkUpdate}
        handleBulkDelete={handleBulkDelete}
        addonSubcategories={addonSubcategories}
        allAddonItems={allAddonItems}
      />
    </div>
  );
};

export default MenuManagement;