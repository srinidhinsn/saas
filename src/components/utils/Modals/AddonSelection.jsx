import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check } from 'lucide-react';

const AddonSelectionPopup = ({
  isOpen,
  onClose,
  selectedAddons,
  onSave,
  addonSubcategories,
  allAddonItems,
  currentItemId // To exclude current item from selection
}) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedAddons, setTempSelectedAddons] = useState(selectedAddons || []);

  useEffect(() => {
    setTempSelectedAddons(selectedAddons || []);
  }, [selectedAddons]);

  // Count items per subcategory — match by both ID and name
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
      // Exclude current item
      if (currentItemId && item.id === currentItemId) return false;

      // Match by subcategory ID or name (DB stores category_id as name string)
      const catVal = (item.category_id || '').trim().toLowerCase();
      const matchesCategory = catVal === subId || catVal === subName;
      if (!matchesCategory) return false;

      // Filter by search query
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
    setTempSelectedAddons(prev => {
      if (prev.includes(addonId)) {
        return prev.filter(id => id !== addonId);
      } else {
        return [...prev, addonId];
      }
    });
  };

  const toggleSelectAll = () => {
    const visibleAddonIds = filteredAddonItems.map(item => item.id);
    const allSelected = visibleAddonIds.every(id => tempSelectedAddons.includes(id));

    if (allSelected) {
      setTempSelectedAddons(prev => prev.filter(id => !visibleAddonIds.includes(id)));
    } else {
      const newSelection = [...new Set([...tempSelectedAddons, ...visibleAddonIds])];
      setTempSelectedAddons(newSelection);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select Add-ons</h2>
            <p className="text-sm text-gray-600 mt-1">
              {tempSelectedAddons.length} add-on(s) selected
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">

          {/* Left Panel - Subcategories */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Addon Categories</h3>
              <div className="space-y-1">
                {addonSubcategories.map(subcategory => (
                  <button
                    key={subcategory.id}
                    onClick={() => {
                      setSelectedSubcategory(subcategory);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedSubcategory?.id === subcategory.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium text-sm">{subcategory.name}</div>
                    <div className="text-xs opacity-75 mt-0.5">
                      {getItemCountForSubcategory(subcategory)} items
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Addon Items */}
          <div className="flex-1 flex flex-col">
            {!selectedSubcategory ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">Select a category to view add-ons</p>
                  <p className="text-gray-500 text-sm mt-1">Choose from the categories on the left</p>
                </div>
              </div>
            ) : (
              <>
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search add-ons by name or code..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <button
                      onClick={toggleSelectAll}
                      disabled={filteredAddonItems.length === 0}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {filteredAddonItems.length > 0 && filteredAddonItems.every(item => tempSelectedAddons.includes(item.id))
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Addon List */}
                <div className="flex-1 overflow-y-auto p-4">
                  {filteredAddonItems.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        {searchQuery ? 'No add-ons found matching your search' : 'No add-ons available in this category'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredAddonItems.map(addon => {
                        const isSelected = tempSelectedAddons.includes(addon.id);

                        return (
                          <button
                            key={addon.id}
                            onClick={() => toggleAddon(addon.id)}
                            className={`text-left p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {addon.name}
                                  </h4>
                                  {addon.code && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                      {addon.code}
                                    </span>
                                  )}
                                </div>
                                {addon.description && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {addon.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-sm font-semibold text-blue-600">
                                    ₹{addon.unit_price}
                                  </span>
                                  {addon.discount > 0 && (
                                    <span className="text-xs text-gray-500 line-through">
                                      ₹{(addon.unit_price + addon.discount).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300'
                              }`}>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {tempSelectedAddons.length > 0 && (
                <div className="flex flex-wrap gap-2 max-w-md">
                  <span className="font-medium">Selected:</span>
                  {tempSelectedAddons.slice(0, 3).map(id => (
                    <span key={id} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                      {getAddonNameById(id)}
                    </span>
                  ))}
                  {tempSelectedAddons.length > 3 && (
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                      +{tempSelectedAddons.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                Save Selection ({tempSelectedAddons.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddonSelectionPopup;