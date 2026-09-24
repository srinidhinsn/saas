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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Transfer Table</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-4 max-h-72 overflow-y-auto">
          {vacantTables.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No vacant tables available.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {vacantTables.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedNewTable(t)}
                  className={`py-3 rounded-lg border-2 text-sm font-bold transition
                    ${selectedNewTable?.id === t.id
                      ? 'border-action-primary bg-action-primary/10 text-action-primary'
                      : 'border-gray-200 hover:border-action-primary text-gray-700'}`}
                >
                  {t.table_number}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (selectedNewTable) { onConfirm(selectedNewTable); onClose(); } }}
            disabled={!selectedNewTable}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm text-white transition
              ${selectedNewTable ? 'bg-action-primary hover:bg-action-danger' : 'bg-gray-300 cursor-not-allowed'}`}
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
    pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending' },
    preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Preparing' },
    ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
    served: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Served' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-400', label: 'Cancelled' },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: status || '—' };

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-600">Cancel Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            The order will be marked as <span className="font-semibold text-red-600">cancelled</span> and kept for records. Select a reason:
          </p>
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
            {ORDER_CANCEL_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`px-2 py-2 rounded-lg text-xs font-medium border text-left transition
                  ${reason === r
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          )}
        </div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Go Back
          </button>
          <button
            disabled={!reason || (reason === 'Other' && !customReason.trim())}
            onClick={() => { onConfirm(effectiveReason); onClose(); }}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm text-white transition
              ${reason && !(reason === 'Other' && !customReason.trim())
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-300 cursor-not-allowed'}`}
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
  const typeColor = isServed ? 'text-red-600' : 'text-orange-600';
  const typeBg = isServed ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
  const buttonColor = isServed ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className={`text-lg font-bold ${typeColor}`}>Remove Item</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm text-gray-700 font-semibold">{item.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Ordered quantity: <span className="font-semibold">{maxQty}</span>
            </p>
          </div>

          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${typeBg} ${typeColor}`}>
            <span className="w-2 h-2 rounded-full bg-current inline-block" />
            {typeLabel} — {isServed
              ? 'Item was already served. Stock will be reversed.'
              : 'Item not yet served. No stock deduction.'}
          </div>

          {maxQty > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">How many to remove?</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRemoveQty(q => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold"
                >−</button>
                <span className="w-10 text-center text-lg font-bold text-gray-800">{removeQty}</span>
                <button
                  onClick={() => setRemoveQty(q => Math.min(maxQty, q + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-lg font-bold"
                >+</button>
                <span className="text-xs text-gray-400 ml-1">of {maxQty}</span>
                <button
                  onClick={() => setRemoveQty(maxQty)}
                  className="ml-auto text-xs text-red-500 underline font-semibold"
                >Remove all</button>
              </div>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full transition-all"
                  style={{ width: `${(removeQty / maxQty) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Reason</p>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {reasonList.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border text-left transition
                    ${reason === r
                      ? isServed
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
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
                className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            )}
          </div>
        </div>

        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
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
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm text-white transition
              ${reason && !(reason === 'Other' && !customReason.trim())
                ? buttonColor
                : 'bg-gray-300 cursor-not-allowed'}`}
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
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-default bg-bg-tertiary shadow-sm">
      <User size={15} className="text-text-secondary shrink-0" />
      <input
        value={value.customer_id}
        onChange={e => onChange({ ...value, customer_id: e.target.value })}
        placeholder="Customer name / ID (optional)"
        className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder-text-secondary text-text-primary"
      />
      <div className="w-px h-5 bg-border-default shrink-0" />
      <Phone size={15} className="text-text-secondary shrink-0" />
      <input
        value={value.contact_phone}
        onChange={e => onChange({ ...value, contact_phone: e.target.value })}
        placeholder="Phone (optional)"
        className="w-32 text-sm bg-transparent outline-none placeholder-text-secondary text-text-primary"
        inputMode="tel"
      />
    </div>
  );
};
export const AddressSelectPanel = ({ addresses, selectedAddressId, setSelectedAddressId }) => {
  if (!addresses || addresses.length === 0) {
    return (
      <div className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-xs text-red-600">
        No saved address found for this customer.
      </div>
    );
  }
  return (
    <div className="px-3 py-2 rounded-xl border border-border-default bg-bg-tertiary shadow-sm">
      <select
        value={selectedAddressId}
        onChange={e => setSelectedAddressId(e.target.value)}
        className="w-full text-sm px-2 py-1.5 rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
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
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left shadow-sm transition
        ${isComplete ? 'border-purple-200 bg-purple-50 hover:bg-purple-100' : 'border-red-300 bg-red-50 hover:bg-red-100'}`}
    >
      <MapPin size={16} className={isComplete ? 'text-purple-600 shrink-0' : 'text-red-500 shrink-0'} />
      <div className="flex-1 min-w-0">
        {isComplete ? (
          <>
            <div className="text-xs font-semibold text-purple-700 truncate">
               {value.contact_phone}
            </div>
            <div className="text-xs text-purple-600 truncate">{value.shipping_address}</div>
          </>
        ) : (
          <div className="text-xs font-semibold text-red-600">Tap to add delivery details</div>
        )}
      </div>
      <span className="text-xs font-semibold text-purple-500 shrink-0">Edit</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Truck size={18} className="text-purple-600" />
            Delivery Details
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3 max-h-[65vh] overflow-y-auto">
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
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Phone <span className="text-red-500">*</span>
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
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
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
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Delivery Address <span className="text-red-500">*</span>
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

        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            disabled={!canSave}
            className={`flex-1 py-2.5 rounded-lg font-bold text-sm text-white transition
              ${canSave ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'}`}
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

export const TablePaymentConfirmModal = ({ isOpen, orderId, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-green-700">Confirm Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600">
            Mark order <span className="font-semibold">#{orderId}</span> as paid and free the table?
          </p>
        </div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(orderId); onClose(); }}
            className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-green-600 hover:bg-green-700 text-white"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg max-w-lg w-full bg-bg-primary max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-2 shrink-0">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">{mainItem?.name}</h3>
        <p className="mb-4 text-text-secondary">Select add-ons:</p>
        <div className="relative mt-3">
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
    <input
      value={addonSearch}
      onChange={e => setAddonSearch(e.target.value)}
      placeholder="Search add-ons..."
      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
    />
  </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2">
  {filteredLineItems.length === 0 ? (
    <p className="text-sm text-text-secondary text-center py-6">No add-ons match "{addonSearch}"</p>
  ) : (
    filteredLineItems.map(item => (
      <div
        key={item.id}
        onClick={() => toggleAddon(item.id)}
        className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all
          ${selectedAddons.includes(item.id)
            ? 'bg-action-primary/10 border-2 border-action-primary'
            : 'bg-bg-tertiary border border-border-default hover:border-action-primary/50'}`}
      >
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
              ${selectedAddons.includes(item.id)
                ? 'bg-action-primary border-action-primary'
                : 'border-gray-300'}`}
          >
            {selectedAddons.includes(item.id) && <Check size={14} className="text-white" />}
          </div>
          <span className="text-text-primary font-medium">{item.name}</span>
        </div>
        <span className="font-semibold text-action-primary">₹{item.unit_price}</span>
      </div>
    ))
  )}
</div>

        <div className="flex gap-3 px-6 py-4 border-t border-border-default shrink-0 bg-bg-primary">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border-default bg-bg-tertiary text-text-primary hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onAddMainOnly}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
          >
            Main Only
          </button>
          <button
            onClick={() => onAddWithSelectedAddons(selectedAddons)}
            disabled={selectedAddons.length === 0}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors
              ${selectedAddons.length > 0
                ? 'bg-action-primary text-white hover:bg-action-danger'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="rounded-2xl w-full max-w-md bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{comboItem.name}</h3>
            {comboItem.description && (
              <p className="text-xs text-violet-200 mt-0.5">{comboItem.description}</p>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-3 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-violet-700">₹{Number(comboItem.unit_price).toFixed(0)}</span>
            {savings > 0 && (
              <span className="ml-2 text-xs text-gray-400 line-through">₹{aLaCarteTotal.toFixed(0)}</span>
            )}
          </div>
          {savings > 0 && (
            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Save ₹{savings.toFixed(0)}
            </span>
          )}
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            What's included ({comboComponents.length} items)
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {comboComponents.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No component details available</p>
            ) : (
              comboComponents.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-violet-50 border border-violet-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{c.name}</span>
                  </div>
                  <span className="text-xs text-violet-600 font-semibold">₹{Number(c.unit_price).toFixed(0)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { onAddCombo(); onClose(); }}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-700 text-white transition-colors"
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
      <div className="flex items-start gap-2 p-3 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
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
            <h4 className="text-sm font-semibold truncate text-gray-800">{main.name}</h4>
            <p className="text-xs font-bold text-action-primary">
            ₹{(main.unit_price * (1 - (Number(main.discount) || 0) / 100)).toFixed(2)}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {main.batch_label && main.batch_label !== activeDineinOrderId && (
                <span className="text-xs text-orange-500 font-mono font-semibold">
                  #{main.batch_label}
                </span>
              )}
              {main.status && <ItemStatusBadge status={main.status} />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-center">
          <span className="text-sm font-semibold text-gray-500">×{main.quantity}</span>
          <button
            onClick={() => onRequestDelete && onRequestDelete(main)}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Remove item"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {addons.map(addon => (
        <div
          key={addon.frontend_unique_key || addon.id}
          className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-blue-50/50"
        >
          <span className="text-xs text-blue-600">↳</span>
          <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
          <span className="text-xs font-semibold text-blue-600">
          ₹{(addon.unit_price * (1 - (Number(addon.discount) || 0) / 100)).toFixed(2)}
          </span>
          <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
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
      <div className="flex items-center gap-2 p-3 rounded-xl border bg-orange-50 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
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
            <h4 className="text-sm font-semibold truncate text-gray-800">{main.name}</h4>
            <p className="text-xs font-bold text-action-primary">
            ₹{(main.unit_price * (1 - (Number(main.discount) || 0) / 100)).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateQuantity(main.id, -1, main.frontend_unique_key)}
            className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
          >
            <Minus size={14} />
          </button>
          <span className="w-6 text-center text-sm font-semibold">{main.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(main.id, 1, main.frontend_unique_key)}
            className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          onClick={() => onRemove(main.id, main.frontend_unique_key)}
          className="text-action-primary hover:text-red-700"
        >
          <X size={16} />
        </button>
      </div>

      {addons.map(addon => (
        <div
          key={addon.frontend_unique_key}
          className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-orange-100/50"
        >
          <span className="text-xs text-orange-600">↳</span>
          <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
          <span className="text-xs font-semibold text-orange-600">
          ₹{(addon.unit_price * (1 - (Number(addon.discount) || 0) / 100)).toFixed(2)}
          </span>
          <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TableReservation — floor view
// ─────────────────────────────────────────────────────────────────────────────

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
    if (m === 1) return '1 min ago';
    if (m < 60) return `${m} mins ago`;
    if (h === 1) return '1 hr ago';
    if (h < 24) return `${h} hrs ago`;
    if (d === 1) return '1 day ago';
    return `${d} days ago`;
  };

  const getOrderStatusStyle = (status) => {
    const map = {
      pending: 'bg-orange-100 text-orange-700',
      preparing: 'bg-blue-100 text-blue-700',
      ready: 'bg-green-100 text-green-700',
      served: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-4 bg-bg-primary overflow-y-auto h-[calc(100vh-4rem)]">

      {/* ── Filter bar ── */}
      <div className="mb-3 sticky top-0 z-10 bg-bg-primary">
        <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border-default bg-bg-tertiary">
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl">
            <button
              onClick={() => { setSelectedSections([]); setSelectedZones([]); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition
                ${selectedSections.length === 0 && selectedZones.length === 0
                  ? 'bg-action-primary text-white'
                  : 'bg-white text-text-secondary hover:bg-gray-100'}`}
            >
              All
            </button>
            <div className="w-px bg-border-default mx-1" />
            {sectionsFromDB.map(sec => (
              <button
                key={sec}
                onClick={() => toggleFilter(sec, setSelectedSections)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition
                  ${selectedSections.includes(sec)
                    ? 'bg-action-primary text-white'
                    : 'bg-white text-text-secondary hover:bg-gray-100'}`}
              >
                {sec}
              </button>
            ))}
            <div className="w-px bg-border-default mx-1" />
            {/* {zonesFromDB.map(zone => (
              <button
                key={zone}
                onClick={() => toggleFilter(zone, setSelectedZones)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition
                  ${selectedZones.includes(zone)
                    ? 'bg-action-primary text-white'
                    : 'bg-white text-text-secondary hover:bg-gray-100'}`}
              >
                {zone}
              </button>
            ))} */}
          </div>

          {/* Dine-in / Takeaway toggle */}
          <div className="ml-auto flex bg-bg-primary border-2 rounded-full border-action-primary p-1 shadow-sm">
            {hasDinein && (
            <button
              onClick={onSelectDineIn}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all
                ${orderMode === 'dinein'
                  ? 'bg-action-primary text-text-white shadow'
                  : 'text-text-secondary hover:bg-gray-100'}`}
            >
              Dine In
            </button>
            )}
            {hasWalkin && (
            <button
    onClick={onSelectWalkIn}
    className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1
      ${orderMode === 'walkin'
        ? 'bg-teal-500 text-white shadow'
        : 'text-gray-600 hover:bg-gray-100'}`}
  >
    <User size={12} /> Walk In
  </button>
            )}
            {hasTakeaway && (
            <button
              onClick={onSelectTakeaway}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1
                ${orderMode === 'takeaway'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Package size={12} /> Takeaway
            </button>
            )}
            {hasDelivery && (
   
            <button
    onClick={onSelectDelivery}
    className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1
      ${orderMode === 'delivery'
        ? 'bg-purple-500 text-white shadow'
        : 'text-gray-600 hover:bg-gray-100'}`}
  >
    <Truck size={12} /> Delivery
  </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table grid ── */}
      {orderMode === 'dinein' && visibleZones.map(zone => {
        const sections = getSectionsByZone(zone);
        return (
          <div key={zone} className="mb-10">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{zone}</h3>
            {sections.map(section => (
              <div key={section} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-200">
                    {section}
                  </span>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5">
                  {filteredTables
                    .filter(t => getZone(t) === zone && getSection(t) === section)
                    .map(table => {
                      const statusKey = table.status?.toLowerCase();
                      const config = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;
                      const orderInfo = tableOrders[table.id];
                      const hasViewableOrder = (statusKey === 'occupied' || statusKey === 'served') && orderInfo;
                      const tableHasDraft = draftTableIds.includes(table.id.toString());
                      const elapsedTime = orderInfo?.created_at ? calcElapsed(orderInfo.created_at) : null;
                      const orderCount = orderInfo?.order_count || 1;
                      const totalPrice = orderInfo?.total_price
                        ? `₹${Number(orderInfo.total_price).toFixed(0)}`
                        : null;

                      const invoiceStatus = orderInfo?.invoice_status?.toLowerCase();
                      const showConfirmPayment = hasViewableOrder && invoiceStatus === 'pending';

                      const handleCardClick = () => {
                        if (config.clickable) onSelectTable(table);
                        else if (hasViewableOrder && onViewOrder) onViewOrder(table);
                      };

                      return (
                        <div
                          key={table.id}
                          className="rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition bg-white"
                        >
                          <div
                            onClick={handleCardClick}
                            className={config.clickable || hasViewableOrder ? 'cursor-pointer' : ''}
                          >
                            {/* Card header */}
                            <div className="flex justify-between items-center px-3 py-2 bg-action-primary text-white">
                              <span className="font-bold text-lg tracking-wide">{table.table_number}</span>
                              {tableHasDraft && !hasViewableOrder && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-yellow-300 text-yellow-900">
                                  DRAFT
                                </span>
                              )}
                              {hasViewableOrder && (
                                <>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getOrderStatusStyle(orderInfo.status)}`}>
                                    {orderInfo.status?.toUpperCase()}
                                  </span>
                                  <span className="text-xl opacity-80 font-bold">
                                    #{orderInfo.dinein_order_id || orderInfo.id}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Card body */}
                            <div
                              className={`p-3 flex items-center justify-between gap-2
                                ${statusKey === 'occupied' ? 'text-blue-600 bg-blue-50'
                                  : statusKey === 'served' ? 'text-purple-600 bg-purple-50'
                                    : statusKey === 'reserved' ? 'text-yellow-600 bg-yellow-50'
                                      : 'text-green-600 bg-green-50'}`}
                            >
                              {statusKey === 'vacant' && <span className="text-2xl text-green-400">—</span>}
                              {(statusKey === 'occupied' || statusKey === 'served') && <Eye size={22} />}
                              {statusKey === 'reserved' && <Lock size={22} />}

                              {hasViewableOrder && (
                                <div className="flex flex-col items-center flex-1">
                                  <span className="text-xs font-bold text-gray-700">
                                    {orderCount} time ordered
                                  </span>
                                  {totalPrice && (
                                    <span className="text-sm font-bold text-action-primary">{totalPrice}</span>
                                  )}
                                </div>
                              )}

                              {hasViewableOrder && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={e => { e.stopPropagation(); onPrintBill?.(orderInfo.id, table.id); }}
                                    className="text-yellow-600 hover:scale-110 transition-transform"
                                    title="Print Bill"
                                  >
                                    <Printer size={22} />
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); onCancelOrder?.(orderInfo.id, table.id); }}
                                    className="text-red-600 hover:scale-110 transition-transform"
                                    title="Cancel Order"
                                  >
                                    <Trash2 size={22} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Elapsed time */}
                            {hasViewableOrder && elapsedTime && (
                              <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                                <div className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-600">
                                  <Clock size={13} className="text-orange-500" />
                                  <span>{elapsedTime}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {showConfirmPayment && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onConfirmPayment?.(orderInfo.id, table.id);
                              }}
                              className="w-full px-4 py-2 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <Check size={14} />
                              Confirm Payment
                            </button>
                          )}

                          {hasViewableOrder && orderInfo.status === 'ready' && !showConfirmPayment && (
                            <button
                              onClick={e => { e.stopPropagation(); onMarkAsServed?.(orderInfo.id, table.id); }}
                              className="w-full px-4 py-2 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                            >
                              Mark as Served
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {orderMode === 'takeaway' && (
        <div className="text-center mt-10 text-gray-500 text-sm">
          Takeaway selected. Opening menu…
        </div>
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

        const todayTakeaway = all.filter(o => {
          if (!takeawayTableIds.includes(String(o.table_id))) return false;
          if (o.status?.toLowerCase() === 'completed') return false;
          if (o.status?.toLowerCase() === 'draft') return false;
          const created = new Date(
            typeof o.created_at === 'string'
              ? o.created_at.replace(' ', 'T').split('.')[0] + 'Z'
              : o.created_at
          );
          return created >= todayStart;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

  const statusStyle = (s) => ({
    pending: 'bg-orange-100 text-orange-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    served: 'bg-purple-100 text-purple-700',
  }[s?.toLowerCase()] || 'bg-gray-100 text-gray-600');

  const calcElapsed = (createdAt) => {
    if (!createdAt) return '';
    const diff = Date.now() - parseISTTimestamp(createdAt);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h} hr ago` : `${Math.floor(h / 24)} day ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-xl w-full max-w-md bg-white shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Today's Takeaway Orders</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select an order to add more items</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading && (
            <p className="text-sm text-center text-gray-400 py-6">Loading…</p>
          )}
          {!loading && orders.length === 0 && (
            <p className="text-sm text-center text-gray-400 py-6">No takeaway orders today yet.</p>
          )}
          {!loading && orders.map(order => (
            <button
              key={order.id}
              onClick={() => { onSelectOrder(order); onClose(); }}
              className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-action-primary hover:bg-orange-50 transition group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800 font-mono">
                    #{order.dinein_order_id || order.id}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusStyle(order.status)}`}>
                    {order.status?.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-bold text-action-primary">
                  ₹{Number(order.total_price || 0).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
                <span>{(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} className="text-orange-400" />
                  {calcElapsed(order.created_at)}
                </span>
              </div>
              {(order.items || []).length > 0 && (
                <p className="mt-1 text-xs text-gray-400 truncate">
                  {order.items.slice(0, 3).map(i => i.item_name).join(', ')}
                  {order.items.length > 3 ? ` +${order.items.length - 3} more` : ''}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Footer — new order option */}
        <div className="px-4 py-3 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={() => { onSelectOrder(null); onClose(); }}
            className="w-full py-2.5 rounded-lg border-2 border-dashed border-orange-300 text-orange-600 text-sm font-semibold hover:bg-orange-50 transition"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-xl w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-600">Stock Alert</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700 font-semibold mb-1">{item?.name}</p>
          <p className="text-sm text-gray-500">Availability reached zero. Do you still want to proceed?</p>
        </div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirmed} className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-700 text-white">Proceed</button>
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
  clientId,
  token,
  orderId,
  tableRef,
  customerDetails,
  orderSubtotal = 0,
}) {
  try {
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
      shipping_address: customerDetails.shipping_address || '', 
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