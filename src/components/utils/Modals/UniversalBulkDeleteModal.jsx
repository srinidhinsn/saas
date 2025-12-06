import React, { useState } from 'react';
import { Trash2, X, Search, AlertCircle } from 'lucide-react';

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
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Delete Tables</h2>
              <button 
                className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center" 
                onClick={handleClose}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">Select tables to remove from the system</p>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables..."
                value={bulkDeleteSearch}
                onChange={e => setBulkDeleteSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {bulkDeleteSearch && (
                <button
                  onClick={() => setBulkDeleteSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Select All */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDeleteTables.length === filteredTables.length && filteredTables.length > 0}
                  onChange={selectAllDeleteTables}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Select All</span>
              </div>
              <span className="text-sm text-gray-600">
                {selectedDeleteTables.length} of {filteredTables.length} selected
              </span>
            </label>
          </div>

          {/* Table List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filteredTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500">No tables found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTables.map(table => {
                  const isSelected = selectedDeleteTables.includes(table.id);
                  return (
                    <label 
                      key={table.id} 
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDeleteTableSelection(table.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{table.name}</div>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600">
                          <span>Seating: {table.table_type}</span>
                          <span>•</span>
                          <span>Status: {table.status}</span>
                          <span>•</span>
                          <span>Zone: {table.location_zone}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={handleContinueToFirstConfirm}
                disabled={selectedDeleteTables.length === 0}
              >
                Delete ({selectedDeleteTables.length})
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Confirm Deletion</h3>
          <p className="text-sm text-gray-600 text-center mb-4">
            You are about to delete <strong>{selectedDeleteTables.length}</strong> table{selectedDeleteTables.length !== 1 ? 's' : ''}
          </p>
          
          <div className="mb-6 max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex flex-wrap gap-2">
              {tables.filter(t => selectedDeleteTables.includes(t.id)).map(t => (
                <span 
                  key={t.id} 
                  className="inline-block px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 font-medium"
              onClick={() => {
                setShowModal(false);
                setShowSecondDeleteConfirm(true);
              }}
            >
              Continue
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Final Confirmation</h3>
          
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-sm text-red-800 font-medium text-center">
              This action cannot be undone. All selected tables will be permanently deleted.
            </p>
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
              onClick={() => {
                setShowModal(false);
                setShowFirstDeleteConfirm(false);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 font-medium"
              onClick={confirmBulkDelete}
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversalBulkDeleteModal;