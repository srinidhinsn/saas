import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ShoppingCart, Plus, Minus, X, Check, Search,
  Users, Package, Trash2, ArrowLeft, FileText,
  Printer as PrinterIcon, Clock, Save, User, Phone,
} from 'lucide-react';
import { Eye, Lock, Printer } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import CategoryTree from '../InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';
import InvoiceModal from '../BillingServices/InvoiceModal';
import { getMenuConfig } from '../../utils/menuConfigResolver';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TABLE_STATUS_CONFIG = {
  vacant: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-action-success' },
  available: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-green-700' },
  occupied: { clickable: false, bg: 'bg-action-primary', border: 'border-action-primary', badge: 'bg-red-100 text-action-primary', viewable: true },
  served: { clickable: false, bg: 'bg-blue-50', border: 'border-blue-400', badge: 'bg-blue-100 text-blue-700', viewable: true },
  reserved: { clickable: false, bg: 'bg-yellow-50', border: 'border-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
  cancelled: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-gray-100 text-gray-500' },
};

const CANCELLATION_REASONS = [
  'Customer changed mind',
  'Wrong item ordered',
  'Duplicate entry',
  'Item out of stock',
  'Customer left',
  'Order placed by mistake',
  'Allergy concern',
  'Other',
];

const WASTAGE_REASONS = [
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

const TransferTableModal = ({ isOpen, onClose, tables, currentTableId, onConfirm }) => {
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
// Draft helpers
// ─────────────────────────────────────────────────────────────────────────────

async function readDraft(tableId, clientId, token) {
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

async function writeDraft(tableId, cart, clientId, token, customerDetails = {}) {
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

async function deleteDraftFromDB(tableId, clientId, token) {
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

function getDraftTableIdsFromOrders(allOrders) {
  return (allOrders || [])
    .filter(o => o.status === 'draft')
    .map(o => String(o.table_id));
}

async function upsertBillingDocumentForCustomer({
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
// ItemStatusBadge
// ─────────────────────────────────────────────────────────────────────────────

const ItemStatusBadge = ({ status }) => {
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

const ORDER_CANCEL_REASONS = [
  'Customer changed mind',
  'Customer left without paying',
  'Duplicate order',
  'Test / mistake order',
  'Payment issue',
  'Kitchen unable to fulfill',
  'Other',
];

const CancelOrderConfirmModal = ({ isOpen, onClose, onConfirm }) => {
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

const OldItemDeleteModal = ({ isOpen, onClose, item, onRemoveOne, onRemoveAll }) => {
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

const CustomerCapturePanel = ({ value, onChange }) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// TablePaymentConfirmModal
// ─────────────────────────────────────────────────────────────────────────────

const TablePaymentConfirmModal = ({ isOpen, orderId, onClose, onConfirm }) => {
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

const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddWithSelectedAddons, onAddMainOnly }) => {
  const [selectedAddons, setSelectedAddons] = useState([]);

  useEffect(() => {
    if (isOpen) setSelectedAddons([]);
  }, [isOpen]);

  const toggleAddon = (id) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg max-w-lg w-full p-6 bg-bg-primary max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">{mainItem?.name}</h3>
        <p className="mb-4 text-text-secondary">Select add-ons:</p>

        <div className="space-y-2 mb-6">
          {lineItems.map(item => (
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
          ))}
        </div>

        <div className="flex gap-3">
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

const ComboDetailModal = ({ isOpen, onClose, comboItem, comboComponents, onAddCombo }) => {
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
// printKOT
//
// FIX: Items store category_name (e.g. "Juices") in category_id field instead
// of the actual DB category ID (e.g. "juices_veg"). We resolve the real ID by
// looking up the category by name in categoriesFlat before walking ancestors.
// ─────────────────────────────────────────────────────────────────────────────

const printKOT = ({ counterTree, categoriesFlat, itemsToPrint, meta }) => {

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
      const mainRow = `
        <tr>
          <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;font-weight:bold;">
            ${item.name}
          </td>
          <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;text-align:center;font-weight:bold;">
            ${item.quantity}
          </td>
          ${item.note
          ? `<td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:11px;color:#555;font-style:italic;">${item.note}</td>`
          : '<td></td>'}
        </tr>
      `;
      const addonRows = (item.linkedAddons || []).map(addon => `
        <tr>
          <td style="padding:2px 2px 2px 16px;border-bottom:1px dashed #eee;font-size:11px;color:#555;">
            ↳ ${addon.name}
          </td>
          <td style="padding:2px 2px;border-bottom:1px dashed #eee;font-size:11px;text-align:center;color:#555;">
            ${addon.quantity}
          </td>
          <td></td>
        </tr>
      `).join('');
      return mainRow + addonRows;
    }).join('');

    return `
      <div class="kot-slip">
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;">
          <div style="font-size:16px;font-weight:bold;letter-spacing:1px;">KOT</div>
          <div style="font-size:13px;font-weight:bold;margin-top:2px;">Counter: ${group.counterName}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px;">
          <span>${meta.orderMode === 'takeaway' ? '🛍 Takeaway' : `Table: ${meta.tableNumber}`}</span>
          <span>${dateStr} ${timeStr}</span>
        </div>
        ${meta.dineinOrderId
        ? `<div style="font-size:11px;margin-bottom:6px;color:#555;">Order #${meta.dineinOrderId}</div>`
        : ''}
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #000;">
              <th style="text-align:left;font-size:12px;padding:3px 2px;">Item</th>
              <th style="text-align:center;font-size:12px;padding:3px 2px;">Qty</th>
              <th style="text-align:left;font-size:12px;padding:3px 2px;">Note</th>
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
      body { font-family: 'Courier New', monospace; background: #fff; }
      .kot-slip { width: 72mm; padding: 8px; margin: 0 auto; }
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

// ─────────────────────────────────────────────────────────────────────────────
// OldItemRow — previously placed items (read-only in cart)
// ─────────────────────────────────────────────────────────────────────────────

const OldItemRow = ({ group, clientId, token, activeDineinOrderId, onRequestDelete }) => {
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

const NewItemRow = ({ group, clientId, token, onUpdateQuantity, onRemove }) => {
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

const TableReservation = ({
  tables = [],
  orderMode = 'dinein',
  tableOrders = {},
  draftTableIds = [],
  onSelectTable,
  onSelectTakeaway,
  onSelectDineIn,
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
    const utc = typeof createdAt === 'string'
      ? createdAt.replace(' ', 'T').split('.')[0] + 'Z'
      : createdAt;
    const diff = Date.now() - new Date(utc).getTime();
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
            <button
              onClick={onSelectDineIn}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all
                ${orderMode === 'dinein'
                  ? 'bg-action-primary text-text-white shadow'
                  : 'text-text-secondary hover:bg-gray-100'}`}
            >
              Dine In
            </button>
            <button
              onClick={onSelectTakeaway}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1
                ${orderMode === 'takeaway'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Package size={12} /> Takeaway
            </button>
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

const TakeawayOrdersModal = ({ isOpen, onClose, clientId, token, takeawayTableIds, onSelectOrder }) => {
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
    const utc = typeof createdAt === 'string'
      ? createdAt.replace(' ', 'T').split('.')[0] + 'Z'
      : createdAt;
    const diff = Date.now() - new Date(utc).getTime();
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
// ─────────────────────────────────────────────────────────────────────────────
// TakeOrder — main component
// ─────────────────────────────────────────────────────────────────────────────

const TakeOrder = ({ clientId, token, onOrderUpdate, realm }) => {

  // ── View ──────────────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState('floor');
  const [orderMode, setOrderMode] = useState('dinein');

  // ── Remote data ───────────────────────────────────────────────────────────
  const [tables, setTables] = useState([]);
  const [tableOrders, setTableOrders] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const [dieterySubCategories, setDieterySubCategories] = useState([]);
  const [sidebarCategories, setSidebarCategories] = useState([]);
  const [counterTree, setCounterTree] = useState([]);
  const [inventoryMap, setInventoryMap] = useState({});
  const [loading, setLoading] = useState(true);

  // ── Order context ─────────────────────────────────────────────────────────
  const [selectedTable, setSelectedTable] = useState('');
  const [takeawayTables, setTakeawayTables] = useState([]);
  const [dineinTableId, setDineinTableId] = useState(null);
  const [takeawayTableId, setTakeawayTableId] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeDineinOrderId, setActiveDineinOrderId] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  // ── Cart ──────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [hasNewItems, setHasNewItems] = useState(false);
  const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const isPlacingRef = useRef(false);

  // ── Drafts ────────────────────────────────────────────────────────────────
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [draftTableIds, setDraftTableIds] = useState([]);   // for floor DRAFT badges

  const [customerDetails, setCustomerDetails] = useState({ customer_id: '', contact_phone: '' });

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [cancelOrderModal, setCancelOrderModal] = useState({ isOpen: false, orderId: null, tableId: null });
  const [tablePayConfirmModal, setTablePayConfirmModal] = useState({ isOpen: false, orderId: null, tableId: null });

  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const [selectedMainItem, setSelectedMainItem] = useState(null);
  const [lineItemsDetails, setLineItemsDetails] = useState([]);

  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [comboModalItem, setComboModalItem] = useState(null);
  const [comboModalComponents, setComboModalComponents] = useState([]);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrderData, setInvoiceOrderData] = useState(null);

  const [oldItemDeleteModal, setOldItemDeleteModal] = useState({ isOpen: false, item: null });

  const searchInputRef = useRef(null);
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;

  const [sections, setSections] = useState([]);
  const [takeawaySections, setTakeawaySections] = useState([]);
  const [zoneConfigId, setZoneConfigId] = useState(null);
  const [dietaryOptions, setDietaryOptions] = useState([]);
  const [dietaryColorMap, setDietaryColorMap] = useState({});
  const [selectedDietary, setSelectedDietary] = useState(null);
  const [stockWarning, setStockWarning] = useState(null);
  const [timingOptions, setTimingOptions] = useState([]);
  const [showTakeawayOrdersModal, setShowTakeawayOrdersModal] = useState(false);
  const menuConfig = useMemo(
    () => (clientId ? getMenuConfig(clientId) : null),
    [clientId]
  );

  const fetchZoneConfig = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const takeawayRoots =
        (import.meta.env.VITE_EASYFOOD_TAKEAWAY_TABLE_DEFAULT_ROOT || '')
          .split(',')
          .map(v => v.trim().toLowerCase())
          .filter(Boolean);

      const allSections = res.data || [];

      // Dine-in sections — exclude anything that matches takeaway roots
      const dineInSections = takeawayRoots.length > 0
        ? allSections.filter(s =>
          !takeawayRoots.some(root =>
            (s.zone || '').toLowerCase().startsWith(root) ||
            (s.section || '').toLowerCase().startsWith(root)
          )
        )
        : allSections;

      // Takeaway sections — only those matching takeaway roots
      const takeawaySectionsFiltered = takeawayRoots.length > 0
        ? allSections.filter(s =>
          takeawayRoots.some(root =>
            (s.zone || '').toLowerCase().startsWith(root) ||
            (s.section || '').toLowerCase().startsWith(root)
          )
        )
        : [];

      setSections(dineInSections);
      setTakeawaySections(takeawaySectionsFiltered);
    } catch (err) {
      console.error('Zone config fetch failed', err);
    }
  };
  const DIETARY_COLORS = ['bg-green-500', 'bg-red-500', 'bg-yellow-400', 'bg-orange-500', 'bg-purple-500', 'bg-blue-500'];

  const fetchDietaryTypes = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
        { params: { category_id: 'dietary_type' }, headers: { Authorization: `Bearer ${token}` } }
      );
      const opts = res.data?.data || [];
      setDietaryOptions(opts);
      const map = {};
      opts.forEach((opt, idx) => {
        map[opt.toLowerCase().replace(/[-_\s]/g, '')] = DIETARY_COLORS[idx % DIETARY_COLORS.length];
      });
      setDietaryColorMap(map);
    } catch (err) {
      console.error('Dietary fetch failed:', err);
    }
  };
  const fetchTimings = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
        {
          params: { category_id: 'available_timings' },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const raw = res.data?.data || [];
      const parsed = raw.map(v => {
        const match = v.match(/^(.+)\((.+)-(.+)\)$/);
        return {
          name: (match?.[1] ?? v).trim().toLowerCase(),
          start: match?.[2] ?? null,
          end: match?.[3] ?? null,
          raw: v
        };
      });
      setTimingOptions(parsed);
    } catch (err) {
      console.error('Timing fetch failed:', err);
      setTimingOptions([]);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────
  // Draft helpers
  // ─────────────────────────────────────────────────────────────────────────

  const deduplicateOrderItems = (items) => {
    const uniqueKeyToItemMap = new Map();
    const result = [];
  
    items.forEach(item => {
      // Prefer frontend_unique_key, then DB id, then warn and include as-is
      const fkey = item.frontend_unique_key || (item.id ? String(item.id) : null);
  
      if (!fkey) {
        console.warn(`Item ${item.item_id} has no unique key or DB id — included without dedup`);
        result.push({ ...item });
        return;
      }
  
      if (uniqueKeyToItemMap.has(fkey)) {
        // Same logical item appearing in multiple sub-orders — accumulate quantity
        uniqueKeyToItemMap.get(fkey).quantity += (item.quantity ?? 0);
      } else {
        const copy = { ...item };
        uniqueKeyToItemMap.set(fkey, copy);
        result.push(copy);
      }
    });
  
    return result;
  };
  const handleSaveDraft = useCallback(async () => {
    if (!selectedTable || cart.length === 0) {
      toast.warn('Nothing to save — cart is empty.');
      return;
    }
    const ok = await writeDraft(selectedTable, cart, clientId, token, customerDetails);
    if (ok) {
      const now = Date.now();
      setDraftSavedAt(now);
      await fetchTables();                  // refreshes floor DRAFT badges
      toast.success('Draft saved! You can return to this table anytime.');
    } else {
      toast.error('Failed to save draft.');
    }
  }, [selectedTable, cart, clientId, token, customerDetails]);

  // ─────────────────────────────────────────────────────────────────────────
  // Category / tree utilities
  // ─────────────────────────────────────────────────────────────────────────

  const flattenCategoryTree = (tree, level = 0, parentId = null) => {
    let flat = [];
    tree.forEach(c => {
      flat.push({
        id: c.id,
        name: c.name,
        level,
        parentId,
        hasChildren: !!(c.subCategories?.length),
      });
      if (c.subCategories?.length) {
        flat = flat.concat(flattenCategoryTree(c.subCategories, level + 1, c.id));
      }
    });
    return flat;
  };

  const getAddonCategoryId = useCallback((itemCategoryId) => {
    if (!itemCategoryId || !categoriesFlat.length) return null;

    // 1️⃣ Find root node (like "dietery")
    const rootNode = categoriesFlat.find(
      c => c.parentId === null || c.parentId === undefined
    );

    if (!rootNode) return null;

    // 2️⃣ Start from item's category
    let current = categoriesFlat.find(c => c.id === itemCategoryId);

    // 3️⃣ Climb upward until direct child of root
    while (current && current.parentId) {
      if (current.parentId === rootNode.id) {
        const slug = current.name
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, "")
          .replace(/[^a-z0-9]/g, "");

        return `addons_${slug}`;
      }

      current = categoriesFlat.find(c => c.id === current.parentId);
    }

    return null;
  }, [categoriesFlat]);

  const getCategoryAndChildrenIds = useCallback((targetId) => {
    if (!targetId || !categoriesFlat.length) return [];
    const result = new Set();
    const addWithChildren = (id) => {
      result.add(id);
      categoriesFlat
        .filter(c => c.parentId === id)
        .forEach(c => addWithChildren(c.id));
    };
    addWithChildren(targetId);
    return Array.from(result);
  }, [categoriesFlat]);

  const findCategoryNode = (tree, matcher) => {
    for (const c of tree) {
      if (
        c.id?.toLowerCase() === matcher.toLowerCase() ||
        c.name?.toLowerCase() === matcher.toLowerCase()
      ) return c;
      if (c.children?.length) {
        const f = findCategoryNode(c.children, matcher);
        if (f) return f;
      }
    }
    return null;
  };

  const getCategoriesAtLevel = (node, tgt, cur = 0) => {
    if (!node) return [];
    if (cur === tgt) return [node];
    let r = [];
    for (const ch of node.children || []) {
      r = r.concat(getCategoriesAtLevel(ch, tgt, cur + 1));
    }
    return r;
  };

  const findNodeAndChildren = (nodes, id) => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children?.length) {
        const f = findNodeAndChildren(n.children, id);
        if (f) return f;
      }
    }
    return null;
  };
  const isItemActive = useCallback((slug) => {
    if (!slug) return true;

    const doubleUnderIdx = slug.lastIndexOf('__');
    const timingSegment = doubleUnderIdx !== -1
      ? slug.slice(doubleUnderIdx + 2).toLowerCase()
      : null;

    // ✅ Explicit unavailable flag
    if (timingSegment === 'unavailable') return false;

    if (!timingOptions || timingOptions.length === 0) return true;
    if (!timingSegment || timingSegment === 'allday') return true;

    const timingKeys = timingSegment.split('+').filter(Boolean);
    if (timingKeys.length === 0) return true;

    const recognizedKeys = timingKeys.filter(key => {
      const t = timingOptions.find(o => o.name?.toLowerCase() === key);
      return t && t.start && t.end;
    });

    if (recognizedKeys.length === 0) return true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return recognizedKeys.some(key => {
      const t = timingOptions.find(o => o.name?.toLowerCase() === key);
      const [sh, sm] = t.start.split(':').map(Number);
      const [eh, em] = t.end.split(':').map(Number);
      return currentMinutes >= (sh * 60 + sm) && currentMinutes <= (eh * 60 + em);
    });
  }, [timingOptions]);
  // ─────────────────────────────────────────────────────────────────────────
  // Determine if a category is a combo category (walks ancestors)
  // ─────────────────────────────────────────────────────────────────────────

  const isComboCategoryId = useCallback((categoryId) => {
    if (!categoryId || !categoriesFlat.length) return false;
    let cur = categoryId;
    const visited = new Set();
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const cat = categoriesFlat.find(c => c.id === cur);
      if (!cat) break;
      if ((cat.name || '').toLowerCase().includes('combo')) return true;
      cur = cat.parentId ?? null;
    }
    return false;
  }, [categoriesFlat]);

  // ─────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────────────────────

  const fetchCounterTree = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category`,
        {
          params: { client_id: clientId, category_id: 'counter' },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCounterTree(res.data.data?.[0]?.subCategories || []);
    } catch (err) {
      console.error('Failed to fetch counter tree:', err);
    }
  };


  const fetchTableOrders = async (tableList) => {
    try {
      const r = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allOrders = r.data?.data || [];

      // ▼ ADD THIS ONE LINE — populates the floor DRAFT badges from server
      setDraftTableIds(getDraftTableIdsFromOrders(allOrders));

      const map = {};
      tableList.forEach(table => {
        const s = table.status?.toLowerCase();
        if (s === 'occupied' || s === 'served') {
          const o = allOrders
            .filter(o =>
              o.table_id === table.id &&
              o.status?.toLowerCase() !== 'completed' &&
              o.status?.toLowerCase() !== 'draft' &&
              o.status?.toLowerCase() !== 'cancelled'
            )
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          if (o) {
            map[table.id] = {
              id: o.id,
              dinein_order_id: o.dinein_order_id,
              status: o.status,
              created_at: o.created_at,
              order_count: o.order_count || 1,
              total_price: o.total_price || 0,
              invoice_status: o.invoice_status || null,
            };
          }
        }
      });
      setTableOrders(map);
    } catch (err) {
      console.error('Failed to fetch table orders:', err);
    }
  };

  // REMOVE the old fetchTables and REPLACE WITH:
  const fetchTables = async () => {
    const takeawayRoots =
      (import.meta.env.VITE_EASYFOOD_TAKEAWAY_TABLE_DEFAULT_ROOT || '')
        .split(',')
        .map(v => v.trim().toLowerCase());

    const res = await axios.get(
      `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const list = Array.isArray(res.data?.data)
      ? res.data.data.map(t => ({
        ...t,
        table_number: t.name || t.table_number || '-',
      }))
      : [];

    const takeaway = list.filter(t =>
      takeawayRoots.some(root =>
        (t.name || '').toLowerCase().startsWith(root)
      )
    );

    setTakeawayTables(takeaway);
    if (takeaway.length > 0) {
      setTakeawayTableId(takeaway[0].id);
    }

    list.sort((a, b) =>
      a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
    );
    setTables(list);
    await fetchTableOrders(list);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Initial data load
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !token || !menuConfig) return;
      try {
        setLoading(true);
        await Promise.all([fetchTables(), fetchCounterTree(), fetchZoneConfig(), fetchDietaryTypes(), fetchTimings()]);

        const [catRes, itemRes, invRes] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.root}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: {
                inventory_id: menuConfig.menuInventoryId,
                ...(zoneConfigId && { zone_config_id: zoneConfigId }),
              }
            }
          ),
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);

        const iMap = {};
        (invRes.data?.data || []).forEach(i => (iMap[i.id] = i));
        setInventoryMap(iMap);

        const fullTree = catRes.data.data.filter(c => c.name?.toLowerCase() !== 'all');
        const subIds = new Set();
        fullTree.forEach(c => c.subCategories?.forEach(s => subIds.add(s.id)));
        const topLevel = fullTree.filter(c => !subIds.has(c.id));
        const flatCats = flattenCategoryTree(topLevel);
        setCategoriesFlat(
          flatCats.map(c => ({
            id: c.id,
            name: (c.name || '').trim(),
            parentId: c.parentId ?? c.parent_id ?? null,
          }))
        );

        const enrichedItems = itemRes.data.data.map(item => {
          const cat = flatCats.find(c => c.id === item.category_id);
          return { ...item, category_name: cat?.name || 'Uncategorized' };
        });
        enrichedItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMenuItems(enrichedItems);

        const buildTree = () => {
          const map = new Map();
          flatCats.forEach(c =>
            map.set(c.id, {
              ...c,
              count: enrichedItems.filter(i => i.category_id === c.id).length,
              children: [],
            })
          );
          const tree = [];
          map.forEach(c => {
            if (c.parentId && map.has(c.parentId)) map.get(c.parentId).children.push(c);
            else tree.push(c);
          });
          return tree;
        };

        const categoryTree = buildTree().map(c =>
          c.id === menuConfig.root || c.name?.toLowerCase() === menuConfig.root.toLowerCase()
            ? { ...c, name: 'All Categories', count: c.children.length }
            : c
        );
        setCategories(categoryTree);
        setSidebarCategories(categoryTree);

        const rootNode = findCategoryNode(categoryTree, menuConfig.root);
        let qc = [];
        if (rootNode) {
          let l = menuConfig.level;
          while (l >= 0) {
            qc = getCategoriesAtLevel(rootNode, l);
            if (qc.length > 0) break;
            l--;
          }
        }
        setDieterySubCategories(qc);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, token, realm, menuConfig]);

  useEffect(() => {
    if (!zoneConfigId || !clientId || !token || !menuConfig) return;

    const refetchMenu = async () => {
      try {
        const itemRes = await axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              inventory_id: menuConfig.menuInventoryId,
              zone_config_id: zoneConfigId,
            }
          }
        );

        // Deduplicate: prefer base record (zone_config_id === 0) when no zone match
        const allItems = itemRes.data.data || [];
        const uniqueKeyToItemMap = new Map();
        allItems.forEach(item => {
          const existing = uniqueKeyToItemMap.get(item.id);
          if (!existing || item.zone_config_id === zoneConfigId) {
            uniqueKeyToItemMap.set(item.id, item);
          }
        });

        const enriched = Array.from(uniqueKeyToItemMap.values()).map(item => {
          const cat = categoriesFlat.find(c => c.id === item.category_id);
          return { ...item, category_name: cat?.name || 'Uncategorized' };
        });
        enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMenuItems(enriched);
      } catch (err) {
        console.error('Zone menu refetch failed:', err);
      }
    };

    refetchMenu();
  }, [zoneConfigId, clientId, token, menuConfig]);
  const getDietaryFromSlug = useCallback((item) => {
    if (!item || !dietaryOptions.length) return null;
    const normalize = (str) => (str || '').toLowerCase().replace(/[-_\s]/g, '');
    const [mainPart = ''] = (item.slug || '').split('__');
    const slugSegments = mainPart.split('_').filter(Boolean);
    const sortedOptions = [...dietaryOptions].sort(
      (a, b) => normalize(b).length - normalize(a).length
    );
    for (let i = 0; i < slugSegments.length; i++) {
      for (let j = 1; j <= 3; j++) {
        const joined = normalize(slugSegments.slice(i, i + j).join(''));
        const match = sortedOptions.find(d => normalize(d) === joined);
        if (match) return normalize(match);
      }
    }
    return null;
  }, [dietaryOptions]);
  // ─────────────────────────────────────────────────────────────────────────
  // Browser history (back button) — push initial floor state once
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    window.history.replaceState({ view: 'floor' }, '');
  }, []);

  useEffect(() => {
    const onBack = (e) => {
      if (currentView === 'order') {
        e.preventDefault();
        goToFloor();
      }
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation helpers
  // ─────────────────────────────────────────────────────────────────────────


  /**
   * goToOrderView — switches to the order view and ensures the cart panel
   * is always visible so the waiter sees items immediately.
   */
  const goToOrderView = () => {
    setCurrentView('order');
    setShowCart(true);
    window.history.pushState({ view: 'order' }, '');
  };

  /**
   * goToFloor — returns to the floor view WITHOUT clearing the cart or draft.
   * The waiter can click back to the same table and pick up right where they left off.
   */
  const goToFloor = () => {
    setCurrentView('floor');
    setShowCart(false);
    setSidebarCategories(categories);
    setSelectedCategoryId(null);
    setSearchQuery('');
    setZoneConfigId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Table / order selection
  // ─────────────────────────────────────────────────────────────────────────

  const handleTransferTable = async (newTable) => {
    if (!activeOrderId) {
      toast.error('No active order to transfer.');
      return;
    }
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const oldTableId = Number(selectedTable);
      const newTableId = newTable.id;

      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: activeOrderId, client_id: clientId, table_id: newTableId },
        { headers }
      );

      const oldTable = tables.find(t => t.id === oldTableId);
      if (oldTable) {
        await axios.post(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          { ...oldTable, id: oldTableId, status: 'vacant', table_type: String(oldTable.table_type) },
          { headers }
        );
      }

      await axios.post(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
        { ...newTable, id: newTableId, status: 'Occupied', table_type: String(newTable.table_type) },
        { headers }
      );

      setSelectedTable(newTableId.toString());
      setDineinTableId(newTableId.toString());
      await fetchTables();
      toast.success(`Transferred to Table ${newTable.table_number}`);
    } catch (err) {
      console.error('[Transfer] Failed:', err);
      toast.error('Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = async (table) => {
    const tableIdStr = table.id.toString();

    setActiveOrderId(null);
    setActiveDineinOrderId(null);
    setHasNewItems(false);
    setCurrentBatchTimestamp(null);
    setOrderMode('dinein');
    setSelectedTable(tableIdStr);
    setDineinTableId(tableIdStr);
    const matchedSection = sections.find(
      s => s.zone === table.location_zone && s.section === table.section
    );
    const resolvedZoneConfigId = matchedSection ? matchedSection.id : null;
    setZoneConfigId(resolvedZoneConfigId);
    const draft = await readDraft(tableIdStr, clientId, token);

    if (draft) {
      // Reconstruct cart from draft order items
      const restoredCart = (draft.items || []).flatMap(item => {
        const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
        const mainKey = item.frontend_unique_key || `${item.item_id}_restored_${Date.now()}`;
        const mainEntry = {
          id: Number(item.item_id),
          name: item.item_name || menuItem?.name || 'Item',
          unit_price: item.unit_price ?? menuItem?.unit_price ?? 0,
          discount: menuItem?.discount || 0,
          image_id: menuItem?.image_id,
          slug: item.slug || menuItem?.slug,
          category: menuItem?.category_name,
          category_id: menuItem?.category_id || null,
          quantity: item.quantity || 1,
          note: '',
          frontend_unique_key: mainKey,
          batch_timestamp: null,
          is_new_item: true,
          saved_sub_order: false,
          status: 'draft',
          is_addon: false,
          parent_item_key: null,
        };

        // Restore linked addons that were saved as line_item_id on the draft item
        const addonEntries = (item.line_item_id || []).map((addonId, idx) => {
          const addonMenuItem = menuItems.find(mi => Number(mi.id) === Number(addonId));
          if (!addonMenuItem) return null;
          return {
            id: Number(addonId),
            name: addonMenuItem.name || 'Addon',
            unit_price: addonMenuItem.unit_price ?? 0,
            discount: addonMenuItem.discount || 0,
            image_id: addonMenuItem.image_id,
            slug: addonMenuItem.slug,
            category: addonMenuItem.category_name,
            category_id: addonMenuItem.category_id || null,
            quantity: 1,
            note: '',
            frontend_unique_key: `${addonId}_addon_${mainKey}_${idx}`,
            batch_timestamp: null,
            is_new_item: true,
            saved_sub_order: false,
            status: 'draft',
            is_addon: true,
            parent_item_key: mainKey,
          };
        }).filter(Boolean);

        return [mainEntry, ...addonEntries];
      });

      setCart(restoredCart);
      setHasNewItems(true);
      setDraftSavedAt(Date.now());
      setShowCart(true);
      if (draft.customer_id || draft.contact_phone) {
        setCustomerDetails({
          customer_id: draft.customer_id || '',
          contact_phone: draft.contact_phone || '',
        });
      } else {
        setCustomerDetails({ customer_id: '', contact_phone: '' });
      }
      toast.info('Draft restored for this table.', { autoClose: 2000 });
    } else {
      setCart([]);
      setDraftSavedAt(null);
      setCustomerDetails({ customer_id: '', contact_phone: '' });
      setShowCart(true);
    }

    goToOrderView();
  };

  const handleTakeawaySelect = () => {
    if (!takeawayTables.length) {
      toast.error('No takeaway table configured');
      return;
    }
    setShowTakeawayOrdersModal(true);
    const tableIdStr = (takeawayTableId || takeawayTables[0].id).toString();
    setOrderMode('takeaway');
    setSelectedTable(tableIdStr);
    setActiveOrderId(null);
    setActiveDineinOrderId(null);
    setCart([]);
    setCustomerDetails({ customer_id: '', contact_phone: '' });
    setShowCart(true);

    // Set takeaway zone_config_id so correct prices are fetched
    const takeawayZoneConfigId = takeawaySections.length > 0
      ? takeawaySections[0].id
      : null;
    setZoneConfigId(takeawayZoneConfigId);

    goToOrderView();
  };
  const handleTakeawayOrderSelected = async (existingOrder) => {
    const tableIdStr = (takeawayTableId || takeawayTables[0].id).toString();
    setOrderMode('takeaway');
    setSelectedTable(tableIdStr);

    // Set takeaway zone_config_id so correct prices are fetched
    const takeawayZoneConfigId = takeawaySections.length > 0
      ? takeawaySections[0].id
      : null;
    setZoneConfigId(takeawayZoneConfigId);

    if (!existingOrder) {
      // New order
      setActiveOrderId(null);
      setActiveDineinOrderId(null);
      setCart([]);
      setHasNewItems(false);
      setCurrentBatchTimestamp(null);
      setDraftSavedAt(null);
    } else {
      // Resume existing order — reconstruct cart as old (read-only) items
      const reconstructedCart = (existingOrder.items || []).map(item => {
        const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
        return {
          id: Number(item.item_id),
          name: item.item_name || menuItem?.name || 'Unnamed Item',
          unit_price: item.unit_price || menuItem?.unit_price || 0,
          quantity: item.quantity || 1,
          note: item.note || '',
          image_id: menuItem?.image_id,
          discount: menuItem?.discount || 0,
          slug: item.slug || menuItem?.slug,
          category: menuItem?.category_name,
          category_id: menuItem?.category_id || null,
          frontend_unique_key: item.frontend_unique_key,
          batch_timestamp: null,
          is_new_item: false,
          saved_sub_order: true,
          status: item.status || 'pending',
          batch_label: item.batch_label,
          sub_order_id: item.sub_order_id,
        };
      });
      setCart(reconstructedCart);
      setActiveOrderId(existingOrder.id);
      setActiveDineinOrderId(existingOrder.dinein_order_id);
      setHasNewItems(false);
      setCurrentBatchTimestamp(null);
      setDraftSavedAt(null);
    }
    setShowCart(true);
    goToOrderView();
  };

  const handleViewOrder = async (table) => {
    if (menuItems.length === 0) {
      alert('Menu still loading...');
      return;
    }
    try {
      setLoading(true);
      const r = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allOrders = r.data?.data || [];
      const tableGroups = allOrders.filter(
        o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed'
      );
      if (tableGroups.length === 0) {
        alert('No active order');
        return;
      }
      const activeOrder = tableGroups.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )[0];

      const reconstructedCart = (activeOrder.items || []).map(item => {
        const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
        return {
          id: Number(item.item_id),
          order_item_id: item.id,
          name: item.item_name || menuItem?.name || 'Unnamed Item',
          unit_price: item.unit_price || menuItem?.unit_price || 0,
          quantity: item.quantity || 1,
          note: item.note || '',
          image_id: menuItem?.image_id,
          discount: menuItem?.discount || 0,
          slug: item.slug || menuItem?.slug,
          category: menuItem?.category_name,
          category_id: menuItem?.category_id || null,
          frontend_unique_key: item.frontend_unique_key,
          batch_timestamp: null,
          is_new_item: false,
          saved_sub_order: true,
          status: item.status || 'pending',
          batch_label: item.batch_label,
          sub_order_id: item.sub_order_id,
        };
      });

      setCart(reconstructedCart);
      setSelectedTable(table.id.toString());
      const matchedSection = sections.find(
        s => s.zone === table.location_zone && s.section === table.section
      );
      setZoneConfigId(matchedSection ? matchedSection.id : null);
      setOrderMode('dinein');
      setActiveOrderId(activeOrder.id);
      setActiveDineinOrderId(activeOrder.dinein_order_id);
      setHasNewItems(false);
      setCurrentBatchTimestamp(null);
      setDraftSavedAt(null);
      goToOrderView();
    } catch (err) {
      console.error(err);
      alert('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToTables = () => {
    // Leave cart & draft untouched — waiter can return to same table
    goToFloor();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Cart operations
  // ─────────────────────────────────────────────────────────────────────────

  const getGroupedCartItems = (items) => {
    const grouped = [];
    const processed = new Set();
    items.forEach(item => {
      const key = item.frontend_unique_key || item.id;
      if (processed.has(key)) return;
      if (!item.parent_item_key) {  // ← parent items have no parent_item_key
        const children = items.filter(i => i.parent_item_key === item.frontend_unique_key);
        grouped.push({ main: { ...item }, addons: children });
        processed.add(key);
        children.forEach(c => processed.add(c.frontend_unique_key || c.id));
      }
    });
    return grouped;
  };

  const getTotalPrice = () =>
    cart
      .filter(i => !(i.frontend_unique_key || '').startsWith('cchild_'))
      .reduce((t, i) => t + (i.unit_price || 0) * i.quantity, 0)
      .toFixed(2);

      const buildCartItem = (item, extra = {}) => {
        const ts = Date.now() + Math.random();
        const { _item_type, ...cleanExtra } = extra;

        const typePrefix = _item_type || 'main';
        const parentKey = cleanExtra.parent_item_key || '';
        const key = parentKey
          ? `${typePrefix}_${parentKey}_${item.id}_${ts}`
          : `${typePrefix}_${item.id}_${ts}`;
      
        return {
          id: Number(item.id),
          name: item.name,
          image_id: item.image_id,
          unit_price: (item.unit_price || 0) * (1 - (Number(item.discount) || 0) / 100),
          slug: item.slug,
          category: item.category_name,
          category_id: item.category_id || null,
          quantity: 1,
          note: '',
          frontend_unique_key: key,
          is_new_item: true,
          saved_sub_order: false,
          is_addon: false,
          parent_item_key: null,
          ...cleanExtra,
        };
      };

  const addToCart = (item, parentItemKey = null) => {
    // Count how many of this item are already in the new (unsaved) cart
    const alreadyInCart = cart
      .filter(i => i.id === item.id && i.is_new_item && !i.saved_sub_order)
      .reduce((sum, i) => sum + i.quantity, 0);

    const available = Number(item.availability ?? Infinity);

    if (available > 0 && alreadyInCart >= available) {
      setStockWarning({
        itemName: item.name,
        available,
      });
      return null;
    }

    setHasNewItems(true);
    let batch = currentBatchTimestamp;
    if (!batch) {
      batch = Date.now();
      setCurrentBatchTimestamp(batch);
    }

    if (!parentItemKey) {
      const existingIndex = cart.findIndex(
        ci => ci.id === Number(item.id) && ci.is_new_item && !ci.saved_sub_order && !ci.is_addon
      );
      if (existingIndex !== -1) {
        setCart(prev =>
          prev.map((ci, idx) =>
            idx === existingIndex ? { ...ci, quantity: ci.quantity + 1 } : ci
          )
        );
        if (!isMobile) setShowCart(true);
        return cart[existingIndex].frontend_unique_key;
      }
    }

    const newItem = buildCartItem(item, {
      batch_timestamp: batch,
      parent_item_key: parentItemKey,
      is_addon: !!parentItemKey,
    });
    setCart(prev => [...prev, newItem]);
    if (!isMobile) setShowCart(true);
    return newItem.frontend_unique_key;
  };

  const removeFromCart = (itemId, uniqueKey = null) => {
    setHasNewItems(true);
    if (uniqueKey) {
      setCart(prev =>
        prev.filter(i =>
          i.frontend_unique_key !== uniqueKey && i.parent_item_key !== uniqueKey
        )
      );
    } else {
      setCart(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const updateQuantity = (itemId, change, uniqueKey = null) => {
    setHasNewItems(true);
    setCart(prev =>
      prev.map(item => {
        const match = uniqueKey
          ? item.frontend_unique_key === uniqueKey
          : item.id === itemId && !item.frontend_unique_key;
        if (!match) return item;
        const q = item.quantity + change;
        return q > 0 ? { ...item, quantity: q } : null;
      }).filter(Boolean)
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Old-item delete
  // ─────────────────────────────────────────────────────────────────────────

  const handleOldItemRequestDelete = (item) => {
    setOldItemDeleteModal({ isOpen: true, item });
  };

  const reloadCartFromServer = useCallback(async (orderId) => {
    try {
      const r = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allOrders = r.data?.data || [];
      const order = allOrders.find(o => o.id === orderId);

      if (!order || !order.items?.length) {
        setCart([]);
        setActiveOrderId(null);
        setActiveDineinOrderId(null);
        setHasNewItems(false);
        await fetchTables();
        goToFloor();
        toast.info('All items removed — order closed.');
        return;
      }

      const rebuiltOldItems = order.items.map(item => {
        const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
        return {
          id: Number(item.item_id),
          order_item_id: item.id,
          name: item.item_name || menuItem?.name || 'Unnamed Item',
          unit_price: item.unit_price || menuItem?.unit_price || 0,
          quantity: item.quantity || 1,
          note: item.note || '',
          image_id: menuItem?.image_id,
          discount: menuItem?.discount || 0,
          slug: item.slug || menuItem?.slug,
          category: menuItem?.category_name,
          category_id: menuItem?.category_id || null,
          frontend_unique_key: item.frontend_unique_key || String(item.id),
          batch_timestamp: null,
          is_new_item: false,
          saved_sub_order: true,
          status: item.status || 'pending',
          batch_label: item.batch_label,
          sub_order_id: item.sub_order_id,
          parent_item_key: item.parent_item_key || null,
        };
      });

      setCart(prev => {
        const unsavedNew = prev.filter(ci => ci.is_new_item && !ci.saved_sub_order);
        return [...rebuiltOldItems, ...unsavedNew];
      });
      await fetchTables();
    } catch (err) {
      console.error('[reloadCartFromServer] failed:', err);
      toast.error('Failed to refresh cart after item change.');
    }
  }, [clientId, token, menuItems]);

  const handleOldItemRemoveOne = async (transactionType, reason, removeQty = 1) => {
    const item = oldItemDeleteModal.item;
    setOldItemDeleteModal({ isOpen: false, item: null });

    if (!item || !item.order_item_id) {
      toast.error('Cannot update — item has no DB reference.');
      return;
    }

    try {
      setLoading(true);

      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
        {
          params: {
            client_id: clientId,
            order_item_id: item.order_item_id,
            quantity: removeQty,
            transaction_type: transactionType,
            reason: reason || undefined,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newQty = item.quantity - removeQty;

      // ✅ FIX: after main item delete, if qty hit zero cascade to children
      if (newQty <= 0 && !item.parent_item_key) {
        const childItems = cart.filter(
          i => i.order_item_id &&
            i.parent_item_key === item.frontend_unique_key
        );
        if (childItems.length > 0) {
          await Promise.all(childItems.map(child =>
            axios.delete(
              `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
              {
                params: {
                  client_id: clientId,
                  order_item_id: child.order_item_id,
                  transaction_type: transactionType,
                  reason: reason || undefined,
                },
                headers: { Authorization: `Bearer ${token}` },
              }
            )
          ));
        }
      }
      toast.success(
        newQty > 0
          ? `Quantity reduced to ${newQty}. (${transactionType})`
          : 'Item removed.'
      );
      await reloadCartFromServer(activeOrderId);
    } catch (err) {
      console.error('[handleOldItemRemoveOne] failed:', err);
      toast.error('Failed to update item quantity.');
    } finally {
      setLoading(false);
    }
  };

  const handleOldItemRemoveAll = async (transactionType, reason) => {
    const item = oldItemDeleteModal.item;
    setOldItemDeleteModal({ isOpen: false, item: null });
    if (!item || !item.order_item_id) {
      toast.error('Cannot delete — item has no DB reference.');
      return;
    }

    try {
      setLoading(true);

      // ✅ FIX: if this is a parent, find all saved children by parent_item_key
      const itemsToDelete = item.parent_item_key
        ? [item]   // it's a child itself — only delete it
        : [
          item,
          ...cart.filter(
            i => i.order_item_id &&
              i.parent_item_key === item.frontend_unique_key
          ),
        ];

      await Promise.all(itemsToDelete.map(targetItem =>
        axios.delete(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
          {
            params: {
              client_id: clientId,
              order_item_id: targetItem.order_item_id,
              transaction_type: transactionType,
              reason: reason || undefined,
            },
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      ));

      toast.success('Item removed.');
      await reloadCartFromServer(activeOrderId);
    } catch (err) {
      console.error('[handleOldItemRemoveAll] failed:', err);
      toast.error('Failed to remove item.');
    } finally {
      setLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────
  // Item click — addon/combo detection
  // ─────────────────────────────────────────────────────────────────────────

  const handleItemClick = (item) => {

    // if (item.category_id === 'Combos') {
    //   // Add the item to the cart directly
    //   addToCart(item);
    //   return; // Exit early without opening the modal
    // }
    const hasLineItems =
      item.line_item_id &&
      Array.isArray(item.line_item_id) &&
      item.line_item_id.length > 0;

    if (!hasLineItems) {
      addToCart(item);
      return;
    }

    const isCombo = isComboCategoryId(item.category_id);

    // Resolve component / addon items directly by ID
    const linkedItems = item.line_item_id
      .map(id => menuItems.find(mi => Number(mi.id) === Number(id)))
      .filter(Boolean);

      if (isCombo) {
        // ✅ Add combo directly without modal
        let batch = currentBatchTimestamp;
        if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    
        setCart(prev => {
          const existingCombo = prev.find(
            i => i.id === Number(item.id) &&
                 i.is_new_item &&
                 !i.saved_sub_order &&
                 !i.is_addon &&
                 (i.frontend_unique_key || '').startsWith('combo_')
          );
    
          if (existingCombo) {
            return prev.map(i => {
              if (i.frontend_unique_key === existingCombo.frontend_unique_key) {
                return { ...i, quantity: i.quantity + 1 };
              }
              if (i.parent_item_key === existingCombo.frontend_unique_key && i.is_addon) {
                return { ...i, quantity: i.quantity + 1 };
              }
              return i;
            });
          }
    
          const comboParentEntry = buildCartItem(item, {
            batch_timestamp: batch,
            is_addon: false,
            _item_type: 'combo',
          });
    
          const childEntries = linkedItems.map(comp =>
            buildCartItem(comp, {
              batch_timestamp: batch,
              parent_item_key: comboParentEntry.frontend_unique_key,
              is_addon: true,
              _item_type: 'cchild',
            })
          );
    
          return [...prev, comboParentEntry, ...childEntries];
        });
    
        setHasNewItems(true);
        if (!isMobile) setShowCart(true);
    
      } else {
      // Show addon picker
      if (linkedItems.length > 0) {
        setSelectedMainItem(item);
        setLineItemsDetails(linkedItems);
        setLineItemsModalOpen(true);
      } else {
        addToCart(item);
      }
    }
  };

  const handleAddMainItemWithSelectedAddons = (selectedAddonIds) => {
    if (!selectedMainItem) return;
    let batch = currentBatchTimestamp;
    if (!batch) {
      batch = Date.now();
      setCurrentBatchTimestamp(batch);
    }

    const mainKey = addToCart(selectedMainItem);

    lineItemsDetails
      .filter(i => selectedAddonIds.includes(i.id))
      .forEach(addon => {
        const addonEntry = buildCartItem(addon, {
          batch_timestamp: batch,
          parent_item_key: mainKey,
          is_addon: true, _item_type: 'addon', 
        });
        setCart(prev => [...prev, addonEntry]);
      });

    setHasNewItems(true);
    setLineItemsModalOpen(false);
    setSelectedMainItem(null);
    setLineItemsDetails([]);
  };

  const handleAddMainItemOnly = () => {
    if (!selectedMainItem) return;
    addToCart(selectedMainItem);
    setLineItemsModalOpen(false);
    setSelectedMainItem(null);
    setLineItemsDetails([]);
    if (!isMobile) setShowCart(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Place order
  //
  // FIX: Addons (is_addon: true) are displayed in the cart but must NOT be
  // sent as separate order items to the API. They are visual-only sub-rows
  // that belong to their parent item. Only parent items go in the payload.
  // Combos likewise go as a single item — their components are on the menu
  // record (line_item_id) and are shown by KDS via that reference.
  // ─────────────────────────────────────────────────────────────────────────

  const handlePlaceOrder = async () => {
    if (isPlacingRef.current || !canPlaceOrder) return;
    isPlacingRef.current = true;
    setIsPlacingOrder(true);

    // For KOT printing we want both parent items and their addon rows
    // (addons print indented below the parent on the slip)
    const itemsToPrintKOT = newItems.length > 0 ? [...newItems] : [...cart];

    // For the order API we only send parent (non-addon) items
const buildOrderPayload = (items) =>
  items
    .filter(i => !(i.frontend_unique_key || '').startsWith('cchild_'))
    .map(i => ({
      item_id: i.id,
      item_name: i.name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: i.unit_price * i.quantity,
      status: 'pending',
      slug: i.slug || '',
      frontend_unique_key: i.frontend_unique_key,
    }));
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let placedOrderId = null;

      if (activeOrderId && activeDineinOrderId) {
        const newOnly = cart.filter(i => i.is_new_item && !i.saved_sub_order);
        if (newOnly.length > 0) {
          const r = await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create-sub-order`,
            { items: buildOrderPayload(newOnly) },
            { headers, params: { client_id: clientId, parent_dinein_order_id: activeDineinOrderId } }
          );
          placedOrderId = activeOrderId;
          toast.success(`Sub-order ${r.data.data.dinein_order_id} created!`);
        }
      } else {
        const existingDraft = await readDraft(selectedTable, clientId, token);
        const total = cart.filter(i => !(i.frontend_unique_key || '').startsWith('cchild_'))
                          .reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
        const itemsPayload = buildOrderPayload(cart);

        if (existingDraft) {
          // ── Promote draft → pending using existing /dinein/update ──────
          // Step 1: replace items via existing /order_items/update
          await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${existingDraft.id}`,
            itemsPayload,
            { headers }
          );
          // Step 2: flip status + fix dinein_order_id via /dinein/update
          await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
            {
              id: existingDraft.id,
              status: 'pending',
              total_price: total,
              // tells backend to reset dinein_order_id from "DRAFT-X" → "X"
              dinein_order_id: String(existingDraft.id),
            },
            { headers }
          );
          placedOrderId = existingDraft.id;
        } else {
          const createRes = await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
            {
              client_id: clientId,
              table_id: Number(selectedTable),
              price: total,
              gst: 0,
              cst: 0,
              total_price: total,
              status: 'pending',
              items: itemsPayload,
            },
            { headers }
          );
          placedOrderId = createRes?.data?.data?.id;
        }

        if (orderMode !== 'takeaway') {
          const tableToUpdate = tables.find(t => t.id.toString() === selectedTable);
          if (tableToUpdate) {
            await axios.post(
              `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
              {
                ...tableToUpdate,
                id: Number(selectedTable),
                status: 'Occupied',
                table_type: tableToUpdate.table_type.toString(),
              },
              { headers }
            );
          }
        }
      }

      // Clean up on success
      if (placedOrderId && (customerDetails.customer_id || customerDetails.contact_phone)) {
        const tableObj = tables.find(t => t.id.toString() === selectedTable);
        const orderSubtotal = cart.filter(i => !(i.frontend_unique_key || '').startsWith('cchild_'))
                                  .reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
        await upsertBillingDocumentForCustomer({
          clientId,
          token,
          orderId: placedOrderId,
          tableRef: tableObj?.table_number || `Table ${selectedTable}`,
          customerDetails,
          orderSubtotal,
        });
      }

      await deleteDraftFromDB(selectedTable, clientId, token);
      await fetchTables();

      // Enrich items for KOT with real category_id from menu data
      const enrichedForKOT = itemsToPrintKOT.map(ci => {
        if (ci.category_id) return ci;
        const mi = menuItems.find(m => Number(m.id) === Number(ci.id));
        return { ...ci, category_id: mi?.category_id || null };
      });
      const tableObj = tables.find(t => t.id.toString() === selectedTable);
      printKOT({
        counterTree,
        categoriesFlat,
        itemsToPrint: enrichedForKOT,
        meta: {
          tableNumber: tableObj?.table_number || selectedTable,
          orderMode,
          dineinOrderId: activeDineinOrderId,
          timestamp: new Date(),
        },
      });

      setCart([]);
      setActiveOrderId(null);
      setActiveDineinOrderId(null);
      setShowCart(false);
      setCurrentView('floor');
      setCurrentBatchTimestamp(null);
      setHasNewItems(false);
      setCustomerDetails({ customer_id: '', contact_phone: '' });
      toast.success('Order placed!');
    } catch (err) {
      console.error('ORDER ERROR:', err);
      toast.error('Order failed');
    } finally {
      isPlacingRef.current = false;
      setIsPlacingOrder(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Clear cart
  // ─────────────────────────────────────────────────────────────────────────

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setShowClearConfirm(true);
  };

  const confirmClearCart = async () => {
    await deleteDraftFromDB(selectedTable, clientId, token);
    setCart([]);
    setSelectedTable('');
    setCurrentView('floor');
    setShowCart(false);
    setShowClearConfirm(false);
    setActiveOrderId(null);
    setActiveDineinOrderId(null);
    setCurrentBatchTimestamp(null);
    setHasNewItems(false);
    setCustomerDetails({ customer_id: '', contact_phone: '' });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Delete order
  // ─────────────────────────────────────────────────────────────────────────

  const handleCancelOrder = async (orderId, tableId, reason) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/cancel?order_id=${orderId}&reason=${encodeURIComponent(reason || '')}`,
        {},
        { headers }
      );

      toast.success('Order cancelled and transaction recorded.');
      await fetchTables();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete order');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Mark as served
  // ─────────────────────────────────────────────────────────────────────────

  const handleMarkAsServed = async (orderId, tableId) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: orderId, client_id: clientId, status: 'served' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Order marked as served');
      await fetchTables();
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark as served');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Confirm payment from the table grid
  // ─────────────────────────────────────────────────────────────────────────

  const handleConfirmPaymentFromGrid = async (orderId, tableId) => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const docsRes = await axios.get(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
        { headers, params: { client_id: clientId } }
      );
      const invoices = (docsRes.data?.data || []).filter(
        d => d.order_id?.toString() === orderId?.toString()
      );
      if (invoices.length > 0) {
        invoices.sort(
          (a, b) =>
            (b.document_version || 1) - (a.document_version || 1) ||
            new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
        );
        const latestDoc = invoices[0];
        await axios.post(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/update_document`,
          { id: latestDoc.id, client_id: clientId, payment_status: 'Paid', status: 'Issued' },
          { headers }
        );
      }

      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: orderId, status: 'served', invoice_status: 'paid' },
        { headers }
      );

      const tableObj = tables.find(t => t.id === tableId);
      if (tableObj) {
        await axios.post(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          {
            id: tableId,
            client_id: clientId,
            name: tableObj.name || `Table ${tableId}`,
            table_type: String(tableObj.table_type || 'Regular'),
            status: 'vacant',
            location_zone: tableObj.location_zone || 'Main',
          },
          { headers }
        );
      }

      toast.success('Payment confirmed! Table is now free.');
      await fetchTables();
    } catch (err) {
      console.error('[handleConfirmPaymentFromGrid]', err);
      toast.error('Failed to confirm payment');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Bill / Invoice
  // ─────────────────────────────────────────────────────────────────────────

  const combineDuplicateItems = (items) => {
    const m = new Map();
    items.forEach(item => {
      const k = item.item_id.toString();
      if (m.has(k)) m.get(k).quantity += item.quantity || 0;
      else m.set(k, { ...item });
    });
    return Array.from(m.values());
  };

  const fetchBillingDocumentForOrder = async (orderId) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { client_id: clientId },
        }
      );
      const invoices = (res.data?.data || []).filter(
        d => d.order_id?.toString() === orderId?.toString()
      );
      if (!invoices.length) return null;
      invoices.sort(
        (a, b) =>
          (b.document_version || 1) - (a.document_version || 1) ||
          new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
      );
      return invoices[0];
    } catch {
      return null;
    }
  };

  const handlePrintBill = async (orderId) => {
    try {
      setLoading(true);
      const r = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const order = (r.data?.data || []).find(o => o.id === orderId);
      if (!order) { toast.error('Order not found'); return; }
  
      const enriched = (order.items || []).map(item => {
        const inv = inventoryMap[item.item_id] || {};
        return {
          ...item,
          unit_price: item.unit_price ?? inv.unit_price ?? 0,
          name: item.item_name ?? inv.name ?? 'Unnamed Item',
        };
      });
  
      const deduplicatedItems = deduplicateOrderItems(enriched);
  
      const billingDoc = await fetchBillingDocumentForOrder(orderId);
      setInvoiceOrderData({
        ...order,
        items: deduplicatedItems,
        customer_id: billingDoc?.customer_id || order.customer_id || '',
        contact_phone: billingDoc?.contact_phone || order.contact_phone || '',
        contact_email: billingDoc?.contact_email || order.contact_email || '',
      });
      setInvoiceModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleBillFromCart = async () => {
    if (!activeOrderId) { toast.error('No active order'); return; }
    try {
      setLoading(true);
      const r = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const order = (r.data?.data || []).find(o => o.id === activeOrderId);
      if (!order) { toast.error('Order not found'); return; }
  
      const enriched = (order.items || []).map(item => {
        const inv = inventoryMap[item.item_id] || {};
        return {
          ...item,
          unit_price: item.unit_price ?? inv.unit_price ?? 0,
          name: item.item_name ?? inv.name ?? 'Unnamed',
        };
      });
  
      const deduplicatedItems = deduplicateOrderItems(enriched);
  
      const billingDoc = await fetchBillingDocumentForOrder(activeOrderId);
      setInvoiceOrderData({
        ...order,
        items: deduplicatedItems,
        customer_id: customerDetails.customer_id || billingDoc?.customer_id || order.customer_id || '',
        contact_phone: customerDetails.contact_phone || billingDoc?.contact_phone || order.contact_phone || '',
        contact_email: billingDoc?.contact_email || order.contact_email || '',
      });
      setInvoiceModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    let items = menuItems;

    // ── 1. Timing filter — skip entirely if timings not loaded yet ──
    if (timingOptions.length > 0) {
      items = items.filter(item => isItemActive(item.slug));
    }

    // ── 2. Dietary filter ──
    if (selectedDietary) {
      items = items.filter(item => {
        const [mainPart = ''] = (item.slug || '').split('__');
        const segments = mainPart.split('_').filter(Boolean);
        return segments.some(seg =>
          seg.toLowerCase().replace(/[-_\s]/g, '') === selectedDietary
        );
      });
    }

    // ── 3. Category filter — uses flat list for reliable traversal ──
    if (selectedCategoryId) {
      const ids = getCategoryAndChildrenIds(selectedCategoryId); // ← no categories arg needed now
      items = items.filter(i => ids.includes(i.category_id));
    }

    // ── 4. Search filter ──
    if (!q) return items;
    return items.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.category_name || '').toLowerCase().includes(q) ||
      String(i.code || '').toLowerCase().includes(q)
    );
  }, [menuItems, selectedCategoryId, searchQuery, selectedDietary, timingOptions, isItemActive, getCategoryAndChildrenIds]);

  const oldItems = cart.filter(i => !i.is_new_item || i.saved_sub_order);
  const newItems = cart.filter(i => i.is_new_item && !i.saved_sub_order);
  const groupedNewItems = newItems.reduce((acc, item) => {
    const b = item.batch_timestamp || 'default';
    if (!acc[b]) acc[b] = [];
    acc[b].push(item);
    return acc;
  }, {});
  const batchTimestamps = Object.keys(groupedNewItems).sort();

  const canPlaceOrder = orderMode === 'takeaway'
    ? cart.filter(i => !i.parent_item_key).length > 0
    : activeOrderId
      ? hasNewItems && newItems.filter(i => !i.parent_item_key).length > 0
      : selectedTable && cart.filter(i => !i.parent_item_key).length > 0;

  const selectedCategoryName =
    categoriesFlat.find(c => c.id === selectedCategoryId)?.name || 'All Categories';

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">

      {/* ══════════════ FLOOR VIEW ══════════════ */}
      {currentView === 'floor' && (
        <TableReservation
          tables={tables.filter(t => !takeawayTables.some(tw => tw.id === t.id))}
          orderMode={orderMode}
          tableOrders={tableOrders}
          draftTableIds={draftTableIds}
          onSelectTable={handleTableSelect}
          onSelectTakeaway={handleTakeawaySelect}
          onSelectDineIn={() => setOrderMode('dinein')}
          onViewOrder={handleViewOrder}
          onPrintBill={handlePrintBill}
          onCancelOrder={(orderId, tableId) =>
            setCancelOrderModal({ isOpen: true, orderId, tableId })
          }
          onMarkAsServed={handleMarkAsServed}
          onConfirmPayment={(orderId, tableId) =>
            setTablePayConfirmModal({ isOpen: true, orderId, tableId })
          }
        />
      )}

      {/* ══════════════ ORDER VIEW ══════════════ */}
      {currentView === 'order' && (
        <div className="mx-auto px-2 py-2">
          <div className="grid lg:grid-cols-4 gap-1">

            {/* ── Category sidebar ── */}
            <div className="w-full lg:col-span-1">
              <div className="lg:h-[calc(98dvh-4rem)] lg:overflow-y-auto pr-1">
                <CategoryTree
                  categories={sidebarCategories}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                  defaultOpenAll
                  zoneConfigId={zoneConfigId}
                  dietaryOptions={dietaryOptions}
                  dietaryColorMap={dietaryColorMap}
                  selectedDietary={selectedDietary}
                  onSelectDietary={setSelectedDietary}
                />
              </div>
            </div>

            {/* ── Menu panel + Cart panel ── */}
            <div className="lg:col-span-3 flex gap-2">

              {/* Menu panel */}
              <div className="transition-all duration-300 border-default border-border-default p-2 rounded-lg flex-1 overflow-y-auto h-[calc(98dvh-4rem)] lg:h-auto lg:max-h-[calc(98dvh-4rem)]">

                {/* Top controls */}
                <div className="space-y-2 mb-2">
                  {/* Back button + Dietary pills + Search */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleBackToTables}
                      className="p-2 rounded-lg bg-bg-tertiary border border-border-default hover:bg-bg-secondary flex-shrink-0"
                    >
                      <ArrowLeft size={20} />
                    </button>

                    {/* Dietary type pills */}
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
                      <button
                        onClick={() => setSelectedDietary(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all border
        ${!selectedDietary
                            ? 'bg-action-primary text-white border-action-primary'
                            : 'bg-bg-tertiary text-text-primary border-border-default hover:border-action-primary'}`}
                      >
                        All
                      </button>
                      {dietaryOptions.map(type => {
                        const key = type.toLowerCase().replace(/[-_\s]/g, '');
                        const count = menuItems.filter(item => {
                          const [mainPart = ''] = (item.slug || '').split('__');
                          return mainPart.split('_').some(seg => seg.toLowerCase().replace(/[-_\s]/g, '') === key);
                        }).length;
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedDietary(selectedDietary === key ? null : key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 transition-all border
            ${selectedDietary === key
                                ? 'bg-action-primary text-white border-action-primary'
                                : 'bg-bg-tertiary text-text-primary border-border-default hover:border-action-primary'}`}
                          >
                            {dietaryColorMap[key] && (
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dietaryColorMap[key]}`} />
                            )}
                            {type}
                            {/* <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
              ${selectedDietary === key ? 'bg-white/20' : 'bg-bg-primary'}`}>
                                {count}
                              </span> */}
                          </button>
                        );
                      })}
                    </div>

                    {/* Search */}
                    <div className="relative w-52 flex-shrink-0">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search items..."
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Item grid */}
                <div className={`grid gap-2 grid-cols-2 md:grid-cols-4 ${showCart ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                  {filteredItems.map(item => {
                    const dp = item.discount && Number(item.discount) > 0
                      ? Number(item.discount).toFixed(0) : null;
                    const ac = item.line_item_id?.length || 0;
                    const dietary = getDietaryFromSlug(item);
                    const dietaryColor = dietary ? (dietaryColorMap[dietary] || '') : '';
                    return (
                      <div
                        key={`${item.id}_${item.zone_config_id ?? 0}`}
                        onClick={() => handleItemClick(item)}
                        className="flex gap-2 items-center bg-bg-primary border-default border-border-default rounded-xl p-1 shadow-sm hover:shadow-md transition cursor-pointer"
                      >
                        <div className={`w-[4px] self-stretch rounded-l-xl flex-shrink-0 ${dietaryColor}`} />
                        <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                          <ImagePreview
                            clientId={clientId}
                            imageId={item.image_id}
                            token={token}
                            alt={item.name}
                            baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                            urlBuilder={({ baseUrl, clientId, imageId }) =>
                              `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {dp ? (
                              <>
                                <span className="text-sm font-bold text-action-primary">
                                  ₹{(item.unit_price * (1 - Number(item.discount) / 100)).toFixed(0)}
                                </span>
                                <span className="text-xs line-through text-text-secondary">
                                  ₹{item.unit_price}
                                </span>
                                <span className="text-xs text-action-danger font-semibold">{dp}% OFF</span>
                              </>
                            ) : (
                              <span className="text-sm font-bold text-action-primary">
                                ₹{item.unit_price}
                              </span>
                            )}
                          </div>
                          {item.availability != null && (
                            <p className={`text-[10px] font-semibold mt-0.5
    ${Number(item.availability) <= 5
                                ? 'text-red-500'
                                : 'text-text-secondary'}`}>
                              Qty: {Number(item.availability)}
                            </p>
                          )}
                          {ac > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                              ${isComboCategoryId(item.category_id)
                                ? 'bg-violet-100 text-violet-700'
                                : 'bg-blue-100 text-blue-700'}`}>
                              {isComboCategoryId(item.category_id) ? `${ac} items` : `+${ac} addon${ac > 1 ? 's' : ''}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Cart panel (desktop only) ── */}
              {!isMobile && (
                <div
                  className={`transition-all duration-300 ease-in-out
                    ${showCart ? 'w-[22rem] opacity-100 z-30' : 'w-0 opacity-0 pointer-events-none'}`}
                >
                  <div className="border border-gray-300 rounded-xl bg-white shadow-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
                    <div className="flex flex-col h-full p-4">

                      {/* Cart header */}
                      <div className="pb-3 border-b space-y-2">
                        <h2 className="text-lg font-semibold text-gray-800">Your Order</h2>

                        <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            {orderMode === 'dinein' && selectedTable && (
                              <span className="font-semibold text-lg text-gray-700">
                                {tables.find(t => t.id.toString() === selectedTable)?.table_number}
                              </span>
                            )}

                            {orderMode === 'takeaway' && (
                              <select
                                value={selectedTable}
                                onChange={(e) => {
                                  setSelectedTable(e.target.value);
                                  setTakeawayTableId(e.target.value);
                                }}
                                className="border-none outline-none rounded px-2 py-1 text-sm bg-white"
                              >
                                <option value="">Select Table</option>
                                {takeawayTables.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.table_number}
                                  </option>
                                ))}
                              </select>
                            )}
                            {activeOrderId && (
                              <button
                                onClick={() => setShowTransferModal(true)}
                                className="text-sm text-red-600 hover:underline"
                              >
                                Transfer
                              </button>
                            )}
                            {activeDineinOrderId && (
                              <span className="text-xs text-gray-500 font-mono">
                                #{activeDineinOrderId}
                              </span>
                            )}
                          </div>
                          <span className="text-base font-bold text-red-600">₹{getTotalPrice()}</span>
                        </div>

                        {/* Draft saved indicator */}
                        {draftSavedAt && (
                          <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                            <Save size={11} />
                            <span>
                              Draft saved ·{' '}
                              {new Date(draftSavedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Dine-in / Takeaway toggle */}
                      <div className="mt-3">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => {
                              setOrderMode('dinein');
                              if (dineinTableId) setSelectedTable(dineinTableId);
                            }}
                            className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
                              ${orderMode === 'dinein'
                                ? 'bg-action-primary text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'}`}
                          >
                            <Users size={16} /> Dine In
                          </button>
                          <button
                            onClick={() => {
                              setOrderMode('takeaway');
                              setSelectedTable(takeawayTableId?.toString());
                            }}
                            className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
                              ${orderMode === 'takeaway'
                                ? 'bg-action-primary text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'}`}
                          >
                            <Package size={16} /> Takeaway
                          </button>
                        </div>
                      </div>

                      {/* Cart body */}
                      {cart.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                          No items added
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 overflow-y-auto mt-4 space-y-2">

                            {/* Old (previously placed) items */}
                            {getGroupedCartItems(oldItems).map((group, idx) => (
                              <OldItemRow
                                key={`old-${idx}`}
                                group={group}
                                clientId={clientId}
                                token={token}
                                activeDineinOrderId={activeDineinOrderId}
                                onRequestDelete={handleOldItemRequestDelete}
                              />
                            ))}

                            {/* Divider between old and new */}
                            {activeOrderId && oldItems.length > 0 && newItems.length > 0 && (
                              <div className="flex items-center gap-2 my-2">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
                                <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent" />
                              </div>
                            )}

                            {/* New items (editable), grouped by batch */}
                            {batchTimestamps.map((ts, bi) => (
                              <React.Fragment key={ts}>
                                {bi > 0 && (
                                  <div className="flex items-center gap-2 my-2">
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
                                    <span className="text-xs font-semibold text-orange-600 px-2">
                                      NEW ITEMS
                                    </span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent" />
                                  </div>
                                )}
                                {getGroupedCartItems(groupedNewItems[ts]).map((group, idx) => (
                                  <NewItemRow
                                    key={`new-${ts}-${idx}`}
                                    group={group}
                                    clientId={clientId}
                                    token={token}
                                    onUpdateQuantity={updateQuantity}
                                    onRemove={removeFromCart}
                                  />
                                ))}
                              </React.Fragment>
                            ))}
                          </div>

                          {/* ── Action buttons ── */}
                          <div className="grid grid-cols-2 gap-2 mt-3">

                            {/* Place Order */}
                            <button
                              onClick={handlePlaceOrder}
                              disabled={!canPlaceOrder || isPlacingOrder}
                              className={`py-2 rounded-lg text-sm font-semibold
                                ${canPlaceOrder && !isPlacingOrder
                                  ? 'bg-action-primary text-white hover:bg-action-danger'
                                  : 'bg-gray-300 cursor-not-allowed'}`}
                            >
                              {isPlacingOrder ? 'Placing...' : 'Place Order'}
                            </button>

                            {/* Bill */}
                            <button
                              onClick={handleBillFromCart}
                              className="py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1"
                            >
                              <FileText size={16} /> Bill
                            </button>

                            {/* Save Draft */}
                            <button
                              onClick={handleSaveDraft}
                              disabled={cart.length === 0}
                              title="Save draft — items will be here even after a page refresh"
                              className={`py-2 border rounded-lg text-sm flex items-center justify-center gap-1 font-semibold transition-colors
                                ${cart.length > 0
                                  ? 'bg-yellow-50 border-yellow-400 text-yellow-700 hover:bg-yellow-100'
                                  : 'opacity-40 cursor-not-allowed text-gray-400 border-gray-200'}`}
                            >
                              <Save size={15} /> Save
                            </button>

                            {/* Clear */}
                            <button
                              onClick={handleClearCart}
                              className="py-2 border rounded-lg text-sm hover:bg-gray-100"
                            >
                              Clear
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating cart button (mobile) ── */}
      {currentView === 'order' && cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40"
        >
          <ShoppingCart size={24} />
        </button>
      )}

      {/* ── Clear confirm dialog ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-80 shadow-xl">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Clear all items?</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will also discard the saved draft for this table.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearCart}
                className="flex-1 py-2 bg-action-primary text-white rounded-lg hover:bg-action-danger"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <LineItemsModal
        isOpen={lineItemsModalOpen}
        onClose={() => {
          setLineItemsModalOpen(false);
          setSelectedMainItem(null);
          setLineItemsDetails([]);
        }}
        mainItem={selectedMainItem}
        lineItems={lineItemsDetails}
        onAddMainOnly={handleAddMainItemOnly}
        onAddWithSelectedAddons={handleAddMainItemWithSelectedAddons}
      />

      <ComboDetailModal
        isOpen={comboModalOpen}
        onClose={() => {
          setComboModalOpen(false);
          setComboModalItem(null);
          setComboModalComponents([]);
        }}
        comboItem={comboModalItem}
        comboComponents={comboModalComponents}
  onAddCombo={() => {
  if (!comboModalItem) return;
  let batch = currentBatchTimestamp;
  if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }

  setCart(prev => {
    // Check if this combo already exists in the new (unsaved) cart
    const existingCombo = prev.find(
      i => i.id === Number(comboModalItem.id) &&
           i.is_new_item &&
           !i.saved_sub_order &&
           !i.is_addon &&
           (i.frontend_unique_key || '').startsWith('combo_')
    );

    if (existingCombo) {
      // Increment combo parent quantity
      const updated = prev.map(i => {
        if (i.frontend_unique_key === existingCombo.frontend_unique_key) {
          return { ...i, quantity: i.quantity + 1 };
        }
        // Increment each child that belongs to this combo parent
        if (
          i.parent_item_key === existingCombo.frontend_unique_key &&
          i.is_addon
        ) {
          return { ...i, quantity: i.quantity + 1 };
        }
        return i;
      });
      return updated;
    }

    // First time adding this combo — create parent + children
    const comboParentEntry = buildCartItem(comboModalItem, {
      batch_timestamp: batch,
      is_addon: false,
      _item_type: 'combo',
    });

    const childEntries = comboModalComponents.map(comp =>
      buildCartItem(comp, {
        batch_timestamp: batch,
        parent_item_key: comboParentEntry.frontend_unique_key,
        is_addon: true,
        _item_type: 'cchild',
      })
    );

    return [...prev, comboParentEntry, ...childEntries];
  });

  setHasNewItems(true);
  if (!isMobile) setShowCart(true);
}}
      />

      <CancelOrderConfirmModal
        isOpen={cancelOrderModal.isOpen}
        onClose={() => setCancelOrderModal({ isOpen: false, orderId: null, tableId: null })}
        onConfirm={(reason) => {
          if (cancelOrderModal.orderId) {
            handleCancelOrder(cancelOrderModal.orderId, cancelOrderModal.tableId, reason);
          }
        }}
      />

      <TablePaymentConfirmModal
        isOpen={tablePayConfirmModal.isOpen}
        orderId={tablePayConfirmModal.orderId}
        onClose={() => setTablePayConfirmModal({ isOpen: false, orderId: null, tableId: null })}
        onConfirm={(orderId) => {
          handleConfirmPaymentFromGrid(orderId, tablePayConfirmModal.tableId);
        }}
      />

      <OldItemDeleteModal
        isOpen={oldItemDeleteModal.isOpen}
        item={oldItemDeleteModal.item}
        onClose={() => setOldItemDeleteModal({ isOpen: false, item: null })}
        onRemoveOne={handleOldItemRemoveOne}
        onRemoveAll={handleOldItemRemoveAll}
      />

      <TransferTableModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        tables={tables}
        currentTableId={selectedTable}
        onConfirm={handleTransferTable}
      />
      <TakeawayOrdersModal
        isOpen={showTakeawayOrdersModal}
        onClose={() => setShowTakeawayOrdersModal(false)}
        clientId={clientId}
        token={token}
        takeawayTableIds={takeawayTables.map(t => String(t.id))}
        onSelectOrder={handleTakeawayOrderSelected}
      />
      {invoiceModalOpen && invoiceOrderData && (
        <InvoiceModal
          clientId={clientId}
          token={token}
          selectedOrder={invoiceOrderData}
          tablesMap={tables.reduce((m, t) => { m[t.id] = t; return m; }, {})}
          inventoryMap={inventoryMap}
          onClose={() => {
            setInvoiceModalOpen(false);
            setInvoiceOrderData(null);
            fetchTables();
          }}
          onSave={id => {
            console.log('Invoice saved:', id);
            fetchTables();
          }}
        />
      )}
      {stockWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="text-base font-bold text-red-600 mb-2">Stock Limit Reached</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold text-gray-800">{stockWarning.itemName}</span>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Only <span className="font-bold text-red-500">{stockWarning.available}</span> available.
              You've already added the maximum quantity.
            </p>
            <button
              onClick={() => setStockWarning(null)}
              className="w-full py-2.5 bg-action-primary text-white rounded-lg font-semibold text-sm hover:bg-action-danger"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeOrder;

// =================================================================================        =========================   //
