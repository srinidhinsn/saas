import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload } from 'lucide-react';
import { FaTimes, FaPlus } from 'react-icons/fa';
import DropdownCheckbox from './DropdownCheckbox';
import axios from 'axios';
const UniversalAddModal = ({
  // Common props
  showModal,
  setShowModal,
  modalType, // 'menu' or 'table'
  clientId,
  token,
  // Menu-specific props
  newItem,
  setNewItem,
  selectedCategory,
  setSelectedCategory,
  categories,
  menuItems, // ✅ This now receives addonItems from parent
  newItemImage,
  setNewItemImage,
  newItemImageUrl,
  setNewItemImageUrl,
  handleAddItem,
  getCategoryIdByName,
  inventoryIds,
  zones = [],
  sections = [],
  // Table-specific props
  tableRanges,
  setTableRanges,
  fieldErrors,
  setFieldErrors,
  isGenerating,
  generateTables
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [zoneOptions, setZoneOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(false);

  // Memoize helpers so they're stable across renders (prevents unnecessary effect runs)
  const flattenCategories = useCallback((items = [], level = 0) => {
    let result = [];
    items.forEach(item => {
      if (!item) return;
      if (item.id !== 'all') {
        result.push({ ...item, level });
        if (item.children) {
          result = result.concat(flattenCategories(item.children, level + 1));
        }
      }
    });
    return result;
  }, []);

  const findCategoryName = useCallback((items = [], targetId) => {
    for (const item of items || []) {
      if (!item) continue;
      if (item.id === targetId) return item.name;
      if (item.children) {
        const found = findCategoryName(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);
  const fetchMasterValues = async (categoryId, setter) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
        {
          params: { category_id: categoryId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setter(res?.data?.data || []);

    } catch (err) {
      console.error("Master fetch error:", categoryId, err);
      setter([]);
    }
  };
  useEffect(() => {
    if (!showModal || modalType !== "table") return;
    if (!clientId || !token) return;

    const loadMasters = async () => {
      setLoadingMasters(true);

      await Promise.all([
        fetchMasterValues("zone", setZoneOptions),
        fetchMasterValues("section", setSectionOptions)
      ]);

      setLoadingMasters(false);
    };

    loadMasters();
  }, [showModal, modalType, clientId, token]);

  // Prefill category_id once when modal opens (guarded — don't overwrite while user types)
  useEffect(() => {
    if (showModal && modalType === 'menu') {
      try {
        const initialCatId = (typeof getCategoryIdByName === 'function')
          ? getCategoryIdByName(selectedCategory) || ''
          : '';
        if ((!newItem || !newItem.category_id) && initialCatId) {
          // use functional update to avoid clobbering concurrent updates
          setNewItem(prev => ({ ...(prev || {}), category_id: initialCatId }));
        }
      } catch (err) {
        // defensive
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, modalType, selectedCategory]);

  // Drag handlers
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
    if (file && file.type && file.type.startsWith('image/')) {
      setNewItemImage(file);
      setNewItemImageUrl(URL.createObjectURL(file));
    } else {
      alert('Please upload a valid image file');
    }
  };

  const handleRangeChange = (index, field, value) => {
    const updated = Array.isArray(tableRanges) ? [...tableRanges] : [];
    updated[index] = { ...(updated[index] || {}) };
    updated[index][field] = field === "table_type" ? Math.max(1, Number(value) || "") : value;
    setTableRanges(updated);
  };

  const handleClose = () => {
    setShowModal(false);
    if (modalType === 'menu') {
      setNewItem?.({
        name: '',
        description: '',
        category_id: '',
        unit_price: '',
        discount: '',
        code: '',
        unit: '',
        line_item_id: [],
        inventory_id: ''
      });

      setNewItemImage?.(null);
      setNewItemImageUrl?.('');
    } else if (modalType === 'table') {
      setTableRanges?.([]);
      setFieldErrors?.([]);
    }
  };

  if (!showModal) return null;

  if (modalType === 'menu') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
        <div className="rounded-lg max-w-2xl w-full p-6 bg-bg-primary max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-text-primary">Add New Menu Item</h3>
            <button onClick={handleClose} className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity">
              <X className='h-5 w-5' />
            </button>
          </div>

          <div className="space-y-4">
            {/* Category Selector */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">Category *</label>
              <select
                value={newItem?.category_id ?? (getCategoryIdByName?.(selectedCategory) ?? '')}
                onChange={(e) => {
                  const selectedCatId = e.target.value;
                  const categoryName = findCategoryName(categories, selectedCatId);
                  if (categoryName) {
                    setSelectedCategory(categoryName);
                  }
                  setNewItem(prev => ({ ...(prev || {}), category_id: selectedCatId }));
                }}
                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                required
              >
                <option value="">Select a category</option>
                {flattenCategories(categories || []).map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {'—'.repeat(cat.level)} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Inventory Selector */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                Inventory Category *
              </label>

              <select
                value={newItem?.inventory_id ?? ""}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...(prev || {}),
                    inventory_id: e.target.value
                  }))
                }
                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                required
              >
                <option value="">Select Inventory</option>

                {(inventoryIds || []).map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">Item Name *</label>
              <input
                type="text"
                value={newItem?.name ?? ''}
                onChange={(e) => setNewItem(prev => ({ ...(prev || {}), name: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                placeholder="Enter item name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">Description</label>
              <textarea
                value={newItem?.description ?? ''}
                onChange={(e) => setNewItem(prev => ({ ...(prev || {}), description: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                placeholder="Enter item description"
                rows="3"
              />
            </div>

            {/* Unit Price & Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Unit Price *</label>
                <input
                  type="number"
                  value={newItem?.unit_price ?? ''}
                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}), unit_price: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Discount</label>
                <input
                  type="number"
                  value={newItem?.discount ?? ''}
                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}), discount: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Code & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Code *</label>
                <input
                  type="text"
                  value={newItem?.code ?? ''}
                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}), code: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Unit</label>
                <input
                  type="text"
                  value={newItem?.unit ?? ''}
                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}), unit: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  placeholder="kg, pcs, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Serving Quantity</label>
                <input
                  type="number"
                  value={newItem?.serving_quantity ?? ''}
                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}), serving_quantity: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Serving Unit</label>
                <input
                  type="text"
                  value={newItem?.serving_unit ?? ''}
                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}), serving_unit: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  placeholder="kg, pcs, etc."
                />
              </div>
            </div>

            {/* Item Image Upload */}
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
                    <img src={newItemImageUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
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
            </div>

            {/* Add-ons - ✅ Now only shows items from addons category */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                Add-ons
                <span className="text-xs text-text-secondary ml-2">
                  (Only items from Addons category)
                </span>
              </label>
              <DropdownCheckbox
                selected={Array.isArray(newItem?.line_item_id) ? newItem.line_item_id : []}
                options={menuItems || []}
                onChange={(selected) => setNewItem(prev => ({ ...(prev || {}), line_item_id: selected }))}
                label="Select Add-ons"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleClose}
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
    );
  }

  // TABLE modal (unchanged)
  if (modalType === 'table') {
    return (
      <div className="fixed inset-0 bg-color-modalsbg bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-bg-primary rounded-xl w-full max-w-xl shadow-2xl border border-border-default my-8">
          <div className="sticky top-0 bg-bg-primary px-4 py-2 border-b-border-default flex justify-between items-center z-10 rounded-t-xl">
            <h3 className="text-xl font-bold text-text-primary">Add Tables</h3>
            <button onClick={handleClose} className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {(tableRanges || []).map((row, index) => (
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 bg-bg-tertiary rounded-lg border-default border-border-default"
                key={index}
              >
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold mb-2 text-text-primary">
                    Table Range *
                    <div className="relative group cursor-pointer">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-action-primary text-xs font-bold">
                        i
                      </span>
                      <div className="absolute left-1/2 -translate-x-1/2 top-7 hidden group-hover:block w-60 p-3 bg-white border border-blue-200 rounded-lg shadow-lg z-50 text-xs text-gray-700">
                        <div className="font-bold mb-1 text-text-primary">
                          Table Range Examples
                        </div>
                        <div className="space-y-1">
                          <div><strong>Single Table:</strong> S1</div>
                          <div><strong>Single Range:</strong> S01:S10</div>
                          <div><strong>Multiple Ranges:</strong> A01:A10,B01:B05</div>
                        </div>
                      </div>
                    </div>
                  </label>

                  <input
                    value={row?.range ?? ''}
                    onChange={(e) => handleRangeChange(index, 'range', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-success ${fieldErrors?.[index]?.range ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                      }`}
                    placeholder="S01:S10"
                  />
                  {fieldErrors?.[index]?.range && (
                    <div className="text-action-danger text-xs mt-1 font-medium">Enter table range</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-text-primary">Seats *</label>

                  <input
                    type="number"
                    min="1"
                    value={row?.table_type ?? ''}
                    onChange={(e) => handleRangeChange(index, 'table_type', e.target.value)}
                    className={`hidden md:block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${fieldErrors?.[index]?.table_type ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                      }`}
                    placeholder="4"
                  />

                  <div className={`md:hidden flex items-center border rounded-lg overflow-hidden ${fieldErrors?.[index]?.table_type ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                    }`}>
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number(row?.table_type) || 1;
                        const value = Math.max(1, current - 1);
                        handleRangeChange(index, 'table_type', value);
                      }}
                      className="px-3 py-2 text-text-primary hover:bg-bg-tertiary font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={row?.table_type ?? ''}
                      onChange={(e) => handleRangeChange(index, 'table_type', e.target.value)}
                      placeholder="4"
                      className="flex-1 text-center py-2 border-x border-border-default focus:outline-none bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number(row?.table_type) || 0;
                        handleRangeChange(index, 'table_type', current + 1);
                      }}
                      className="px-3 py-2 text-text-primary hover:bg-bg-tertiary font-bold"
                    >
                      +
                    </button>
                  </div>

                  {fieldErrors?.[index]?.table_type && (
                    <div className="text-action-danger text-xs mt-1 font-medium">Enter seating</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Section *</label>
                  <select
                    value={row?.section ?? ""}
                    onChange={(e) => handleRangeChange(index, "section", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Section</option>

                    {loadingMasters ? (
                      <option disabled>Loading...</option>
                    ) : sectionOptions.length === 0 ? (
                      <option disabled>No Sections Configured</option>
                    ) : (
                      sectionOptions.map((sec, i) => (
                        <option key={i} value={sec}>{sec}</option>
                      ))
                    )}

                  </select>

                  {fieldErrors?.[index]?.section && (
                    <div className="text-action-danger text-xs mt-1 font-medium">
                      Select section
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Zone *</label>
                  <select
                    value={row?.location_zone ?? ""}
                    onChange={(e) => handleRangeChange(index, "location_zone", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Zone</option>

                    {loadingMasters ? (
                      <option disabled>Loading...</option>
                    ) : zoneOptions.length === 0 ? (
                      <option disabled>No Zones Configured</option>
                    ) : (
                      zoneOptions.map((zone, i) => (
                        <option key={i} value={zone}>{zone}</option>
                      ))
                    )}

                  </select>

                  {fieldErrors?.[index]?.location_zone && (
                    <div className="text-action-danger text-xs mt-1 font-medium">
                      Select zone
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-text-primary">Remark</label>
                  <select
                    value={row?.remark ?? 'Vacant'}
                    onChange={(e) => handleRangeChange(index, 'remark', e.target.value)}
                    className="w-full px-3 py-2 border-default border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary"
                  >
                    <option value="Vacant">Vacant</option>
                    <option value="Reserved">Reserved</option>
                  </select>
                </div>
              </div>
            ))}

            <button
              className="w-full bg-action-primary text-text-white py-2 rounded-lg hover:bg-bulkActionsHover-addingHover hover:text-text-primary transition-colors font-bold text-lg shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={isGenerating}
              onClick={generateTables}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-border-default"></div>
                  Generating Tables...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FaPlus /> Generate Tables
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UniversalAddModal;