import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ShoppingCart, Plus, Minus, X, Check, Search,
  Users, Package, Trash2, ArrowLeft, FileText,
  Printer as PrinterIcon, Clock, Save,
} from 'lucide-react';
import { Eye, Lock, Printer } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import CategoryTree from '../../MainComponents/InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';
import InvoiceModal from '../../MainComponents/BillingServices/InvoiceModal';
import { getMenuConfig } from '../../utils/menuConfigResolver';
import { useTenant } from "../../../context/TenantContext";
// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TABLE_STATUS_CONFIG = {
  vacant: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-action-success' },
  available: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-green-700' },
  occupied: { clickable: false, bg: 'bg-action-primary', border: 'border-action-primary', badge: 'bg-red-100 text-action-primary', viewable: true },
  served: { clickable: false, bg: 'bg-blue-50', border: 'border-blue-400', badge: 'bg-blue-100 text-blue-700', viewable: true },
  reserved: { clickable: false, bg: 'bg-yellow-50', border: 'border-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
};
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

async function writeDraft(tableId, cart, clientId, token) {
  // If a draft already exists for this table, delete it first then recreate.
  // Reuses the existing DELETE + CREATE endpoints with no new API needed.
  try {
    // Find existing draft id to delete it
    const existing = await readDraft(tableId, clientId, token);
    if (existing) {
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
        {
          params: { dinein_order_id: existing.id },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    }

    const total = cart.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);

    await axios.post(
      `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
      {
        client_id: clientId,
        table_id: Number(tableId),
        price: total,
        gst: 0,
        cst: 0,
        total_price: total,
        status: 'draft',           // ← the only new thing
        items: cart.map(i => ({
          item_id: i.id,
          item_name: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: (i.unit_price || 0) * i.quantity,
          status: 'draft',
          slug: i.slug || '',
          frontend_unique_key: i.frontend_unique_key,
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
    await axios.delete(
      `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
      {
        params: { dinein_order_id: existing.id },
        headers: { Authorization: `Bearer ${token}` },
      }
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



// ─────────────────────────────────────────────────────────────────────────────
// ItemStatusBadge
// ─────────────────────────────────────────────────────────────────────────────

const ItemStatusBadge = ({ status }) => {
  const cfg = {
    pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending' },
    preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Preparing' },
    ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
    served: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Served' },
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

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-600">Delete Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700">Are you sure? This cannot be undone.</p>
        </div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700"
          >
            Delete
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
// printKOT
// Addons travel with their parent — never routed independently to any counter.
// ─────────────────────────────────────────────────────────────────────────────

const printKOT = ({ counterTree, categoriesFlat, itemsToPrint, meta }) => {
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

  const counterCategoryMap = {};
  counterTree.forEach(counter => {
    counterCategoryMap[counter.id] = new Set(
      (counter.subCategories || []).map(sc => sc.id)
    );
  });

  const findCounterForItem = (item) => {
    const ancestors = getCategoryAncestors(item.category_id || item.category);
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

const OldItemRow = ({ group, clientId, token, activeDineinOrderId }) => {
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
              ₹{(main.unit_price - (main.discount || 0)).toFixed(2)}
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
        <span className="text-sm font-semibold text-gray-500 self-center">×{main.quantity}</span>
      </div>

      {addons.map(addon => (
        <div
          key={addon.frontend_unique_key || addon.id}
          className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-blue-50/50"
        >
          <span className="text-xs text-blue-600">↳</span>
          <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
          <span className="text-xs font-semibold text-blue-600">
            ₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}
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
              ₹{(main.unit_price - (main.discount || 0)).toFixed(2)}
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
            ₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}
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
  onDeleteOrder,
  onMarkAsServed,
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
            {zonesFromDB.map(zone => (
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
            ))}
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
                                    onClick={e => { e.stopPropagation(); onDeleteOrder?.(orderInfo.id, table.id); }}
                                    className="text-red-600 hover:scale-110 transition-transform"
                                    title="Delete Order"
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

                          {/* Mark as Served button */}
                          {hasViewableOrder && orderInfo.status === 'ready' && (
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
// TakeOrder — main component
// ─────────────────────────────────────────────────────────────────────────────

const TakeOrder = ({ token, onOrderUpdate, realm }) => {
  const { clientId } = useTenant();
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

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const [selectedMainItem, setSelectedMainItem] = useState(null);
  const [lineItemsDetails, setLineItemsDetails] = useState([]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrderData, setInvoiceOrderData] = useState(null);

  const searchInputRef = useRef(null);
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;

  const menuConfig = useMemo(
    () => (clientId ? getMenuConfig(clientId) : null),
    [clientId]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Draft helpers
  // ─────────────────────────────────────────────────────────────────────────


  const handleSaveDraft = useCallback(async () => {
    if (!selectedTable || cart.length === 0) {
      toast.warn('Nothing to save — cart is empty.');
      return;
    }
    const ok = await writeDraft(selectedTable, cart, clientId, token);
    if (ok) {
      const now = Date.now();
      setDraftSavedAt(now);
      await fetchTables();                  // refreshes floor DRAFT badges
      toast.success('Draft saved! You can return to this table anytime.');
    } else {
      toast.error('Failed to save draft.');
    }
  }, [selectedTable, cart, clientId, token]);



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

  const getCategoryAndChildrenIds = (cats, targetId) => {
    const result = new Set();
    const traverse = (nodes, found = false) => {
      for (const n of nodes) {
        const isT = n.id === targetId;
        if (isT || found) result.add(n.id);
        if (n.children?.length) traverse(n.children, found || isT);
      }
    };
    traverse(cats);
    return Array.from(result);
  };

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
              o.status?.toLowerCase() !== 'draft'      // ← exclude drafts from occupied map
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
        await Promise.all([fetchTables(), fetchCounterTree()]);

        const [catRes, itemRes, invRes] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.root}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?inventory_id=${menuConfig.menuInventoryId}`,
            { headers: { Authorization: `Bearer ${token}` } }
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
    const draft = await readDraft(tableIdStr, clientId, token);

    if (draft) {
      // Reconstruct cart from draft order items
      const restoredCart = (draft.items || []).map(item => {
        const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
        return {
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
          frontend_unique_key: item.frontend_unique_key,
          batch_timestamp: null,
          is_new_item: true,
          saved_sub_order: false,
          status: 'draft',
        };
      });
      setCart(restoredCart);
      setHasNewItems(true);
      setDraftSavedAt(Date.now());
      setShowCart(true);
      toast.info('Draft restored for this table.', { autoClose: 2000 });
    } else {
      setCart([]);
      setDraftSavedAt(null);
      setShowCart(true);
    }

    goToOrderView();
  };

  const handleTakeawaySelect = () => {
    if (!takeawayTables.length) {
      toast.error('No takeaway table configured');
      return;
    }

    const tableIdStr = (takeawayTableId || takeawayTables[0].id).toString();
    setOrderMode('takeaway');
    setSelectedTable(tableIdStr);
    setActiveOrderId(null);
    setActiveDineinOrderId(null);
    setCart([]);
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
      if (!item.is_addon && !item.parent_item_key) {
        const addons = items.filter(i => i.parent_item_key === item.frontend_unique_key);
        grouped.push({ main: { ...item }, addons });
        processed.add(key);
        addons.forEach(a => processed.add(a.frontend_unique_key || a.id));
      }
    });
    return grouped;
  };

  const getTotalPrice = () =>
    cart.reduce((t, i) => t + (i.unit_price || 0) * i.quantity, 0).toFixed(2);

  const buildCartItem = (item, extra = {}) => {
    const ts = Date.now() + Math.random();
    const key = `${item.id}_${ts}`;
    return {
      id: Number(item.id),
      name: item.name,
      unit_price: item.unit_price || 0,
      image_id: item.image_id,
      discount: item.discount || 0,
      slug: item.slug,
      category: item.category_name,
      category_id: item.category_id || null,
      quantity: 1,
      note: '',
      frontend_unique_key: key,
      is_new_item: true,
      saved_sub_order: false,
      ...extra,
    };
  };

  const addToCart = (item, parentItemKey = null) => {
    setHasNewItems(true);
    let batch = currentBatchTimestamp;
    if (!batch) {
      batch = Date.now();
      setCurrentBatchTimestamp(batch);
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
  // Item click — opens addon modal or directly adds to cart
  // ─────────────────────────────────────────────────────────────────────────

  const handleItemClick = (item) => {
    const hasLineItems =
      item.line_item_id &&
      Array.isArray(item.line_item_id) &&
      item.line_item_id.length > 0;

    if (!hasLineItems) {
      addToCart(item);
      return;
    }

    const addonCatId = getAddonCategoryId(item.category_id);

    const getAddonDescendantIds = (rootId) => {
      const ids = new Set([rootId]);
      const addChildren = (parentId) => {
        categoriesFlat
          .filter(c => c.parentId === parentId)
          .forEach(c => { ids.add(c.id); addChildren(c.id); });
      };
      addChildren(rootId);
      return ids;
    };
    const validAddonCategoryIds = getAddonDescendantIds(addonCatId);

    const lineItems = item.line_item_id
      .map(id => {
        const ai = menuItems.find(i => i.id === id);
        if (!ai) return null;
        return validAddonCategoryIds.has(ai.category_id) ? ai : null;
      })
      .filter(Boolean);

    if (lineItems.length > 0) {
      setSelectedMainItem(item);
      setLineItemsDetails(lineItems);
      setLineItemsModalOpen(true);
    } else {
      addToCart(item);
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

    // Attach each selected addon to the main item via parent_item_key
    lineItemsDetails
      .filter(i => selectedAddonIds.includes(i.id))
      .forEach(addon => {
        const ts = Date.now() + Math.random();
        const addonEntry = buildCartItem(addon, {
          batch_timestamp: batch,
          parent_item_key: mainKey,
          is_addon: true,
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
  // ─────────────────────────────────────────────────────────────────────────

  const handlePlaceOrder = async () => {
    if (isPlacingRef.current || !canPlaceOrder) return;
    isPlacingRef.current = true;
    setIsPlacingOrder(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeOrderId && activeDineinOrderId) {
        // Append new items as a sub-order
        const newOnly = cart.filter(i => i.is_new_item && !i.saved_sub_order);
        if (newOnly.length > 0) {
          const r = await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create-sub-order`,
            {
              items: newOnly.map(i => ({
                item_id: i.id,
                item_name: i.name,
                quantity: i.quantity,
                unit_price: i.unit_price,
                line_total: i.unit_price * i.quantity,
                slug: i.slug,
                frontend_unique_key: i.frontend_unique_key,
              })),
            },
            { headers, params: { client_id: clientId, parent_dinein_order_id: activeDineinOrderId } }
          );
          toast.success(`Sub-order ${r.data.data.dinein_order_id} created!`);
        }
      } else {
        const existingDraft = await readDraft(selectedTable, clientId, token);
        const total = cart.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
        const itemsPayload = cart.map(i => ({
          item_id: i.id,
          item_name: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.unit_price * i.quantity,
          status: 'pending',
          slug: i.slug || '',
          frontend_unique_key: i.frontend_unique_key,
        }));

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
        } else {
          // No draft — create fresh as before (unchanged)
          await axios.post(
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
        }

        // Update table to Occupied — unchanged
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

      // Clean up on success
      await deleteDraftFromDB(selectedTable, clientId, token);
      await fetchTables();
      setCart([]);
      setActiveOrderId(null);
      setActiveDineinOrderId(null);
      setShowCart(false);
      setCurrentView('floor');
      setCurrentBatchTimestamp(null);
      setHasNewItems(false);
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
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Delete order
  // ─────────────────────────────────────────────────────────────────────────

  const handleDeleteOrder = async (orderId, tableId) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
        {
          params: { dinein_order_id: orderId, client_id: clientId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const tableObj = tables.find(t => t.id === tableId);
      if (tableObj) {
        await axios.post(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          {
            id: tableId,
            client_id: clientId,
            name: tableObj.name,
            table_type: tableObj.table_type,
            status: 'vacant',
            location_zone: tableObj.location_zone,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      toast.success('Order deleted');
      await fetchTables();
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
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
      setInvoiceOrderData({ ...order, items: combineDuplicateItems(enriched) });
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
      setInvoiceOrderData({ ...order, items: combineDuplicateItems(enriched) });
      setInvoiceModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // KOT
  // ─────────────────────────────────────────────────────────────────────────

  const handlePrintKOT = () => {
    const itemsToPrint = newItems.length > 0 ? newItems : cart;
    if (itemsToPrint.length === 0) {
      toast.warn('No items to print KOT for.');
      return;
    }
    const enriched = itemsToPrint.map(ci => {
      if (ci.category_id) return ci;
      const mi = menuItems.find(m => Number(m.id) === Number(ci.id));
      return { ...ci, category_id: mi?.category_id || null };
    });
    const tableObj = tables.find(t => t.id.toString() === selectedTable);
    printKOT({
      counterTree,
      categoriesFlat,
      itemsToPrint: enriched,
      meta: {
        tableNumber: tableObj?.table_number || selectedTable,
        orderMode,
        dineinOrderId: activeDineinOrderId,
        timestamp: new Date(),
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    let items = menuItems;
    if (selectedCategoryId) {
      const ids = getCategoryAndChildrenIds(categories, selectedCategoryId);
      items = items.filter(i => ids.includes(i.category_id));
    }
    if (!q) return items;
    return items.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.category_name || '').toLowerCase().includes(q) ||
      String(i.code || '').toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItems, selectedCategoryId, searchQuery, categories]);

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
    ? cart.length > 0
    : activeOrderId
      ? hasNewItems && newItems.length > 0
      : selectedTable && cart.length > 0;

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
          tables={tables}
          orderMode={orderMode}
          tableOrders={tableOrders}
          draftTableIds={draftTableIds}
          onSelectTable={handleTableSelect}
          onSelectTakeaway={handleTakeawaySelect}
          onSelectDineIn={() => setOrderMode('dinein')}
          onViewOrder={handleViewOrder}
          onPrintBill={handlePrintBill}
          onDeleteOrder={(orderId, tableId) => {
            setOrderToDelete({ orderId, tableId });
            setShowDeleteConfirm(true);
          }}
          onMarkAsServed={handleMarkAsServed}
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
                />
              </div>
            </div>

            {/* ── Menu panel + Cart panel ── */}
            <div className="lg:col-span-3 flex gap-2">

              {/* Menu panel */}
              <div className="transition-all duration-300 border-default border-border-default p-2 rounded-lg flex-1 overflow-y-auto h-[calc(98dvh-4rem)] lg:h-auto lg:max-h-[calc(98dvh-4rem)]">

                {/* Top controls */}
                <div className="space-y-2 mb-2">

                  {/* Dietary quick-filters */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {dieterySubCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          const n = findNodeAndChildren(categories, cat.id);
                          if (n) setSidebarCategories([n]);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border whitespace-nowrap transition-all flex-shrink-0
                          ${selectedCategoryId === cat.id
                            ? 'bg-action-primary text-white border-action-primary'
                            : 'bg-bg-tertiary text-text-primary hover:border-action-primary'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Back button + Category name + Search */}
                  <div className="flex items-center justify-between lg:flex-row flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleBackToTables}
                        className="p-2 rounded-lg bg-bg-tertiary border border-border-default hover:bg-bg-secondary"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <h2 className="text-xl font-semibold text-text-primary truncate">
                        {selectedCategoryName}
                        <span className="text-sm ml-2">({filteredItems.length})</span>
                      </h2>
                    </div>
                    <div className="relative w-64 max-w-full">
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
                    const dp = item.discount && item.unit_price && Number(item.discount) > 0
                      ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(0)
                      : null;
                    const ac = item.line_item_id?.length || 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="flex gap-2 items-center bg-bg-primary border-default border-border-default rounded-xl p-1 shadow-sm hover:shadow-md transition cursor-pointer"
                      >
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
                                  ₹{(item.unit_price - item.discount).toFixed(0)}
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
                          {ac > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                              +{ac} addon{ac > 1 ? 's' : ''}
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

                            {/* Print KOT — spans both columns */}
                            <button
                              onClick={handlePrintKOT}
                              disabled={cart.length === 0}
                              className={`col-span-2 py-2 border rounded-lg text-sm flex items-center justify-center gap-1 transition-colors
                                ${cart.length > 0
                                  ? 'hover:bg-gray-100 text-gray-700'
                                  : 'opacity-40 cursor-not-allowed text-gray-400'}`}
                            >
                              <PrinterIcon size={16} /> Print KOT
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

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setOrderToDelete(null); }}
        onConfirm={() => {
          if (orderToDelete) {
            handleDeleteOrder(orderToDelete.orderId, orderToDelete.tableId);
          }
        }}
      />
      <TransferTableModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        tables={tables}
        currentTableId={selectedTable}
        onConfirm={handleTransferTable}
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
    </div>
  );
};

export default TakeOrder;