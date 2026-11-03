import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import {
  ShoppingCart, Plus, Minus, X, Check, Search,
  Users, Package, Trash2, ArrowLeft, FileText, Mail, MapPin,  
  Printer as PrinterIcon, Clock, Save, User, Phone,Truck,
} from 'lucide-react';
import { Eye, Lock, Printer } from 'lucide-react';
import ImagePreview from '../../utils/ImagePreview';
import CustomerAutocomplete from '../BillingServices/CustomerAutocomplete';
import { parseISTTimestamp } from '../../utils/dateRange';

export const TABLE_STATUS_CONFIG = {
  vacant: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-action-success' },
  available: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-green-700' },
  occupied: { clickable: false, bg: 'bg-action-primary', border: 'border-action-primary', badge: 'bg-red-100 text-action-primary', viewable: true },
  served: { clickable: false, bg: 'bg-blue-50', border: 'border-blue-400', badge: 'bg-blue-100 text-blue-700', viewable: true },
  reserved: { clickable: false, bg: 'bg-yellow-50', border: 'border-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
  cancelled: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-gray-100 text-gray-500' },
};

export const CANCELLATION_REASONS = [
  'Customer changed mind',
  'Wrong item ordered',
  'Duplicate entry',
  'Item out of stock',
  'Customer left',
  'Order placed by mistake',
  'Allergy concern',
  'Other',
];

export const WASTAGE_REASONS = [
  'Plate returned by customer',
  'Quality issue / not fresh',
  'Preparation error',
  'Spilled / dropped',
  'Overcooked / undercooked',
  'Customer complaint',
  'Expired ingredient used',
  'Other',
];

// ─────────────────────────────────────────────────────────────────────────────
// TransferTableModal
// ─────────────────────────────────────────────────────────────────────────────

export const TransferTableModal = ({ isOpen, onClose, tables, currentTableId, onConfirm }) => {
  const [selectedNewTable, setSelectedNewTable] = useState(null);

  useEffect(() => {
    if (isOpen) setSelectedNewTable(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const vacantTables = tables.filter(
    t => t.status?.toLowerCase() === 'vacant' && t.id.toString() !== currentTableId
  );

  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-modal max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Transfer table">
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h2 className="text-panel-title text-brand-dark">Transfer Table</h2>
          <button onClick={onClose} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-modal py-card space-y-item">
          {vacantTables.length === 0 ? (
            <p className="text-ui text-ink-muted text-center py-4">No vacant tables available.</p>
          ) : (
            <div className="grid grid-cols-3 gap-item-sm">
              {vacantTables.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedNewTable(t)}
                  className={`py-3 rounded-panel border text-ui font-bold transition-colors
                    ${selectedNewTable?.id === t.id
                      ? 'border-brand-ring bg-brand-tint text-brand-dark shadow-focus-ring'
                      : 'border-line bg-surface text-ink-soft hover:border-brand-line hover:bg-brand-tint'}`}
                >
                  {t.table_number}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            onClick={onClose}
            className="ui-btn"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (selectedNewTable) { onConfirm(selectedNewTable); onClose(); } }}
            disabled={!selectedNewTable}
            className="ui-btn ui-btn-add"
          >
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ItemStatusBadge
// ─────────────────────────────────────────────────────────────────────────────

export const ItemStatusBadge = ({ status }) => {
  const cfg = {
    pending: { dot: 'bg-status-pending', label: 'Pending' },
    preparing: { dot: 'bg-status-preparing', label: 'Preparing' },
    ready: { dot: 'bg-status-ready', label: 'Ready' },
    served: { dot: 'bg-status-served', label: 'Served' },
    cancelled: { dot: 'bg-gray-300', label: 'Cancelled' },
  }[status] || { dot: 'bg-gray-300', label: status || '—' };

  return (
    <span className="inline-flex items-center gap-1 text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line">
      <span className={`h-1.5 w-1.5 rounded-badge ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DeleteConfirmModal
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_CANCEL_REASONS = [
  'Customer changed mind',
  'Customer left without paying',
  'Duplicate order',
  'Test / mistake order',
  'Payment issue',
  'Kitchen unable to fulfill',
  'Other',
];

export const CancelOrderConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (isOpen) { setReason(''); setCustomReason(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveReason = reason === 'Other' ? customReason : reason;

  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-modal max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Cancel order">
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h2 className="text-panel-title text-brand-dark">Cancel Order</h2>
          <button onClick={onClose} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-modal py-card space-y-item">
          <p className="text-ui text-ink-muted">
            The order will be marked as <span className="font-semibold text-brand-dark">cancelled</span> and kept for records. Select a reason:
          </p>
          <div className="grid grid-cols-2 gap-item-sm max-h-52 overflow-y-auto pr-1">
            {ORDER_CANCEL_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`px-2 py-2 rounded-button-sm text-ui-sm font-semibold border text-left transition-colors
                  ${reason === r
                    ? 'bg-brand text-text-white border-brand'
                    : 'bg-surface text-ink-soft border-line hover:border-brand-line hover:bg-brand-tint'}`}
              >
                {r}
              </button>
            ))}
          </div>
          {reason === 'Other' && (
            <input
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Describe the reason…"
              className="w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink outline-none placeholder:text-ink-faint transition-colors focus:border-brand-ring focus:shadow-focus-ring"
            />
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            onClick={onClose}
            className="ui-btn"
          >
            Go Back
          </button>
          <button
            disabled={!reason || (reason === 'Other' && !customReason.trim())}
            onClick={() => { onConfirm(effectiveReason); onClose(); }}
            className="ui-btn ui-btn-danger"
          >
            Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OldItemDeleteModal
// ─────────────────────────────────────────────────────────────────────────────

export const OldItemDeleteModal = ({ isOpen, onClose, item, onRemoveOne, onRemoveAll }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [removeQty, setRemoveQty] = useState(1);

  const isServed = item?.status === 'served';
  const transactionType = isServed ? 'WASTAGE' : 'ITEM_CANCELLED';
  const reasonList = isServed ? WASTAGE_REASONS : CANCELLATION_REASONS;
  const typeLabel = isServed ? 'Wastage' : 'Cancellation';
  const typeColor = isServed ? 'text-brand-dark' : 'text-brand-dark';
  const typeBg = isServed ? 'bg-brand-light border-brand-line' : 'bg-brand-light border-brand-line';
  const buttonColor = isServed ? 'ui-btn-danger' : 'ui-btn-danger';


  useEffect(() => {
    if (isOpen) {
      setReason('');
      setCustomReason('');
      setRemoveQty(1);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const maxQty = item.quantity || 1;
  const isRemoveAll = removeQty >= maxQty;
  const effectiveReason = reason === 'Other' ? customReason : reason;

  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-modal max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Remove item">
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h2 className={`text-panel-title ${typeColor}`}>Remove Item</h2>
          <button onClick={onClose} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-modal py-card space-y-item">
          <div>
            <p className="text-ui text-brand-dark font-bold">{item.name}</p>
            <p className="text-ui-sm text-ink-muted mt-0.5">
              Ordered quantity: <span className="font-semibold text-ink-soft">{maxQty}</span>
            </p>
          </div>

          <div className={`flex items-center gap-2 px-3 py-2 rounded-button-sm border text-ui-sm font-semibold ${typeBg} ${typeColor}`}>
            <span className="w-2 h-2 rounded-full bg-current inline-block" />
            {typeLabel} — {isServed
              ? 'Item was already served. Stock will be reversed.'
              : 'Item not yet served. No stock deduction.'}
          </div>

          {maxQty > 1 && (
            <div>
              <p className="mb-2 text-micro font-bold uppercase tracking-wide text-ink-muted">How many to remove?</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRemoveQty(q => Math.max(1, q - 1))}
                  className="grid place-items-center h-8 w-8 rounded-button-sm border border-brand-line bg-surface text-brand-dark text-lg font-bold hover:bg-brand-light transition-colors"
                >−</button>
                <span className="w-10 text-center text-kpi text-brand-dark">{removeQty}</span>
                <button
                  onClick={() => setRemoveQty(q => Math.min(maxQty, q + 1))}
                  className="grid place-items-center h-8 w-8 rounded-button-sm border border-brand-line bg-surface text-brand-dark text-lg font-bold hover:bg-brand-light transition-colors"
                >+</button>
                <span className="text-ui-sm text-ink-muted ml-1">of {maxQty}</span>
                <button
                  onClick={() => setRemoveQty(maxQty)}
                  className="ml-auto text-ui-sm text-brand-dark underline font-semibold"
                >Remove all</button>
              </div>
              <div className="mt-2 h-1.5 bg-brand-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all"
                  style={{ width: `${(removeQty / maxQty) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-micro font-bold uppercase tracking-wide text-ink-muted">Reason</p>
            <div className="grid grid-cols-2 gap-item-sm max-h-48 overflow-y-auto pr-1">
              {reasonList.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-2 py-2 rounded-button-sm text-ui-sm font-semibold border text-left transition-colors
                    ${reason === r
                      ? isServed
                        ? 'bg-brand text-text-white border-brand'
                        : 'bg-brand text-text-white border-brand'
                      : 'bg-surface text-ink-soft border-line hover:border-brand-line hover:bg-brand-tint'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Other' && (
              <input
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe the reason…"
                className="mt-2 w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink outline-none placeholder:text-ink-faint transition-colors focus:border-brand-ring focus:shadow-focus-ring"
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            onClick={onClose}
            className="ui-btn"
          >
            Cancel
          </button>
          <button
            disabled={!reason || (reason === 'Other' && !customReason.trim())}
            onClick={() => {
              if (isRemoveAll) {
                onRemoveAll(transactionType, effectiveReason);
              } else {
                onRemoveOne(transactionType, effectiveReason, removeQty);
              }
            }}
            className={`ui-btn ${buttonColor}`}
          >
            {isRemoveAll
              ? `Remove All (${maxQty})`
              : `Remove ${removeQty}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CustomerCapturePanel
// ─────────────────────────────────────────────────────────────────────────────

export const CustomerCapturePanel = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-panel border border-brand-line bg-brand-tint shadow-panel">
      <User size={15} className="text-ink-muted shrink-0" />
      <input
        value={value.customer_id}
        onChange={e => onChange({ ...value, customer_id: e.target.value })}
        placeholder="Customer name / ID (optional)"
        className="flex-1 min-w-0 text-ui bg-transparent outline-none placeholder:text-ink-faint text-ink"
      />
      <div className="w-px h-5 bg-brand-line shrink-0" />
      <Phone size={15} className="text-ink-muted shrink-0" />
      <input
        value={value.contact_phone}
        onChange={e => onChange({ ...value, contact_phone: e.target.value })}
        placeholder="Phone (optional)"
        className="w-32 text-ui bg-transparent outline-none placeholder:text-ink-faint text-ink"
        inputMode="tel"
      />
    </div>
  );
};
export const AddressSelectPanel = ({ addresses, selectedAddressId, setSelectedAddressId }) => {
  if (!addresses || addresses.length === 0) {
    return (
      <div className="px-3 py-2 rounded-panel border border-state-occupied/30 bg-state-occupied-bg text-ui-sm text-state-occupied">
        No saved address found for this customer.
      </div>
    );
  }
  return (
    <div className="px-3 py-2 rounded-panel border border-brand-line bg-brand-tint shadow-panel">
      <select
        value={selectedAddressId}
        onChange={e => setSelectedAddressId(e.target.value)}
        className="w-full text-ui px-2 py-1.5 rounded-button-sm border border-brand-line bg-surface text-ink focus:outline-none focus:border-brand-ring focus:shadow-focus-ring"
      >
        <option value="">Select delivery address</option>
        {addresses.map(addr => (
          <option key={addr.id} value={addr.id}>
            {[addr.name, addr.address_line1, addr.city].filter(Boolean).join(', ') || 'Address'}
          </option>
        ))}
      </select>
    </div>
  );
};
// ─── Compact trigger shown inside the cart ─────────────────────────────────
export const DeliveryDetailsSummary = ({ value, onClick }) => {
  const isComplete = value.contact_phone?.trim() && value.shipping_address?.trim();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-panel border text-left shadow-panel transition-colors
        ${isComplete ? 'border-brand-line bg-brand-tint hover:bg-brand-light' : 'border-state-occupied/40 bg-state-occupied-bg hover:border-state-occupied'}`}
    >
      <MapPin size={16} className={isComplete ? 'text-brand shrink-0' : 'text-state-occupied shrink-0'} />
      <div className="flex-1 min-w-0">
        {isComplete ? (
          <>
            <div className="text-ui-sm font-semibold text-brand-dark truncate">
               {value.contact_phone}
            </div>
            <div className="text-ui-sm text-ink-muted truncate">{value.shipping_address}</div>
          </>
        ) : (
          <div className="text-ui-sm font-semibold text-state-occupied">Tap to add delivery details</div>
        )}
      </div>
      <span className="text-ui-sm font-semibold text-brand shrink-0">Edit</span>
    </button>
  );
};

// ─── Full delivery details modal ───────────────────────────────────────────
export const DeliveryDetailsModal = ({ isOpen, onClose, value, onSave, customers = [] }) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  if (!isOpen) return null;

  const canSave = draft.contact_phone?.trim() && draft.shipping_address?.trim();

  const applyCustomer = (c) => {
    setDraft(d => ({
      ...d,
      customer_id: c.customer_id || d.customer_id,
      contact_phone: c.contact_phone || d.contact_phone,
      contact_email: c.contact_email || d.contact_email,
      shipping_address: c.shipping_address || d.shipping_address,
    }));
  };

  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-modal max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Delivery details">
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h2 className="text-panel-title text-brand-dark flex items-center gap-2">
            <Truck size={16} className="text-brand" />
            Delivery Details
          </h2>
          <button onClick={onClose} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-modal py-card space-y-item">
          {/* <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Customer Name</label>
            <CustomerAutocomplete
              value={draft.customer_id}
              onChange={(val) => setDraft(d => ({ ...d, customer_id: val }))}
              onSelectCustomer={applyCustomer}
              customers={customers}
              placeholder="Customer name / ID"
              valueField="customer_id"
            />
          </div> */}

          <div>
            <label className="block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted">
              Phone <span className="text-state-occupied">*</span>
            </label>
            <CustomerAutocomplete
              value={draft.contact_phone}
              onChange={(val) => setDraft(d => ({ ...d, contact_phone: val }))}
              onSelectCustomer={applyCustomer}
              customers={customers}
              placeholder="Phone number"
              valueField="contact_phone"
            />
          </div>

          <div>
            <label className="block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted">Email</label>
            <CustomerAutocomplete
              value={draft.contact_email}
              onChange={(val) => setDraft(d => ({ ...d, contact_email: val }))}
              onSelectCustomer={applyCustomer}
              customers={customers}
              placeholder="Email (optional)"
              valueField="contact_email"
            />
          </div>

          <div>
            <label className="block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted">
              Delivery Address <span className="text-state-occupied">*</span>
            </label>
            <CustomerAutocomplete
              value={draft.shipping_address}
              onChange={(val) => setDraft(d => ({ ...d, shipping_address: val }))}
              onSelectCustomer={applyCustomer}
              customers={customers}
              placeholder="Full delivery address"
              valueField="shipping_address"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            onClick={onClose}
            className="ui-btn"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            disabled={!canSave}
            className="ui-btn ui-btn-add"
          >
            Save Details
          </button>
        </div>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────
// TablePaymentConfirmModal
// ─────────────────────────────────────────────────────────────────────────────

export const TablePaymentConfirmModal = ({ isOpen, orderId,displayId, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-modal max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Confirm payment">
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h2 className="text-panel-title text-brand-dark">Confirm Payment</h2>
          <button onClick={onClose} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-modal py-card">
          <p className="text-ui text-ink-muted">
            Mark order <span className="font-semibold text-brand-dark">#{displayId ?? orderId}</span> as paid and free the table?
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            onClick={onClose}
            className="ui-btn"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(orderId); onClose(); }}
            className="ui-btn ui-btn-add"
          >
            Confirm Paid
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LineItemsModal
// ─────────────────────────────────────────────────────────────────────────────

export const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddWithSelectedAddons, onAddMainOnly }) => {
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [addonSearch, setAddonSearch] = useState(''); // ← add this

  useEffect(() => {
    if (isOpen) setSelectedAddons([]); setAddonSearch('');
  }, [isOpen]);

  const toggleAddon = (id) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredLineItems = lineItems.filter(item =>
  (item.name || '').toLowerCase().includes(addonSearch.trim().toLowerCase())
);

  if (!isOpen) return null;

  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-lg max-h-[80vh] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Select add-ons">
        <div className="px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
        <h3 className="text-panel-title text-brand-dark">{mainItem?.name}</h3>
        <p className="text-micro text-ink-muted">Select add-ons:</p>
        </div>
        <div className="px-modal py-item border-b border-line-soft shrink-0">
        <div className="relative">
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
    <input
      value={addonSearch}
      onChange={e => setAddonSearch(e.target.value)}
      placeholder="Search add-ons..."
      className="ui-input"
    />
  </div>
        </div>

        <div className="flex-1 overflow-y-auto px-modal py-card space-y-item-sm">
  {filteredLineItems.length === 0 ? (
    <p className="text-ui text-ink-muted text-center py-6">No add-ons match "{addonSearch}"</p>
  ) : (
    filteredLineItems.map(item => (
      <div
        key={item.id}
        onClick={() => toggleAddon(item.id)}
        className={`flex justify-between items-center p-item rounded-panel border cursor-pointer transition-colors
          ${selectedAddons.includes(item.id)
            ? 'border-brand-ring bg-brand-tint'
            : 'border-line bg-surface hover:border-brand-line hover:bg-brand-tint'}`}
      >
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
              ${selectedAddons.includes(item.id)
                ? 'bg-brand border-brand'
                : 'border-line-strong bg-surface'}`}
          >
            {selectedAddons.includes(item.id) && <Check size={14} className="text-white" />}
          </div>
          <span className="text-ui font-semibold text-ink">{item.name}</span>
        </div>
        <span className="text-ui font-bold text-brand-dark">₹{item.unit_price}</span>
      </div>
    ))
  )}
</div>

        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            onClick={onClose}
            className="ui-btn"
          >
            Cancel
          </button>
          <button
            onClick={onAddMainOnly}
            className="ui-btn"
          >
            Main Only
          </button>
          <button
            onClick={() => onAddWithSelectedAddons(selectedAddons)}
            disabled={selectedAddons.length === 0}
            className="ui-btn ui-btn-add"
          >
            Add ({selectedAddons.length})
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ComboDetailModal — shown when a combo item is clicked
// ─────────────────────────────────────────────────────────────────────────────

export const ComboDetailModal = ({ isOpen, onClose, comboItem, comboComponents, onAddCombo }) => {
  if (!isOpen || !comboItem) return null;

  const aLaCarteTotal = comboComponents.reduce(
    (sum, c) => sum + (Number(c.unit_price) || 0), 0
  );
  const savings = aLaCarteTotal - Number(comboItem.unit_price);

  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Combo details">
        <div className="flex items-start justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <div>
            <h3 className="text-panel-title text-brand-dark">{comboItem.name}</h3>
            {comboItem.description && (
              <p className="text-ui-sm text-ink-muted mt-0.5">{comboItem.description}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-modal py-item bg-brand-tint border-b border-brand-line flex items-center justify-between shrink-0">
          <div>
            <span className="text-kpi text-brand-dark">₹{Number(comboItem.unit_price).toFixed(0)}</span>
            {savings > 0 && (
              <span className="ml-2 text-ui-sm text-ink-muted line-through">₹{aLaCarteTotal.toFixed(0)}</span>
            )}
          </div>
          {savings > 0 && (
            <span className="text-micro font-bold bg-state-vacant-bg text-state-vacant px-2 py-1 rounded-badge">
              Save ₹{savings.toFixed(0)}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-modal py-card">
          <p className="text-micro font-bold text-ink-muted uppercase tracking-wide mb-item-sm">
            What's included ({comboComponents.length} items)
          </p>
          <div className="space-y-item-sm">
            {comboComponents.length === 0 ? (
              <p className="text-ui text-ink-muted italic text-center py-4">No component details available</p>
            ) : (
              comboComponents.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className="flex items-center justify-between px-3 py-2 rounded-panel bg-brand-tint border border-brand-line"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-soft text-brand-dark text-micro font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-ui font-semibold text-ink">{c.name}</span>
                  </div>
                  <span className="text-ui-sm text-brand-dark font-semibold">₹{Number(c.unit_price).toFixed(0)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            onClick={onClose}
            className="ui-btn"
          >
            Cancel
          </button>
          <button
            onClick={() => { onAddCombo(); onClose(); }}
            className="ui-btn ui-btn-add"
          >
            Add Combo · ₹{Number(comboItem.unit_price).toFixed(0)}
          </button>
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// OldItemRow — previously placed items (read-only in cart)
// ─────────────────────────────────────────────────────────────────────────────

export const OldItemRow = ({ group, clientId, token, activeDineinOrderId, onRequestDelete }) => {
  const { main, addons } = group;
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2 p-3 rounded-panel border border-line bg-surface shadow-panel">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-button-sm overflow-hidden border border-line bg-surface shrink-0">
            <ImagePreview
              clientId={clientId}
              imageId={main.image_id}
              token={token}
              alt={main.name}
              baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
              urlBuilder={({ baseUrl, clientId, imageId }) =>
                `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-ui font-bold truncate text-ink">{main.name}</h4>
            <p className="text-ui-sm font-bold text-brand-dark">
            ₹{(main.unit_price * (1 - (Number(main.discount) || 0) / 100)).toFixed(2)}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {main.batch_label && main.batch_label !== activeDineinOrderId && (
                <span className="text-micro text-ink-muted font-mono font-semibold">
                  #{main.batch_label}
                </span>
              )}
              {main.status && <ItemStatusBadge status={main.status} />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-center">
          <span className="text-ui font-semibold text-ink-muted">×{main.quantity}</span>
          <button
            onClick={() => onRequestDelete && onRequestDelete(main)}
            className="text-ink-muted hover:text-brand-dark transition-colors"
            title="Remove item"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {addons.map(addon => (
        <div
          key={addon.frontend_unique_key || addon.id}
          className="flex items-center gap-2 p-2 pl-8 rounded-button-sm border border-dashed border-brand-line bg-brand-tint"
        >
          <span className="text-ui-sm text-brand">↳</span>
          <span className="text-ui text-ink-soft truncate flex-1">{addon.name}</span>
          <span className="text-ui-sm font-semibold text-brand-dark">
          ₹{(addon.unit_price * (1 - (Number(addon.discount) || 0) / 100)).toFixed(2)}
          </span>
          <span className="text-ui-sm text-ink-muted w-6 text-center">×{addon.quantity}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NewItemRow — newly added items (editable quantity / removable)
// ─────────────────────────────────────────────────────────────────────────────

export const NewItemRow = ({ group, clientId, token, onUpdateQuantity, onRemove }) => {
  const { main, addons } = group;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 p-3 rounded-panel border border-brand-line bg-brand-tint shadow-panel">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-button-sm overflow-hidden border border-line bg-surface shrink-0">
            <ImagePreview
              clientId={clientId}
              imageId={main.image_id}
              token={token}
              alt={main.name}
              baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
              urlBuilder={({ baseUrl, clientId, imageId }) =>
                `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-ui font-bold truncate text-ink">{main.name}</h4>
            <p className="text-ui-sm font-bold text-brand-dark">
            ₹{(main.unit_price * (1 - (Number(main.discount) || 0) / 100)).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateQuantity(main.id, -1, main.frontend_unique_key)}
            className="grid place-items-center w-7 h-7 border border-brand-line rounded-button-sm bg-surface text-brand-dark hover:bg-brand-light transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="w-6 text-center text-ui font-semibold text-ink">{main.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(main.id, 1, main.frontend_unique_key)}
            className="grid place-items-center w-7 h-7 border border-brand-line rounded-button-sm bg-surface text-brand-dark hover:bg-brand-light transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          onClick={() => onRemove(main.id, main.frontend_unique_key)}
          className="text-ink-muted hover:text-brand-dark transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {addons.map(addon => (
        <div
          key={addon.frontend_unique_key}
          className="flex items-center gap-2 p-2 pl-8 rounded-button-sm border border-dashed border-brand-line bg-brand-light"
        >
          <span className="text-ui-sm text-brand">↳</span>
          <span className="text-ui text-ink-soft truncate flex-1">{addon.name}</span>
          <span className="text-ui-sm font-semibold text-brand-dark">
          ₹{(addon.unit_price * (1 - (Number(addon.discount) || 0) / 100)).toFixed(2)}
          </span>
          <span className="text-ui-sm text-ink-muted w-6 text-center">×{addon.quantity}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TableReservation — floor view
// ─────────────────────────────────────────────────────────────────────────────


const ORDER_STATUS_BAR = {
  pending: { bar: 'border-t-status-pending', dot: 'bg-status-pending' },
  preparing: { bar: 'border-t-status-preparing', dot: 'bg-status-preparing' },
  ready: { bar: 'border-t-status-ready', dot: 'bg-status-ready' },
  served: { bar: 'border-t-status-served', dot: 'bg-status-served' },
  cancelled: { bar: 'border-t-gray-300', dot: 'bg-gray-300' },
};

export const TableReservation = ({
  tables = [],
  orderMode = 'dinein',
  tableOrders = {},
  draftTableIds = [],
  hasDinein = true,
  hasWalkin = true,
  hasTakeaway = true,
  hasDelivery = true,
  onSelectTable,
  onSelectTakeaway,
  onSelectDineIn,
  onSelectWalkIn,
  onSelectDelivery,
  onViewOrder,
  onPrintBill,
  onCancelOrder,
  onMarkAsServed,
  onConfirmPayment,
}) => {
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedZones, setSelectedZones] = useState([]);

  const getZone = t => t.location_zone?.trim() || 'Unassigned';
  const getSection = t => t.section?.trim() || 'Other';

  const zonesFromDB = [...new Set(tables.map(t => t.location_zone).filter(Boolean))];
  const sectionsFromDB = [...new Set(tables.map(t => t.section).filter(Boolean))];

  const toggleFilter = (value, setter) => {
    setter(prev =>
      prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]
    );
  };

  const filteredTables = tables.filter(t => {
    const z = getZone(t);
    const s = getSection(t);
    return (selectedZones.length === 0 || selectedZones.includes(z))
      && (selectedSections.length === 0 || selectedSections.includes(s));
  });

  const visibleZones = [...new Set(filteredTables.map(t => getZone(t)))];
  const getSectionsByZone = zone =>
    [...new Set(filteredTables.filter(t => getZone(t) === zone).map(t => getSection(t)))];

  const calcElapsed = (createdAt) => {
    if (!createdAt) return null;
    const diff = Date.now() - parseISTTimestamp(createdAt);
    if (diff < 0) return 'Just now';
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (s < 60) return 'Just now';
    if (m === 1) return '1 min ';
    if (m < 60) return `${m} mins `;
    if (h === 1) return '1 hr ';
    if (h < 24) return `${h} hrs `;
    if (d === 1) return '1 day ';
    return `${d} days `;
  };


  const modeBtn = (active) => `ui-tab inline-flex items-center gap-1 ${active ? 'ui-tab-active' : ''}`;

  return (
    <div className="ui-page !min-h-0 h-[calc(100vh-4rem)] overflow-y-auto">

      {/* ── Filter bar ── */}
      <section className="ui-panel sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="ui-tabs" role="group" aria-label="Filter by section">
            <button
              type="button"
              aria-pressed={selectedSections.length === 0 && selectedZones.length === 0}
              onClick={() => { setSelectedSections([]); setSelectedZones([]); }}
              className={`ui-tab ${selectedSections.length === 0 && selectedZones.length === 0 ? 'ui-tab-active' : ''}`}
            >
              All
            </button>
            {sectionsFromDB.map(sec => (
              <button
                key={sec}
                type="button"
                aria-pressed={selectedSections.includes(sec)}
                onClick={() => toggleFilter(sec, setSelectedSections)}
                className={`ui-tab ${selectedSections.includes(sec) ? 'ui-tab-active' : ''}`}
              >
                {sec}
              </button>
            ))}
            {/* {zonesFromDB.map(zone => (
              <button
                key={zone}
                type="button"
                aria-pressed={selectedZones.includes(zone)}
                onClick={() => toggleFilter(zone, setSelectedZones)}
                className={`ui-toggle-btn ${selectedZones.includes(zone) ? 'ui-toggle-btn-active' : ''}`}
              >
                {zone}
              </button>
            ))} */}
          </div>

          <div className="flex items-center gap-x-3 gap-y-1 text-micro text-ink-muted">
          {Object.entries(ORDER_STATUS_BAR).map(([status, s]) => (
            <span key={status} className="inline-flex items-center gap-1 capitalize">
              <span className={`h-2 w-2 rounded-badge ${s.dot}`} />
              {status}
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-badge bg-state-reserved" /> Draft
          </span>
        </div>

          {/* Order-mode toggle */}
          <div className="ui-tabs" role="group" aria-label="Order type">
            {hasDinein && (
              <button type="button" aria-pressed={orderMode === 'dinein'} onClick={onSelectDineIn} className={modeBtn(orderMode === 'dinein')}>
                Dine In
              </button>
            )}
            {hasWalkin && (
              <button type="button" aria-pressed={orderMode === 'walkin'} onClick={onSelectWalkIn} className={modeBtn(orderMode === 'walkin')}>
                <User size={12} /> Walk In
              </button>
            )}
            {hasTakeaway && (
              <button type="button" aria-pressed={orderMode === 'takeaway'} onClick={onSelectTakeaway} className={modeBtn(orderMode === 'takeaway')}>
                <Package size={12} /> Takeaway
              </button>
            )}
            {hasDelivery && (
              <button type="button" aria-pressed={orderMode === 'delivery'} onClick={onSelectDelivery} className={modeBtn(orderMode === 'delivery')}>
                <Truck size={12} /> Delivery
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Zones → sections → table cards ── */}
      {orderMode === 'dinein' && visibleZones.map(zone => {
        const sections = getSectionsByZone(zone);
        const zoneTables = filteredTables.filter(t => getZone(t) === zone);
        const isVac = t => ['vacant', 'available'].includes(t.status?.toLowerCase().trim());
        const vac = zoneTables.filter(isVac).length;
        const occ = zoneTables.filter(t => t.status?.toLowerCase() === 'occupied').length;

        return (
          <section key={zone} className="ui-panel">
            {/* Zone header */}
            <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-line-divider">
              <h3 className="text-panel-title text-brand-dark">{zone}</h3>
              <span className="text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line">
                {zoneTables.length} table{zoneTables.length !== 1 ? 's' : ''}
              </span>
              <div className="ml-auto hidden sm:flex gap-2.5 text-ui-sm text-ink-muted">
                <span><b className="text-ink-soft">{vac}</b> vacant</span>
                <span><b className="text-ink-soft">{occ}</b> occupied</span>
              </div>
            </div>

            {sections.map(section => {
              const sectionTables = zoneTables.filter(t => getSection(t) === section);
              return (
                <div key={section} className="mb-3.5 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-ui font-bold text-ink-soft">{section}</h4>
                    <span className="text-micro text-ink-muted">
                      {sectionTables.length} table{sectionTables.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-tiles gap-tiles">
                    {sectionTables.map(table => {
                      const rawStatus = table.status?.toLowerCase().trim();
                      const statusKey = rawStatus === 'available' ? 'vacant' : rawStatus;
                      const isVacant = statusKey === 'vacant';
                      const config = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;
                      const canSelect = isVacant || config.clickable;
                      const orderInfo = tableOrders[table.id];
                      const hasViewableOrder = (statusKey === 'occupied' || statusKey === 'served') && orderInfo;
                      const tableHasDraft = draftTableIds.includes(table.id.toString());
                      const elapsedTime = orderInfo?.created_at ? calcElapsed(orderInfo.created_at) : null;
                      const orderCount = orderInfo?.order_count || 1;
                      const totalPrice = orderInfo?.total_price
                        ? `₹${Number(orderInfo.total_price).toFixed(0)}`
                        : null;

                      const invoiceStatus = orderInfo?.invoice_status?.toLowerCase();
                      const orderStatus = orderInfo?.status?.toLowerCase();
                      const showConfirmPayment = hasViewableOrder && invoiceStatus === 'pending';
                      const showMarkServed = hasViewableOrder && orderStatus === 'ready' && !showConfirmPayment;

                      const bar = hasViewableOrder
                      ? (ORDER_STATUS_BAR[orderStatus]?.bar || 'border-t-line-strong')
                      : 'border-t-line-strong';

                      const handleCardClick = () => {
                        if (canSelect) onSelectTable(table);
                        else if (hasViewableOrder && onViewOrder) onViewOrder(table);
                      };

                      return (
                        <div
                          key={table.id}
                          className={`flex flex-col overflow-hidden ui-card ${bar}`}
                        >
                          {/* Clickable area: header + body */}
                          <div
                            onClick={handleCardClick}
                            className={canSelect || hasViewableOrder ? 'cursor-pointer' : ''}
                          >
                            {/* Header: table name + timer */}
                            <div className="flex items-center justify-between gap-4 p-2">
                              <span className="text-body-sm font-bold text-brand-dark break-words">{table.table_number}</span>

                              
                              {hasViewableOrder && (
                                <span className="text-body-sm font-bold text-brand-dark">#{orderInfo.dinein_order_id || orderInfo.id}</span>
                              )}
                              {tableHasDraft && !hasViewableOrder && (
                                <span className="ui-chip bg-state-reserved-bg text-state-reserved">Draft</span>
                              )}
                            </div>

                            {/* Body */}
                            <div className={`grid gap-0.5 px-3 pb-2.5 text-ui-sm text-ink-muted min-h-[1.75rem] ${isVacant ? '' : ''}`}>
                              {hasViewableOrder ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span><b className="text-ink-soft">Ordered -{orderCount}</b></span>
                                  {hasViewableOrder && elapsedTime && (
                                <span className="inline-flex items-center gap-1 text-micro font-bold text-ink-muted whitespace-nowrap">
                                  <Clock size={12} className="text-brand" />
                                  {elapsedTime}
                                </span>
                              )}
                                  
                                </div>
                              ) : statusKey === 'reserved' ? (
                                <span className="inline-flex items-center gap-1.5 text-ui-sm font-semibold text-state-reserved">
                                  <Lock size={14} /> Reserved
                                </span>
                              ) : isVacant ? (
                                <>
                                 
                                </>
                              ) : statusKey === 'occupied' || statusKey === 'served' ? (
                                <Eye size={18} className="text-brand" />
                              ) : (
                                <span className="text-heading-sm leading-none text-brand-soft">—</span>
                              )}
                            </div>
                          </div>

                          {/* Action strip */}
                          {showConfirmPayment && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onConfirmPayment?.(orderInfo.id, table.id);
                              }}
                              className="flex items-center justify-center gap-1 w-full py-2 bg-brand text-text-white text-micro font-bold tracking-wide hover:bg-brand-dark transition-colors"
                            >
                              <Check size={13} />
                              CONFIRM PAYMENT
                            </button>
                          )}

                          {showMarkServed && (
                            <button
                              onClick={e => { e.stopPropagation(); onMarkAsServed?.(orderInfo.id, table.id); }}
                              className="w-full py-2 bg-brand text-text-white text-micro font-bold tracking-wide hover:bg-brand-dark transition-colors"
                            >
                              MARK AS SERVED
                            </button>
                          )}

                          {/* Footer: PRINT / DELETE */}
                          {hasViewableOrder && (
                            <div className="grid grid-cols-3 mt-auto border-t border-line-soft text-micro font-bold tracking-wide">
                              <button
                                className="flex items-center justify-center gap-1 py-2 bg-canvas/40 text-brand-dark hover:bg-brand-light transition-colors"
                                onClick={e => { e.stopPropagation(); onPrintBill?.(orderInfo.id, table.id); }}
                                title="Print Bill"
                              >
                                <Printer size={12} />
                              </button>
                              <span className="flex items-center justify-center py-2 border-l border-line-soft text-ui font-bold text-brand-dark">{totalPrice}</span>
                              <button
                                className="flex items-center justify-center gap-1 py-2 bg-canvas/40 text-brand-dark border-l border-line-soft hover:bg-brand-soft transition-colors"
                                onClick={e => { e.stopPropagation(); onCancelOrder?.(orderInfo.id, table.id); }}
                                title="Cancel Order"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      {orderMode === 'takeaway' && (
        <section className="ui-panel text-center py-10 text-ui text-ink-muted">
          Takeaway selected. Opening menu…
        </section>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TakeawayOrdersModal — today's takeaway orders picker
// ─────────────────────────────────────────────────────────────────────────────

export const TakeawayOrdersModal = ({ isOpen, onClose, clientId, token, takeawayTableIds, onSelectOrder }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchTodayOrders = async () => {
      setLoading(true);
      try {
        const r = await axios.get(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const all = r.data?.data || [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const takeawayOnly = all.filter(o =>
          takeawayTableIds.includes(String(o.table_id)) &&
          !['completed', 'draft'].includes(o.status?.toLowerCase())
        );
        
        const latestDay = takeawayOnly
          .map(o => o.business_day_start)
          .filter(Boolean)
          .sort()
          .pop();
        
        const todayTakeaway = takeawayOnly
          .filter(o => !latestDay || o.business_day_start === latestDay)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setOrders(todayTakeaway);
      } catch (err) {
        console.error('TakeawayOrdersModal fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTodayOrders();
  }, [isOpen, clientId, token, takeawayTableIds]);

  if (!isOpen) return null;

  const statusStyle = (s) => ORDER_STATUS_BAR[s?.toLowerCase()]?.bar || 'border-t-line-strong';

  const calcElapsed = (createdAt) => {
    if (!createdAt) return '';
    const diff = Date.now() - parseISTTimestamp(createdAt);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m} min `;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h} hr ` : `${Math.floor(h / 24)} day `;
  };

  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-md max-h-[80vh] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Takeaway orders">
        {/* Header */}
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <div>
            <h2 className="text-panel-title text-brand-dark">Today's Takeaway Orders</h2>
            <p className="text-micro text-ink-muted mt-0.5">Select an order to add more items</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-canvas px-modal py-card space-y-item-sm">
          {loading && (
            <p className="text-ui text-center text-ink-muted py-6">Loading…</p>
          )}
          {!loading && orders.length === 0 && (
            <p className="text-ui text-center text-ink-muted py-6">No takeaway orders today yet.</p>
          )}
          {!loading && orders.map(order => (
            <button
              key={order.id}
              onClick={() => { onSelectOrder(order); onClose(); }}
              className={`w-full text-left p-3 rounded-panel border border-line border-t-bar ${statusStyle(order.status)} bg-surface shadow-panel hover:shadow-panel-hover transition-shadow`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-ui font-bold text-brand-dark font-mono">
                    #{order.dinein_order_id || order.id}
                  </span>
                  <ItemStatusBadge status={order.status?.toLowerCase()} />
                </div>
                <span className="text-ui font-bold text-brand-dark">
                  ₹{Number(order.total_price || 0).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-ui-sm text-ink-muted">
                <span>{(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} className="text-brand" />
                  {calcElapsed(order.created_at)}
                </span>
              </div>
              {(order.items || []).length > 0 && (
                <p className="mt-1 text-ui-sm text-ink-muted truncate">
                  {order.items.slice(0, 3).map(i => i.item_name).join(', ')}
                  {order.items.length > 3 ? ` +${order.items.length - 3} more` : ''}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Footer — new order option */}
        <div className="px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            onClick={() => { onSelectOrder(null); onClose(); }}
            className="w-full h-control rounded-button-sm border-2 border-dashed border-brand-line bg-surface text-brand-dark text-ui font-semibold hover:bg-brand-light transition-colors"
          >
            + Start a new takeaway order
          </button>
        </div>
      </div>
    </div>
  );
};
export const StockConfirmModal = ({ pending, onCancel, onConfirmed }) => {
  if (!pending) return null;
  const { item } = pending;
  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-modal max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Stock alert">
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h2 className="text-panel-title text-brand-dark">Stock Alert</h2>
          <button onClick={onCancel} aria-label="Close" className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-modal py-card">
          <p className="text-ui text-brand-dark font-bold mb-1">{item?.name}</p>
          <p className="text-ui text-ink-muted">Availability reached zero. Do you still want to proceed?</p>
        </div>
        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button onClick={onCancel} className="ui-btn">Cancel</button>
          <button onClick={onConfirmed} className="ui-btn ui-btn-add">Proceed</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = jwtDecode(token);
    return payload.user_id || payload.sub || null;
  } catch {
    return null;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Draft helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function readDraft(tableId, clientId, token) {
  try {
    const r = await axios.get(
      `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const allOrders = r.data?.data || [];
    return allOrders.find(
      o => o.status === 'draft' && String(o.table_id) === String(tableId)
    ) || null;
  } catch {
    return null;
  }
}

export async function writeDraft(tableId, cart, clientId, token, customerDetails = {}) {
  try {
    const existing = await readDraft(tableId, clientId, token);
    if (existing) {
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: existing.id, status: 'cancelled' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    // Only send parent (non-addon) items in the draft — addons are stored
    // as metadata on the parent via parent_item_key so they can be restored
    const parentItems = cart.filter(i => !i.is_addon);
    const total = parentItems.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);

    await axios.post(
      `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
      {
        client_id: clientId,
        table_id: Number(tableId),
        price: total,
        gst: 0,
        cst: 0,
        total_price: total,
        status: 'draft',
        items: parentItems.map(i => ({
          item_id: i.id,
          item_name: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: (i.unit_price || 0) * i.quantity,
          status: 'draft',
          slug: i.slug || '',
          frontend_unique_key: i.frontend_unique_key,
          // Store linked addon IDs so we can restore them on re-open
          line_item_id: cart
            .filter(a => a.is_addon && a.parent_item_key === i.frontend_unique_key)
            .map(a => a.id),
        })),
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch (err) {
    console.error('writeDraft failed:', err);
    return false;
  }
}

export async function deleteDraftFromDB(tableId, clientId, token) {
  try {
    const existing = await readDraft(tableId, clientId, token);
    if (!existing) return;
    await axios.post(
      `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
      { id: existing.id, status: 'cancelled' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (err) {
    console.warn('deleteDraft warning:', err?.response?.data || err.message);
  }
}

export function getDraftTableIdsFromOrders(allOrders) {
  return (allOrders || [])
    .filter(o => o.status === 'draft')
    .map(o => String(o.table_id));
}

export async function upsertBillingDocumentForCustomer({
  clientId, token, orderId, tableRef, customerDetails, orderSubtotal = 0,
}) {
  try {
    const existingRes = await axios.get(
      `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
      { headers: { Authorization: `Bearer ${token}` }, params: { client_id: clientId } }
    );
    const existing = (existingRes.data?.data || [])
      .find(d => d.order_id?.toString() === orderId.toString());

    if (existing) {
      // Just refresh customer info — never touch payment_status/status/document_number
      await axios.post(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/update_document`,
        {
          id: existing.id,
          client_id: clientId,
          customer_id: customerDetails.customer_id || '',
          contact_email: customerDetails.contact_email || '',
          contact_phone: customerDetails.contact_phone || '',
          shipping_address: customerDetails.shipping_address || '',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return existing.id;
    }

    // No existing doc — create as before
    const payload = {
      client_id: clientId,
      document_type: 'Invoice',
      document_date: new Date().toISOString(),
      order_id: orderId.toString(),
      reference_number: tableRef || `Order ${orderId}`,
      subtotal: orderSubtotal,
      tax_amount: 0,
      tax_rate: 18,
      discount_amount: 0,
      discount: 0,
      total_amount: orderSubtotal,
      payment_status: 'Pending',
      status: 'Draft',
      customer_id: customerDetails.customer_id || '',
      contact_email: customerDetails.contact_email || '',
      contact_phone: customerDetails.contact_phone || '',
      shipping_address: customerDetails.shipping_address || ''
    };

    const res = await axios.post(
      `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/create_document`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res?.data?.data?.id ?? null;
  } catch (err) {
    console.warn('[upsertBillingDocumentForCustomer] failed:', err?.response?.data || err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// printKOT
//
// FIX: Items store category_name (e.g. "Juices") in category_id field instead
// of the actual DB category ID (e.g. "juices_veg"). We resolve the real ID by
// looking up the category by name in categoriesFlat before walking ancestors.
// ─────────────────────────────────────────────────────────────────────────────

export const printKOT = ({ counterTree, categoriesFlat, itemsToPrint, meta }) => {

  // Build a name→id map from categoriesFlat so we can resolve category names
  // that items store in their category_id field
  const categoryNameToId = {};
  categoriesFlat.forEach(c => {
    if (c.name) categoryNameToId[c.name.trim().toLowerCase()] = c.id;
  });

  // Resolve the real category ID for an item, handling both actual IDs and
  // category names stored in the category_id field
  const resolveRealCategoryId = (rawCategoryId) => {
    if (!rawCategoryId) return null;
    // Check if it already exists as a real category ID
    const directMatch = categoriesFlat.find(c => c.id === rawCategoryId);
    if (directMatch) return rawCategoryId;
    // Otherwise treat it as a category name and look up the ID
    const nameKey = String(rawCategoryId).trim().toLowerCase();
    return categoryNameToId[nameKey] || null;
  };

  // Walk from a category ID up through all ancestor IDs (inclusive)
  const getCategoryAncestors = (categoryId) => {
    const ancestors = new Set();
    let cur = categoryId;
    const visited = new Set();
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      ancestors.add(cur);
      const cat = categoriesFlat.find(c => c.id === cur);
      cur = cat?.parentId || null;
    }
    return ancestors;
  };

  // Map counter id → set of assigned sub-category IDs
  const counterCategoryMap = {};
  counterTree.forEach(counter => {
    counterCategoryMap[counter.id] = new Set(
      (counter.subCategories || []).map(sc => sc.id)
    );
  });

  // Find which counter an item belongs to by resolving its real category ID
  // first, then walking ancestors to match against counter assignments
  const findCounterForItem = (item) => {
    // Resolve the actual category ID (item.category_id may be a name)
    const realCategoryId = resolveRealCategoryId(item.category_id || item.category);
    if (!realCategoryId) return null;

    const ancestors = getCategoryAncestors(realCategoryId);
    for (const counter of counterTree) {
      const assigned = counterCategoryMap[counter.id];
      for (const catId of assigned) {
        if (ancestors.has(catId)) return counter;
      }
    }
    return null;
  };

  // Build addon map keyed by parent's frontend_unique_key
  const addonsByParentKey = {};
  itemsToPrint.forEach(item => {
    if (item.is_addon && item.parent_item_key) {
      if (!addonsByParentKey[item.parent_item_key]) {
        addonsByParentKey[item.parent_item_key] = [];
      }
      addonsByParentKey[item.parent_item_key].push(item);
    }
  });

  // Only route parent / standalone items to counters
  const parentItems = itemsToPrint.filter(item => !item.is_addon);

  const groups = {};
  parentItems.forEach(item => {
    const counter = findCounterForItem(item);
    const key = counter ? counter.id : '__unassigned__';
    const name = counter ? counter.name : 'General Kitchen';
    if (!groups[key]) groups[key] = { counterName: name, items: [] };
    groups[key].items.push({
      ...item,
      linkedAddons: addonsByParentKey[item.frontend_unique_key] || [],
    });
  });

  const groupEntries = Object.entries(groups);
  if (groupEntries.length === 0) {
    toast.warn('No items to print KOT for.');
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString();

  const slipHtml = groupEntries.map(([, group]) => {
    const rows = group.items.map(item => {
      const price = Number(item.unit_price) || 0;
      const mainRow = `
        <tr>
          <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;font-weight:bold;">
            ${item.name}
          </td>
          <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;text-align:center;font-weight:bold;">
            ${item.quantity}
          </td>
          <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:12px;text-align:right;">
            ₹${price.toFixed(2)}
          </td>
          ${item.note
          ? `<td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:11px;color:#555;font-style:italic;">${item.note}</td>`
          : '<td></td>'}
        </tr>
      `;
      const addonRows = (item.linkedAddons || []).map(addon => {
        const aPrice = Number(addon.unit_price) || 0;
        return `
        <tr>
          <td style="padding:2px 2px 2px 16px;border-bottom:1px dashed #eee;font-size:11px;color:#555;">
            ↳ ${addon.name}
          </td>
          <td style="padding:2px 2px;border-bottom:1px dashed #eee;font-size:11px;text-align:center;color:#555;">
            ${addon.quantity}
          </td>
          <td style="padding:2px 2px;border-bottom:1px dashed #eee;font-size:11px;text-align:right;color:#555;">
            ₹${aPrice.toFixed(2)}
          </td>
          <td></td>
        </tr>
      `}).join('');
      return mainRow + addonRows;
    }).join('');

    return `
      <div class="kot-slip">
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;">
          <div style="font-size:16px;font-weight:bold;letter-spacing:1px;">KOT</div>
          <div style="font-size:13px;font-weight:bold;margin-top:2px;">Counter: ${group.counterName}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-bottom:4px;">
          <span>${meta.orderMode === 'takeaway' ? '🛍 Takeaway' : `Table: ${meta.tableNumber}`}</span>
          <span>${dateStr} ${timeStr}</span>
        </div>
        ${meta.dineinOrderId
        ? `<div style="font-size:12px;font-weight:bold;margin-bottom:6px;color:#333;">Order #${meta.dineinOrderId}</div>`
        : ''}
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #000;">
              <th style="text-align:left;font-size:12px;padding:3px 2px;">Item</th>
              <th style="text-align:center;font-size:12px;padding:3px 2px;">Qty</th>
              <th style="text-align:left;font-size:12px;padding:3px 2px;">Note</th>
              <th style="text-align:right;font-size:12px;padding:3px 2px;">Price</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align:center;margin-top:10px;font-size:11px;color:#888;">— End of KOT —</div>
      </div>
    `;
  }).join('<div class="page-break"></div>');

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    toast.error('Popup blocked. Please allow popups to print KOT.');
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>KOT</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 80mm auto; margin: 0; }
      body { font-family: 'Courier New', monospace; background: #fff; }
      .kot-slip { width: 72mm; padding: 6px 8px; margin: 0 auto; }
      .page-break { page-break-after: always; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .kot-slip { page-break-inside: avoid; }
        .page-break { page-break-after: always; height: 0; }
      }
    </style></head><body>
    ${slipHtml}
    <script>
      window.onload = function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      };
    <\/script>
    </body></html>
  `);
  printWindow.document.close();
};