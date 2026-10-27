import React from 'react';
import { X, Search, AlertCircle } from 'lucide-react';

// full class strings so Tailwind keeps them
const statusChip = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'vacant' || s === 'available') return 'bg-state-vacant-bg text-state-vacant';
  if (s === 'occupied') return 'bg-state-occupied-bg text-state-occupied';
  if (s === 'reserved') return 'bg-state-reserved-bg text-state-reserved';
  return 'bg-state-other-bg text-state-other';
};

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
    const allSelected =
      selectedDeleteTables.length === filteredTables.length && filteredTables.length > 0;

    return (
      <div className="ui-backdrop">
        <div className="ui-dialog max-w-modal-lg animate-scale-in" role="dialog" aria-modal="true" aria-label="Delete tables">

          {/* Header (danger tint) */}
          <div className="ui-dialog-head bg-danger-bg border-danger-border">
            <div className="min-w-0">
              <h2 className="text-panel-title text-danger">Delete Tables</h2>
              <p className="text-micro text-ink-muted">Select tables to remove from the system</p>
            </div>
            <button type="button" className="ui-icon-btn" onClick={handleClose} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search + select all */}
          <div className="px-modal py-item border-b border-line-soft shrink-0 space-y-item">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search tables..."
                value={bulkDeleteSearch}
                onChange={e => setBulkDeleteSearch(e.target.value)}
                className="ui-input pr-9"
              />
              {bulkDeleteSearch && (
                <button
                  type="button"
                  onClick={() => setBulkDeleteSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="flex items-center gap-item-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={selectAllDeleteTables}
                  className="ui-check"
                />
                <span className="text-ui font-semibold text-ink">Select All</span>
              </span>
              <span className="ui-count">
                {selectedDeleteTables.length} / {filteredTables.length}
              </span>
            </label>
          </div>

          {/* Table list */}
          <div className="ui-dialog-body">
            {filteredTables.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-10 w-10 mx-auto mb-3 text-brand-soft" />
                <p className="text-ui text-ink-muted">No tables found</p>
              </div>
            ) : (
              <div className="space-y-item-sm">
                {filteredTables.map(table => {
                  const isSelected = selectedDeleteTables.includes(table.id);
                  return (
                    <label
                      key={table.id}
                      className={`ui-row ${isSelected ? 'ui-row-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDeleteTableSelection(table.id)}
                        className="ui-check"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="text-ui font-semibold text-ink">{table.name}</div>
                        <div className="flex flex-wrap gap-x-2 mt-0.5 text-micro text-ink-muted">
                          <span>Seats: <b className="font-semibold text-ink-soft">{table.table_type}</b></span>
                          <span>•</span>
                          <span>Zone: <b className="font-semibold text-ink-soft">{table.location_zone || '—'}</b></span>
                        </div>
                      </div>

                      <span className={`ui-chip ${statusChip(table.status)}`}>{table.status}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="ui-dialog-foot">
            <button type="button" className="ui-btn" onClick={handleClose}>Cancel</button>
            <button
              type="button"
              className="ui-btn ui-btn-delete"
              onClick={handleContinueToFirstConfirm}
              disabled={selectedDeleteTables.length === 0}
            >
              Delete ({selectedDeleteTables.length})
            </button>
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
    <div className="ui-backdrop">
      <div className="ui-modal text-center animate-scale-in" role="dialog" aria-modal="true" aria-label="Confirm deletion">
        <div className="h-12 w-12 mx-auto mb-item rounded-badge grid place-items-center bg-danger-bg text-danger">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h3 className="text-panel-title text-ink mb-1">Confirm Deletion</h3>
        <p className="text-ui text-ink-muted mb-item">
          You are about to delete <strong className="text-danger">{selectedDeleteTables.length}</strong> table{selectedDeleteTables.length !== 1 ? 's' : ''}
        </p>

        <div className="flex flex-wrap justify-center gap-item-sm max-h-32 overflow-y-auto p-2 mb-card rounded-button bg-brand-light">
          {tables.filter(t => selectedDeleteTables.includes(t.id)).map(t => (
            <span
              key={t.id}
              className="text-micro font-bold px-2.5 py-0.5 rounded-badge bg-danger-bg text-danger"
            >
              {t.name}
            </span>
          ))}
        </div>

        <div className="flex gap-item-sm">
          <button className="ui-btn flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          <button
            className="ui-btn ui-btn-danger flex-1"
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
    <div className="ui-backdrop">
      <div className="ui-modal text-center animate-scale-in" role="dialog" aria-modal="true" aria-label="Final confirmation">
        <div className="h-12 w-12 mx-auto mb-item rounded-badge grid place-items-center bg-danger-bg text-danger">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h3 className="text-panel-title text-ink mb-item">Final Confirmation</h3>

        <div className="text-left border-l-bar border-l-danger pl-3 py-2 mb-card text-ui text-ink-muted">
          <b className="text-danger">This cannot be undone.</b> All selected tables will be permanently deleted.
        </div>

        <div className="flex gap-item-sm">
          <button
            className="ui-btn flex-1"
            onClick={() => {
              setShowModal(false);
              setShowFirstDeleteConfirm(false);
            }}
          >
            Cancel
          </button>
          <button className="ui-btn ui-btn-danger flex-1" onClick={confirmBulkDelete}>
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};

export default UniversalBulkDeleteModal;