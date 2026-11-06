import React, { useState, useEffect } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import MenuImagePreview from '../../MainComponents/InventoryServices/Tree&CategoryManage/MenuImagePreview';
import AddonSelectionPopup from './AddonSelection';
import ComboSelectionPopup from './CombosSelectionPopup';
import axios from 'axios';
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
const UniversalEditModal = ({
  // Common props
  showModal,
  setShowModal,
  modalType, // 'menu' or 'table'
  normalizedRealm,
  // Menu-specific props
  editingItem,
  setEditingItem,
  categories,
  addonSubcategories, // ✅ Addon subcategories
  allAddonItems, // ✅ All addon items
  editItemImage,
  setEditItemImage,
  editItemImageUrl,
  setEditItemImageUrl,
  handleEditItem,
  clientId,
  token,
  inventoryIds,
  fetchAddonData, setAddonSubcategories, setAllAddonItems, units,
  // Combo props
  dedupedMenuItems, categoriesFlat,
  dietaryColorMap,
  // Table-specific props
  editRowId,
  setEditRowId,
  table,
  handleEditChange,
  saveEdit,
  editFieldErrors
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [showAddonPopup, setShowAddonPopup] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [dietaryOptions, setDietaryOptions] = useState([]);
  const [timingOptions, setTimingOptions] = useState([]);

  const isComboItem = React.useMemo(() => {
    if (!editingItem?.category_id || !categoriesFlat?.length) return false;
    // editingItem.isCombo is pre-computed by handleItemClick in MenuManagement
    if (editingItem.isCombo !== undefined) return editingItem.isCombo;
    let currentId = editingItem.category_id;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const cat = categoriesFlat.find(c => c.id === currentId);
      if (!cat) break;
      if ((cat.name || '').toLowerCase().includes('combo')) return true;
      currentId = cat.parentId ?? null;
    }
    return false;
  }, [editingItem, categoriesFlat]);

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

    fetchConfigs();
    fetchStatuses();
    if (normalizedRealm === 'restaurant') {
      fetchDietaryTypes();
      fetchTimings();
    }
  }, [showModal, clientId, token, normalizedRealm]);

  // Menu Modal Functions
  useEffect(() => {
    if (!showModal || modalType !== 'menu' || !fetchAddonData) return;
    fetchAddonData().then(({ subcategories, items }) => {
      setAddonSubcategories?.(subcategories);
      setAllAddonItems?.(items);
    });
  }, [showModal, modalType]);

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

  // ✅ Get addon name by ID
  const getAddonNameById = (id) => {
    const addon = allAddonItems?.find(item => item.id === id);
    return addon?.name || 'Unknown';
  };

  // ✅ Remove individual addon
  const removeAddon = (addonId) => {
    setEditingItem(prev => ({
      ...prev,
      line_item_id: (prev?.line_item_id || []).filter(id => id !== addonId)
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    if (modalType === 'menu') {
      setEditingItem?.(null);
      setEditItemImage?.(null);
      setEditItemImageUrl?.('');
    } else if (modalType === 'table') {
      setEditRowId?.(null);
    }
  };

  if (!showModal) return null;

  // Render Menu Edit Modal
  if (modalType === 'menu' && editingItem) {
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
          <div className="flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label={isComboItem ? 'Edit combo' : 'Edit menu item'}>

            {/* Header */}
            <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
              <div>
                <h2 className="text-panel-title text-brand-dark">
                  {isComboItem ? 'Edit Combo' : 'Edit Menu Item'}
                </h2>
                {isComboItem && (
                  <p className="text-micro text-ink-muted mt-0.5">Combo price is fixed — component items are informational</p>
                )}
              </div>
              <button onClick={handleClose} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"><X className="h-4 w-4" /></button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-modal py-card">
              <div className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className={label}>Category <span className="text-state-occupied">*</span></label>
                  <select
                    value={editingItem.category_id || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
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
                  <label className={label}>
                    {isComboItem ? 'Combo Name' : 'Item Name'} <span className="text-state-occupied">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className={field}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={label}>Description</label>
                  <textarea
                    value={editingItem.description || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className={area}
                    rows="3"
                  />
                </div>
            {isRentalRealm(normalizedRealm) && (
                <div>
                     <label className={label}>
                           Rental Tier <span className="text-state-occupied">*</span>
                     </label>
                     <div className="flex gap-2 items-center bg-brand-tint border border-brand-line rounded-panel p-2">
                         <input  value={editingItem?.rentalTier?.label || ''} placeholder="e.g. Half Day"
                                 onChange={(e) => setEditingItem(prev => ({ ...prev,
                                                  rentalTier: { ...(prev?.rentalTier || {}), label: e.target.value } }))}
                                 className={`${field} flex-1`}/>
                         <input type="number" min="0" value={editingItem?.rentalTier?.days ?? ''} placeholder="Days"
                                onChange={(e) => setEditingItem(prev => ({...prev,
                                                 rentalTier: { ...(prev?.rentalTier || {}), days: e.target.value }}))}
                                className={`${field} !w-16 !px-2`}/>
                         <input type="number" min="0" value={editingItem?.rentalTier?.hours ?? ''} placeholder="Hrs"
                                onChange={(e) => setEditingItem(prev => ({ ...prev,
                                                 rentalTier: { ...(prev?.rentalTier || {}), hours: e.target.value }}))}
                                className={`${field} !w-16 !px-2`}/>
                         <input type="number" min="0" value={editingItem?.rentalTier?.minutes ?? ''} placeholder="Min"
                                onChange={(e) => setEditingItem(prev => ({ ...prev,
                                                 rentalTier: { ...(prev?.rentalTier || {}), minutes: e.target.value }}))}
                                className={`${field} !w-16 !px-2`}/>
                     </div>
                {!editingItem?.rentalTier?.label && ( <p className="mt-1 text-micro font-semibold text-state-occupied">Enter rental tier details</p> )}
                </div> )}
                {normalizedRealm === 'restaurant' && (
  <div>
    <label className={label}>
      Dietary Type
    </label>
    <div className="flex flex-wrap gap-2">
    <div className="flex flex-wrap gap-2">
  {dietaryOptions.map((d) => {
    const key = (d || '').toLowerCase().replace(/[-_\s]/g, '');
    const selected = (editingItem?.dietary_type || '').toLowerCase().replace(/[-_\s]/g, '') === key;
    const style = getDietaryStyle(d);
    const dotClass = dietaryColorMap?.[d] || dietaryColorMap?.[key] || style.dot;
    return (
      <button
        key={d}
        type="button"
        onClick={() =>
          setEditingItem(prev => ({ ...prev, dietary_type: selected ? '' : d }))
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
    {!editingItem?.dietary_type && (
      <p className="text-ui-sm text-ink-muted mt-1">No dietary type selected</p>
    )}
  </div>
)}
                {normalizedRealm === 'restaurant' && (
                  <div>
                    <label className={label}>
                      Availability Timing
                    </label>

                    {(editingItem?.slug || '').includes('__unavailable') && (
                      <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-panel bg-state-occupied-bg border border-state-occupied/30">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-state-occupied" />
                          <span className="text-ui font-semibold text-state-occupied">
                            Currently marked as Unavailable
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            // Strip __unavailable from slug, restore to base
                            const currentSlug = editingItem.slug || '';
                            const baseSlug = currentSlug.replace(/__unavailable$/, '');
                            setEditingItem(prev => ({
                              ...prev,
                              slug: baseSlug,
                              availability: prev._previousAvailability ?? 999,
                              availability_time: prev._previousTiming ?? [],
                            }));
                          }}
                          className="ui-btn ui-btn-add !h-7 !px-3"
                        >
                          ✓ Mark Available
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {timingOptions.map((t) => {
                        const key = (t.name || '').toLowerCase();
                        const currentTimings = Array.isArray(editingItem?.availability_time)
                          ? editingItem.availability_time
                          : (editingItem?.availability_time ? [editingItem.availability_time] : []);
                        // Disable timing buttons when item is marked unavailable
                        const isUnavailable = (editingItem?.slug || '').includes('__unavailable');
                        const selected = currentTimings.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={isUnavailable}
                            onClick={() => {
                              const next = selected
                                ? currentTimings.filter(x => x !== key)
                                : [...currentTimings, key];
                              setEditingItem(prev => ({ ...prev, availability_time: next }));
                            }}
                            className={`px-3 py-1.5 rounded-button-sm text-ui font-semibold border transition-colors
              ${isUnavailable ? 'opacity-40 cursor-not-allowed bg-canvas border-line text-ink-muted' :
                                selected
                                  ? 'bg-brand text-text-white border-brand'
                                  : 'bg-surface border-line text-ink-soft hover:border-brand-line hover:bg-brand-tint'
                              }`}
                          >
                            {t.name} {t.start && t.end ? `(${t.start}–${t.end})` : ''}
                          </button>
                        );
                      })}
                    </div>

                    {!(editingItem?.slug || '').includes('__unavailable') &&
                      (Array.isArray(editingItem?.availability_time)
                        ? editingItem.availability_time.length === 0
                        : !editingItem?.availability_time) && (
                        <p className="text-ui-sm text-ink-muted mt-1">No timing selected = available all day</p>
                      )}
                  </div>
                )}
                {/* Unit Price & Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>
                      {isComboItem ? 'Combo Price (flat) *' : 'Base Price (All Zones) *'}
                    </label>
                    <input
                      type="number"
                      value={editingItem.unit_price}
                      onChange={(e) => setEditingItem({ ...editingItem, unit_price: e.target.value })}
                      className={field}
                      required
                    />
                  </div>

                  <div>
                    <label className={label}>Discount</label>
                    <input
                      type="number"
                      value={editingItem.discount}
                      onChange={(e) => setEditingItem({ ...editingItem, discount: e.target.value })}
                      className={field}
                    />
                  </div>
                </div>

                {/* Zone-wise pricing */}
                {configs.length > 0 && (
                  <div>
                    <label className={label}>
                      Zone-wise Pricing
                    </label>
                    {configs.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 mb-1 rounded-panel border border-brand-line bg-brand-tint"
                      >
                        <span className="text-ui font-semibold text-ink">
                          <span className="font-bold text-brand-dark">{c.section}</span>
                          <span className="text-ink-muted mx-1">—</span>
                          <span>{c.zone}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-ui-sm text-ink-muted">₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder={editingItem?.unit_price || "base price"}
                            value={editingItem?.zonePrices?.[c.id] ?? ''}
                            onChange={e => setEditingItem(prev => ({
                              ...prev,
                              zonePrices: { ...(prev.zonePrices || {}), [c.id]: e.target.value }
                            }))}
                            className={`${field} !w-24 !h-8 !px-2 text-right`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Code & Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>
                      Code <span className="text-state-occupied">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingItem.code ?? ''}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,

                          code: e.target.value
                        })
                      }
                      className={field}
                      placeholder="Item Code"
                      required
                    />
                  </div>
                  <div>
                    <label className={label}>
                      Availability  <span className="text-state-occupied">*</span>
                    </label>
                    <input
                      type="number"
                      value={editingItem.availability ?? ''}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          availability: e.target.value
                        })
                      } className={field}
                    />
                  </div>
                  <div>
                    <label className={label}>Unit</label>
                    <select value={editingItem.unit}
                      onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                      className={field}>
                    <option value="">Select unit</option>
                    {(units || []).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    </select>
                  </div>
                  <div>
                  <label className={label}>Serving Quantity</label>
                  <input type="number" value={editingItem.serving_quantity ?? ''} onChange={e => setEditingItem({ ...editingItem, serving_quantity: e.target.value })}
                    className={field} placeholder="0" />
                </div>
                <div>
                    <label className={label}>Serving Unit</label>
                    <select value={editingItem.serving_unit}
                      onChange={(e) => setEditingItem({ ...editingItem, serving_unit: e.target.value })}
                      className={field}>
                    <option value="">Select unit</option>
                    {(units || []).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    </select>
                  </div>
                </div>

                {/* Image */}
                <div>
                  <label className={label}>Item Image</label>
                  {(editItemImageUrl || editingItem.image_id) && (
                    <div className="mb-3">
                      <p className="text-ui-sm text-ink-muted mb-1">Current Image:</p>
                      {editItemImageUrl ? (
                        <div className="relative">
                          <img
                            src={editItemImageUrl}
                            alt="New Preview"
                            className="w-full h-32 object-cover rounded-panel border border-line"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditItemImage(null);
                              setEditItemImageUrl('');
                            }}
                            className="absolute top-2 right-2 bg-brand text-text-white p-1.5 rounded-full hover:bg-brand-dark"
                          >
                            <X className="w-4 h-4" />
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
                          className="w-full h-32 object-cover rounded-panel border border-line"
                        />
                      )}
                    </div>
                  )}
                  <div
                    className={`relative border-2 border-dashed rounded-panel p-6 transition-colors ${dragActive ? 'border-brand-ring bg-brand-tint' : 'border-brand-line bg-surface'
                      }`}
                    onDragEnter={handleEditDrag}
                    onDragLeave={handleEditDrag}
                    onDragOver={handleEditDrag}
                    onDrop={handleEditDrop}
                  >
                    <div className="text-center">
                      <Upload className="mx-auto mb-2 text-brand-ring" size={32} />
                      <p className="text-ui text-ink-muted mb-2">
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
                        className="ui-btn ui-btn-add cursor-pointer"
                      >
                        Choose File
                      </label>
                    </div>
                  </div>
                </div>

                {/* ── Combo items OR Addon picker ── */}
                <div>
                  {isComboItem ? (
                    <>
                      <label className={label}>
                        Combo Items
                        <span className="ml-1 text-ui-sm text-ink-muted font-normal normal-case tracking-normal">(what's included — price is fixed above)</span>
                      </label>

                      {editingItem.line_item_id?.length > 0 && (
                        <div className="mb-3 p-3 bg-brand-tint border border-brand-line rounded-panel space-y-1.5 max-h-36 overflow-y-auto">
                          {editingItem.line_item_id.map(id => {
                            const it = dedupedMenuItems?.find(i => i.id === id);
                            return it ? (
                              <div key={id} className="flex items-center justify-between text-ui">
                                <span className="font-semibold text-brand-dark truncate">{it.name}</span>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-ui-sm text-ink-muted font-semibold">₹{Number(it.unit_price).toFixed(0)}</span>
                                  <button type="button"
                                    onClick={() => setEditingItem(prev => ({ ...prev, line_item_id: prev.line_item_id.filter(x => x !== id) }))}
                                    className="w-4 h-4 rounded-full bg-brand-light hover:bg-brand-soft flex items-center justify-center">
                                    <X size={9} className="text-brand-dark" />
                                  </button>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowAddonPopup(true)}
                        className={dashedBtn}
                      >
                        <Plus size={18} />
                        <span>{editingItem.line_item_id?.length > 0 ? `Edit Combo Items (${editingItem.line_item_id.length})` : 'Select Combo Items'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <label className={label}>Add-ons</label>
                      {editingItem.line_item_id?.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {editingItem.line_item_id.map(addonId => (
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
                        <span>{editingItem.line_item_id?.length > 0 ? `Manage Add-ons (${editingItem.line_item_id.length} selected)` : 'Select Add-ons'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
              <button
                onClick={handleClose}
                className="ui-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleEditItem}
                className="ui-btn ui-btn-add"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Combo picker OR Addon picker */}
        {isComboItem ? (
          <ComboSelectionPopup
            isOpen={showAddonPopup}
            onClose={() => setShowAddonPopup(false)}
            selectedComponents={editingItem?.line_item_id || []}
            onSave={ids => setEditingItem(prev => ({ ...prev, line_item_id: ids }))}
            allMenuItems={dedupedMenuItems || []}
            categoriesFlat={categoriesFlat || []}
            currentItemId={editingItem?.id}
          />
        ) : (
          <AddonSelectionPopup
            isOpen={showAddonPopup}
            onClose={() => setShowAddonPopup(false)}
            selectedAddons={editingItem?.line_item_id || []}
            onSave={selectedAddons => setEditingItem(prev => ({ ...prev, line_item_id: selectedAddons }))}
            addonSubcategories={addonSubcategories || []}
            allAddonItems={allAddonItems || []}
            currentItemId={editingItem?.id}
          />
        )}
      </>
    );
  }

  // Render Table Edit Modal
  if (modalType === 'table' && table) {
    const setSeats = (v) => handleEditChange(table.id, "table_type", Math.max(1, Number(v) || 1));

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
          className="flex flex-col w-full max-w-modal max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in"
          role="dialog"
          aria-modal="true"
          aria-label="Edit table"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
            <h2 className="text-panel-title text-brand-dark">Edit table</h2>
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

            {/* Table name */}
            <div className="text-center rounded-panel border border-brand-line bg-gradient-to-b from-brand-tint to-surface py-item shadow-panel">
              <span className="block text-metric-label font-semibold text-ink-label">Table name</span>
              <strong className="block mt-1 text-kpi text-brand-dark break-words">{table.name}</strong>
            </div>

            {/* Seating */}
            <div>
              <label className={label}>No of seating</label>
              <div
                className={
                  "flex items-stretch h-control overflow-hidden rounded-button-sm border bg-surface " +
                  "focus-within:border-brand-ring focus-within:shadow-focus-ring " +
                  (editFieldErrors?.table_type ? "border-state-occupied" : "border-brand-line")
                }
              >
                <button
                  type="button"
                  aria-label="Decrease"
                  onClick={() => setSeats((Number(table.table_type) || 1) - 1)}
                  className="px-item font-bold text-brand-dark hover:bg-brand-light transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={table.table_type}
                  onChange={(e) => setSeats(e.target.value)}
                  className="flex-1 min-w-0 text-center text-ui font-semibold text-ink bg-transparent border-x border-brand-line outline-none"
                />
                <button
                  type="button"
                  aria-label="Increase"
                  onClick={() => setSeats((Number(table.table_type) || 1) + 1)}
                  className="px-item font-bold text-brand-dark hover:bg-brand-light transition-colors"
                >
                  +
                </button>
              </div>
              {editFieldErrors?.table_type && <p className={errorText}>{editFieldErrors.table_type}</p>}
            </div>

            {/* Section & Zone */}
            <div>
              <label className={label}>Section &amp; zone</label>
              <select
                value={table.config_id || ""}
                onChange={(e) => handleEditChange(table.id, "config_id", Number(e.target.value))}
                className={field}
              >
                <option value="">Select config</option>
                {loadingConfigs ? (
                  <option disabled>Loading...</option>
                ) : configs.length === 0 ? (
                  <option disabled>No config available</option>
                ) : (
                  configs.map(c => (
                    <option key={c.id} value={c.id}>{c.section} - {c.zone}</option>
                  ))
                )}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className={label}>Status</label>
              <select
                value={table.status || ""}
                onChange={(e) => handleEditChange(table.id, "status", e.target.value)}
                className={field + (editFieldErrors?.status ? fieldError : "")}
              >
                <option value="">Select status</option>
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {editFieldErrors?.status && <p className={errorText}>{editFieldErrors.status}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
            <button type="button" className="ui-btn" onClick={handleClose}>Cancel</button>
            <button type="button" className="ui-btn ui-btn-add" onClick={saveEdit}>Save changes</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UniversalEditModal;