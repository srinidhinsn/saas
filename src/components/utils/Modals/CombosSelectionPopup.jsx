import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, Package, Plus, Minus, Tag, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ComboSelectionPopup
 *
 * Industry-standard combo management:
 * - Combo item has its OWN fixed price set by the manager
 * - Component items (line_item_id[]) define WHAT'S INCLUDED, not the price
 * - We compute "à la carte total" (sum of parts) purely for display — "Save ₹X"
 * - The combo price stored in DB is always the flat combo price
 *
 * This mirrors how Zomato/Swiggy/Toast POS handle combos:
 *   combo.price = fixed price manager sets
 *   combo.line_item_id = array of component item IDs (informational / kitchen routing)
 */
const ComboSelectionPopup = ({
  isOpen,
  onClose,
  // Current selected component IDs
  selectedComponents,
  // Called with (componentIds) on save
  onSave,
  // All menu items available to be components (already deduplicated by caller)
  allMenuItems,
  // All categories flat list for grouping
  categoriesFlat,
  // Current item being edited (excluded from component list)
  currentItemId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [tempSelected, setTempSelected] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Sync incoming selection when opened
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedComponents || []);
      setSearchQuery('');
      setSelectedCategoryId(null);
    }
  }, [isOpen, selectedComponents]);

  // Build category list from the items available (only categories that have items)
  const availableCategories = useMemo(() => {
    const catIds = new Set(
      allMenuItems
        .filter(item => !currentItemId || item.id !== currentItemId)
        .map(item => (item.category_id || '').trim().toLowerCase())
    );

    const cats = categoriesFlat.filter(
      c => catIds.has(c.id?.toLowerCase()) || catIds.has(c.name?.toLowerCase())
    );

    // Deduplicate by name
    const seen = new Set();
    return cats.filter(c => {
      const key = (c.name || '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allMenuItems, categoriesFlat, currentItemId]);

  // Filter items by category + search
  const filteredItems = useMemo(() => {
    return allMenuItems.filter(item => {
      if (currentItemId && item.id === currentItemId) return false;

      if (selectedCategoryId) {
        const cat = categoriesFlat.find(c => c.id === selectedCategoryId);
        const catName = (cat?.name || '').toLowerCase();
        const itemCat = (item.category_id || '').trim().toLowerCase();
        if (itemCat !== catName && itemCat !== selectedCategoryId?.toLowerCase()) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (item.name || '').toLowerCase().includes(q) ||
          String(item.code || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allMenuItems, selectedCategoryId, searchQuery, currentItemId, categoriesFlat]);

  // Compute à la carte total of selected items
  const aLaCarteTotal = useMemo(() => {
    return tempSelected.reduce((sum, id) => {
      const item = allMenuItems.find(i => i.id === id);
      return sum + (Number(item?.unit_price) || 0);
    }, 0);
  }, [tempSelected, allMenuItems]);

  const toggleItem = (id) => {
    setTempSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const removeComponent = (id) => {
    setTempSelected(prev => prev.filter(x => x !== id));
  };

  const toggleExpanded = (id) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getItemById = (id) => allMenuItems.find(i => i.id === id);

  const handleSave = () => {
    onSave(tempSelected);
    onClose();
  };

  const handleClose = () => {
    setTempSelected(selectedComponents || []);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Build Combo</h2>
              <p className="text-xs text-violet-200">
                Select items included in this combo · Price set separately on the item
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: Category sidebar */}
          <div className="w-52 border-r border-gray-100 flex flex-col bg-gray-50 overflow-y-auto shrink-0">
            <div className="p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                Categories
              </p>
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  selectedCategoryId === null
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Items
                <span className="ml-1 text-xs opacity-60">
                  ({allMenuItems.filter(i => !currentItemId || i.id !== currentItemId).length})
                </span>
              </button>

              {availableCategories.map(cat => {
                const count = allMenuItems.filter(item => {
                  if (currentItemId && item.id === currentItemId) return false;
                  const itemCat = (item.category_id || '').trim().toLowerCase();
                  return itemCat === cat.name?.toLowerCase() || itemCat === cat.id?.toLowerCase();
                }).length;

                if (count === 0) return null;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                      selectedCategoryId === cat.id
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="truncate block">{cat.name}</span>
                    <span className={`text-xs ${selectedCategoryId === cat.id ? 'text-violet-200' : 'text-gray-400'}`}>
                      {count} items
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle: Item list */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search items by name or code…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Search className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">No items found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredItems.map(item => {
                    const isSelected = tempSelected.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`text-left w-full px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900 truncate">{item.name}</span>
                            {item.code && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono shrink-0">
                                {item.code}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>
                          )}
                        </div>

                        {/* Price */}
                        <div className="shrink-0 text-right">
                          <span className={`text-sm font-bold ${isSelected ? 'text-violet-700' : 'text-gray-700'}`}>
                            ₹{Number(item.unit_price).toFixed(0)}
                          </span>
                          <p className="text-[10px] text-gray-400">à la carte</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Selected components summary */}
          <div className="w-64 border-l border-gray-100 flex flex-col bg-gray-50 shrink-0">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">
                Combo Includes
                <span className="ml-2 bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {tempSelected.length}
                </span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tempSelected.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-center">
                  <Package className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">Select items from the list to add them to this combo</p>
                </div>
              ) : (
                tempSelected.map(id => {
                  const item = getItemById(id);
                  if (!item) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100 shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-violet-600 font-bold">₹{Number(item.unit_price).toFixed(0)}</p>
                      </div>
                      <button
                        onClick={() => removeComponent(id)}
                        className="w-5 h-5 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pricing summary */}
            {tempSelected.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-white space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>À la carte total</span>
                  <span className="font-semibold line-through text-gray-400">₹{aLaCarteTotal.toFixed(0)}</span>
                </div>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Tag className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-amber-700 leading-snug">
                    Set the combo price on the item form. The price you enter there is what customers pay — not this sum.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {tempSelected.length > 0 ? (
              <span>
                <span className="font-semibold text-gray-800">{tempSelected.length} item{tempSelected.length !== 1 ? 's' : ''}</span>
                {' '}selected · à la carte value{' '}
                <span className="font-semibold text-gray-700">₹{aLaCarteTotal.toFixed(0)}</span>
              </span>
            ) : (
              <span className="text-gray-400">No items selected yet</span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={tempSelected.length === 0}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              Save Combo ({tempSelected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboSelectionPopup;