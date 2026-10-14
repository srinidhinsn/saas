import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, Search, Plus } from 'lucide-react';
import AddonSelectionPopup from './AddonSelection';
import axios from 'axios';

const UniversalBulkUpdateModal = ({
  // Common props
  showModal,
  setShowModal,
  modalType, // 'menu' or 'table'
  clientId,
  token,
  menuItems,
  // Menu-specific props (Bulk Update)
  filteredItems,
  selectedRows,
  setSelectedRows,
  selectAllChecked,
  setSelectAllChecked,
  bulkEditData,
  setBulkEditData,
  handleBulkUpdate,
  handleBulkDelete,
  addonSubcategories, // ✅ Addon subcategories
  allAddonItems, // ✅ All addon items

  // Table-specific props (Bulk Update)
  tables,
  bulkUpdateSearch,
  setBulkUpdateSearch,
  selectedUpdateTables,
  setSelectedUpdateTables,
  bulkUpdateData,
  setBulkUpdateData,
  bulkUpdateGlobal,
  setBulkUpdateGlobal,
  handleBulkUpdateChange,
  saveBulkUpdate,
  getFilteredUpdateTables
}) => {

  // ✅ State for global add-ons popup
  const [showGlobalAddonPopup, setShowGlobalAddonPopup] = React.useState(false);
  const [globalAddons, setGlobalAddons] = React.useState([]);
  const [configs, setConfigs] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [dietaryOptions, setDietaryOptions] = useState([]);
  // ✅ State for individual item addon popup
  const [showItemAddonPopup, setShowItemAddonPopup] = React.useState(false);
  const [currentEditingItemId, setCurrentEditingItemId] = React.useState(null);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  // In UniversalBulkUpdateModal — replace the fetchConfigs function and its useEffect

  const fetchConfigs = async () => {
    if (loadingConfigs) return; // ✅ Guard against concurrent calls
    try {
      setLoadingConfigs(true);

      const res = await axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
        {
          params: { client_id: clientId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // ✅ Ensure it's always a clean array, deduplicated by id
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const seen = new Set();
      const unique = raw.filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      setConfigs(unique);
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

  useEffect(() => {
    if (!showModal) {
      setConfigs([]);
      return;
    }
    if (!clientId || !token) return;

    fetchConfigs();
    fetchStatuses();
    fetchDietaryTypes();
  }, [showModal]); 
  const confirmBulkDeleteAction = async () => {
    setIsDeleting(true);
    try {
      await handleBulkDelete();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  // ✅ Get addon name by ID
  const getAddonNameById = (id) => {
    const addon = allAddonItems?.find(item => item.id === id);
    return addon?.name || 'Unknown';
  };

  // ✅ FIXED: Apply global add-ons to all selected items (works both ways)
  const handleGlobalAddonSave = (selectedAddons) => {
    setGlobalAddons(selectedAddons);
    setShowGlobalAddonPopup(false);

    // If items are already selected, apply immediately
    if (selectedRows.length > 0) {
      const updatedBulkData = { ...bulkEditData };

      selectedRows.forEach(itemId => {
        updatedBulkData[itemId] = {
          ...(updatedBulkData[itemId] || {}),
          line_item_id: [...selectedAddons]
        };
      });

      setBulkEditData(updatedBulkData);

      if (selectedAddons.length > 0) {
        alert(`Applied ${selectedAddons.length} add-on(s) to ${selectedRows.length} selected item(s)`);
      }
    } else if (selectedAddons.length > 0) {
      // Addons selected but no items yet - just store them
    }
  };

  // ✅ Clear global add-ons for all selected items
  const clearGlobalAddons = () => {
    if (selectedRows.length === 0) {
      alert('No items selected');
      return;
    }

    const updatedBulkData = { ...bulkEditData };

    selectedRows.forEach(itemId => {
      updatedBulkData[itemId] = {
        ...(updatedBulkData[itemId] || {}),
        line_item_id: []
      };
    });

    setBulkEditData(updatedBulkData);
    setGlobalAddons([]);
  };

  // ✅ Open addon popup for specific item
  const openItemAddonPopup = (itemId) => {
    setCurrentEditingItemId(itemId);
    setShowItemAddonPopup(true);
  };

  // ✅ NEW: Apply global addons automatically when items are selected (if addons were already chosen)
  React.useEffect(() => {
    if (modalType === 'menu' && globalAddons.length > 0 && selectedRows.length > 0) {
      const updatedBulkData = { ...bulkEditData };
      let hasChanges = false;

      selectedRows.forEach(itemId => {
        // Only apply if this item doesn't already have the global addons set
        const currentAddons = updatedBulkData[itemId]?.line_item_id;
        const addonsMatch = currentAddons &&
          currentAddons.length === globalAddons.length &&
          currentAddons.every(id => globalAddons.includes(id));

        if (!addonsMatch) {
          updatedBulkData[itemId] = {
            ...(updatedBulkData[itemId] || {}),
            line_item_id: [...globalAddons]
          };
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setBulkEditData(updatedBulkData);
      }
    }
  }, [selectedRows, globalAddons, modalType]);

  // Menu: Toggle all selection
  const toggleSelectAll = () => {
    if (modalType === 'menu') {
      if (!selectAllChecked) {
        setSelectedRows(filteredItems.map(item => item.id));
        setSelectAllChecked(true);
      } else {
        setSelectedRows([]);
        setSelectAllChecked(false);
      }
    }
  };

  // Menu: Toggle individual row
  const toggleRowSelection = (itemId) => {
    if (selectedRows.includes(itemId)) {
      setSelectedRows(selectedRows.filter(id => id !== itemId));
    } else {
      setSelectedRows([...selectedRows, itemId]);
    }
  };

  // Menu: Update bulk edit data
  const updateBulkEditData = (itemId, field, value) => {
    const editData = bulkEditData[itemId] || {};
    setBulkEditData({
      ...bulkEditData,
      [itemId]: { ...editData, [field]: value }
    });
  };

  // Table: Toggle all selection
  const selectAllUpdateTables = () => {
    const filtered = getFilteredUpdateTables();
    if (selectedUpdateTables.length === filtered.length) {
      setSelectedUpdateTables([]);
    } else {
      setSelectedUpdateTables(filtered.map(t => t.id));
    }
  };

  // Table: Toggle individual table
  const toggleUpdateTableSelection = (tableId) => {
    setSelectedUpdateTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleClose = () => {
    setShowModal(false);
    if (modalType === 'menu') {
      setSelectedRows([]);
      setBulkEditData({});
      setSelectAllChecked(false);
      setGlobalAddons([]);
      setShowGlobalAddonPopup(false);
      setShowItemAddonPopup(false);
      setCurrentEditingItemId(null);
      setShowDeleteConfirm(false);
    } else if (modalType === 'table') {
      setSelectedUpdateTables([]);
      setBulkUpdateData({});
      setBulkUpdateSearch('');
      setBulkUpdateGlobal({
        table_type: "",
        status: "",
        config_id: ""
      });
    }
  };

  if (!showModal) return null;

 // Render Menu Bulk Update Modal
if (modalType === 'menu') {
  const inputBase =
    "w-full px-3 py-2 border border-border-default rounded-lg text-sm bg-bg-primary text-text-primary " +
    "focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-500 transition";
  const labelBase =
    "block text-[11px] font-semibold uppercase tracking-wide mb-1 text-text-secondary";
  const thBase =
    "px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary bg-bg-tertiary whitespace-nowrap";

  const getZoneValue = (item, editData, c) =>
    editData.zonePrices?.[c.id] ??
    menuItems?.find(
      m => Number(m.id) === Number(item.id) && Number(m.zone_config_id) === Number(c.id)
    )?.unit_price ??
    '';

  const getZoneVariants = (item) =>
    menuItems?.filter(
      m => Number(m.id) === Number(item.id) && m.zone_config_id !== null && m.zone_config_id !== 0
    ) || [];

  const availabilityBadge = (item) =>
    Number(item.availability) === 0
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-green-100 text-green-700 border-green-200";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="bg-bg-primary w-full sm:max-w-6xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh] h-full rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border-default">
          {/* HEADER */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-buttons-update text-gray-900 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Edit className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold leading-tight truncate">Bulk Update & Delete</h2>
                <p className="text-xs opacity-80 truncate">Select items, edit inline, then save</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-white/30 hover:bg-white/50 transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* GLOBAL ADD-ONS */}
          <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-200 shrink-0">
            <p className="text-xs font-semibold text-text-secondary mb-2">
              Apply add-ons to all selected items
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="grid grid-cols-2 sm:flex gap-2">
                <button
                  onClick={() => setShowGlobalAddonPopup(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-buttons-update hover:bg-amber-600 text-gray-900 font-semibold text-sm shadow-sm transition-colors whitespace-nowrap"
                >
                  <Plus size={16} />
                  {globalAddons.length > 0 ? `${globalAddons.length} add-on(s)` : 'Select Add-ons'}
                </button>
                <button
                  onClick={clearGlobalAddons}
                  disabled={globalAddons.length === 0 && selectedRows.length === 0}
                  className="px-4 py-2 rounded-lg bg-buttons-configure hover:bg-slate-600 text-white font-semibold text-sm transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Clear All
                </button>
              </div>

              {globalAddons.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {globalAddons.slice(0, 3).map(id => (
                    <span key={id} className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-medium">
                      {getAddonNameById(id)}
                    </span>
                  ))}
                  {globalAddons.length > 3 && (
                    <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full text-xs font-medium">
                      +{globalAddons.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-2">
              {selectedRows.length > 0
                ? `${globalAddons.length > 0 ? 'Add-ons applied to' : 'Select add-ons to apply to'} ${selectedRows.length} selected item(s)`
                : globalAddons.length > 0
                  ? `${globalAddons.length} add-on(s) chosen. Now select items to apply them.`
                  : 'Pick add-ons first then items, or items first then add-ons.'}
            </p>
          </div>

          {/* ACTION BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border-default bg-bg-tertiary shrink-0">
            <label className="flex items-center justify-between sm:justify-start gap-3 cursor-pointer select-none">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectAllChecked}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="text-sm font-semibold text-text-primary">Select All</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                {selectedRows.length} / {filteredItems.length}
              </span>
            </label>

            <div className="grid grid-cols-3 sm:flex gap-2">
              <button
                onClick={() => {
                  if (selectedRows.length === 0) return;
                  const updated = { ...bulkEditData };
                  selectedRows.forEach(id => {
                    updated[id] = { ...(updated[id] || {}), availability: 0 };
                  });
                  setBulkEditData(updated);
                }}
                disabled={selectedRows.length === 0}
                className="flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <span className="sm:hidden">Unavail.</span>
                <span className="hidden sm:inline">Mark Unavailable</span>
              </button>
              <button
                onClick={() => {
                  if (selectedRows.length === 0) return;
                  const updated = { ...bulkEditData };
                  selectedRows.forEach(id => {
                    updated[id] = { ...(updated[id] || {}), availability: 999 };
                  });
                  setBulkEditData(updated);
                }}
                disabled={selectedRows.length === 0}
                className="flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <span className="sm:hidden">Avail.</span>
                <span className="hidden sm:inline">Mark Available</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={selectedRows.length === 0}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-buttons-delete hover:bg-red-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto bg-bg-primary px-3 sm:px-4 py-3">

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-border-default">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border-default">
                    <th className={`${thBase} w-10`}>
                      <input
                        type="checkbox"
                        checked={selectAllChecked}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </th>
                    <th className={thBase}>Name</th>
                    <th className={thBase}>Description</th>
                    <th className={thBase}>Price</th>
                    <th className={thBase}>Discount</th>
                    <th className={thBase}>Zone Price</th>
                    <th className={thBase}>Code</th>
                    <th className={thBase}>Availability</th>
                    <th className={thBase}>Add-ons</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
                    const isSelected = selectedRows.includes(item.id);
                    const editData = bulkEditData[item.id] || {};
                    const currentAddons =
                      editData.line_item_id !== undefined
                        ? editData.line_item_id
                        : Array.isArray(item.line_item_id) ? item.line_item_id : [];
                    const zoneVariants = getZoneVariants(item);

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-border-default transition-colors ${
                          isSelected
                            ? 'bg-amber-50/60'
                            : index % 2 === 0
                              ? 'bg-bg-primary hover:bg-bg-tertiary'
                              : 'bg-bg-tertiary/50 hover:bg-bg-tertiary'
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(item.id)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                        </td>

                        <td className="px-3 py-2.5 min-w-[160px]">
                          {isSelected ? (
                            <input
                              type="text"
                              value={editData.name !== undefined ? editData.name : item.name}
                              onChange={e => updateBulkEditData(item.id, 'name', e.target.value)}
                              className={inputBase}
                              placeholder="Item name"
                            />
                          ) : (
                            <span className="text-sm font-medium text-text-primary">{item.name}</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 min-w-[180px]">
                          {isSelected ? (
                            <input
                              type="text"
                              value={editData.description !== undefined ? editData.description : item.description ?? ''}
                              onChange={e => updateBulkEditData(item.id, 'description', e.target.value)}
                              className={inputBase}
                              placeholder="Description"
                            />
                          ) : (
                            <span className="text-sm text-text-secondary truncate block max-w-[220px]">
                              {item.description || '-'}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 w-28">
                          {isSelected ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editData.unit_price !== undefined ? editData.unit_price : item.unit_price}
                              onChange={e => updateBulkEditData(item.id, 'unit_price', e.target.value)}
                              className={inputBase}
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-text-primary">
                              ₹{typeof item.unit_price === 'number' ? item.unit_price.toFixed(2) : '0.00'}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 w-28">
                          {isSelected ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editData.discount !== undefined ? editData.discount : item.discount}
                              onChange={e => updateBulkEditData(item.id, 'discount', e.target.value)}
                              className={inputBase}
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-sm text-text-primary">
                              {Number(item.discount) > 0 ? `${Number(item.discount)}%` : '-'}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 min-w-[200px]">
                          {isSelected ? (
                            <div className="space-y-1.5">
                              {configs.map(c => (
                                <div key={c.id} className="flex items-center gap-2">
                                  <span className="text-xs text-text-secondary font-medium w-24 truncate shrink-0">
                                    {c.section}-{c.zone}
                                  </span>
                                  <span className="text-xs text-text-secondary">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder={item.unit_price || "0.00"}
                                    value={getZoneValue(item, editData, c)}
                                    onChange={e =>
                                      updateBulkEditData(item.id, 'zonePrices', {
                                        ...(editData.zonePrices || {}),
                                        [c.id]: e.target.value
                                      })
                                    }
                                    className="w-20 px-2 py-1 border border-border-default rounded-lg text-xs text-right bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-500"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : zoneVariants.length === 0 || !configs.length ? (
                            <span className="text-xs text-text-secondary">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {zoneVariants.map(s => {
                                const c = configs.find(x => x.id === s.zone_config_id);
                                return c ? (
                                  <span
                                    key={`${s.id}-${s.zone_config_id}`}
                                    className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200"
                                  >
                                    {c.section}-{c.zone}: ₹{s.unit_price}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2.5 w-32">
                          {isSelected ? (
                            <input
                              type="text"
                              value={editData.code !== undefined ? editData.code : item.code ?? ''}
                              onChange={e => updateBulkEditData(item.id, 'code', e.target.value)}
                              className={inputBase}
                              placeholder="Code"
                            />
                          ) : (
                            <span className="text-sm text-text-primary">{item.code ?? '-'}</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 min-w-[150px]">
                          {isSelected ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={editData.availability !== undefined ? editData.availability : item.availability ?? ''}
                                onChange={e => updateBulkEditData(item.id, 'availability', e.target.value)}
                                className={`${inputBase} w-20`}
                                placeholder="0"
                              />
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateBulkEditData(item.id, 'availability', 0)}
                                  className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200 font-semibold whitespace-nowrap transition-colors"
                                >
                                  × Off
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateBulkEditData(item.id, 'availability', 999)}
                                  className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 hover:bg-green-200 font-semibold whitespace-nowrap transition-colors"
                                >
                                  ✓ On
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${availabilityBadge(item)}`}>
                              {Number(item.availability) === 0 ? 'Off' : item.availability ?? '—'}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 w-36">
                          {isSelected ? (
                            <button
                              type="button"
                              onClick={() => openItemAddonPopup(item.id)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border-2 border-dashed border-border-default text-text-primary hover:border-amber-500 hover:bg-amber-50 transition-all text-sm font-medium flex items-center justify-center gap-1"
                            >
                              <Plus size={14} />
                              {currentAddons.length > 0 ? `${currentAddons.length} add-on(s)` : 'Select'}
                            </button>
                          ) : (
                            <span className="text-sm text-text-primary">
                              {Array.isArray(item.line_item_id) && item.line_item_id.length > 0
                                ? `${item.line_item_id.length} add-on(s)`
                                : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS (sibling of the table, so they actually render on small screens) */}
            <div className="md:hidden space-y-2.5">
              {filteredItems.map(item => {
                const isSelected = selectedRows.includes(item.id);
                const editData = bulkEditData[item.id] || {};
                const currentAddons =
                  editData.line_item_id !== undefined
                    ? editData.line_item_id
                    : Array.isArray(item.line_item_id) ? item.line_item_id : [];
                const zoneVariants = getZoneVariants(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border-2 overflow-hidden transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/40 shadow-sm'
                        : 'border-border-default bg-bg-primary'
                    }`}
                  >
                    {/* Card header */}
                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(item.id)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary text-sm truncate">{item.name}</p>
                        <p className="text-xs text-text-secondary truncate">{item.description || '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-text-primary">₹{item.unit_price}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${availabilityBadge(item)}`}>
                          {Number(item.availability) === 0 ? 'Off' : item.availability ?? '—'}
                        </span>
                      </div>
                    </label>

                    {/* Zone chips when not selected */}
                    {!isSelected && zoneVariants.length > 0 && (
                      <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                        {zoneVariants.map(s => {
                          const c = configs.find(x => x.id === s.zone_config_id);
                          return c ? (
                            <span
                              key={`${s.id}-${s.zone_config_id}`}
                              className="text-[11px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full"
                            >
                              {c.section}-{c.zone}: ₹{s.unit_price}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}

                    {/* Edit fields when selected */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-3 space-y-3 border-t border-amber-200">
                        <div>
                          <label className={labelBase}>Name</label>
                          <input
                            type="text"
                            value={editData.name !== undefined ? editData.name : item.name}
                            onChange={e => updateBulkEditData(item.id, 'name', e.target.value)}
                            className={inputBase}
                          />
                        </div>

                        <div>
                          <label className={labelBase}>Description</label>
                          <input
                            type="text"
                            value={editData.description !== undefined ? editData.description : item.description ?? ''}
                            onChange={e => updateBulkEditData(item.id, 'description', e.target.value)}
                            className={inputBase}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelBase}>Base Price</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editData.unit_price !== undefined ? editData.unit_price : item.unit_price}
                              onChange={e => updateBulkEditData(item.id, 'unit_price', e.target.value)}
                              className={inputBase}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className={labelBase}>Discount %</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editData.discount !== undefined ? editData.discount : item.discount}
                              onChange={e => updateBulkEditData(item.id, 'discount', e.target.value)}
                              className={inputBase}
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelBase}>Code</label>
                            <input
                              type="text"
                              value={editData.code !== undefined ? editData.code : item.code ?? ''}
                              onChange={e => updateBulkEditData(item.id, 'code', e.target.value)}
                              className={inputBase}
                              placeholder="Item code"
                            />
                          </div>
                          <div>
                            <label className={labelBase}>Availability</label>
                            <input
                              type="number"
                              min="0"
                              value={editData.availability !== undefined ? editData.availability : item.availability ?? ''}
                              onChange={e => updateBulkEditData(item.id, 'availability', e.target.value)}
                              className={inputBase}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateBulkEditData(item.id, 'availability', 0)}
                            className="py-2 rounded-lg text-xs bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition-colors"
                          >
                            × Mark Off
                          </button>
                          <button
                            type="button"
                            onClick={() => updateBulkEditData(item.id, 'availability', 999)}
                            className="py-2 rounded-lg text-xs bg-green-100 text-green-700 hover:bg-green-200 font-semibold transition-colors"
                          >
                            ✓ Mark On
                          </button>
                        </div>

                        {configs.length > 0 && (
                          <div>
                            <label className={labelBase}>Zone Prices</label>
                            <div className="space-y-2">
                              {configs.map(c => (
                                <div
                                  key={c.id}
                                  className="flex items-center gap-2 bg-bg-primary border border-border-default rounded-lg px-3 py-1.5"
                                >
                                  <span className="text-xs font-medium text-text-primary flex-1 truncate">
                                    {c.section} — {c.zone}
                                  </span>
                                  <span className="text-xs text-text-secondary">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder={item.unit_price || "0.00"}
                                    value={getZoneValue(item, editData, c)}
                                    onChange={e =>
                                      updateBulkEditData(item.id, 'zonePrices', {
                                        ...(editData.zonePrices || {}),
                                        [c.id]: e.target.value
                                      })
                                    }
                                    className="w-20 px-2 py-1 border border-border-default rounded-lg text-sm text-right bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-500"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className={labelBase}>Add-ons</label>
                          <button
                            type="button"
                            onClick={() => openItemAddonPopup(item.id)}
                            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border-2 border-dashed border-border-default text-text-primary hover:border-amber-500 hover:bg-amber-50 transition-all text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <Plus size={14} />
                            {currentAddons.length > 0 ? `${currentAddons.length} add-on(s) selected` : 'Select Add-ons'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-30" />
                <p className="text-text-secondary font-medium">No items to display</p>
                <p className="text-text-secondary text-sm mt-1 opacity-80">Try adjusting your filters or search</p>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-4 sm:px-6 py-3 bg-bg-tertiary border-t border-border-default shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={handleClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-bg-primary text-text-primary border border-border-default hover:bg-bg-secondary font-semibold text-sm transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleBulkUpdate}
              disabled={selectedRows.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-buttons-update hover:bg-amber-600 text-gray-900 font-semibold text-sm shadow-md transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <Edit className="w-4 h-4" />
              Update Selected ({selectedRows.length})
            </button>
          </div>
        </div>
      </div>

      {/* Global Add-on popup */}
      <AddonSelectionPopup
        isOpen={showGlobalAddonPopup}
        onClose={() => setShowGlobalAddonPopup(false)}
        selectedAddons={globalAddons}
        onSave={handleGlobalAddonSave}
        addonSubcategories={addonSubcategories || []}
        allAddonItems={allAddonItems || []}
        currentItemId={null}
      />
{/* Bulk Delete Confirmation */}
{showDeleteConfirm && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-4">
    <div className="bg-bg-primary w-full max-w-md max-h-[calc(100dvh-1.5rem)] rounded-xl shadow-2xl border border-border-default flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border-b border-red-200 shrink-0">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-red-900">Delete selected items?</h3>
          <p className="text-xs text-red-700">This action cannot be undone</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 overflow-y-auto">
        <p className="text-sm text-text-secondary mb-3">
          You are about to permanently delete{" "}
          <strong className="text-red-600 text-base">{selectedRows.length}</strong>{" "}
          item{selectedRows.length !== 1 ? "s" : ""}, including all of their zone prices.
          They will also be removed from any item that uses them as an add-on.
        </p>

        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-bg-tertiary border border-border-default">
          {filteredItems
            .filter(i => selectedRows.includes(i.id))
            .map(i => (
              <span
                key={i.id}
                className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-xs font-semibold"
              >
                {i.name}
              </span>
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-bg-tertiary border-t border-border-default flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
        <button
          onClick={() => setShowDeleteConfirm(false)}
          disabled={isDeleting}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-bg-primary text-text-primary border border-border-default hover:bg-bg-secondary font-semibold text-sm transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={confirmBulkDeleteAction}
          disabled={isDeleting}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Yes, Delete {selectedRows.length}
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}
      {/* Per-item Add-on popup */}
      {currentEditingItemId && (
        <AddonSelectionPopup
          isOpen={showItemAddonPopup}
          onClose={() => {
            setShowItemAddonPopup(false);
            setCurrentEditingItemId(null);
          }}
          selectedAddons={
            bulkEditData[currentEditingItemId]?.line_item_id ||
            filteredItems.find(i => i.id === currentEditingItemId)?.line_item_id || []
          }
          onSave={(selectedAddons) => {
            updateBulkEditData(currentEditingItemId, 'line_item_id', selectedAddons);
            setShowItemAddonPopup(false);
            setCurrentEditingItemId(null);
          }}
          addonSubcategories={addonSubcategories || []}
          allAddonItems={allAddonItems || []}
          currentItemId={currentEditingItemId}
        />
      )}
    </>
  );
}

  // Render Table Bulk Update Modal
if (modalType === 'table') {
  const filteredTables = getFilteredUpdateTables();
  const allSelected =
    selectedUpdateTables.length === filteredTables.length && filteredTables.length > 0;

  const inputBase =
    "w-full px-3 py-2 border border-border-default rounded-lg text-sm bg-bg-primary text-text-primary " +
    "focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-500 transition";
  const labelBase =
    "block text-[11px] font-semibold uppercase tracking-wide mb-1 text-text-secondary";

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "vacant" || s === "available") return "bg-green-100 text-green-700 border-green-200";
    if (s === "occupied") return "bg-red-100 text-red-700 border-red-200";
    if (s === "reserved") return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const StatusOptions = () =>
    statusOptions.length > 0 ? (
      statusOptions.map(s => <option key={s} value={s}>{s}</option>)
    ) : (
      <>
        <option value="Vacant">Vacant</option>
        <option value="Reserved">Reserved</option>
      </>
    );

  // Reusable +/- stepper (works on all screen sizes)
  const Stepper = ({ value, onChange, placeholder }) => (
    <div className="flex items-stretch border border-border-default rounded-lg overflow-hidden bg-bg-primary focus-within:ring-2 focus-within:ring-amber-400/60 focus-within:border-amber-500 transition">
      <button
        type="button"
        onClick={() => {
          const cur = Number(value) || 0;
          onChange(cur > 1 ? cur - 1 : "");
        }}
        className="px-3 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
        aria-label="Decrease"
      >
        −
      </button>
      <input
        type="number"
        min="1"
        value={value}
        onChange={e => onChange(e.target.value ? Math.max(1, Number(e.target.value)) : "")}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-center py-2 border-x border-border-default focus:outline-none text-sm bg-transparent text-text-primary"
      />
      <button
        type="button"
        onClick={() => onChange((Number(value) || 0) + 1)}
        className="px-3 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
  <div className="bg-bg-primary w-full sm:max-w-3xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh] h-full rounded-md shadow-2xl flex flex-col overflow-hidden border border-border-default">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4 px-8 sm:px-6 py-4 bg-buttons-update text-text-primary shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold leading-tight truncate">Bulk Update Tables</h2>
              <p className="text-xs text-text-white truncate">Changes apply to all selected tables</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-text-white hover:bg-white/50 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GLOBAL APPLY */}
        <div className="px-4 sm:px-6 py-3 bg-bg-tertiary border-b border-border-default shrink-0">
          <p className="text-xs font-semibold text-text-secondary mb-2">Apply to all selected</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelBase}>Seating</label>
              <Stepper
                value={bulkUpdateGlobal.table_type}
                placeholder="No change"
                onChange={v => setBulkUpdateGlobal(prev => ({ ...prev, table_type: v }))}
              />
            </div>

            <div>
              <label className={labelBase}>Status</label>
              <select
                value={bulkUpdateGlobal.status}
                onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, status: e.target.value }))}
                className={inputBase}
              >
                <option value="">No change</option>
                <StatusOptions />
              </select>
            </div>

            <div>
              <label className={labelBase}>Section & Zone</label>
              <select
                value={bulkUpdateGlobal.config_id || ""}
                className={inputBase}
                onChange={e => {
                  const value = Number(e.target.value);
                  setBulkUpdateGlobal(prev => ({ ...prev, config_id: value }));
                  selectedUpdateTables.forEach(id =>
                    handleBulkUpdateChange(id, "config_id", value)
                  );
                }}
              >
                <option value="">No change</option>
                {configs.map(c => (
                  <option key={c.id} value={c.id}>{c.section} - {c.zone}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SEARCH + SELECT ALL */}
        <div className="px-4 sm:px-6 py-3 border-b border-border-default bg-bg-primary shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search tables..."
              value={bulkUpdateSearch}
              onChange={e => setBulkUpdateSearch(e.target.value)}
              className={`${inputBase} pl-9`}
            />
          </div>

          <label className="flex items-center justify-between sm:justify-end gap-3 cursor-pointer select-none">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={selectAllUpdateTables}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-sm font-semibold text-text-primary">Select All</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {selectedUpdateTables.length} / {filteredTables.length}
            </span>
          </label>
        </div>

        {/* TABLE LIST */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 bg-bg-primary">
          {filteredTables.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-30" />
              <p className="text-text-secondary font-medium">No tables found</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTables.map(table => {
                const isSelected = selectedUpdateTables.includes(table.id);
                const config = configs.find(c => c.id === table.config_id);

                return (
                  <div
                    key={table.id}
                    className={`rounded-xl border-2 overflow-hidden transition-all ${
                      isSelected
                        ? "border-amber-400 bg-amber-50/40 shadow-sm"
                        : "border-border-default bg-bg-primary hover:border-amber-200"
                    }`}
                  >
                    {/* Card header */}
                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUpdateTableSelection(table.id)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="font-bold text-sm text-text-primary flex-1 truncate">
                        {table.name}
                      </span>
                      <span className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full border ${statusBadge(table.status)}`}>
                        {table.status}
                      </span>
                    </label>

                    {isSelected ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-3 pb-3 pt-3 border-t border-amber-200">
                        <div>
                          <label className={labelBase}>Seating</label>
                          <Stepper
                            value={bulkUpdateData[table.id]?.table_type ?? table.table_type ?? ""}
                            placeholder={bulkUpdateGlobal.table_type ? `Global: ${bulkUpdateGlobal.table_type}` : "Seating"}
                            onChange={v => handleBulkUpdateChange(table.id, "table_type", v)}
                          />
                        </div>

                        <div>
                          <label className={labelBase}>Status</label>
                          <select
                            value={bulkUpdateData[table.id]?.status ?? table.status}
                            onChange={e => handleBulkUpdateChange(table.id, "status", e.target.value)}
                            className={inputBase}
                          >
                            <StatusOptions />
                          </select>
                        </div>

                        <div>
                          <label className={labelBase}>Section & Zone</label>
                          <select
                            value={bulkUpdateData[table.id]?.config_id ?? table.config_id ?? ""}
                            onChange={e =>
                              handleBulkUpdateChange(table.id, "config_id", Number(e.target.value))
                            }
                            className={inputBase}
                          >
                            <option value="">No change</option>
                            {configs.map(c => (
                              <option key={c.id} value={c.id}>{c.section} - {c.zone}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 px-3 pb-3 pt-2 border-t border-border-default text-xs">
                        <div>
                          <span className="text-text-secondary">Seats: </span>
                          <span className="font-semibold text-text-primary">{table.table_type}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-2 truncate">
                          <span className="text-text-secondary">Section & Zone: </span>
                          <span className="font-semibold text-text-primary">
                            {config ? `${config.section} - ${config.zone}` : "-"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-4 sm:px-6 py-3 bg-bg-tertiary border-t border-border-default shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-bg-primary text-text-primary border border-border-default hover:bg-bg-secondary font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveBulkUpdate}
            disabled={selectedUpdateTables.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-amber-300 hover:bg-amber-600 text-gray-900 font-semibold text-sm shadow-md transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Edit className="w-4 h-4" />
            Update ({selectedUpdateTables.length})
          </button>
        </div>
      </div>
    </div>
  );
}

  return null;
};

export default UniversalBulkUpdateModal;
