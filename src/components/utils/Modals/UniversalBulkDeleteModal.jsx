import React from 'react';
import { X, Search, AlertCircle } from 'lucide-react';

/* ─────────────────────────────────────────────
   Shared analytics-theme class strings
   (only uses utilities / ui-* classes that exist in the final tailwind config)
───────────────────────────────────────────── */
const CHECK = "h-4 w-4 cursor-pointer accent-brand";
const COUNT =
  "text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line";
const ICON_BTN =
  "grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface " +
  "text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors";
const DIALOG =
  "flex flex-col w-full max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line " +
  "border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in";
const HEAD =
  "flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0";
const FOOT =
  "flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0";

// full class strings so Tailwind keeps them
const statusChip = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'vacant' || s === 'available') return 'bg-state-vacant-bg text-state-vacant';
  if (s === 'occupied') return 'bg-state-occupied-bg text-state-occupied';
  if (s === 'reserved') return 'bg-state-reserved-bg text-state-reserved';
  return 'bg-state-other-bg text-state-other';
};
const statusBar = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'vacant' || s === 'available') return 'border-t-state-vacant';
  if (s === 'occupied') return 'border-t-state-occupied';
  if (s === 'reserved') return 'border-t-state-reserved';
  return 'border-t-state-other';
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
      <div className="ui-backdrop font-sans">
        <div className={`${DIALOG} max-w-3xl`} role="dialog" aria-modal="true" aria-label="Delete tables">

          {/* Header */}
          <div className={HEAD}>
            <div className="min-w-0">
              <h2 className="text-panel-title text-brand-dark truncate">Bulk delete tables</h2>
              <p className="text-micro text-ink-muted truncate">Select tables to remove from the system</p>
            </div>
            <button type="button" className={ICON_BTN} onClick={handleClose} aria-label="Close">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-brand-dark"
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
                  className={CHECK}
                />
                <span className="text-ui font-semibold text-ink">Select all</span>
              </span>
              <span className={COUNT}>
                {selectedDeleteTables.length} / {filteredTables.length}
              </span>
            </label>
          </div>

          {/* Table list */}
          <div className="flex-1 overflow-y-auto bg-canvas px-modal py-card">
            {filteredTables.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-10 w-10 mx-auto mb-3 text-brand-soft" />
                <p className="text-ui text-ink-muted">No tables found</p>
              </div>
            ) : (
              <div className="grid grid-cols-tiles gap-tiles">
                {filteredTables.map(table => {
                  const isSelected = selectedDeleteTables.includes(table.id);
                  return (
                    <label
                      key={table.id}
                      className={`flex flex-col min-w-0 cursor-pointer overflow-hidden rounded-panel border border-t-bar ${statusBar(table.status)} shadow-panel transition-colors ${isSelected
                          ? 'border-brand-ring bg-brand-tint'
                          : 'border-line bg-surface hover:border-brand-line hover:bg-brand-tint'
                        }`}
                    >
                      <div className="flex items-center gap-item-sm px-item pt-item-sm pb-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDeleteTableSelection(table.id)}
                          className={CHECK}
                        />
                        <span className="flex-1 min-w-0 truncate text-ui font-bold text-brand-dark">{table.name}</span>
                      </div>

                      <div className="grid gap-0.5 px-item pb-item-sm text-micro text-ink-muted">
                        <div>Seats: <b className="font-semibold text-ink-soft">{table.table_type}</b></div>
                        <div className="truncate">Zone: <b className="font-semibold text-ink-soft">{table.location_zone || '—'}</b></div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={FOOT}>
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
    <div className="ui-backdrop font-sans">
      <div className="ui-modal text-center animate-scale-in" role="dialog" aria-modal="true" aria-label="Confirm deletion">
        <div className="h-12 w-12 mx-auto mb-item rounded-badge grid place-items-center bg-brand-light text-brand-dark">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h3 className="text-panel-title text-brand-dark mb-1">Confirm deletion</h3>
        <p className="text-ui text-ink-muted mb-item">
          You are about to delete <strong className="text-brand-dark">{selectedDeleteTables.length}</strong> table{selectedDeleteTables.length !== 1 ? 's' : ''}
        </p>

        <div className="flex flex-wrap justify-center gap-item-sm max-h-32 overflow-y-auto p-2 mb-card rounded-button bg-brand-light border border-brand-line">
          {tables.filter(t => selectedDeleteTables.includes(t.id)).map(t => (
            <span
              key={t.id}
              className="text-micro font-bold px-2.5 py-0.5 rounded-badge bg-surface text-brand-dark border border-brand-line"
            >
              {t.name}
            </span>
          ))}
        </div>

        <div className="flex gap-item-sm">
          <button className="ui-btn flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          <button
            className="ui-btn ui-btn-add flex-1"
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
    <div className="ui-backdrop font-sans">
      <div className="ui-modal text-center animate-scale-in" role="dialog" aria-modal="true" aria-label="Final confirmation">
        <div className="h-12 w-12 mx-auto mb-item rounded-badge grid place-items-center bg-brand-light text-brand-dark">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h3 className="text-panel-title text-brand-dark mb-item">Final confirmation</h3>

        <div className="text-left border-l-bar border-l-brand pl-3 py-2 mb-card text-ui text-ink-muted">
          <b className="text-brand-dark">This cannot be undone.</b> All selected tables will be permanently deleted.
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
          <button className="ui-btn ui-btn-add flex-1" onClick={confirmBulkDelete}>
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
};

export default UniversalBulkDeleteModal;