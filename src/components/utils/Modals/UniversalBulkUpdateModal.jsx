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
      "w-full h-8 px-2 rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
      "outline-none placeholder:text-ink-faint transition-colors " +
      "focus:border-brand-ring focus:shadow-focus-ring";
    const labelBase =
      "block text-micro font-bold uppercase tracking-wide mb-1 text-ink-muted";
    const thBase =
      "px-3 py-3 text-left text-micro font-bold uppercase tracking-wide text-brand-dark bg-brand-light whitespace-nowrap";
    const checkBase = "w-4 h-4 accent-brand rounded cursor-pointer";
    const zoneInput =
      "w-20 h-7 px-2 rounded-button-sm border border-brand-line bg-surface text-ui-sm text-right text-ink " +
      "outline-none focus:border-brand-ring focus:shadow-focus-ring";
    const dashedBtn =
      "w-full px-3 py-2 rounded-button-sm bg-surface border-2 border-dashed border-brand-line text-brand-dark " +
      "hover:bg-brand-light transition-colors text-ui font-semibold flex items-center justify-center gap-1";

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
        ? "bg-state-occupied-bg text-state-occupied border-state-occupied/30"
        : "bg-state-vacant-bg text-state-vacant border-state-vacant/30";

    return (
      <>
        <div className="ui-backdrop font-sans">
          <div className="flex flex-col w-full sm:max-w-6xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh] h-full overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Bulk update menu items">
            {/* HEADER */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-brand-light border-b border-brand-line shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Edit className="w-5 h-5 shrink-0 text-brand" />
                <div className="min-w-0">
                  <h2 className="text-panel-title text-brand-dark truncate">Bulk Update & Delete</h2>
                  <p className="text-micro text-ink-muted truncate">Select items, edit inline, then save</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GLOBAL ADD-ONS */}
            <div className="px-4 sm:px-6 py-3 bg-brand-tint border-b border-brand-line shrink-0">
              <p className="text-micro font-bold uppercase tracking-wide text-brand-dark mb-2">
                Apply add-ons to all selected items
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="grid grid-cols-2 sm:flex gap-2">
                  <button
                    onClick={() => setShowGlobalAddonPopup(true)}
                    className="ui-btn ui-btn-add whitespace-nowrap"
                  >
                    <Plus size={16} />
                    {globalAddons.length > 0 ? `${globalAddons.length} add-on(s)` : 'Select Add-ons'}
                  </button>
                  <button
                    onClick={clearGlobalAddons}
                    disabled={globalAddons.length === 0 && selectedRows.length === 0}
                    className="ui-btn whitespace-nowrap"
                  >
                    Clear All
                  </button>
                </div>

                {globalAddons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {globalAddons.slice(0, 3).map(id => (
                      <span key={id} className="bg-brand-light text-brand-dark border border-brand-line px-2 py-0.5 rounded-badge text-ui-sm font-semibold">
                        {getAddonNameById(id)}
                      </span>
                    ))}
                    {globalAddons.length > 3 && (
                      <span className="bg-surface text-ink-muted border border-line px-2 py-0.5 rounded-badge text-ui-sm font-semibold">
                        +{globalAddons.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-ui-sm text-ink-muted mt-2">
                {selectedRows.length > 0
                  ? `${globalAddons.length > 0 ? 'Add-ons applied to' : 'Select add-ons to apply to'} ${selectedRows.length} selected item(s)`
                  : globalAddons.length > 0
                    ? `${globalAddons.length} add-on(s) chosen. Now select items to apply them.`
                    : 'Pick add-ons first then items, or items first then add-ons.'}
              </p>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 border-b border-line bg-canvas shrink-0">
              <label className="flex items-center justify-between sm:justify-start gap-3 cursor-pointer select-none">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectAllChecked}
                    onChange={toggleSelectAll}
                    className={checkBase}
                  />
                  <span className="text-ui font-semibold text-ink">Select All</span>
                </span>
                <span className="text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line">
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
                  className="ui-btn"
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
                  className="ui-btn"
                >
                  <span className="sm:hidden">Avail.</span>
                  <span className="hidden sm:inline">Mark Available</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedRows.length === 0}
                  className="ui-btn ui-btn-delete"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto bg-canvas px-3 sm:px-4 py-3">

              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto rounded-panel border border-line bg-surface shadow-panel">
                <table className="w-full border-collapse min-w-[1000px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-brand-line">
                      <th className={`${thBase} w-10`}>
                        <input
                          type="checkbox"
                          checked={selectAllChecked}
                          onChange={toggleSelectAll}
                          className={checkBase}
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
                          className={`border-b border-line-soft transition-colors ${isSelected
                              ? 'bg-brand-tint'
                              : index % 2 === 0
                                ? 'bg-surface hover:bg-brand-tint'
                                : 'bg-canvas/50 hover:bg-brand-tint'
                            }`}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRowSelection(item.id)}
                              className={checkBase}
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
                              <span className="text-ui font-semibold text-ink">{item.name}</span>
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
                              <span className="text-ui text-ink-muted truncate block max-w-[220px]">
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
                              <span className="text-ui font-bold text-brand-dark">
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
                              <span className="text-ui text-ink-soft">
                                {Number(item.discount) > 0 ? `${Number(item.discount)}%` : '-'}
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 min-w-[200px]">
                            {isSelected ? (
                              <div className="space-y-1.5">
                                {configs.map(c => (
                                  <div key={c.id} className="flex items-center gap-2">
                                    <span className="text-ui-sm text-ink-muted font-semibold w-24 truncate shrink-0">
                                      {c.section}-{c.zone}
                                    </span>
                                    <span className="text-ui-sm text-ink-muted">₹</span>
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
                                      className={zoneInput}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : zoneVariants.length === 0 || !configs.length ? (
                              <span className="text-ui-sm text-ink-muted">-</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {zoneVariants.map(s => {
                                  const c = configs.find(x => x.id === s.zone_config_id);
                                  return c ? (
                                    <span
                                      key={`${s.id}-${s.zone_config_id}`}
                                      className="text-micro px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line font-semibold"
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
                              <span className="text-ui text-ink-soft">{item.code ?? '-'}</span>
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
                                  className={`${inputBase} !w-20`}
                                  placeholder="0"
                                />
                                <div className="flex flex-col gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateBulkEditData(item.id, 'availability', 0)}
                                    className="px-2 py-0.5 rounded-seg text-micro bg-state-occupied-bg text-state-occupied hover:opacity-80 font-bold whitespace-nowrap transition-opacity"
                                  >
                                    × Off
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateBulkEditData(item.id, 'availability', 999)}
                                    className="px-2 py-0.5 rounded-seg text-micro bg-state-vacant-bg text-state-vacant hover:opacity-80 font-bold whitespace-nowrap transition-opacity"
                                  >
                                    ✓ On
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className={`text-micro font-bold px-2 py-1 rounded-badge border ${availabilityBadge(item)}`}>
                                {Number(item.availability) === 0 ? 'Off' : item.availability ?? '—'}
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 w-36">
                            {isSelected ? (
                              <button
                                type="button"
                                onClick={() => openItemAddonPopup(item.id)}
                                className={dashedBtn}
                              >
                                <Plus size={14} />
                                {currentAddons.length > 0 ? `${currentAddons.length} add-on(s)` : 'Select'}
                              </button>
                            ) : (
                              <span className="text-ui text-ink-soft">
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
                      className={`rounded-panel border overflow-hidden transition-colors shadow-panel ${isSelected
                          ? 'border-brand-ring bg-brand-tint'
                          : 'border-line bg-surface'
                        }`}
                    >
                      {/* Card header */}
                      <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(item.id)}
                          className={checkBase}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-brand-dark text-ui truncate">{item.name}</p>
                          <p className="text-ui-sm text-ink-muted truncate">{item.description || '—'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-ui font-bold text-brand-dark">₹{item.unit_price}</p>
                          <span className={`text-micro font-bold px-1.5 py-0.5 rounded-badge border ${availabilityBadge(item)}`}>
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
                                className="text-micro bg-brand-light text-brand-dark border border-brand-line px-2 py-0.5 rounded-badge font-semibold"
                              >
                                {c.section}-{c.zone}: ₹{s.unit_price}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Edit fields when selected */}
                      {isSelected && (
                        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-brand-line">
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
                              className="py-2 rounded-button-sm text-micro bg-state-occupied-bg text-state-occupied hover:opacity-80 font-bold transition-opacity"
                            >
                              × Mark Off
                            </button>
                            <button
                              type="button"
                              onClick={() => updateBulkEditData(item.id, 'availability', 999)}
                              className="py-2 rounded-button-sm text-micro bg-state-vacant-bg text-state-vacant hover:opacity-80 font-bold transition-opacity"
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
                                    className="flex items-center gap-2 bg-surface border border-brand-line rounded-button-sm px-3 py-1.5"
                                  >
                                    <span className="text-ui-sm font-semibold text-ink flex-1 truncate">
                                      {c.section} — {c.zone}
                                    </span>
                                    <span className="text-ui-sm text-ink-muted">₹</span>
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
                                      className={zoneInput}
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
                              className={dashedBtn}
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
                  <Search className="w-12 h-12 text-brand-soft mx-auto mb-3" />
                  <p className="text-ui font-semibold text-ink-soft">No items to display</p>
                  <p className="text-ui-sm text-ink-muted mt-1">Try adjusting your filters or search</p>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="px-4 sm:px-6 py-3 bg-surface border-t border-line shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleClose}
                className="ui-btn w-full sm:w-auto"
              >
                Close
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={selectedRows.length === 0}
                className="ui-btn ui-btn-add w-full sm:w-auto"
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
          <div className="ui-backdrop font-sans">
            <div className="flex flex-col w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Delete selected items">

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 bg-brand-light border-b border-brand-line shrink-0">
                <div className="w-10 h-10 rounded-full bg-surface border border-brand-line flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-brand-dark" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-panel-title text-brand-dark">Delete selected items?</h3>
                  <p className="text-micro text-ink-muted">This action cannot be undone</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 overflow-y-auto">
                <p className="text-ui text-ink-muted mb-3">
                  You are about to permanently delete{" "}
                  <strong className="text-brand-dark text-body-sm">{selectedRows.length}</strong>{" "}
                  item{selectedRows.length !== 1 ? "s" : ""}, including all of their zone prices.
                  They will also be removed from any item that uses them as an add-on.
                </p>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-button-sm bg-brand-light border border-brand-line">
                  {filteredItems
                    .filter(i => selectedRows.includes(i.id))
                    .map(i => (
                      <span
                        key={i.id}
                        className="px-2.5 py-1 rounded-badge bg-surface text-brand-dark border border-brand-line text-ui-sm font-semibold"
                      >
                        {i.name}
                      </span>
                    ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-canvas border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="ui-btn w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDeleteAction}
                  disabled={isDeleting}
                  className="ui-btn ui-btn-danger w-full sm:w-auto"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-badge animate-spin-slow" />
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

    // Full class strings so Tailwind keeps them
    const label = "block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted";
    const field =
      "w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
      "outline-none placeholder:text-ink-faint transition-colors " +
      "focus:border-brand-ring focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
    const check = "h-4 w-4 cursor-pointer accent-brand";
    const countPill =
      "text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line";

    const statusChip = (status) => {
      const s = (status || "").toLowerCase();
      if (s === "vacant" || s === "available") return "bg-state-vacant-bg text-state-vacant";
      if (s === "occupied") return "bg-state-occupied-bg text-state-occupied";
      if (s === "reserved") return "bg-state-reserved-bg text-state-reserved";
      return "bg-state-other-bg text-state-other";
    };
    const statusBar = (status) => {
      const s = (status || "").toLowerCase();
      if (s === "vacant" || s === "available") return "border-t-state-vacant";
      if (s === "occupied") return "border-t-state-occupied";
      if (s === "reserved") return "border-t-state-reserved";
      return "border-t-state-other";
    };

    const statusOptionEls =
      statusOptions.length > 0
        ? statusOptions.map(s => <option key={s} value={s}>{s}</option>)
        : [
          <option key="Vacant" value="Vacant">Vacant</option>,
          <option key="Reserved" value="Reserved">Reserved</option>,
        ];

    // − [n] +  (plain function, NOT a component, so inputs keep focus)
    const renderStepper = (value, onChange, placeholder) => (
      <div className="flex items-stretch h-control overflow-hidden rounded-button-sm border border-brand-line bg-surface focus-within:border-brand-ring focus-within:shadow-focus-ring">
        <button
          type="button"
          aria-label="Decrease"
          className="px-item font-bold text-brand-dark hover:bg-brand-light transition-colors"
          onClick={() => {
            const cur = Number(value) || 0;
            onChange(cur > 1 ? cur - 1 : "");
          }}
        >
          −
        </button>
        <input
          type="number"
          min="1"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value ? Math.max(1, Number(e.target.value)) : "")}
          className="flex-1 min-w-0 text-center text-ui font-semibold text-ink bg-transparent border-x border-brand-line outline-none placeholder:font-normal placeholder:text-ink-faint"
        />
        <button
          type="button"
          aria-label="Increase"
          className="px-item font-bold text-brand-dark hover:bg-brand-light transition-colors"
          onClick={() => onChange((Number(value) || 0) + 1)}
        >
          +
        </button>
      </div>
    );

    return (
      <div className="ui-backdrop font-sans">
        <div
          className="flex flex-col w-full max-w-3xl h-full max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in"
          role="dialog"
          aria-modal="true"
          aria-label="Bulk update tables"
        >

          {/* HEADER */}
          <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
            <div className="min-w-0">
              <h2 className="text-panel-title text-brand-dark truncate">Bulk update tables</h2>
              <p className="text-micro text-ink-muted truncate">Changes apply to all selected tables</p>
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

          {/* APPLY TO ALL */}
          <div className="px-modal py-item bg-brand-tint border-b border-brand-line shrink-0">
            <p className="mb-2 text-micro font-bold uppercase tracking-wide text-brand-dark">Apply to all selected</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-item">
              <div>
                <label className={label}>Seating</label>
                {renderStepper(
                  bulkUpdateGlobal.table_type,
                  v => setBulkUpdateGlobal(prev => ({ ...prev, table_type: v })),
                  "No change"
                )}
              </div>

              <div>
                <label className={label}>Status</label>
                <select
                  value={bulkUpdateGlobal.status}
                  onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, status: e.target.value }))}
                  className={field}
                >
                  <option value="">No change</option>
                  {statusOptionEls}
                </select>
              </div>

              <div>
                <label className={label}>Section &amp; zone</label>
                <select
                  value={bulkUpdateGlobal.config_id || ""}
                  className={field}
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
          <div className="px-modal py-item border-b border-line-soft shrink-0 flex flex-col sm:flex-row gap-item-sm sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search tables..."
                value={bulkUpdateSearch}
                onChange={e => setBulkUpdateSearch(e.target.value)}
                className="ui-input"
              />
            </div>

            <label className="flex items-center justify-between sm:justify-end gap-item cursor-pointer select-none">
              <span className="flex items-center gap-item-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={selectAllUpdateTables}
                  className={check}
                />
                <span className="text-ui font-semibold text-ink">Select all</span>
              </span>
              <span className={countPill}>
                {selectedUpdateTables.length} / {filteredTables.length}
              </span>
            </label>
          </div>

          {/* TABLE LIST */}
          <div className="flex-1 overflow-y-auto bg-canvas px-modal py-card">
            {filteredTables.length === 0 ? (
              <div className="text-center py-16">
                <Search className="h-10 w-10 mx-auto mb-3 text-brand-soft" />
                <p className="text-ui text-ink-muted">No tables found</p>
              </div>
            ) : (
              <div className="grid grid-cols-tiles gap-tiles">
                {filteredTables.map(table => {
                  const isSelected = selectedUpdateTables.includes(table.id);
                  const config = configs.find(c => c.id === table.config_id);

                  return (
                    <div
                      key={table.id}
                      className={`flex flex-col min-w-0 overflow-hidden rounded-panel border border-t-bar ${statusBar(table.status)} shadow-panel transition-colors ${isSelected
                          ? "border-brand-ring bg-brand-tint"
                          : "border-line bg-surface hover:border-brand-line"
                        }`}
                    >
                      {/* Tile header */}
                      <label className="flex items-center gap-item-sm px-item pt-item-sm pb-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUpdateTableSelection(table.id)}
                          className={check}
                        />
                        <span className="flex-1 min-w-0 truncate text-ui font-bold text-brand-dark">{table.name}</span>
                      </label>

                      {isSelected ? (
                        <div className="grid gap-item-sm px-item pb-item pt-item-sm border-t border-brand-line">
                          <div>
                            <label className={label}>Seating</label>
                            {renderStepper(
                              bulkUpdateData[table.id]?.table_type ?? table.table_type ?? "",
                              v => handleBulkUpdateChange(table.id, "table_type", v),
                              bulkUpdateGlobal.table_type ? `Global: ${bulkUpdateGlobal.table_type}` : "Seating"
                            )}
                          </div>

                          <div>
                            <label className={label}>Status</label>
                            <select
                              value={bulkUpdateData[table.id]?.status ?? table.status}
                              onChange={e => handleBulkUpdateChange(table.id, "status", e.target.value)}
                              className={field}
                            >
                              {statusOptionEls}
                            </select>
                          </div>

                          <div>
                            <label className={label}>Section &amp; zone</label>
                            <select
                              value={bulkUpdateData[table.id]?.config_id ?? table.config_id ?? ""}
                              onChange={e => handleBulkUpdateChange(table.id, "config_id", Number(e.target.value))}
                              className={field}
                            >
                              <option value="">No change</option>
                              {configs.map(c => (
                                <option key={c.id} value={c.id}>{c.section} - {c.zone}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-0.5 px-item pb-item-sm pt-item-sm border-t border-line-soft text-micro text-ink-muted">
                          <div>Seats: <b className="font-semibold text-ink-soft">{table.table_type}</b></div>
                          <div className="truncate">
                            Zone: <b className="font-semibold text-ink-soft">{config ? `${config.section} - ${config.zone}` : "-"}</b>
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
          <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-surface border-t border-line shrink-0">
            <button type="button" onClick={handleClose} className="ui-btn">Cancel</button>
            <button
              type="button"
              onClick={saveBulkUpdate}
              disabled={selectedUpdateTables.length === 0}
              className="ui-btn ui-btn-add"
            >
              <Edit className="h-4 w-4" />
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
