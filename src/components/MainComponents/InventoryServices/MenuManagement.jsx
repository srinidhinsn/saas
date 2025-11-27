import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, X, Search, Edit, Trash2, Upload, Download } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import MenuCategoryTree from './Tree&CategoryManage/MenuCategoryTree';
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
const MenuManagement = ({ clientId, token, realm}) => {
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
    line_item_id: []
  });

  // Bulk operations
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});

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

  useEffect(() => {
    const fetchData = async () => {
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
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?realm=${realm}`,
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
    };

    fetchData();
  }, [clientId, token]);

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

  const filteredItems = getFilteredItems();

  // Add Item
  const handleAddItem = async () => {
    try {
      const payload = {
        ...newItem,
        client_id: clientId,
        unit_price: parseFloat(newItem.unit_price) || 0,
        discount: parseFloat(newItem.discount) || 0,
        availability: parseInt(newItem.availability) || 0
      };

      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/create`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh items
      const itemRes = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMenuItems(itemRes.data.data);

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
      alert('Item added successfully!');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };

  // Edit Item
  const handleEditItem = async () => {
    try {
      const payload = {
        ...editingItem,
        client_id: clientId,
        unit_price: parseFloat(editingItem.unit_price) || 0,
        discount: parseFloat(editingItem.discount) || 0,
        availability: parseInt(editingItem.availability) || 0
      };

      await axios.post(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh items
      const itemRes = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMenuItems(itemRes.data.data);

      setShowEditModal(false);
      setEditingItem(null);
      alert('Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
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
    const exportData = filteredItems.map(item => ({
      ID: item.id,
      Name: item.name,
      Description: item.description,
      Category: item.category,
      Unit_Price: item.unit_price,
      Discount: item.discount,
      Availability: item.availability,
      Unit: item.unit
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MenuItems");

    XLSX.writeFile(workbook, "menu_items.xlsx");
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

    
      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
          <div className="rounded-lg max-w-md w-full p-6 bg-bg-primary">
            <h3 className="text-xl font-semibold mb-4 text-text-primary text-center">Confirm Delete</h3>
            <p className="mb-6 text-text-secondary">
              Want to delete <strong className="text-text-primary">{deleteTarget.name}</strong>?
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