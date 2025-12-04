import React from 'react';
import { X, Edit, Trash2 } from 'lucide-react';
import { FaEdit, FaTrash, FaTimes, FaCheck, FaSearch } from 'react-icons/fa';

const UniversalBulkUpdateModal = ({
  // Common props
  showModal,
  setShowModal,
  modalType, // 'menu' or 'table'
  
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
    } else if (modalType === 'table') {
      setSelectedUpdateTables([]);
      setBulkUpdateData({});
      setBulkUpdateSearch('');
      setBulkUpdateGlobal({ table_type: "", status: "", location_zone: "" });
    }
  };

  if (!showModal) return null;

  // Render Menu Bulk Update Modal
  if (modalType === 'menu') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-color-modalsbg">
        <div className="rounded-xl max-w-2xl w-full bg-bg-primary max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-border-default">
          
          {/* Header */}
          <div className="flex justify-between items-center px-2 sm:px-4 rounded-xl py-4 border-b border-border-default bg-bg-tertiary">
            <h3 className="text-lg sm:text-xl font-bold text-text-primary">Bulk Update & Delete</h3>
            <button 
              onClick={handleClose} 
              className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-bg-tertiary rounded-lg"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
  
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 border-b border-border-default bg-bg-tertiary">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-text-primary cursor-pointer hover:text-action-primary transition-colors">
                <input
                  type="checkbox"
                  checked={selectAllChecked}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-border-default"
                />
                <span className="text-xs sm:text-sm font-semibold">Select All</span>
              </label>
              <span className="text-xs sm:text-sm text-text-secondary font-medium bg-bg-primary px-3 py-1 rounded-full border border-border-default">
                {selectedRows.length} item(s) selected
              </span>
            </div>
  
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={handleBulkUpdate}
                disabled={selectedRows.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg text-sm sm:text-base w-full sm:w-auto"
              >
                <Edit size={16} className="sm:w-5 sm:h-5" />
                <span>Update Selected</span>
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedRows.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-action-danger text-text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg text-sm sm:text-base w-full sm:w-auto"
              >
                <Trash2 size={16} className="sm:w-5 sm:h-5" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
  
          {/* Table Container */}
          <div className="flex-1 overflow-auto px-1 sm:px-2 lg:px-3 py-2">
            <div className="min-w-[800px]">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-bg-primary z-10 shadow-sm">
                  <tr className="border-b-2 border-border-default">
                    <th className="px-3 sm:px-4 py-3 text-left bg-bg-tertiary">
                      <input
                        type="checkbox"
                        checked={selectAllChecked}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-border-default"
                      />
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-bold text-text-primary min-w-[150px] bg-bg-tertiary">
                      Name
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-bold text-text-primary min-w-[200px] bg-bg-tertiary">
                      Description
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-bold text-text-primary min-w-[100px] bg-bg-tertiary">
                      Price
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-bold text-text-primary min-w-[100px] bg-bg-tertiary">
                      Discount
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-bold text-text-primary min-w-[120px] bg-bg-tertiary">
                      Availability
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
                    const isSelected = selectedRows.includes(item.id);
                    const editData = bulkEditData[item.id] || {};
  
                    return (
                      <tr 
                        key={item.id} 
                        className={`border-b border-border-default transition-all duration-200 ${
                          isSelected 
                            ? 'bg-orange-50 hover:bg-orange-100' 
                            : index % 2 === 0 
                              ? 'bg-bg-primary hover:bg-bg-tertiary' 
                              : 'bg-bg-tertiary hover:bg-bg-tertiary'
                        }`}
                      >
                        <td className="px-3 sm:px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(item.id)}
                            className="w-4 h-4 rounded border-border-default focus:ring-2 focus:ring-action-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          {isSelected ? (
                            <input
                              type="text"
                              value={editData.name !== undefined ? editData.name : item.name}
                              onChange={(e) => updateBulkEditData(item.id, 'name', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-primary border-2 border-action-primary text-text-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-action-primary shadow-sm"
                              placeholder="Item name"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm text-text-primary font-medium">{item.name}</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          {isSelected ? (
                            <input
                              type="text"
                              value={editData.description !== undefined ? editData.description : item.description}
                              onChange={(e) => updateBulkEditData(item.id, 'description', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-primary border-2 border-action-primary text-text-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-action-primary shadow-sm"
                              placeholder="Description"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm text-text-secondary truncate block max-w-xs">
                              {item.description || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          {isSelected ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editData.unit_price !== undefined ? editData.unit_price : item.unit_price}
                              onChange={(e) => updateBulkEditData(item.id, 'unit_price', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-primary border-2 border-action-primary text-text-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-action-primary shadow-sm"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm text-text-primary font-semibold">
                              ₹{typeof item.unit_price === 'number' ? item.unit_price.toFixed(2) : '0.00'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          {isSelected ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editData.discount !== undefined ? editData.discount : item.discount}
                              onChange={(e) => updateBulkEditData(item.id, 'discount', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-primary border-2 border-action-primary text-text-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-action-primary shadow-sm"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm text-text-primary font-semibold">
                              ₹{typeof item.discount === 'number' ? item.discount.toFixed(2) : (item.discount || 0)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          {isSelected ? (
                            <input
                              type="number"
                              value={editData.availability !== undefined ? editData.availability : item.availability}
                              onChange={(e) => updateBulkEditData(item.id, 'availability', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-bg-primary border-2 border-action-primary text-text-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-action-primary shadow-sm"
                              placeholder="0"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm text-text-primary font-semibold">{item.availability || 0}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
  
              {filteredItems.length === 0 && (
                <div className="text-center py-16 bg-bg-secondary rounded-lg mt-4 border border-border-default">
                  <div className="text-text-secondary text-4xl mb-3">📋</div>
                  <p className="text-text-secondary font-semibold text-base sm:text-lg">No items to display</p>
                  <p className="text-text-secondary text-xs sm:text-sm mt-2">Try adjusting your filters or search</p>
                </div>
              )}
            </div>
          </div>
  
          {/* Footer */}
          <div className="px-4 sm:px-6 py-4 border-t border-border-default bg-bg-tertiary">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs sm:text-sm text-text-secondary text-center sm:text-left">
                <span className="font-semibold">💡 Tip:</span> Select items by clicking checkboxes, edit fields, then click "Update Selected"
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-lg bg-bg-primary text-text-primary border-2 border-border-default hover:bg-bg-secondary hover:border-action-primary transition-all font-semibold shadow-sm hover:shadow-md text-sm sm:text-base w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render Table Bulk Update Modal
  if (modalType === 'table') {
    const filteredTables = getFilteredUpdateTables();
    
    return (
      <div className="fixed inset-0 bg-color-modalsbg z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-bg-primary rounded-xl w-full max-w-3xl shadow-2xl border-2 border-border-default max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-border-default flex justify-between items-center bg-gradient-to-r from-action-primary to-action-success">
            <h3 className="text-lg sm:text-xl font-bold text-text-white">Bulk Update Tables</h3>
            <button 
              onClick={handleClose} 
              className="text-text-white hover:text-text-primary hover:bg-bg-primary transition-all p-2 rounded-lg"
            >
              <FaTimes size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
  
          {/* Global Update Section */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-b-2 border-border-default">
            <h4 className="text-xs sm:text-sm font-bold text-text-secondary mb-3 uppercase tracking-wide">Apply to All Selected</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-text-secondary">Global Seating</label>
                <input
                  type="number"
                  min="1"
                  value={bulkUpdateGlobal.table_type}
                  onChange={e => {
                    const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                    setBulkUpdateGlobal(prev => ({ ...prev, table_type: value }));
                  }}
                  placeholder="Apply to all"
                  className="w-full px-3 py-2.5 border-2 border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-action-primary text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-text-secondary">Global Status</label>
                <select
                  value={bulkUpdateGlobal.status}
                  onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2.5 border-2 border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-action-primary text-sm shadow-sm"
                >
                  <option value="">-- No Change --</option>
                  <option value="Vacant">Vacant</option>
                  <option value="Reserved">Reserved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-text-secondary">Global Zone</label>
                <select
                  value={bulkUpdateGlobal.location_zone}
                  onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, location_zone: e.target.value }))}
                  className="w-full px-3 py-2.5 border-2 border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-action-primary text-sm shadow-sm"
                >
                  <option value="">-- No Change --</option>
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </div>
            </div>
          </div>
  
          {/* Search Bar */}
          <div className="px-4 sm:px-6 py-3 border-b border-border-default bg-bg-primary">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search tables to update..."
                value={bulkUpdateSearch}
                onChange={e => setBulkUpdateSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border-2 border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-action-primary text-sm shadow-sm"
              />
            </div>
          </div>
  
          {/* Select All */}
          <div className="px-4 sm:px-6 py-2 bg-bg-tertiary border-b border-border-default">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-bg-primary p-2 rounded-lg transition-all group">
              <input
                type="checkbox"
                checked={selectedUpdateTables.length === filteredTables.length && filteredTables.length > 0}
                onChange={selectAllUpdateTables}
                className="w-4 h-4 text-action-primary rounded border-border-default focus:ring-2 focus:ring-action-primary"
              />
              <span className="font-bold text-sm sm:text-base text-text-primary group-hover:text-action-primary transition-colors">
                Select All Tables 
                <span className="ml-2 text-action-primary bg-orange-100 px-2 py-1 rounded-full text-xs font-bold">
                  {selectedUpdateTables.length} selected
                </span>
              </span>
            </label>
          </div>
  
          {/* Table List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="space-y-3 sm:space-y-4">
              {filteredTables.length === 0 ? (
                <div className="text-center py-16 bg-bg-secondary rounded-xl border-2 border-dashed border-border-default">
                  <FaSearch className="text-text-secondary text-4xl sm:text-5xl mx-auto mb-4" />
                  <p className="text-text-secondary font-bold text-base sm:text-lg">No tables found</p>
                  <p className="text-text-secondary text-xs sm:text-sm mt-2">Try a different search term</p>
                </div>
              ) : (
                filteredTables.map(table => (
                  <div 
                    key={table.id} 
                    className={`border-2 rounded-xl p-3 sm:p-4 bg-bg-primary transition-all shadow-sm hover:shadow-md ${
                      selectedUpdateTables.includes(table.id) 
                        ? 'border-action-primary bg-orange-50' 
                        : 'border-border-default hover:border-action-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedUpdateTables.includes(table.id)}
                        onChange={() => toggleUpdateTableSelection(table.id)}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-action-primary rounded border-border-default focus:ring-2 focus:ring-action-primary cursor-pointer"
                      />
                      <span className="font-bold text-base sm:text-lg text-text-primary">{table.name}</span>
                      {selectedUpdateTables.includes(table.id) && (
                        <span className="ml-auto text-xs font-bold bg-action-primary text-text-white px-3 py-1 rounded-full shadow-sm">
                          Selected
                        </span>
                      )}
                    </div>
  
                    {selectedUpdateTables.includes(table.id) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-border-default">
                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-text-secondary">Seating</label>
                          <input
                            type="number"
                            min="1"
                            value={bulkUpdateData[table.id]?.table_type ?? table.table_type ?? ""}
                            onChange={e => {
                              const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                              handleBulkUpdateChange(table.id, "table_type", value);
                            }}
                            placeholder={bulkUpdateGlobal.table_type ? `Global: ${bulkUpdateGlobal.table_type}` : "Seating"}
                            className="w-full px-3 py-2 border-2 border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-action-primary shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-text-secondary">Status</label>
                          <select
                            value={bulkUpdateData[table.id]?.status ?? table.status}
                            onChange={e => handleBulkUpdateChange(table.id, 'status', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-action-primary shadow-sm"
                          >
                            <option value="Vacant">Vacant</option>
                            <option value="Reserved">Reserved</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-text-secondary">Zone</label>
                          <select
                            value={bulkUpdateData[table.id]?.location_zone ?? table.location_zone}
                            onChange={e => handleBulkUpdateChange(table.id, 'location_zone', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-action-primary shadow-sm"
                          >
                            <option value="AC">AC</option>
                            <option value="Non-AC">Non-AC</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-border-default">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                          <div className="bg-bg-tertiary px-3 py-2 rounded-lg border border-border-default">
                            <span className="font-bold text-text-secondary">Seating:</span>
                            <span className="ml-2 text-text-primary font-semibold">{table.table_type}</span>
                          </div>
                          <div className="bg-bg-tertiary px-3 py-2 rounded-lg border border-border-default">
                            <span className="font-bold text-text-secondary">Status:</span>
                            <span className="ml-2 text-text-primary font-semibold">{table.status}</span>
                          </div>
                          <div className="bg-bg-tertiary px-3 py-2 rounded-lg border border-border-default">
                            <span className="font-bold text-text-secondary">Zone:</span>
                            <span className="ml-2 text-text-primary font-semibold">{table.location_zone}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
  
          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-bg-tertiary border-t-2 border-border-default flex flex-col sm:flex-row gap-3">
            <button
              className="flex-1 bg-modalsUpdateBg-save text-text-white py-3 sm:py-3.5 rounded-lg hover:opacity-90 transition-all font-bold shadow-md hover:shadow-lg disabled:bg-bg-primary disabled:text-text-secondary disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 text-sm sm:text-base"
              onClick={saveBulkUpdate}
              disabled={selectedUpdateTables.length === 0}
            >
              <FaCheck size={16} className="sm:w-5 sm:h-5" />
              <span>Update {selectedUpdateTables.length} Table(s)</span>
            </button>
            <button
              className="flex-1 bg-modalsUpdateBg-cancel text-text-white py-3 sm:py-3.5 rounded-lg hover:bg-bg-primary hover:text-text-primary hover:border-2 hover:border-action-danger transition-all font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
              onClick={handleClose}
            >
              <FaTimes size={16} className="sm:w-5 sm:h-5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default UniversalBulkUpdateModal;