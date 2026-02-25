import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, X, Check, Search, Users, Package, Trash2, ArrowLeft, FileText, Printer as PrinterIcon, Clock } from 'lucide-react';
import axios from 'axios';
import CategoryTree from '../InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';
import { Eye, Lock, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import InvoiceModal from '../BillingServices/InvoiceModal';
import { getMenuConfig } from '../../utils/menuConfigResolver';

// ─── Status badge helper ─────────────────────────────────────────────────────
const ItemStatusBadge = ({ status }) => {
  const cfg = {
    pending:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Pending' },
    preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Preparing' },
    ready:     { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Ready' },
    served:    { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Served' },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: status || '—' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

const TABLE_STATUS_CONFIG = {
  vacant:   { clickable: true,  bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-action-success' },
  available:{ clickable: true,  bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-green-700' },
  occupied: { clickable: false, bg: 'bg-action-primary', border: 'border-action-primary', badge: 'bg-red-100 text-action-primary', viewable: true },
  served:   { clickable: false, bg: 'bg-blue-50',        border: 'border-blue-400',       badge: 'bg-blue-100 text-blue-700',  viewable: true },
  reserved: { clickable: false, bg: 'bg-yellow-50',      border: 'border-yellow-400',     badge: 'bg-yellow-100 text-yellow-700' },
};

// ─── Table reservation floor view ────────────────────────────────────────────
const TableReservation = ({ tables=[], orderMode="dinein", onSelectTable, onSelectTakeaway, onSelectDineIn, onViewOrder, tableOrders={}, onPrintBill, onDeleteOrder, onMarkAsServed }) => {
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedZones, setSelectedZones]       = useState([]);

  const getZone    = t => t.location_zone?.trim() || "Unassigned";
  const getSection = t => t.section?.trim()       || "Other";
  const zonesFromDB    = [...new Set(tables.map(t => t.location_zone).filter(Boolean))];
  const sectionsFromDB = [...new Set(tables.map(t => t.section).filter(Boolean))];
  const toggleFilter = (v, set) => set(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const filteredTables = tables.filter(t => {
    const z = getZone(t), s = getSection(t);
    return (selectedZones.length === 0 || selectedZones.includes(z))
        && (selectedSections.length === 0 || selectedSections.includes(s));
  });
  const visibleZones    = [...new Set(filteredTables.map(t => getZone(t)))];
  const getSectionsByZone = zone => [...new Set(filteredTables.filter(t => getZone(t) === zone).map(t => getSection(t)))];

  const calcElapsed = createdAt => {
    if (!createdAt) return null;
    const utc  = typeof createdAt === "string" ? createdAt.replace(" ", "T").split(".")[0] + "Z" : createdAt;
    const diff = Date.now() - new Date(utc).getTime();
    if (diff < 0) return "Just now";
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (s < 60)  return "Just now";
    if (m === 1) return "1 min ago";  if (m < 60) return `${m} mins ago`;
    if (h === 1) return "1 hr ago";   if (h < 24) return `${h} hrs ago`;
    if (d === 1) return "1 day ago";  return `${d} days ago`;
  };

  return (
    <div className="p-4 bg-bg-primary overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Filter bar */}
      <div className="mb-3 sticky top-0 z-10 bg-bg-primary">
        <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border-default bg-bg-tertiary">
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl">
            <button onClick={() => { setSelectedSections([]); setSelectedZones([]); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedSections.length === 0 && selectedZones.length === 0 ? "bg-action-primary text-white" : "bg-white text-text-secondary hover:bg-gray-100"}`}>All</button>
            <div className="w-px bg-border-default mx-1"/>
            {sectionsFromDB.map(sec => (
              <button key={sec} onClick={() => toggleFilter(sec, setSelectedSections)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedSections.includes(sec) ? "bg-action-primary text-white" : "bg-white text-text-secondary hover:bg-gray-100"}`}>{sec}</button>
            ))}
            <div className="w-px bg-border-default mx-1"/>
            {zonesFromDB.map(zone => (
              <button key={zone} onClick={() => toggleFilter(zone, setSelectedZones)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedZones.includes(zone) ? "bg-action-primary text-white" : "bg-white text-text-secondary hover:bg-gray-100"}`}>{zone}</button>
            ))}
          </div>
          <div className="ml-auto flex bg-bg-primary border-2 rounded-full border-action-primary p-1 shadow-sm">
            <button onClick={onSelectDineIn}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${orderMode === "dinein" ? "bg-action-primary text-text-white shadow" : "text-text-secondary hover:bg-gray-100"}`}>Dine In</button>
            <button onClick={onSelectTakeaway}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1 ${orderMode === "takeaway" ? "bg-orange-500 text-white shadow" : "text-gray-600 hover:bg-gray-100"}`}>
              <Package size={12}/>Takeaway
            </button>
          </div>
        </div>
      </div>

      {orderMode === "dinein" && visibleZones.map(zone => {
        const sections = getSectionsByZone(zone);
        return (
          <div key={zone} className="mb-10">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{zone}</h3>
            {sections.map(section => (
              <div key={section} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-200">{section}</span>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5">
                  {filteredTables.filter(t => getZone(t) === zone && getSection(t) === section).map(table => {
                    const statusKey = table.status?.toLowerCase();
                    const config    = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;
                    const orderInfo = tableOrders[table.id];
                    const hasViewableOrder = (statusKey === 'occupied' || statusKey === 'served') && orderInfo;

                    const rootCreatedAt = orderInfo?.created_at;
                    const elapsedTime   = rootCreatedAt ? calcElapsed(rootCreatedAt) : null;

                    const orderCount = orderInfo?.order_count || 1;
                    const totalPrice = orderInfo?.total_price ? `₹${Number(orderInfo.total_price).toFixed(0)}` : null;

                    return (
                      <div key={table.id} className="rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition bg-white">
                        <div onClick={() => { if (config.clickable) onSelectTable(table); else if (hasViewableOrder && onViewOrder) onViewOrder(table); }}
                          className={`${config.clickable || hasViewableOrder ? 'cursor-pointer' : ''}`}>

                          <div className="flex justify-between items-center px-3 py-2 bg-action-primary text-white">
                            <span className="font-bold text-lg tracking-wide">{table.table_number}</span>
                            {hasViewableOrder && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                                ${orderInfo.status === 'pending'   ? 'bg-orange-100 text-orange-700' :
                                  orderInfo.status === 'preparing' ? 'bg-blue-100 text-blue-700'   :
                                  orderInfo.status === 'ready'     ? 'bg-green-100 text-green-700' :
                                  orderInfo.status === 'served'    ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'}`}>
                                {orderInfo.status?.toUpperCase()}
                              </span>
                            )}
                            {hasViewableOrder && (
                              <span className="text-xl opacity-80 font-bold">#{orderInfo.dinein_order_id || orderInfo.id}</span>
                            )}
                          </div>

                          <div className={`p-3 flex items-center justify-between gap-2
                            ${statusKey === 'occupied' ? 'text-blue-600 bg-blue-50'     :
                              statusKey === 'served'   ? 'text-purple-600 bg-purple-50' :
                              statusKey === 'reserved' ? 'text-yellow-600 bg-yellow-50' :
                              'text-green-600 bg-green-50'}`}>

                            {statusKey === 'vacant'   && <span className="text-2xl text-green-400">—</span>}
                            {(statusKey === 'occupied' || statusKey === 'served') && <Eye size={22}/>}
                            {statusKey === 'reserved' && <Lock size={22}/>}

                            {hasViewableOrder && (
                              <div className="flex flex-col items-center flex-1">
                                <span className="text-xs font-bold text-gray-700">
                                  {orderCount} time orderd
                                </span>
                                {totalPrice && (
                                  <span className="text-sm font-bold text-action-primary">{totalPrice}</span>
                                )}
                              </div>
                            )}

                            {hasViewableOrder && (
                              <div className="flex gap-2">
                                <button onClick={e => { e.stopPropagation(); onPrintBill && onPrintBill(orderInfo.id, table.id); }}
                                  className="text-yellow-600 hover:scale-110 transition-transform" title="Print Bill">
                                  <Printer size={22}/>
                                </button>
                                <button onClick={e => { e.stopPropagation(); onDeleteOrder && onDeleteOrder(orderInfo.id, table.id); }}
                                  className="text-red-600 hover:scale-110 transition-transform" title="Delete Order">
                                  <Trash2 size={22}/>
                                </button>
                              </div>
                            )}
                          </div>

                          {hasViewableOrder && elapsedTime && (
                            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                              <div className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-600">
                                <Clock size={13} className="text-orange-500"/>
                                <span>{elapsedTime}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {hasViewableOrder && orderInfo.status === 'ready' && (
                          <button onClick={e => { e.stopPropagation(); onMarkAsServed && onMarkAsServed(orderInfo.id, table.id); }}
                            className="w-full px-4 py-2 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
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
    </div>
  );
};

// ─── Modals ───────────────────────────────────────────────────────────────────
const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddWithSelectedAddons, onAddMainOnly }) => {
  const [selectedAddons, setSelectedAddons] = useState([]);
  useEffect(() => { if (isOpen) setSelectedAddons([]); }, [isOpen]);
  const toggleAddon = id => setSelectedAddons(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg max-w-lg w-full p-6 bg-bg-primary max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">{mainItem?.name}</h3>
        <p className="mb-4 text-text-secondary">Select add-ons:</p>
        <div className="space-y-2 mb-6">
          {lineItems.map(item => (
            <div key={item.id} onClick={() => toggleAddon(item.id)}
              className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all
                ${selectedAddons.includes(item.id) ? 'bg-action-primary/10 border-2 border-action-primary' : 'bg-bg-tertiary border border-border-default hover:border-action-primary/50'}`}>
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedAddons.includes(item.id) ? 'bg-action-primary border-action-primary' : 'border-gray-300'}`}>
                  {selectedAddons.includes(item.id) && <Check size={14} className="text-white"/>}
                </div>
                <span className="text-text-primary font-medium">{item.name}</span>
              </div>
              <span className="font-semibold text-action-primary">₹{item.unit_price}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border-default bg-bg-tertiary text-text-primary hover:bg-gray-100">Cancel</button>
          <button onClick={onAddMainOnly} className="flex-1 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700">Main Only</button>
          <button onClick={() => onAddWithSelectedAddons(selectedAddons)} disabled={selectedAddons.length === 0}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${selectedAddons.length > 0 ? 'bg-action-primary text-white hover:bg-action-danger' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            Add ({selectedAddons.length})
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-600">Delete Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
        </div>
        <div className="px-6 py-5"><p className="text-sm text-gray-700">Are you sure? This cannot be undone.</p></div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
};

// ─── KOT Print utility ───────────────────────────────────────────────────────
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
    counterCategoryMap[counter.id] = new Set((counter.subCategories || []).map(sc => sc.id));
  });

  const findCounterForItem = (item) => {
    const ancestors = getCategoryAncestors(item.category_id || item.category);
    for (const counter of counterTree) {
      const assigned = counterCategoryMap[counter.id];
      for (const catId of assigned) { if (ancestors.has(catId)) return counter; }
    }
    return null;
  };

  const groups = {};
  itemsToPrint.forEach(item => {
    const counter = findCounterForItem(item);
    const key = counter ? counter.id : '__unassigned__';
    const name = counter ? counter.name : 'General Kitchen';
    if (!groups[key]) groups[key] = { counterName: name, items: [] };
    groups[key].items.push(item);
  });

  const groupEntries = Object.entries(groups);
  if (groupEntries.length === 0) { toast.warn('No items to print KOT for.'); return; }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString();

  const slipHtml = groupEntries.map(([, group]) => {
    const rows = group.items.map(item => `
      <tr>
        <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;">${item.name}${item.is_addon ? ' <span style="font-size:10px;color:#888;">(add-on)</span>' : ''}</td>
        <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;text-align:center;font-weight:bold;">${item.quantity}</td>
        ${item.note ? `<td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:11px;color:#555;font-style:italic;">${item.note}</td>` : '<td></td>'}
      </tr>
    `).join('');
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
        ${meta.dineinOrderId ? `<div style="font-size:11px;margin-bottom:6px;color:#555;">Order #${meta.dineinOrderId}</div>` : ''}
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
  if (!printWindow) { toast.error('Popup blocked. Please allow popups to print KOT.'); return; }
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>KOT</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; background: #fff; }
      .kot-slip { width: 72mm; padding: 8px; margin: 0 auto; }
      .page-break { page-break-after: always; }
      @media print { body { -webkit-print-color-adjust: exact; } .kot-slip { page-break-inside: avoid; } .page-break { page-break-after: always; height: 0; } }
    </style></head><body>
    ${slipHtml}
    <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };<\/script>
    </body></html>
  `);
  printWindow.document.close();
};

// ─── Main TakeOrder component ─────────────────────────────────────────────────
const TakeOrder = ({ clientId, token, onOrderUpdate, realm }) => {
  const [searchQuery, setSearchQuery]   = useState('');
  const searchInputRef                  = useRef(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [cart, setCart]                 = useState([]);
  const [showCart, setShowCart]         = useState(true);
  const [tables, setTables]             = useState([]);
  const [categories, setCategories]     = useState([]);
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const [menuItems, setMenuItems]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const [selectedMainItem, setSelectedMainItem]     = useState(null);
  const [lineItemsDetails, setLineItemsDetails]     = useState([]);
  const [orderMode, setOrderMode]       = useState('dinein');
  const [takeawayTableId, setTakeawayTableId] = useState(null);
  const isPlacingRef                    = useRef(false);
  const isMobile                        = window.matchMedia('(max-width: 1024px)').matches;
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentView, setCurrentView]   = useState('floor');
  const [activeOrderId, setActiveOrderId]         = useState(null);
  const [activeDineinOrderId, setActiveDineinOrderId] = useState(null);
  const [hasNewItems, setHasNewItems]   = useState(false);
  const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
  const [tableOrders, setTableOrders]   = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [dieterySubCategories, setDieterySubCategories] = useState([]);
  const [sidebarCategories, setSidebarCategories] = useState([]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrderData, setInvoiceOrderData] = useState(null);
  const [inventoryMap, setInventoryMap] = useState({});
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [counterTree, setCounterTree]   = useState([]);

  // All IDs and keywords come from menuConfigResolver — nothing hardcoded here
  const menuConfig = React.useMemo(() => clientId ? getMenuConfig(clientId) : null, [clientId]);

  // ─── Utils ───────────────────────────────────────────────────────────────
  const flattenCategoryTree = (tree, level = 0, parentId = null) => {
    let flat = [];
    tree.forEach(c => {
      flat.push({ id: c.id, name: c.name, level, parentId, hasChildren: !!(c.subCategories?.length) });
      if (c.subCategories?.length) flat = flat.concat(flattenCategoryTree(c.subCategories, level + 1, c.id));
    });
    return flat;
  };

  // ─── Resolve the correct addon category for a menu item's category ────────
  //     Uses keywords from menuConfig (env-driven).
  //     Non-AC is checked FIRST — "non_ac" contains "ac" so order matters.
  const getAddonCategoryId = React.useCallback((itemCategoryId) => {
    if (!menuConfig) return 'addons_ac';
    const { addonCategoryAC, addonCategoryNonAC, addonNonACKeywords, addonACKeywords } = menuConfig;

    if (!itemCategoryId || !categoriesFlat.length) return addonCategoryAC;

    // Build path of lowercase category names from item up to root
    const pathNames = [];
    let cur = itemCategoryId;
    const visited = new Set();
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const cat = categoriesFlat.find(c => c.id === cur);
      if (!cat) break;
      pathNames.push((cat.name || '').toLowerCase());
      cur = cat.parentId || cat.parent_id;
    }

    // Check Non-AC first (before AC — avoids "non_ac" falsely matching "ac")
    const isNonAC = addonNonACKeywords.some(kw =>
      pathNames.some(p => p === kw || p.includes(kw))
    );
    if (isNonAC) return addonCategoryNonAC;

    const isAC = addonACKeywords.some(kw =>
      pathNames.some(p => p === kw || p.includes(kw))
    );
    if (isAC) return addonCategoryAC;

    return addonCategoryAC; // default
  }, [categoriesFlat, menuConfig]);

  const getCategoryAndChildrenIds = (categories, targetId) => {
    const result = new Set();
    const traverse = (nodes, found = false) => {
      for (const n of nodes) {
        const isT = n.id === targetId;
        if (isT || found) result.add(n.id);
        if (n.children?.length) traverse(n.children, found || isT);
      }
    };
    traverse(categories);
    return Array.from(result);
  };

  const findCategoryNode = (tree, matcher) => {
    for (const c of tree) {
      if (c.id?.toLowerCase() === matcher.toLowerCase() || c.name?.toLowerCase() === matcher.toLowerCase()) return c;
      if (c.children?.length) { const f = findCategoryNode(c.children, matcher); if (f) return f; }
    }
    return null;
  };

  const getCategoriesAtLevel = (node, tgt, cur = 0) => {
    if (!node) return [];
    if (cur === tgt) return [node];
    let r = [];
    for (const ch of node.children || []) r = r.concat(getCategoriesAtLevel(ch, tgt, cur + 1));
    return r;
  };

  const findNodeAndChildren = (nodes, id) => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children?.length) { const f = findNodeAndChildren(n.children, id); if (f) return f; }
    }
    return null;
  };

  // ─── Fetch counter tree for KOT ──────────────────────────────────────────
  const fetchCounterTree = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category`,
        { params: { client_id: clientId, category_id: 'counter' }, headers: { Authorization: `Bearer ${token}` } }
      );
      setCounterTree(res.data.data?.[0]?.subCategories || []);
    } catch (err) { console.error('Failed to fetch counter tree:', err); }
  };

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchTables = async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } });
    const list = Array.isArray(res.data?.data) ? res.data.data.map(t => ({ ...t, table_number: t.name || t.table_number || "-" })) : [];
    const tw = list.find(t => Number(t.id) === 500); if (tw) setTakeawayTableId(tw.id);
    list.sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }));
    setTables(list);
    await fetchTableOrders(list);
  };

  const fetchTableOrders = async (tableList) => {
    try {
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = r.data?.data || [];
      const map = {};
      tableList.forEach(table => {
        const s = table.status?.toLowerCase();
        if (s === 'occupied' || s === 'served') {
          const o = allOrders
            .filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          if (o) map[table.id] = { id: o.id, dinein_order_id: o.dinein_order_id, status: o.status, created_at: o.created_at, order_count: o.order_count || 1, total_price: o.total_price || 0 };
        }
      });
      setTableOrders(map);
    } catch (err) { console.error("Failed to fetch table orders:", err); }
  };

  const handleDeleteOrder = async (orderId, tableId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
        { params: { dinein_order_id: orderId, client_id: clientId }, headers: { Authorization: `Bearer ${token}` } });
      const tableObj = tables.find(t => t.id === tableId);
      if (tableObj) await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
        { id: tableId, client_id: clientId, name: tableObj.name, table_type: tableObj.table_type, status: 'Vacant', location_zone: tableObj.location_zone },
        { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Order deleted');
      await fetchTables(); setShowDeleteConfirm(false); setOrderToDelete(null);
    } catch (err) { console.error(err); toast.error('Failed to delete order'); }
  };

  const handleMarkAsServed = async (orderId, tableId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: orderId, client_id: clientId, status: 'served' }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Order marked as served');
      await fetchTables();
    } catch (err) { console.error(err); toast.error('Failed to mark as served'); }
  };

  const combineDuplicateItems = items => {
    const m = new Map();
    items.forEach(item => {
      const k = item.item_id.toString();
      if (m.has(k)) m.get(k).quantity += item.quantity || 0;
      else m.set(k, { ...item });
    });
    return Array.from(m.values());
  };

  const handlePrintBill = async (orderId, tableId) => {
    try {
      setLoading(true);
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const order = (r.data?.data || []).find(o => o.id === orderId);
      if (!order) { toast.error('Order not found'); return; }
      const enriched = (order.items || []).map(item => {
        const inv = inventoryMap[item.item_id] || {};
        return { ...item, unit_price: item.unit_price ?? inv.unit_price ?? 0, name: item.item_name ?? inv.name ?? "Unnamed Item" };
      });
      setInvoiceOrderData({ ...order, items: combineDuplicateItems(enriched) });
      setInvoiceModalOpen(true);
    } catch (e) { console.error(e); toast.error("Failed to load order"); }
    finally { setLoading(false); }
  };

  const handleBillFromCart = async () => {
    if (!activeOrderId) { toast.error('No active order'); return; }
    try {
      setLoading(true);
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const order = (r.data?.data || []).find(o => o.id === activeOrderId);
      if (!order) { toast.error('Order not found'); return; }
      const enriched = (order.items || []).map(item => {
        const inv = inventoryMap[item.item_id] || {};
        return { ...item, unit_price: item.unit_price ?? inv.unit_price ?? 0, name: item.item_name ?? inv.name ?? "Unnamed" };
      });
      setInvoiceOrderData({ ...order, items: combineDuplicateItems(enriched) });
      setInvoiceModalOpen(true);
    } catch (e) { console.error(e); toast.error("Failed to load order"); }
    finally { setLoading(false); }
  };

  const handlePrintKOT = () => {
    const itemsToPrint = newItems.length > 0 ? newItems : cart;
    if (itemsToPrint.length === 0) { toast.warn('No items to print KOT for.'); return; }
    const enriched = itemsToPrint.map(ci => {
      if (ci.category_id) return ci;
      const mi = menuItems.find(m => Number(m.id) === Number(ci.id));
      return { ...ci, category_id: mi?.category_id || null };
    });
    const tableObj = tables.find(t => t.id.toString() === selectedTable);
    printKOT({ counterTree, categoriesFlat, itemsToPrint: enriched, meta: { tableNumber: tableObj?.table_number || selectedTable, orderMode, dineinOrderId: activeDineinOrderId, timestamp: new Date() } });
  };

  useEffect(() => {
    const onBack = e => { if (currentView === 'order') { e.preventDefault(); setCurrentView('floor'); setShowCart(false); window.history.pushState({ view: 'floor' }, ''); } };
    window.addEventListener('popstate', onBack); return () => window.removeEventListener('popstate', onBack);
  }, [currentView]);
  useEffect(() => { window.history.pushState({ view: 'floor' }, ''); }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !token || !menuConfig) return;
      try {
        setLoading(true);
        await Promise.all([fetchTables(), fetchCounterTree()]);
        const [catRes, itemRes, invRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.root}`, { headers: { Authorization: `Bearer ${token}` } }),
          // Uses menuInventoryId from env — not hardcoded "menu"
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?inventory_id=${menuConfig.menuInventoryId}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const iMap = {}; (invRes.data?.data || []).forEach(i => (iMap[i.id] = i)); setInventoryMap(iMap);
        const fullTree = catRes.data.data.filter(c => c.name?.toLowerCase() !== "all");
        const subIds   = new Set(); fullTree.forEach(c => c.subCategories?.forEach(s => subIds.add(s.id)));
        const topLevel = fullTree.filter(c => !subIds.has(c.id));
        const flatCats = flattenCategoryTree(topLevel);
        setCategoriesFlat(flatCats.map(c => ({ id: c.id, name: (c.name || '').trim(), parentId: c.parentId ?? c.parent_id ?? null })));
        const enriched = itemRes.data.data.map(item => { const cat = flatCats.find(c => c.id === item.category_id); return { ...item, category_name: cat?.name || "Uncategorized" }; });
        setMenuItems(enriched);
        const buildTree = () => {
          const map = new Map(); flatCats.forEach(c => map.set(c.id, { ...c, count: enriched.filter(i => i.category_id === c.id).length, children: [] }));
          const tree = []; map.forEach(c => { if (c.parentId && map.has(c.parentId)) map.get(c.parentId).children.push(c); else tree.push(c); }); return tree;
        };
        const categoryTree = buildTree().map(c =>
          (c.id === menuConfig.root || c.name?.toLowerCase() === menuConfig.root.toLowerCase())
            ? { ...c, name: 'All Categories', count: c.children.length }
            : c
        );
        setCategories(categoryTree); setSidebarCategories(categoryTree);
        const rootNode = findCategoryNode(categoryTree, menuConfig.root);
        let qc = [];
        if (rootNode) { let l = menuConfig.level; while (l >= 0) { qc = getCategoriesAtLevel(rootNode, l); if (qc.length > 0) break; l--; } }
        setDieterySubCategories(qc);
      } catch (err) { console.error("Fetch error:", err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [clientId, token, realm, menuConfig]);

  const selectedCategoryName = categoriesFlat.find(c => c.id === selectedCategoryId)?.name || "All Categories";

  const getFilteredItems = () => {
    const q = (searchQuery || '').trim().toLowerCase();
    let items = menuItems;
    if (selectedCategoryId) { const ids = getCategoryAndChildrenIds(categories, selectedCategoryId); items = items.filter(i => ids.includes(i.category_id)); }
    if (!q) return items;
    return items.filter(i => (i.name || '').toLowerCase().includes(q) || (i.category_name || '').toLowerCase().includes(q) || String(i.code || '').toLowerCase().includes(q));
  };
  const filteredItems = getFilteredItems();

  // ─── Cart ops ─────────────────────────────────────────────────────────────
  const handleItemClick = item => {
    if (item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0) {
      // ★ Use keyword-based resolver — works for both AC and Non-AC items
      const addonCatId = getAddonCategoryId(item.category_id);

      // Build the set of valid addon category IDs for this item's section
      // (the addon root itself + all its descendant category IDs)
      const addonRoot = flattenCategoryTree(
        // We need to walk our already-flat list to find descendants of addonCatId
        // Reconstruct a mini-tree just for the addon root's children
        []
      );

      // Simpler: collect all category IDs that are descendants of addonCatId
      const getAddonDescendantIds = (rootId) => {
        const ids = new Set([rootId]);
        const addChildren = (parentId) => {
          categoriesFlat.filter(c => c.parentId === parentId).forEach(c => {
            ids.add(c.id);
            addChildren(c.id);
          });
        };
        addChildren(rootId);
        return ids;
      };
      const validAddonCategoryIds = getAddonDescendantIds(addonCatId);

      // Filter line items to only those in the correct addon section
      const lineItems = item.line_item_id.map(id => {
        const ai = menuItems.find(i => i.id === id);
        if (!ai) return null;
        // Check if the addon item's category is within the valid addon category tree
        if (validAddonCategoryIds.has(ai.category_id)) return ai;
        return null;
      }).filter(Boolean);

      if (lineItems.length > 0) {
        setSelectedMainItem(item);
        setLineItemsDetails(lineItems);
        setLineItemsModalOpen(true);
      } else {
        addToCart(item);
      }
    } else {
      addToCart(item);
    }
  };

  const addToCart = (item, parentItemKey = null) => {
    setHasNewItems(true);
    const ts   = Date.now() + Math.random();
    const uKey = `${item.id}_${ts}`;
    let batch  = currentBatchTimestamp;
    if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    setCart(prev => [...prev, {
      id: Number(item.id), name: item.name, unit_price: item.unit_price || 0,
      image_id: item.image_id, discount: item.discount || 0, slug: item.slug,
      category: item.category_name, category_id: item.category_id || null,
      quantity: 1, note: "",
      frontend_unique_key: uKey, batch_timestamp: batch,
      is_new_item: true, saved_sub_order: false,
      parent_item_key: parentItemKey, is_addon: !!parentItemKey,
    }]);
    if (!isMobile) setShowCart(true);
  };

  const handleAddMainItemWithSelectedAddons = selectedAddonIds => {
    if (!selectedMainItem) return;
    const ts = Date.now() + Math.random(); const mKey = `${selectedMainItem.id}_${ts}`;
    let batch = currentBatchTimestamp; if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    setCart(prev => [...prev, {
      id: Number(selectedMainItem.id), name: selectedMainItem.name, unit_price: selectedMainItem.unit_price || 0,
      image_id: selectedMainItem.image_id, discount: selectedMainItem.discount || 0, slug: selectedMainItem.slug,
      category: selectedMainItem.category_name, category_id: selectedMainItem.category_id || null,
      quantity: 1, note: "",
      frontend_unique_key: mKey, batch_timestamp: batch, is_new_item: true, saved_sub_order: false, has_addons: selectedAddonIds.length > 0,
    }]);
    lineItemsDetails.filter(i => selectedAddonIds.includes(i.id)).forEach(addon => {
      const ats = Date.now() + Math.random(); const aKey = `${addon.id}_${ats}`;
      setCart(prev => [...prev, {
        id: Number(addon.id), name: addon.name, unit_price: addon.unit_price || 0,
        image_id: addon.image_id, discount: addon.discount || 0, slug: addon.slug,
        category: addon.category_name, category_id: addon.category_id || null,
        quantity: 1, note: "",
        frontend_unique_key: aKey, batch_timestamp: batch, is_new_item: true, saved_sub_order: false,
        parent_item_key: mKey, is_addon: true,
      }]);
    });
    setHasNewItems(true); setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]);
  };

  const handleAddMainItemOnly = () => {
    if (!selectedMainItem) return;
    const ts = Date.now() + Math.random(); const uKey = `${selectedMainItem.id}_${ts}`;
    let batch = currentBatchTimestamp; if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    setHasNewItems(true);
    setCart(prev => [...prev, {
      id: Number(selectedMainItem.id), name: selectedMainItem.name || 'Unnamed Item', unit_price: selectedMainItem.unit_price || 0,
      image_id: selectedMainItem.image_id, discount: selectedMainItem.discount || 0, slug: selectedMainItem.slug,
      category: selectedMainItem.category_name, category_id: selectedMainItem.category_id || null,
      quantity: 1, note: "",
      frontend_unique_key: uKey, batch_timestamp: batch, is_new_item: true, saved_sub_order: false,
    }]);
    setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]);
    if (!isMobile) setShowCart(true);
  };

  const removeFromCart = (itemId, uniqueKey = null) => {
    setHasNewItems(true);
    if (uniqueKey) setCart(cart.filter(i => i.frontend_unique_key !== uniqueKey && i.parent_item_key !== uniqueKey));
    else setCart(cart.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId, change, uniqueKey = null) => {
    setHasNewItems(true);
    setCart(cart.map(item => {
      const match = uniqueKey ? item.frontend_unique_key === uniqueKey : item.id === itemId && !item.frontend_unique_key;
      if (match) { const q = item.quantity + change; return q > 0 ? { ...item, quantity: q } : null; }
      return item;
    }).filter(Boolean));
  };

  const getTotalPrice = () => cart.reduce((t, i) => t + (i.unit_price || 0) * i.quantity, 0).toFixed(2);

  // ─── Place order ──────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (isPlacingRef.current || !canPlaceOrder) return;
    isPlacingRef.current = true; setIsPlacingOrder(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (activeOrderId && activeDineinOrderId) {
        const newOnly = cart.filter(i => i.is_new_item && !i.saved_sub_order);
        if (newOnly.length > 0) {
          const r = await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create-sub-order`,
            { items: newOnly.map(i => ({ item_id: i.id, item_name: i.name, quantity: i.quantity, unit_price: i.unit_price, line_total: i.unit_price * i.quantity, slug: i.slug, frontend_unique_key: i.frontend_unique_key })) },
            { headers, params: { client_id: clientId, parent_dinein_order_id: activeDineinOrderId } },
          );
          toast.success(`Sub-order ${r.data.data.dinein_order_id} created!`);
        }
      } else {
        const total = cart.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
        await axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
          { client_id: clientId, table_id: Number(selectedTable), price: total, gst: 0, cst: 0, total_price: total, status: "pending", items: cart.map(i => ({ item_id: i.id, item_name: i.name, quantity: i.quantity, unit_price: i.unit_price, line_total: i.unit_price * i.quantity, status: "pending", slug: i.slug })) },
          { headers },
        );
        const tableToUpdate = tables.find(t => t.id.toString() === selectedTable);
        if (tableToUpdate) await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          { ...tableToUpdate, id: Number(selectedTable), status: "Occupied", table_type: tableToUpdate.table_type.toString() }, { headers });
      }
      await fetchTables();
      setCart([]); setActiveOrderId(null); setActiveDineinOrderId(null);
      setShowCart(false); setCurrentView("floor"); setCurrentBatchTimestamp(null); setHasNewItems(false);
      toast.success('Order placed!');
    } catch (err) { console.error("ORDER ERROR:", err); toast.error("Order failed"); }
    finally { isPlacingRef.current = false; setIsPlacingOrder(false); }
  };

  const handleTableSelect  = table => { setSelectedTable(table.id.toString()); setCurrentView('order'); window.history.pushState({ view: 'order' }, ''); };
  const handleTakeawaySelect = () => { setOrderMode('takeaway'); setSelectedTable(takeawayTableId.toString()); setCurrentView('order'); window.history.pushState({ view: 'order' }, ''); };
  const handleClearCart    = () => { if (cart.length === 0) return; setShowClearConfirm(true); };
  const confirmClearCart   = () => {
    setCart([]); setSelectedTable(''); setCurrentView('floor'); setShowCart(false); setShowClearConfirm(false);
    setActiveOrderId(null); setActiveDineinOrderId(null); setCurrentBatchTimestamp(null); setHasNewItems(false);
  };

  const handleViewOrder = async table => {
    if (menuItems.length === 0) { alert("Menu still loading..."); return; }
    try {
      setLoading(true);
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = r.data?.data || [];
      const tableGroups = allOrders.filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed');
      if (tableGroups.length === 0) { alert('No active order'); return; }
      const activeOrder = tableGroups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      setActiveOrderId(activeOrder.id); setActiveDineinOrderId(activeOrder.dinein_order_id);
      setHasNewItems(false); setCurrentBatchTimestamp(null);
      const reconstructedCart = (activeOrder.items || []).map(item => {
        const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
        return { id: Number(item.item_id), name: item.item_name || menuItem?.name || 'Unnamed Item', unit_price: item.unit_price || menuItem?.unit_price || 0, quantity: item.quantity || 1, note: item.note || '', image_id: menuItem?.image_id, discount: menuItem?.discount || 0, slug: item.slug || menuItem?.slug, category: menuItem?.category_name, category_id: menuItem?.category_id || null, frontend_unique_key: item.frontend_unique_key, batch_timestamp: null, is_new_item: false, saved_sub_order: true, status: item.status || "pending", batch_label: item.batch_label, sub_order_id: item.sub_order_id };
      });
      setCart(reconstructedCart); setSelectedTable(table.id.toString()); setOrderMode('dinein'); setCurrentView('order'); setShowCart(true);
      window.history.pushState({ view: 'order' }, '');
    } catch (err) { console.error(err); alert('Failed to load order'); }
    finally { setLoading(false); }
  };

  const handleBackToTables = () => {
    setCurrentView('floor'); setShowCart(false); setSelectedTable(''); setCart([]);
    setActiveOrderId(null); setActiveDineinOrderId(null); setCurrentBatchTimestamp(null); setHasNewItems(false);
    setSelectedCategoryId("All Categories"); setSidebarCategories(categories);
  };

  // ─── Split cart ───────────────────────────────────────────────────────────
  const oldItems = cart.filter(i => !i.is_new_item || i.saved_sub_order);
  const newItems = cart.filter(i => i.is_new_item && !i.saved_sub_order);
  const groupedNewItems   = newItems.reduce((acc, item) => { const b = item.batch_timestamp || 'default'; if (!acc[b]) acc[b] = []; acc[b].push(item); return acc; }, {});
  const batchTimestamps   = Object.keys(groupedNewItems).sort();
  const canPlaceOrder     = orderMode === 'takeaway' ? cart.length > 0 : activeOrderId ? hasNewItems && newItems.length > 0 : selectedTable && cart.length > 0;

  const getGroupedCartItems = items => {
    const grouped = []; const processed = new Set();
    items.forEach(item => {
      if (processed.has(item.frontend_unique_key || item.id)) return;
      if (!item.is_addon && !item.parent_item_key) {
        const addons = items.filter(i => i.parent_item_key === item.frontend_unique_key);
        grouped.push({ main: { ...item }, addons });
        processed.add(item.frontend_unique_key || item.id);
        addons.forEach(a => processed.add(a.frontend_unique_key || a.id));
      }
    });
    return grouped;
  };

  const OldItemRow = ({ group }) => {
    const { main, addons } = group;
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
              <ImagePreview clientId={clientId} imageId={main.image_id} token={token} alt={main.name}
                baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                className="w-full h-full object-cover"/>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold truncate text-gray-800">{main.name}</h4>
              <p className="text-xs font-bold text-action-primary">₹{(main.unit_price - (main.discount || 0)).toFixed(2)}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {main.batch_label && main.batch_label !== activeDineinOrderId && (
                  <span className="text-xs text-orange-500 font-mono font-semibold">#{main.batch_label}</span>
                )}
                {main.status && <ItemStatusBadge status={main.status}/>}
              </div>
            </div>
          </div>
          <span className="text-sm font-semibold text-gray-500 self-center">×{main.quantity}</span>
        </div>
        {addons.map(addon => (
          <div key={addon.frontend_unique_key || addon.id} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-blue-50/50">
            <span className="text-xs text-blue-600">↳</span>
            <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
            <span className="text-xs font-semibold text-blue-600">₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}</span>
            <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
          </div>
        ))}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">
      {currentView === 'floor' && (
        <TableReservation tables={tables} onSelectTable={handleTableSelect} onSelectTakeaway={handleTakeawaySelect}
          onSelectDineIn={() => setOrderMode('dinein')} onViewOrder={handleViewOrder} orderMode={orderMode}
          tableOrders={tableOrders} onPrintBill={handlePrintBill}
          onDeleteOrder={(orderId, tableId) => { setOrderToDelete({ orderId, tableId }); setShowDeleteConfirm(true); }}
          onMarkAsServed={handleMarkAsServed}/>
      )}

      {currentView === 'order' && (
        <div className="mx-auto px-2 py-2">
          <div className="grid lg:grid-cols-4 gap-1">
            <div className="w-full lg:col-span-1">
              <div className="lg:h-[calc(98dvh-4rem)] lg:overflow-y-auto pr-1">
                <CategoryTree categories={sidebarCategories} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} defaultOpenAll/>
              </div>
            </div>

            <div className="lg:col-span-3 flex gap-2">
              <div className="transition-all duration-300 border-default border-border-default p-2 rounded-lg flex-1 overflow-y-auto h-[calc(98dvh-4rem)] lg:h-auto lg:max-h-[calc(98dvh-4rem)]">
                <div className="space-y-2">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {dieterySubCategories.map(cat => (
                      <button key={cat.id} onClick={() => { setSelectedCategoryId(cat.id); const n = findNodeAndChildren(categories, cat.id); if (n) setSidebarCategories([n]); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border whitespace-nowrap transition-all flex-shrink-0
                          ${selectedCategoryId === cat.id ? 'bg-action-primary text-white border-action-primary' : 'bg-bg-tertiary text-text-primary hover:border-action-primary'}`}>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between lg:flex-row flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <button onClick={handleBackToTables} className="p-2 rounded-lg bg-bg-tertiary border border-border-default hover:bg-bg-secondary"><ArrowLeft size={20}/></button>
                      <h2 className="text-xl font-semibold text-text-primary truncate">{selectedCategoryName}<span className="text-sm ml-2">({filteredItems.length})</span></h2>
                    </div>
                    <div className="relative w-64 max-w-full">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"/>
                      <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search items..."
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"/>
                    </div>
                  </div>
                </div>

                <div className={`grid gap-2 grid-cols-2 md:grid-cols-4 ${showCart ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                  {filteredItems.map(item => {
                    const dp = item.discount && item.unit_price && Number(item.discount) > 0 ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(0) : null;
                    const ac = item.line_item_id?.length || 0;
                    return (
                      <div onClick={() => handleItemClick(item)} key={item.id}
                        className="flex gap-2 items-center bg-bg-primary border-default border-border-default rounded-xl p-1 shadow-sm hover:shadow-md transition cursor-pointer">
                        <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                          <ImagePreview clientId={clientId} imageId={item.image_id} token={token} alt={item.name}
                            baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                            urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                            className="w-full h-full object-cover"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-text-primary line-clamp-2">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {dp ? (<><span className="text-sm font-bold text-action-primary">₹{(item.unit_price - item.discount).toFixed(0)}</span><span className="text-xs line-through text-text-secondary">₹{item.unit_price}</span><span className="text-xs text-action-danger font-semibold">{dp}% OFF</span></>) :
                              (<span className="text-sm font-bold text-action-primary">₹{item.unit_price}</span>)}
                          </div>
                          {ac > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">+{ac} addon{ac > 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!isMobile && (
                <div className={`transition-all duration-300 ease-in-out ${showCart ? 'w-[22rem] opacity-100 z-30' : 'w-0 opacity-0'}`}>
                  <div className="border border-gray-300 rounded-xl bg-white shadow-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
                    <div className="flex flex-col h-full p-4">
                      <div className="pb-3 border-b space-y-2">
                        <h2 className="text-lg font-semibold text-gray-800">Your Order</h2>
                        <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            {orderMode === 'dinein' && selectedTable && (
                              <span className="font-semibold text-lg text-gray-700">{tables.find(t => t.id.toString() === selectedTable)?.table_number}</span>
                            )}
                            {activeDineinOrderId && <span className="text-xs text-gray-500 font-mono">#{activeDineinOrderId}</span>}
                          </div>
                          <span className="text-base font-bold text-red-600">₹{getTotalPrice()}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                          <button onClick={() => setOrderMode('dinein')} className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${orderMode === 'dinein' ? 'bg-action-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}><Users size={16}/>Dine In</button>
                          <button onClick={() => { setOrderMode('takeaway'); setSelectedTable(takeawayTableId?.toString()); }} className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${orderMode === 'takeaway' ? 'bg-action-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}><Package size={16}/>Takeaway</button>
                        </div>
                      </div>

                      {cart.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No items added</div>
                      ) : (
                        <>
                          <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                            {getGroupedCartItems(oldItems).map((group, idx) => <OldItemRow key={`old-${idx}`} group={group}/>)}

                            {activeOrderId && oldItems.length > 0 && newItems.length > 0 && (
                              <div className="flex items-center gap-2 my-2">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"/>
                                <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"/>
                              </div>
                            )}

                            {batchTimestamps.map((ts, bi) => (
                              <React.Fragment key={ts}>
                                {bi > 0 && (
                                  <div className="flex items-center gap-2 my-2">
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"/>
                                    <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"/>
                                  </div>
                                )}
                                {getGroupedCartItems(groupedNewItems[ts]).map((group, idx) => (
                                  <div key={`new-${ts}-${idx}`} className="space-y-1">
                                    <div className="flex items-center gap-2 p-3 rounded-xl border bg-orange-50 shadow-sm">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
                                          <ImagePreview clientId={clientId} imageId={group.main.image_id} token={token} alt={group.main.name}
                                            baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                                            urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                                            className="w-full h-full object-cover"/>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h4 className="text-sm font-semibold truncate text-gray-800">{group.main.name}</h4>
                                          <p className="text-xs font-bold text-action-primary">₹{(group.main.unit_price - (group.main.discount || 0)).toFixed(2)}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => updateQuantity(group.main.id, -1, group.main.frontend_unique_key)} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"><Minus size={14}/></button>
                                        <span className="w-6 text-center text-sm font-semibold">{group.main.quantity}</span>
                                        <button onClick={() => updateQuantity(group.main.id, 1, group.main.frontend_unique_key)} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"><Plus size={14}/></button>
                                      </div>
                                      <button onClick={() => removeFromCart(group.main.id, group.main.frontend_unique_key)} className="text-action-primary hover:text-red-700"><X size={16}/></button>
                                    </div>
                                    {group.addons.map(addon => (
                                      <div key={addon.frontend_unique_key} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-orange-100/50">
                                        <span className="text-xs text-orange-600">↳</span>
                                        <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
                                        <span className="text-xs font-semibold text-orange-600">₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}</span>
                                        <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </React.Fragment>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <button onClick={handlePlaceOrder}
                              className={`py-2 rounded-lg text-sm font-semibold ${canPlaceOrder && !isPlacingOrder ? 'bg-action-primary text-white hover:bg-action-danger' : 'bg-gray-300 cursor-not-allowed'}`}
                              disabled={!canPlaceOrder || isPlacingOrder}>
                              {isPlacingOrder ? 'Placing...' : 'Place Order'}
                            </button>
                            <button onClick={handleBillFromCart} className="py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1"><FileText size={16}/>Bill</button>
                            <button onClick={handleClearCart} className="py-2 border rounded-lg text-sm hover:bg-gray-100">Clear</button>
                            <button onClick={handlePrintKOT} disabled={cart.length === 0}
                              className={`py-2 border rounded-lg text-sm flex items-center justify-center gap-1 transition-colors ${cart.length > 0 ? 'hover:bg-gray-100 text-gray-700' : 'opacity-40 cursor-not-allowed text-gray-400'}`}>
                              <PrinterIcon size={16}/>Print KOT
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

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-80 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Clear all items?</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={confirmClearCart} className="flex-1 py-2 bg-action-primary text-white rounded-lg hover:bg-action-danger">Clear</button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40"><ShoppingCart size={24}/></button>
      )}

      <LineItemsModal isOpen={lineItemsModalOpen} onClose={() => { setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]); }}
        mainItem={selectedMainItem} lineItems={lineItemsDetails} onAddMainOnly={handleAddMainItemOnly} onAddWithSelectedAddons={handleAddMainItemWithSelectedAddons}/>
      <DeleteConfirmModal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setOrderToDelete(null); }}
        onConfirm={() => { if (orderToDelete) handleDeleteOrder(orderToDelete.orderId, orderToDelete.tableId); }}/>

      {invoiceModalOpen && invoiceOrderData && (
        <InvoiceModal clientId={clientId} token={token} selectedOrder={invoiceOrderData}
          tablesMap={tables.reduce((m, t) => { m[t.id] = t; return m; }, {})} inventoryMap={inventoryMap}
          onClose={() => { setInvoiceModalOpen(false); setInvoiceOrderData(null); fetchTables(); }}
          onSave={id => { console.log('Invoice saved:', id); fetchTables(); }}/>
      )}
    </div>
  );
};

export default TakeOrder;