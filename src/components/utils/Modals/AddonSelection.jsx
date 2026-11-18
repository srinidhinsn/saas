
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check } from 'lucide-react';

const AddonSelectionPopup = ({
  isOpen,
  onClose,
  selectedAddons,
  onSave,
  addonSubcategories,
  allAddonItems,
  currentItemId // ✅ To exclude current item from selection
}) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedAddons, setTempSelectedAddons] = useState(selectedAddons || []);

  useEffect(() => {
    setTempSelectedAddons(selectedAddons || []);
  }, [selectedAddons]);

  const getItemCountForSubcategory = (subcategory) => {
    const subId = subcategory.id;
    const subName = (subcategory.name || '').trim().toLowerCase();
    return allAddonItems.filter(item => {
      const catVal = (item.category_id || '').trim().toLowerCase();
      return catVal === subId || catVal === subName;
    }).length;
  };

  // Filter addons by selected subcategory — match by both ID and name
  const filteredAddonItems = useMemo(() => {
    if (!selectedSubcategory) return [];

    const subId = selectedSubcategory.id;
    const subName = (selectedSubcategory.name || '').trim().toLowerCase();

    return allAddonItems.filter(item => {
      if (currentItemId && item.id === currentItemId) return false;

      const catVal = (item.category_id || '').trim().toLowerCase();
      const matchesCategory = catVal === subId || catVal === subName;
      if (!matchesCategory) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = (item.name || '').toLowerCase();
        const code = String(item.code || '').toLowerCase();
        return name.includes(query) || code.includes(query);
      }

      return true;
    });
  }, [selectedSubcategory, allAddonItems, searchQuery, currentItemId]);

  const toggleAddon = (addonId) => {
    setTempSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const allVisibleSelected =
    filteredAddonItems.length > 0 &&
    filteredAddonItems.every(item => tempSelectedAddons.includes(item.id));

  const toggleSelectAll = () => {
    const visibleAddonIds = filteredAddonItems.map(item => item.id);
    if (allVisibleSelected) {
      setTempSelectedAddons(prev => prev.filter(id => !visibleAddonIds.includes(id)));
    } else {
      setTempSelectedAddons([...new Set([...tempSelectedAddons, ...visibleAddonIds])]);
    }
  };

  const handleSave = () => {
    onSave(tempSelectedAddons);
    onClose();
  };

  const handleClose = () => {
    setTempSelectedAddons(selectedAddons || []);
    setSelectedSubcategory(null);
    setSearchQuery('');
    onClose();
  };

  const getAddonNameById = (id) => {
    const addon = allAddonItems.find(item => item.id === id);
    return addon?.name || 'Unknown';
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="ui-backdrop-nested font-sans">
      <div className="flex flex-col w-full sm:max-w-4xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] h-full overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-brand-light border-b border-brand-line shrink-0">
          <div className="min-w-0">
            <h2 className="text-panel-title text-brand-dark leading-tight">Select Add-ons</h2>
            <p className="text-micro text-ink-muted mt-0.5">
              <span className="font-semibold text-brand">{tempSelectedAddons.length}</span> selected
            </p>
          </div>
          <button
            onClick={handleClose}
            className="grid place-items-center h-8 w-8 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* CATEGORIES: horizontal chips on mobile, sidebar on md+ */}
          <div className="shrink-0 md:w-60 border-b md:border-b-0 md:border-r border-line bg-canvas md:overflow-y-auto">
            <div className="p-3 md:p-4">
              <h3 className="hidden md:block text-micro font-bold uppercase tracking-wide text-ink-muted mb-3">
                Add-on Categories
              </h3>

              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
                {addonSubcategories.map(subcategory => {
                  const active = selectedSubcategory?.id === subcategory.id;
                  return (
                    <button
                      key={subcategory.id}
                      onClick={() => {
                        setSelectedSubcategory(subcategory);
                        setSearchQuery('');
                      }}
                      className={`shrink-0 md:w-full flex items-center justify-between gap-3 text-left px-3 py-2 rounded-button-sm border transition-all whitespace-nowrap md:whitespace-normal ${
                        active
                          ? 'bg-brand text-white border-brand shadow-sm'
                          : 'bg-surface text-ink border-line hover:border-brand-ring hover:bg-brand-tint'
                      }`}
                    >
                      <span className="font-semibold text-ui-sm truncate">{subcategory.name}</span>
                      <span
                        className={`text-micro font-semibold px-2 py-0.5 rounded-badge shrink-0 ${
                          active ? 'bg-white/20 text-white' : 'bg-canvas text-ink-muted border border-line'
                        }`}
                      >
                        {getItemCountForSubcategory(subcategory)}
                      </span>
                    </button>
                  );
                })}

                {addonSubcategories.length === 0 && (
                  <p className="text-ui-sm text-ink-muted italic">No categories available</p>
                )}
              </div>
            </div>
          </div>

          {/* ITEMS PANEL */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {!selectedSubcategory ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-14 h-14 bg-canvas border border-line rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-ink-muted" />
                  </div>
                  <p className="text-ui font-semibold text-ink">Select a category</p>
                  <p className="text-ui-sm text-ink-muted mt-1">
                    <span className="md:hidden">Pick one from the tabs above</span>
                    <span className="hidden md:inline">Choose one from the list on the left</span>
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Search + select all */}
                <div className="p-3 sm:p-4 border-b border-line shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or code..."
                      className="w-full h-control pl-9 pr-3 px-item border border-brand-line rounded-button-sm text-ui bg-surface text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-brand-ring focus:shadow-focus-ring"
                    />
                  </div>
                  <button
                    onClick={toggleSelectAll}
                    disabled={filteredAddonItems.length === 0}
                    className="ui-btn whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {allVisibleSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Items */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
                  {filteredAddonItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Search className="w-10 h-10 text-ink-faint mx-auto mb-2" />
                      <p className="text-ui-sm text-ink-muted">
                        {searchQuery
                          ? 'No add-ons match your search'
                          : 'No add-ons in this category'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                      {filteredAddonItems.map(addon => {
                        const isSelected = tempSelectedAddons.includes(addon.id);
                        const discountPct = Number(addon.discount) > 0 ? Number(addon.discount) : null;
                        const finalPrice = discountPct
                          ? Number(addon.unit_price) * (1 - discountPct / 100)
                          : Number(addon.unit_price);

                        return (
                          <button
                            key={addon.id}
                            type="button"
                            onClick={() => toggleAddon(addon.id)}
                            className={`text-left p-3 rounded-panel border transition-all ${
                              isSelected
                                ? 'border-brand bg-brand-tint shadow-panel'
                                : 'border-line bg-surface hover:border-brand-ring hover:bg-brand-tint'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h4 className="font-semibold text-ui text-ink truncate">
                                    {addon.name}
                                  </h4>
                                  {addon.code && (
                                    <span className="shrink-0 text-micro font-semibold bg-canvas text-ink-muted border border-line px-2 py-0.5 rounded-badge">
                                      {addon.code}
                                    </span>
                                  )}
                                </div>

                                {addon.description && (
                                  <p className="text-ui-sm text-ink-muted mt-1 line-clamp-2">
                                    {addon.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-ui font-bold text-ink">
                                    ₹{finalPrice.toFixed(finalPrice % 1 === 0 ? 0 : 2)}
                                  </span>
                                  {discountPct && (
                                    <>
                                      <span className="text-ui-sm text-ink-muted line-through">
                                        ₹{addon.unit_price}
                                      </span>
                                      <span className="text-micro font-semibold bg-state-occupied-bg text-state-occupied border border-state-occupied/30 px-2 py-0.5 rounded-badge">
                                        {discountPct.toFixed(0)}% OFF
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-button-sm border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-brand border-brand'
                                    : 'border-line bg-surface'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-4 sm:px-6 py-3 bg-canvas border-t border-line shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          {/* Selected chips */}
          <div className="min-w-0 flex-1">
            {tempSelectedAddons.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 max-h-16 overflow-y-auto">
                {tempSelectedAddons.slice(0, 3).map(id => (
                  <span
                    key={id}
                    className="flex items-center gap-1 bg-brand-light text-brand-dark border border-brand-line pl-2.5 pr-1 py-0.5 rounded-badge text-ui-sm font-medium max-w-[10rem]"
                  >
                    <span className="truncate">{getAddonNameById(id)}</span>
                    <button
                      type="button"
                      onClick={() => toggleAddon(id)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-brand-soft shrink-0"
                      aria-label="Remove"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {tempSelectedAddons.length > 3 && (
                  <span className="bg-surface text-ink-muted border border-line px-2 py-0.5 rounded-badge text-ui-sm font-medium">
                    +{tempSelectedAddons.length - 3} more
                  </span>
                )}
              </div>
            ) : (
              <span className="text-ui-sm text-ink-muted">Nothing selected yet</span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 shrink-0">
            <button
              onClick={handleClose}
              className="ui-btn w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="ui-btn ui-btn-add w-full sm:w-auto"
            >
              Save Selection ({tempSelectedAddons.length})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddonSelectionPopup;
