import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import { FaPlus } from 'react-icons/fa';
import axios from 'axios';
import AddonSelectionPopup from './AddonSelection';
import ComboSelectionPopup from './CombosSelectionPopup';
import {isRentalRealm} from '../Menu-utils/menuUtils'
const getDietaryStyle = (name = '') => {
  const k = name.toLowerCase().replace(/[-_\s]/g, '');
  if (k.includes('nonveg'))
    return { selected: 'bg-red-100 text-red-800 border-red-500', dot: 'bg-buttons-delete' };
  if (k.includes('egg'))
    return { selected: 'bg-amber-100 text-amber-800 border-amber-500', dot: 'bg-buttons-update' };
  if (k.includes('vegan'))
    return { selected: 'bg-emerald-100 text-emerald-800 border-emerald-500', dot: 'bg-emerald-500' };
  if (k.includes('jain'))
    return { selected: 'bg-teal-100 text-teal-800 border-teal-500', dot: 'bg-teal-500' };
  if (k.includes('veg'))
    return { selected: 'bg-green-100 text-green-800 border-green-600', dot: 'bg-green-600' };
  return { selected: 'bg-slate-200 text-slate-800 border-slate-500', dot: 'bg-buttons-configure' };
};
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
  dietaryColorMap,isSubmitting,
  isComboCategory, dedupedMenuItems, categoriesFlat,
  fetchAddonData,
  // Table-specific props
  tableRanges,
  setTableRanges,
  fieldErrors,
  setFieldErrors,
  isGenerating,
  generateTables,setAddonSubcategories,setAllAddonItems,
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
    const label = "block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted";
    const field =
      "w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
      "outline-none placeholder:text-ink-faint transition-colors " +
      "focus:border-brand-ring focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
    const area =
      "w-full px-item py-2 rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
      "outline-none placeholder:text-ink-faint transition-colors " +
      "focus:border-brand-ring focus:shadow-focus-ring";
    const dashedBtn =
      "w-full h-control rounded-button-sm bg-surface border-2 border-dashed border-brand-line text-brand-dark " +
      "hover:bg-brand-light transition-colors flex items-center justify-center gap-2 text-ui font-semibold";

    return (
      <>
        <div className="ui-backdrop font-sans">
          <div className="flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label={isComboCategory ? 'Add combo' : 'Add menu item'}>
            <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
              <div>
                <h3 className="text-panel-title text-brand-dark">
                  {isComboCategory ? 'Add New Combo' : 'Add New Menu Item'}
                </h3>
                {isComboCategory && (
                  <p className="text-micro text-ink-muted mt-0.5">
                    Set a flat combo price — component prices are for reference only
                  </p>
                )}
              </div>
              <button onClick={handleClose} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"><X className='h-4 w-4' /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-modal py-card space-y-4">
              {/* Category Selector */}
              <div>
                <label className={label}>Category *</label>
                <select
                  value={newItem?.category_id || ''}
                  onChange={(e) => {
                    const selectedCatId = e.target.value;

                    setNewItem(prev => ({
                      ...(prev || {}),
                      category_id: selectedCatId
                    }));
                  }}

                  className={field}
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
                <label className={label}> {isComboCategory ? 'Combo Name *' : 'Item Name *'}</label>
                <input
                  type="text"
                  value={newItem?.name ?? ''}
                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}), name: e.target.value }))}
                  className={field}
                  placeholder={isComboCategory ? "e.g. Family Combo, Weekend Special" : "Enter item name"} 
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className={label}>Description</label>
                <textarea
                  value={newItem?.description ?? ''}
                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}), description: e.target.value }))}
                  className={area}
                  placeholder={isComboCategory ? "What's included, portion details…" : "Enter item description"} rows="3" />
              </div>
              {isRentalRealm(normalizedRealm) &&  (
                  <div>
                       <label className={label}>
                             Rental Tier <span className="text-state-occupied">*</span>
                       </label>

                       <div className="flex gap-2 items-center bg-brand-tint border border-brand-line rounded-panel p-2">
                           <input value={newItem?.rentalTier?.label || ''}  placeholder="e.g. Half Day"
                                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}),
                                                   rentalTier: { ...(prev?.rentalTier || {}), label: e.target.value }}))}
                                  className={`${field} flex-1`}/>
                           <input type="number" min="0" value={newItem?.rentalTier?.days ?? ''} placeholder="Days"
                                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}),
                                                   rentalTier: { ...(prev?.rentalTier || {}), days: e.target.value }}))}
                                  className={`${field} !w-16 !px-2`}/>
                           <input type="number" min="0"  value={newItem?.rentalTier?.hours ?? ''}  placeholder="Hrs"
                                  onChange={(e) =>  setNewItem(prev => ({ ...(prev || {}),
                                                    rentalTier: { ...(prev?.rentalTier || {}), hours: e.target.value }}))}
                                  className={`${field} !w-16 !px-2`}/>
                           <input type="number" min="0" value={newItem?.rentalTier?.minutes ?? ''} placeholder="Min"
                                  onChange={(e) => setNewItem(prev => ({ ...(prev || {}),
                                                  rentalTier: { ...(prev?.rentalTier || {}), minutes: e.target.value }}))}
                                  className={`${field} !w-16 !px-2`}/>
                       </div>

                       {!newItem?.rentalTier?.label && ( <p className="mt-1 text-micro font-semibold text-state-occupied">Enter rental tier details</p> )}
                  </div>
              )}
              {normalizedRealm === 'restaurant' && (
  <div>
    <label className={label}>
      Dietary Type
    </label>
    <div className="flex flex-wrap gap-2">
    <div className="flex flex-wrap gap-2">
  {dietaryOptions.map((d) => {
    const key = (d || '').toLowerCase().replace(/[-_\s]/g, '');
    const selected = (newItem?.dietary_type || '').toLowerCase().replace(/[-_\s]/g, '') === key;
    const style = getDietaryStyle(d);
    const dotClass = dietaryColorMap?.[d] || dietaryColorMap?.[key] || style.dot;
    return (
      <button
        key={d}
        type="button"
        onClick={() =>
          setNewItem(prev => ({ ...prev, dietary_type: selected ? '' : d }))
        }
        className={`px-3 py-1.5 rounded-button-sm text-ui font-semibold border transition-colors capitalize flex items-center gap-2 ${
          selected
            ? `${style.selected} shadow-seg-active`
            : 'bg-surface text-ink-soft border-line hover:border-brand-line hover:bg-brand-tint'
        }`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
        {d}
        {selected && <span className="text-micro font-bold">✓</span>}
      </button>
    );
  })}
</div>
    </div>
    {!newItem?.dietary_type && (
      <p className="text-ui-sm text-ink-muted mt-1">No dietary type selected</p>
    )}
  </div>
)}
              {normalizedRealm === 'restaurant' && (
                <div>
                  <label className={label}>
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
                          className={`px-3 py-1.5 rounded-button-sm text-ui font-semibold border transition-colors ${selected
                              ? 'bg-brand text-text-white border-brand'
                              : 'bg-surface border-line text-ink-soft hover:border-brand-line hover:bg-brand-tint'
                            }`}
                        >
                          {t.name} {t.start && t.end ? `(${t.start}–${t.end})` : ''}
                        </button>
                      );
                    })}
                  </div>
                  {(newItem?.availability_time || []).length === 0 && (
                    <p className="text-ui-sm text-ink-muted mt-1">No timing selected = available all day</p>
                  )}
                </div>
              )}
              {/* Unit Price & Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}> {isComboCategory ? 'Combo Price * (flat, not sum of parts)' : 'Unit Price *'}</label>
                  <input
                    type="number"
                    value={newItem?.unit_price ?? ''}
                    onChange={(e) => setNewItem(prev => ({ ...(prev || {}), unit_price: e.target.value }))}
                    className={field}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className={label}>Discount</label>
                  <input
                    type="number"
                    value={newItem?.discount ?? ''}
                    onChange={(e) => setNewItem(prev => ({ ...(prev || {}), discount: e.target.value }))}
                    className={field}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Zone pricing */}
              <div>
                <label className={label}>
                  Pricing by Zone & Section
                </label>
                {/* Base price row — already exists above, just keep it */}
                {configs.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 mb-1 rounded-panel border border-brand-line bg-brand-tint">
                    <span className="text-ui font-semibold text-ink">
                      <span className="font-bold text-brand-dark">{c.section}</span>
                      <span className="text-ink-muted mx-1">—</span>
                      <span className='text-ink-soft'>{c.zone}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-ui-sm text-ink-muted">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder={newItem?.unit_price || "0.00"}
                        value={newItem?.zonePrices?.[c.id] ?? ''}
                        onChange={e => setNewItem(prev => ({
                          ...prev,
                          zonePrices: { ...(prev.zonePrices || {}), [c.id]: e.target.value }
                        }))}
                        className={`${field} !w-24 !h-8 !px-2 text-right`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Code & Unit */}
              <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className={label}>Unit</label>
                  <select
                    value={newItem?.unit ?? ''}
                    onChange={(e) => setNewItem(prev => ({ ...(prev || {}), unit: e.target.value }))}
                    className={field}
                  >
                    <option value="">Select unit</option>
                    {(units || []).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>
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
                    className={field}
                    placeholder="Enter stock / quantity"
                  />
                </div>
                <div>
                  <label className={label}>Serving Unit</label>
                  <select
                    value={newItem?.serving_unit ?? ''}
                    onChange={(e) => setNewItem(prev => ({ ...(prev || {}), serving_unit: e.target.value }))}
                    className={field}
                  >
                    <option value="">Select unit</option>
                    {(units || []).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Serving Quantity</label>
                  <input
                    type="number"
                    value={newItem?.serving_quantity ?? ''}
                    onChange={(e) => setNewItem(prev => ({ ...(prev || {}), serving_quantity: e.target.value }))}
                    className={field}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className={label}>Code *</label>
                  <input
                    type="text"
                    value={newItem?.code ?? ''}
                    onChange={(e) => setNewItem(prev => ({ ...(prev || {}), code: e.target.value }))}
                    className={field}
                    placeholder="0"
                  />
                </div>

                {/* ── Combo OR Addon picker ── */}
                <div>
                  {isComboCategory ? (
                    <>
                      <label className={label}>
                        Combo Items
                        <span className="ml-1 text-ui-sm text-ink-muted font-normal normal-case tracking-normal">(what's included)</span>
                      </label>

                      {newItem?.line_item_id?.length > 0 && (
                        <div className="mb-2 p-2 bg-brand-tint border border-brand-line rounded-panel space-y-1 max-h-28 overflow-y-auto">
                          {newItem.line_item_id.map(id => {
                            const it = dedupedMenuItems?.find(i => i.id === id);
                            return it ? (
                              <div key={id} className="flex items-center justify-between text-ui-sm">
                                <span className="font-semibold text-brand-dark truncate">{it.name}</span>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <span className="text-ink-muted">₹{Number(it.unit_price).toFixed(0)}</span>
                                  <button type="button" onClick={() => setNewItem(prev => ({ ...prev, line_item_id: prev.line_item_id.filter(x => x !== id) }))}
                                    className="w-4 h-4 rounded-full bg-brand-light hover:bg-brand-soft flex items-center justify-center">
                                    <X size={9} className="text-brand-dark" />
                                  </button>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}

                      <button type="button" onClick={() => setShowAddonPopup(true)}
                        className={dashedBtn}>
                        <Plus size={16} />
                        <span>{newItem?.line_item_id?.length > 0 ? `Edit Items (${newItem.line_item_id.length})` : 'Select Combo Items'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <label className={label}>Add-ons</label>
                      {newItem?.line_item_id?.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {newItem.line_item_id.map(addonId => (
                            <div key={addonId} className="flex items-center gap-2 bg-brand-light text-brand-dark border border-brand-line px-3 py-1 rounded-badge text-ui font-semibold">
                              <span>{getAddonNameById(addonId)}</span>
                              <button type="button" onClick={() => removeAddon(addonId)} className="hover:bg-brand-soft rounded-full p-0.5"><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => setShowAddonPopup(true)}
                        className={dashedBtn}>
                        <Plus size={18} />
                        <span>{newItem?.line_item_id?.length > 0 ? `Manage Add-ons (${newItem.line_item_id.length} selected)` : 'Select Add-ons'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>



              {/* Item Image Upload */}
              <div>
                <label className={label}>Item Image</label>
                <div
                  className={`relative border-2 border-dashed rounded-panel p-4 transition-colors ${dragActive ? 'border-brand-ring bg-brand-tint' : 'border-brand-line bg-surface'
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {newItemImageUrl ? (
                    <div className="relative">
                      <img src={newItemImageUrl} alt="Preview" className="w-full h-48 object-cover rounded-panel" />
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemImage(null);
                          setNewItemImageUrl('');
                        }}
                        className="absolute top-2 right-2 bg-brand text-text-white p-2 rounded-full hover:bg-brand-dark"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Upload className="mx-auto mb-2 text-brand-ring" size={32} />
                      <p className="text-ui text-ink-muted mb-2">
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
                        className="ui-btn ui-btn-add cursor-pointer"
                      >
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
              <button
                onClick={handleClose}
                className="ui-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={isSubmitting}
                className="ui-btn ui-btn-add"
              >
                {isComboCategory ? 'Add Combo' : 'Add Item'}
              </button>
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
    const label = "block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted";
    const field =
      "w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
      "outline-none placeholder:text-ink-faint transition-colors " +
      "focus:border-brand-ring focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
    const fieldError = " !border-state-occupied !bg-state-occupied-bg";
    const errorText = "mt-1 text-micro font-semibold text-state-occupied";

    return (
      <div className="ui-backdrop font-sans">
        <div
          className="flex flex-col w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in"
          role="dialog"
          aria-modal="true"
          aria-label="Add tables"
        >

          {/* Header */}
          <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
            <div className="min-w-0">
              <h3 className="text-panel-title text-brand-dark">Add tables</h3>
              <p className="text-micro text-ink-muted">Create one table or a whole range at once</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-modal py-card space-y-item">
            {(tableRanges || []).map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-2 gap-item rounded-panel border border-brand-line bg-brand-tint p-panel"
              >
                {/* Range */}
                <div className="sm:col-span-2">
                  <label className={`${label} flex items-center gap-item-sm`}>
                    Table range *
                    <span className="relative group cursor-pointer normal-case tracking-normal">
                      <span className="grid place-items-center h-4 w-4 rounded-badge bg-brand-soft text-brand-dark text-micro font-bold">
                        i
                      </span>
                      <span className="absolute left-0 top-6 hidden group-hover:block w-60 p-item bg-surface border border-brand-line rounded-button shadow-card z-10 text-ui-sm text-ink font-normal">
                        <span className="block font-bold text-brand-dark mb-1">Table range examples</span>
                        <span className="block"><strong>Single table:</strong> S1</span>
                        <span className="block"><strong>Single range:</strong> S01:S10</span>
                        <span className="block"><strong>Multiple ranges:</strong> A01:A10,B01:B05</span>
                      </span>
                    </span>
                  </label>
                  <input
                    value={row?.range ?? ''}
                    onChange={(e) => handleRangeChange(index, 'range', e.target.value)}
                    className={field + (fieldErrors?.[index]?.range ? fieldError : '')}
                    placeholder="S01:S10"
                  />
                  {fieldErrors?.[index]?.range && <div className={errorText}>Enter table range</div>}
                </div>

                {/* Seats */}
                <div>
                  <label className={label}>Seats *</label>
                  <input
                    type="number"
                    min="1"
                    value={row?.table_type ?? ''}
                    onChange={e => handleRangeChange(index, 'table_type', e.target.value)}
                    className={field + (fieldErrors?.[index]?.table_type ? fieldError : '')}
                    placeholder="4"
                  />
                  {fieldErrors?.[index]?.table_type && <div className={errorText}>Enter seating</div>}
                </div>

                {/* Config */}
                <div>
                  <label className={label}>Section &amp; zone *</label>
                  <select
                    value={row?.config_id ?? ''}
                    onChange={(e) => handleRangeChange(index, 'config_id', Number(e.target.value))}
                    className={field}
                  >
                    <option value="">Select config</option>
                    {loadingConfigs ? (
                      <option disabled>Loading...</option>
                    ) : configs.length === 0 ? (
                      <option disabled>No config available</option>
                    ) : (
                      configs.map((c) => (
                        <option key={c.id} value={c.id}>{c.section} - {c.zone}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Remark */}
                <div className="sm:col-span-2">
                  <label className={label}>Remark</label>
                  <select
                    value={row?.remark ?? ''}
                    onChange={(e) => handleRangeChange(index, 'remark', e.target.value)}
                    className={field}
                  >
                    <option value="">Select status</option>
                    {statusOptions.length > 0
                      ? statusOptions.map(s => (
                        <option key={s} value={s.toLowerCase()}>{s}</option>
                      ))
                      : (
                        <>
                          <option value="vacant">Vacant</option>
                          <option value="reserved">Reserved</option>
                        </>
                      )}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
            <button type="button" className="ui-btn" onClick={handleClose}>Cancel</button>
            <button
              type="button"
              className="ui-btn ui-btn-add"
              disabled={isGenerating}
              onClick={generateTables}
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 rounded-badge border-2 border-white/40 border-t-white animate-spin-slow" />
                  Generating…
                </>
              ) : (
                'Generate tables'
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