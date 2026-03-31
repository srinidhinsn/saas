import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import { FaTimes, FaPlus } from 'react-icons/fa';
import axios from 'axios';
import AddonSelectionPopup from './AddonSelection';

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
  categories,
  addonSubcategories, // ✅ Addon subcategories
  allAddonItems, // ✅ All addon items
  newItemImage,
  setNewItemImage,
  newItemImageUrl,
  setNewItemImageUrl,
  handleAddItem,
  getCategoryIdByName,
  inventoryIds,

  // Table-specific props
  tableRanges,
  setTableRanges,
  fieldErrors,
  setFieldErrors,
  isGenerating,
  generateTables,
  units
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [showAddonPopup, setShowAddonPopup] = useState(false); // ✅ Popup state
  const [configs, setConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);
  const [dietaryOptions, setDietaryOptions] = useState([]);
  const [timingOptions, setTimingOptions] = useState([]);

  // Memoize helpers so they're stable across renders (prevents unnecessary effect runs)
  const flattenCategories = useCallback((items = [], level = 0) => {
    let result = [];

    items.forEach(item => {
      if (!item) return;

      const children = item.children || item.subCategories || [];

      if (item.id !== 'all') {
        result.push({ ...item, level });

        if (children.length) {
          result = result.concat(flattenCategories(children, level + 1));
        }
      }
    });

    return result;
  }, []);

  const fetchStatuses = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
        {
          params: { category_id: "status" },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setStatusOptions(res.data?.data || []);
    } catch (err) {
      console.error("Status fetch error:", err);
      setStatusOptions([]);
    }
  };

  const fetchConfigs = async () => {
    try {
      setLoadingConfigs(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
        {
          params: { client_id: clientId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setConfigs(res.data || []);
    } catch (err) {
      console.error("Config fetch error:", err);
      setConfigs([]);
    } finally {
      setLoadingConfigs(false);
    }
  };
  const fetchDietaryTypes = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
        {
          params: { category_id: "dietary_type" },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log("Dietary API:", res.data);
      setDietaryOptions(res.data?.data || []);
    } catch (err) {
      console.error("Dietary fetch error:", err);
      setDietaryOptions([]);
    }
  };

  const fetchTimings = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
        {
          params: { category_id: "available_timings" },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setTimingOptions(res.data?.data || []);
    } catch (err) {
      console.error("Timing fetch error:", err);
    }
  };

  useEffect(() => {
    if (!showModal) return;
    if (!clientId || !token) return;

    fetchConfigs();
    fetchStatuses();
    fetchDietaryTypes();
    fetchTimings();
  }, [showModal, modalType, clientId, token]);

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

  // ✅ Get addon name by ID
  const getAddonNameById = (id) => {
    const addon = allAddonItems?.find(item => item.id === id);
    return addon?.name || 'Unknown';
  };

  // ✅ Remove individual addon
  const removeAddon = (addonId) => {
    setNewItem(prev => ({
      ...(prev || {}),
      line_item_id: (prev?.line_item_id || []).filter(id => id !== addonId)
    }));
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
        inventory_id: 'menu'
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
      <>
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
                  value={newItem?.category_id || ''}
                  onChange={(e) => {
                    const selectedCatId = e.target.value;

                    setNewItem(prev => ({
                      ...(prev || {}),
                      category_id: selectedCatId
                    }));
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
              <div>
                <label className="block text-sm font-medium mb-2">
                  Availability Timing
                </label>

                <select
                  value={newItem?.availability_time || ""}
                  onChange={(e) =>
                    setNewItem(prev => ({
                      ...prev,
                      availability_time: e.target.value
                    }))
                  }
                  className="w-full px-4 py-2 rounded-lg border"
                >
                  <option value="">Select timing</option>

                  {timingOptions.map((t) => {
                    const [name, start, end] = t.split("|");

                    return (
                      <option key={t} value={name}>
                        {name} ({start} - {end})
                      </option>
                    );
                  })}
                </select>
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
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">
                  Pricing by Zone & Section
                </label>
                {/* Base price row — already exists above, just keep it */}
                {configs.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 mb-1 rounded-xl border border-border-default bg-bg-tertiary">
                    <span className="text-sm font-medium text-text-primary">
                      <span className="font-semibold text-blue-600">{c.section}</span>
                      <span className="text-gray-400 mx-1">—</span>
                      <span>{c.zone}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder={newItem?.unit_price || "0.00"}
                        value={newItem?.zonePrices?.[c.id] ?? ''}
                        onChange={e => setNewItem(prev => ({
                          ...prev,
                          zonePrices: { ...(prev.zonePrices || {}), [c.id]: e.target.value }
                        }))}
                        className="w-24 px-2 py-1 rounded-lg border border-border-default bg-bg-primary text-sm text-right focus:outline-none focus:ring-2 focus:ring-action-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Code & Unit */}
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    Availability
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem?.availability ?? ''}
                    onChange={(e) =>
                      setNewItem(prev => ({
                        ...(prev || {}),
                        availability: e.target.value
                      }))
                    }
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default"
                    placeholder="Enter stock / quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">Serving Unit</label>
                  <select
                    value={newItem?.serving_unit ?? ''}
                    onChange={(e) => setNewItem(prev => ({ ...(prev || {}), serving_unit: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  >
                    <option value="">Select unit</option>
                    {(units || []).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>


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
                {/* ✅ Add-ons with Popup */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    Add-ons
                  </label>

                  {/* Selected Addons Display */}
                  {newItem?.line_item_id && newItem.line_item_id.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {newItem.line_item_id.map(addonId => (
                        <div
                          key={addonId}
                          className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm"
                        >
                          <span>{getAddonNameById(addonId)}</span>
                          <button
                            type="button"
                            onClick={() => removeAddon(addonId)}
                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Select Addons Button */}
                  <button
                    type="button"
                    onClick={() => setShowAddonPopup(true)}
                    className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border-2 border-dashed border-border-default text-text-primary hover:border-action-primary hover:bg-bg-secondary transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <Plus size={18} />
                    <span>
                      {newItem?.line_item_id && newItem.line_item_id.length > 0
                        ? `Manage Add-ons (${newItem.line_item_id.length} selected)`
                        : 'Select Add-ons'}
                    </span>
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    Dietary Type
                  </label>
                  <select
                    value={newItem?.dietary_type || ""}
                    onChange={(e) =>
                      setNewItem(prev => ({
                        ...prev,
                        dietary_type: e.target.value
                      }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border-default"
                  >
                    <option value="">Select type</option>

                    {dietaryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
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

        {/* ✅ Addon Selection Popup */}
        <AddonSelectionPopup
          isOpen={showAddonPopup}
          onClose={() => setShowAddonPopup(false)}
          selectedAddons={newItem?.line_item_id || []}
          onSave={(selectedAddons) => {
            setNewItem(prev => ({ ...(prev || {}), line_item_id: selectedAddons }));
          }}
          addonSubcategories={addonSubcategories || []}
          allAddonItems={allAddonItems || []}
          currentItemId={null}
        />
      </>
    );
  }

  // TABLE modal
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
                  <label className="block text-sm font-semibold mb-2">Table Config *</label>

                  <select
                    value={row?.config_id ?? ""}
                    onChange={(e) => handleRangeChange(index, "config_id", Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Config</option>

                    {loadingConfigs ? (
                      <option disabled>Loading...</option>
                    ) : configs.length === 0 ? (
                      <option disabled>No Config Available</option>
                    ) : (
                      configs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.section} - {c.zone}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-text-primary">Remark</label>
                  <select
                    value={row?.remark ?? ''}
                    onChange={(e) => handleRangeChange(index, 'remark', e.target.value)}
                    className="w-full px-3 py-2 border-default border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary"
                  >
                    <option value="">Select status</option>
                    {statusOptions.length > 0
                      ? statusOptions.map(s => (
                        <option key={s} value={s.toLowerCase()}>{s}</option>
                      ))
                      : (
                        // fallback if masters API has nothing yet
                        <>
                          <option value="vacant">Vacant</option>
                          <option value="reserved">Reserved</option>
                        </>
                      )
                    }
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