import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import { FaPlus } from 'react-icons/fa';
import axios from 'axios';
import AddonSelectionPopup from './AddonSelection';
import ComboSelectionPopup from './CombosSelectionPopup';

const UniversalAddModal = ({
  // Common props
  showModal,
  setShowModal,
  modalType, // 'menu' or 'table'
  clientId,
  token,
  normalizedRealm,
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

  isComboCategory, dedupedMenuItems, categoriesFlat,
  fetchAddonData,
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
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/table-types`,
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
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
        {
          params: { category_id: "dietary_type" },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setDietaryOptions(res.data?.data || []);
    } catch (err) {
      console.error("Dietary fetch error:", err);
      setDietaryOptions([]);
    }
  };

  const fetchTimings = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
        {
          params: { category_id: "available_timings" },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const raw = res.data?.data || [];

      const parsed = raw.map(v => {
        const match = v.match(/^(.+)\((.+)-(.+)\)$/);
        return {
          name: (match?.[1] ?? v).toLowerCase(),
          start: match?.[2] ?? null,
          end: match?.[3] ?? null,
          raw: v
        };
      });

      setTimingOptions(parsed);
    } catch (err) {
      console.error("Timing fetch error:", err);
      setTimingOptions([]);
    }
  };

  useEffect(() => {
    if (!showModal) return;
    if (!clientId || !token) return;

  })
  useEffect(() => {
    if (!showModal || !clientId || !token) return;
    fetchConfigs();
    fetchStatuses();
    if (normalizedRealm === 'restaurant') {
      fetchDietaryTypes();
      fetchTimings();
    }
  }, [showModal, modalType, clientId, token, normalizedRealm]);

  // Drag handlers
  useEffect(() => {
    if (!showModal || modalType !== 'menu' || !fetchAddonData) return;
    fetchAddonData().then(({ subcategories, items }) => {
      setAddonSubcategories?.(subcategories);
      setAllAddonItems?.(items);
    });
  }, [showModal, modalType]);

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
              <div>
                <h3 className="text-xl font-semibold text-text-primary">
                  {isComboCategory ? 'Add New Combo' : 'Add New Menu Item'}
                </h3>
                {isComboCategory && (
                  <p className="text-xs text-violet-600 mt-0.5">
                    Set a flat combo price — component prices are for reference only
                  </p>
                )}
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90"><X className='h-5 w-5' /></button>
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
                <label className="block text-sm font-medium mb-2 text-text-primary"> {isComboCategory ? 'Combo Name *' : 'Item Name *'}</label>
                <input
                  type="text"
                  value={newItem?.name ?? ''}
                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}), name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  placeholder={isComboCategory ? "e.g. Family Combo, Weekend Special" : "Enter item name"} 
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
                  placeholder={isComboCategory ? "What's included, portion details…" : "Enter item description"} rows="3" />
              </div>
              {normalizedRealm === 'restaurant' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Availability Timing
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {timingOptions.map((t) => {
                      const key = (t.name || '').toLowerCase();
                      const selected = (newItem?.availability_time || []).includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            const current = newItem?.availability_time || [];
                            const next = selected
                              ? current.filter(x => x !== key)
                              : [...current, key];
                            setNewItem(prev => ({ ...prev, availability_time: next }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${selected
                          ? 'bg-action-primary text-white border-action-primary'
                          : 'bg-bg-tertiary border-border-default text-text-primary hover:border-action-primary'
                            }`}
                        >
                          {t.name} {t.start && t.end ? `(${t.start}–${t.end})` : ''}
                        </button>
                      );
                    })}
                  </div>
                  {(newItem?.availability_time || []).length === 0 && (
                    <p className="text-xs text-text-secondary mt-1">No timing selected = available all day</p>
                  )}
                </div>
              )}
              {/* Unit Price & Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary"> {isComboCategory ? 'Combo Price * (flat, not sum of parts)' : 'Unit Price *'}</label>
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

              {/* Zone pricing */}
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

                {/* ── Combo OR Addon picker ── */}
                <div>
                  {isComboCategory ? (
                    <>
                      <label className="block text-sm font-medium mb-2 text-text-primary">
                        Combo Items
                        <span className="ml-1 text-xs text-gray-400 font-normal">(what's included)</span>
                      </label>

                      {newItem?.line_item_id?.length > 0 && (
                        <div className="mb-2 p-2 bg-violet-50 border border-violet-200 rounded-lg space-y-1 max-h-28 overflow-y-auto">
                          {newItem.line_item_id.map(id => {
                            const it = dedupedMenuItems?.find(i => i.id === id);
                            return it ? (
                              <div key={id} className="flex items-center justify-between text-xs">
                                <span className="font-medium text-violet-800 truncate">{it.name}</span>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <span className="text-violet-500">₹{Number(it.unit_price).toFixed(0)}</span>
                                  <button type="button" onClick={() => setNewItem(prev => ({ ...prev, line_item_id: prev.line_item_id.filter(x => x !== id) }))}
                                    className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center">
                                    <X size={9} className="text-red-600" />
                                  </button>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}

                      <button type="button" onClick={() => setShowAddonPopup(true)}
                        className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border-2 border-dashed border-violet-300 text-violet-700 hover:border-violet-500 hover:bg-violet-50 transition-all flex items-center justify-center gap-2 text-sm font-medium">
                        <Plus size={16} />
                        <span>{newItem?.line_item_id?.length > 0 ? `Edit Items (${newItem.line_item_id.length})` : 'Select Combo Items'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium mb-2 text-text-primary">Add-ons</label>
                      {newItem?.line_item_id?.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {newItem.line_item_id.map(addonId => (
                            <div key={addonId} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
                              <span>{getAddonNameById(addonId)}</span>
                              <button type="button" onClick={() => removeAddon(addonId)} className="hover:bg-blue-200 rounded-full p-0.5"><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => setShowAddonPopup(true)}
                        className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border-2 border-dashed border-border-default text-text-primary hover:border-action-primary hover:bg-bg-secondary transition-all flex items-center justify-center gap-2 font-medium">
                        <Plus size={18} />
                        <span>{newItem?.line_item_id?.length > 0 ? `Manage Add-ons (${newItem.line_item_id.length} selected)` : 'Select Add-ons'}</span>
                      </button>
                    </>
                  )}
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
                  {isComboCategory ? 'Add Combo' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Combo picker OR Addon picker */}
        {isComboCategory ? (
          <ComboSelectionPopup
            isOpen={showAddonPopup}
            onClose={() => setShowAddonPopup(false)}
            selectedComponents={newItem?.line_item_id || []}
            onSave={ids => setNewItem(prev => ({ ...(prev || {}), line_item_id: ids }))}
            allMenuItems={dedupedMenuItems || []}
            categoriesFlat={categoriesFlat || []}
            currentItemId={null}
          />
        ) : (
          <AddonSelectionPopup
            isOpen={showAddonPopup}
            onClose={() => setShowAddonPopup(false)}
            selectedAddons={newItem?.line_item_id || []}
            onSave={selectedAddons => setNewItem(prev => ({ ...(prev || {}), line_item_id: selectedAddons }))}
            addonSubcategories={addonSubcategories || []}
            allAddonItems={allAddonItems || []}
            currentItemId={null}
          />
        )}
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
                  <label className="flex items-center gap-2 text-sm font-semibold mb-2 text-text-primary">Table Range *</label>
                  <input value={row?.range ?? ''} onChange={e => handleRangeChange(index, 'range', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-success ${fieldErrors?.[index]?.range ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'}`}
                    placeholder="S01:S10" />
                  {fieldErrors?.[index]?.range && <div className="text-action-danger text-xs mt-1 font-medium">Enter table range</div>}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-text-primary">Seats *</label>
                  <input type="number" min="1" value={row?.table_type ?? ''} onChange={e => handleRangeChange(index, 'table_type', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${fieldErrors?.[index]?.table_type ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'}`}
                    placeholder="4" />
                  {fieldErrors?.[index]?.table_type && <div className="text-action-danger text-xs mt-1 font-medium">Enter seating</div>}
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