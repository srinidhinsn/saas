import React, { useState } from 'react';
import { Trash2, X, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';

const UniversalBulkDeleteModal = ({
  showModal,
  setShowModal,
  modalType = 'table',
  tables = [],
  bulkDeleteSearch = '',
  setBulkDeleteSearch,
  selectedDeleteTables = [],
  setSelectedDeleteTables,
  showFirstDeleteConfirm,
  setShowFirstDeleteConfirm,
  showSecondDeleteConfirm,
  setShowSecondDeleteConfirm,
  confirmBulkDelete,
  getFilteredDeleteTables
}) => {
  const toggleDeleteTableSelection = (tableId) => {
    setSelectedDeleteTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const selectAllDeleteTables = () => {
    const filtered = getFilteredDeleteTables();
    if (selectedDeleteTables.length === filtered.length) {
      setSelectedDeleteTables([]);
    } else {
      setSelectedDeleteTables(filtered.map(t => t.id));
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedDeleteTables([]);
    setBulkDeleteSearch('');
  };

  const handleContinueToFirstConfirm = () => {
    setShowModal(false);
    setShowFirstDeleteConfirm(true);
  };

  if (!showModal) return null;

  if (modalType === 'table') {
    const filteredTables = getFilteredDeleteTables();

    return (
      <div className="fixed inset-0 bg-color-modalsbg backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-bg-primary rounded-2xl w-full max-w-2xl shadow-2xl border border-border-default max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          {/* Header with gradient */}
          <div className="relative px-6 py-5 border-b border-border-default bg-gradient-to-r from-red-50 via-pink-50 to-red-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-action-danger bg-opacity-10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-action-danger" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">Bulk Delete Tables</h3>
                  <p className="text-sm text-text-secondary mt-0.5">Select tables to permanently remove</p>
                </div>
              </div>
              <button 
                className="w-8 h-8 rounded-lg hover:bg-bg-tertiary transition-all duration-200 flex items-center justify-center group" 
                onClick={handleClose}
              >
                <X className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-border-default bg-bg-primary">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              <input
                type="text"
                placeholder="Search tables by name, zone, or status..."
                value={bulkDeleteSearch}
                onChange={e => setBulkDeleteSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-border-default rounded-xl bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-danger focus:border-transparent transition-all duration-200 text-text-primary placeholder-text-secondary"
              />
              {bulkDeleteSearch && (
                <button
                  onClick={() => setBulkDeleteSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full hover:bg-bg-tertiary flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              )}
            </div>
          </div>

          {/* Select All Bar */}
          <div className="px-6 py-3 bg-bg-tertiary border-b border-border-default">
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedDeleteTables.length === filteredTables.length && filteredTables.length > 0}
                    onChange={selectAllDeleteTables}
                    className="w-5 h-5 text-action-danger rounded border-2 border-border-default focus:ring-2 focus:ring-action-danger focus:ring-offset-0 cursor-pointer transition-all"
                  />
                </div>
                <span className="font-semibold text-text-primary group-hover:text-action-danger transition-colors">
                  Select All Tables
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-action-danger bg-opacity-10 text-action-danger rounded-full text-sm font-semibold">
                  {selectedDeleteTables.length} selected
                </span>
                <span className="text-sm text-text-secondary">
                  of {filteredTables.length}
                </span>
              </div>
            </label>
          </div>

          {/* Table List with improved cards */}
          <div className="flex-1 overflow-y-auto p-4 bg-bg-primary">
            {filteredTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-text-secondary" />
                </div>
                <p className="text-text-secondary text-center">No tables found matching your search</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTables.map(table => {
                  const isSelected = selectedDeleteTables.includes(table.id);
                  return (
                    <div 
                      key={table.id} 
                      className={`group border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'border-action-danger bg-red-50 shadow-lg scale-[1.01]' 
                          : 'border-border-default bg-bg-primary hover:border-action-danger hover:shadow-md'
                      }`}
                      onClick={() => toggleDeleteTableSelection(table.id)}
                    >
                      <label className="flex items-start gap-4 cursor-pointer">
                        <div className="relative mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDeleteTableSelection(table.id)}
                            className="w-5 h-5 text-action-danger rounded border-2 border-border-default focus:ring-2 focus:ring-action-danger focus:ring-offset-0 cursor-pointer transition-all"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-lg text-text-primary truncate">{table.name}</h4>
                            {isSelected && (
                              <span className="flex items-center gap-1.5 text-xs bg-action-danger text-text-white px-3 py-1 rounded-full font-semibold whitespace-nowrap ml-2 shadow-sm">
                                <AlertTriangle className="w-3 h-3" />
                                Will be deleted
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="text-text-secondary">Seating:</span>
                              <span className="font-semibold text-text-primary px-2 py-0.5 bg-bg-tertiary rounded">
                                {table.table_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-text-secondary">Status:</span>
                              <span className={`font-semibold px-2 py-0.5 rounded ${
                                table.status === 'available' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-tableStatusBg-occupied text-action-danger'
                              }`}>
                                {table.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-text-secondary">Zone:</span>
                              <span className="font-semibold text-text-primary px-2 py-0.5 bg-bg-tertiary rounded">
                                {table.location_zone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-bg-primary border-t border-border-default">
            <div className="flex gap-3">
              <button
                className="flex-1 bg-action-danger text-text-white py-3.5 rounded-xl hover:bg-opacity-90 transition-all duration-200 font-bold shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group"
                onClick={handleContinueToFirstConfirm}
                disabled={selectedDeleteTables.length === 0}
              >
                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Delete {selectedDeleteTables.length} Table{selectedDeleteTables.length !== 1 ? 's' : ''}
              </button>
              <button
                className="flex-1 bg-modalsUpdateBg-cancel text-text-primary py-3.5 rounded-xl hover:bg-bg-tertiary transition-all duration-200 font-bold border border-border-default flex items-center justify-center gap-2"
                onClick={handleClose}
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// First Delete Confirmation Modal
export const FirstDeleteConfirmModal = ({
  showModal,
  setShowModal,
  selectedDeleteTables = [],
  tables = [],
  setShowSecondDeleteConfirm
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-color-modalsbg backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-bg-primary rounded-2xl w-full max-w-md shadow-2xl border border-border-default animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-action-danger bg-opacity-10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-action-danger" />
          </div>
          
          <h3 className="text-2xl font-bold text-text-primary mb-2">Confirm Deletion</h3>
          <p className="text-text-secondary mb-6">
            You are about to delete{' '}
            <strong className="text-action-danger text-xl">{selectedDeleteTables.length}</strong>{' '}
            table{selectedDeleteTables.length !== 1 ? 's' : ''}
          </p>
          
          <div className="mb-6 max-h-40 overflow-y-auto p-4 bg-bg-tertiary rounded-xl border border-border-default">
            <div className="flex flex-wrap gap-2 justify-center">
              {tables.filter(t => selectedDeleteTables.includes(t.id)).map(t => (
                <span 
                  key={t.id} 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-tableStatusBg-occupied text-action-danger rounded-lg text-sm font-bold border border-red-300 shadow-sm"
                >
                  <Trash2 className="w-3 h-3" />
                  {t.name}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              className="flex-1 bg-action-danger text-text-white py-3 rounded-xl hover:bg-opacity-90 transition-all duration-200 font-bold shadow-lg"
              onClick={() => {
                setShowModal(false);
                setShowSecondDeleteConfirm(true);
              }}
            >
              Continue
            </button>
            <button
              className="flex-1 bg-modalsUpdateBg-cancel text-text-primary py-3 rounded-xl hover:bg-bg-tertiary transition-all duration-200 font-bold border border-border-default"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Second Delete Confirmation Modal
export const SecondDeleteConfirmModal = ({
  showModal,
  setShowModal,
  setShowFirstDeleteConfirm,
  confirmBulkDelete
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-color-modalsbg backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-bg-primary rounded-2xl w-full max-w-md shadow-2xl border-2 border-red-300 animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-action-danger bg-opacity-10 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <AlertTriangle className="w-10 h-10 text-action-danger" />
          </div>
          
          <h3 className="text-2xl font-bold text-action-danger mb-4">Final Confirmation</h3>
          
          <div className="bg-tableStatusBg-occupied border-2 border-red-300 rounded-xl p-5 mb-6 shadow-inner">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-action-danger" />
              <p className="text-action-danger font-black text-lg uppercase tracking-wide">
                Irreversible Action
              </p>
            </div>
            <p className="text-text-primary text-sm font-medium">
              All selected tables will be permanently deleted from the system
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              className="flex-1 bg-action-danger text-text-white py-3.5 rounded-xl hover:bg-opacity-90 transition-all duration-200 font-bold shadow-lg flex items-center justify-center gap-2 group"
              onClick={confirmBulkDelete}
            >
              <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Confirm Delete
            </button>
            <button
              className="flex-1 bg-modalsUpdateBg-cancel text-text-primary py-3.5 rounded-xl hover:bg-bg-tertiary transition-all duration-200 font-bold border border-border-default"
              onClick={() => {
                setShowModal(false);
                setShowFirstDeleteConfirm(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversalBulkDeleteModal;