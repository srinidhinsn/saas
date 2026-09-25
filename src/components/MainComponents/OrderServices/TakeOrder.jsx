import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  ShoppingCart, Plus, Minus, X, Check, Search,
  Users, Package, Trash2, ArrowLeft, FileText, Mail, MapPin,  
  Printer as PrinterIcon, Clock, Save, User, Phone,Truck,
} from 'lucide-react';
import { Eye, Lock, Printer } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import CategoryTree from '../InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';
import InvoiceModal from '../BillingServices/InvoiceModal';
import { getMenuConfig } from '../../utils/menuConfigResolver';
import { menuCache } from '../../utils/Menu-utils/menuCache';
import { getDietaryFromSlug, isItemActive,buildCartItem, getGroupedCartItems, deduplicateOrderItems,getCategoryAndChildrenIds, isPackagingCategoryId,isDeliveryChargeCategoryId, excludePackagingItems, relinkCartItemsToParents}
         from '../../utils/Menu-utils/menuUtils';
import {useDietaryTypes, useTimings, useZoneConfig, useMenuData,useCounterTree} from '../../utils/Menu-utils/useMenuData';
import { parseISTTimestamp } from '../../utils/dateRange';
import CustomerAutocomplete from '../BillingServices/CustomerAutocomplete';
import { useInvoiceModal } from '../../utils/BillingUtils';
import {
  TransferTableModal,
  ItemStatusBadge,
  CancelOrderConfirmModal,
  OldItemDeleteModal,
  CustomerCapturePanel,
  AddressSelectPanel,
  DeliveryDetailsSummary,
  DeliveryDetailsModal,
  TablePaymentConfirmModal,
  LineItemsModal,
  ComboDetailModal,
  OldItemRow,
  NewItemRow,
  TableReservation,
  TakeawayOrdersModal,
  StockConfirmModal,
  getUserIdFromToken,
  readDraft,
  writeDraft,
  getDraftTableIdsFromOrders,
  deleteDraftFromDB,
  upsertBillingDocumentForCustomer,
  printKOT
} from './TakeOrderModals';

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
  // const [menuItems, setMenuItems] = useState([]);
  // const [categories, setCategories] = useState([]);
  // const [categoriesFlat, setCategoriesFlat] = useState([]);
  // const [dieterySubCategories, setDieterySubCategories] = useState([]);
  const [sidebarCategories, setSidebarCategories] = useState([]);
  // const [counterTree, setCounterTree] = useState([]);
  const [inventoryMap, setInventoryMap] = useState({});
  // const [loading, setLoading] = useState(true);
//   const { dietaryOptions, dietaryColorMap } = useDietaryTypes({ clientId, token });
// const { timingOptions }                   = useTimings({ clientId, token });
// const { sections, zones }                 = useZoneConfig({ clientId, token });
  // ── Order context ─────────────────────────────────────────────────────────
  const [selectedTable, setSelectedTable] = useState('');
  const [takeawayTables, setTakeawayTables] = useState([]);
  const [walkinTables, setWalkinTables] = useState([]);
  const [deliveryTables, setDeliveryTables] = useState([]);
  const [walkinTableId, setWalkinTableId] = useState(null);
  const [deliveryTableId, setDeliveryTableId] = useState(null);
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
  const [showDeliveryDetailsModal, setShowDeliveryDetailsModal] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({ customer_id: '', contact_phone: '',contact_email: '',shipping_address: '', });
  const [customersList, setCustomersList] = useState([]);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
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

  const {
  invoiceModalOpen,
  invoiceOrderData,
  openInvoiceForOrder,
  closeInvoiceModal,
} = useInvoiceModal({ clientId, token, inventoryMap });

  const [oldItemDeleteModal, setOldItemDeleteModal] = useState({ isOpen: false, item: null });

  const searchInputRef = useRef(null);
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;

  const [pendingPackagingItems, setPendingPackagingItems] = useState([]);

  // const [takeawaySections, setTakeawaySections] = useState([]);
  const [zoneConfigId, setZoneConfigId] = useState(null);
  const [selectedDietary, setSelectedDietary] = useState(null);
  const [showTakeawayOrdersModal, setShowTakeawayOrdersModal] = useState(false);
  const hasFetchedRef = useRef(false);
  const menuConfig = useMemo(
    () => (clientId ? getMenuConfig(clientId) : null),
    [clientId]
  );
  const {
    menuItems,
    allMenuItemsRaw,
    categories,
    categoriesFlat,
    dieterySubCategories,
    dedupedMenuItems,
    requiredScreenId,
    loading,
    refetch: fetchData,
  } = useMenuData({
    clientId,
    token,
    menuConfig,
    zoneConfigId,
    includeAllRaw: true,
  });
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [pendingStockConfirm, setPendingStockConfirm] = useState(null);
  
  const getAvailability = useCallback((item) => {
    if (!item) return null;
    const override = availabilityMap[item.id];
    return override !== undefined ? override : (item.availability != null ? Number(item.availability) : null);
  }, [availabilityMap]);
  
  const adjustAvailability = useCallback((itemId, delta) => {
    setAvailabilityMap(prev => {
      const current = prev[itemId] !== undefined
        ? prev[itemId]
        : (menuItems.find(mi => Number(mi.id) === Number(itemId))?.availability ?? null);
      if (current == null) return prev; // item doesn't track stock at all
      return { ...prev, [itemId]: Number(current) + delta };
    });
  }, [menuItems]);
  // ─────────────────────────────────────────────────────────────────────────
  // Draft helpers
  // ─────────────────────────────────────────────────────────────────────────
  const { counterTree } = useCounterTree({
    clientId,
    token,
  });
  
  const {
    sections,
    takeawaySections,
    zones,
  } = useZoneConfig({
    clientId,
    token,
    takeawayRootEnv: menuConfig?.takeawayTableRoot,
  });
  
  const {
    dietaryOptions,
    dietaryColorMap,
  } = useDietaryTypes({
    clientId,
    token,
  });
  
  const {
    timingOptions,
  } = useTimings({
    clientId,
    token,
  });
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

  const attachPackagingIfTakeaway = (mainKey, batch, packagingItems) => {
  if (!['takeaway', 'delivery'].includes(orderMode) || !mainKey || !packagingItems?.length) return;
  packagingItems.forEach(pkg => {
    const pkgEntry = buildCartItem(pkg, {
      batch_timestamp: batch,
      parent_item_key: mainKey,
      is_addon: true,
      _item_type: 'addon',       // reuse the known-good addon path for pricing
      is_container: true,        // custom flag for later identification only
    });
    setCart(prev => [...prev, {
      ...pkgEntry,
      unit_price: Number(pkg.unit_price) || 0,   // force-cast in case buildCartItem left it stringy/undefined
    }]);
  });
};

const syncPackagingForOrderMode = (newMode) => {
  setCart(prev => {
    if (['takeaway', 'delivery'].includes(newMode)) {
      const additions = [];
      prev
        .filter(i => !i.parent_item_key && !i.saved_sub_order)
        .forEach(mainItem => {
          const menuRecord = menuItems.find(mi => Number(mi.id) === Number(mainItem.id));
          const linkedIds = menuRecord?.line_item_id || [];
          if (!linkedIds.length) return;

          const alreadyHasPackaging = prev.some(
            i => i.parent_item_key === mainItem.frontend_unique_key && i.is_container
          );
          if (alreadyHasPackaging) return;

          linkedIds
            .map(id => menuItems.find(mi => Number(mi.id) === Number(id)))
            .filter(li => li && isPackagingCategoryId(li.category_id, categoriesFlat))
            .forEach(pkg => {
              const batch = mainItem.batch_timestamp || currentBatchTimestamp || Date.now();
              const entry = buildCartItem(pkg, {
                batch_timestamp: batch,
                parent_item_key: mainItem.frontend_unique_key,
                is_addon: true,
                _item_type: 'addon',
                is_container: true,
              });
              additions.push({ ...entry, unit_price: Number(pkg.unit_price) || 0 });
            });
        });
      return [...prev, ...additions];
    }
    // Switching back to dine-in — drop any unsaved packaging containers
    return prev.filter(i => !(i.is_container && !i.saved_sub_order));
  });
};
const syncDeliveryChargeForOrderMode = (newMode) => {
  setCart(prev => {
    if (newMode === 'delivery') {
      const already = prev.some(i => i.is_delivery_charge && !i.saved_sub_order);
      if (already) return prev;

      const chargeItem = menuItems.find(mi =>
        isDeliveryChargeCategoryId(mi.category_id, categoriesFlat)
      );
      if (!chargeItem) return prev; // not configured — silently skip

      const batch = currentBatchTimestamp || Date.now();
      const entry = buildCartItem(chargeItem, {
        batch_timestamp: batch,
        is_addon: false,
        _item_type: 'delivery_charge',
      });
      return [...prev, {
        ...entry,
        unit_price: Number(chargeItem.unit_price) || 0,
        quantity: 1,
        is_delivery_charge: true,
      }];
    }
    return prev.filter(i => !(i.is_delivery_charge && !i.saved_sub_order));
  });
};
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

  const fetchTableOrders = async (tableList = []) => {
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

  const fetchTables = useCallback(async () => {
    const takeawayRoots = (menuConfig?.takeawayTableRoot || 'takeaway')
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);
  
    const walkinRoots = (menuConfig?.walkinTableRoot || 'walkin')
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);
  
    const deliveryRoots = (menuConfig?.deliveryTableRoot || 'delivery')
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);
  
    const [tableRes, configRes] = await Promise.all([
      axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ]);
  
    const freshConfigs = configRes.data || [];
  
    const list = Array.isArray(tableRes.data?.data)
      ? tableRes.data.data.map(t => {
          const matchedConfig = freshConfigs.find(
            c =>
              c.section?.trim().toLowerCase() === t.section?.trim().toLowerCase() &&
              c.zone?.trim().toLowerCase() === t.location_zone?.trim().toLowerCase()
          );
          return {
            ...t,
            table_number: t.name || t.table_number || '-',
            config_id: matchedConfig?.id || null,
          };
        })
      : [];
  
    const takeaway = list.filter(t =>
      takeawayRoots.some(root => (t.name || '').toLowerCase().startsWith(root))
    );
    setTakeawayTables(takeaway);
    if (takeaway.length > 0) setTakeawayTableId(takeaway[0].id);
  
    const walkin = list.filter(t =>
      walkinRoots.some(root => (t.name || '').toLowerCase().startsWith(root))
    );
    setWalkinTables(walkin);
    if (walkin.length > 0) setWalkinTableId(walkin[0].id);
  
    const delivery = list.filter(t =>
      deliveryRoots.some(root => (t.name || '').toLowerCase().startsWith(root))
    );
    setDeliveryTables(delivery);
    if (delivery.length > 0) setDeliveryTableId(delivery[0].id);
  
    list.sort((a, b) =>
      a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
    );
    setTables(list);
    await fetchTableOrders(list);
  }, [clientId, token, menuConfig]);

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
  useEffect(() => {
    if (menuItems.length > 0 && Object.keys(availabilityMap).length === 0) {
      const seed = {};
      menuItems.forEach(mi => { if (mi.availability != null) seed[mi.id] = Number(mi.availability); });
      setAvailabilityMap(seed);
    }
  }, [menuItems]);
  // ─────────────────────────────────────────────────────────────────────────
  // Navigation helpers
  // ─────────────────────────────────────────────────────────────────────────


const handleDeliverySelect = async () => {
  const t = deliveryTables[0];
  if (!t) { toast.error('Delivery table not configured. Check VITE_DELIVERY_TABLE_DEFAULT_ROOT.'); return; }

  setOrderMode('delivery');
  setActiveOrderId(null);
  setActiveDineinOrderId(null);
  setHasNewItems(false);
  setCurrentBatchTimestamp(null);
  setSelectedTable(t.id.toString());
  setDeliveryTableId(t.id);
  setZoneConfigId(t.config_id || null);
  setCart([]);
  setCustomerDetails({ customer_id: '', contact_phone: '', contact_email: '', shipping_address: '' });
  setShowDeliveryDetailsModal(true); 
  setShowCart(true);
  syncDeliveryChargeForOrderMode('delivery');
  goToOrderView();
};

const handleWalkInSelect = async () => {
  const t = walkinTables[0];
  if (!t) { toast.error('Walk-in table not configured. Check VITE_WALKIN_TABLE_DEFAULT_ROOT.'); return; }

  setOrderMode('walkin');
  setActiveOrderId(null);
  setActiveDineinOrderId(null);
  setHasNewItems(false);
  setCurrentBatchTimestamp(null);
  setSelectedTable(t.id.toString());
  setWalkinTableId(t.id);
  setZoneConfigId(t.config_id || null);
  setCart([]);
  setSelectedAddressId('');
  setShowCart(true);
  goToOrderView();
};
  useEffect(() => {
    if (!token || !clientId) return;
  
    const fetchUsernameAndAddresses = async () => {
      try {
        const userId = getUserIdFromToken(token);
        if (!userId) return;
  
        const usersRes = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/users`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const users = usersRes.data?.data?.users || [];
        const match = users.find(u => u.client_id === clientId) || users[0];
  
        setCustomerDetails(prev => ({
          ...prev,
          customer_id: userId,
          customer_name: match?.username || '',
        }));
  
        if (match?.id) {
          try {
            const addrRes = await axios.get(
              `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const addresses = addrRes.data?.data?.addresses || [];
            setCustomerAddresses(addresses);
          } catch {
            setCustomerAddresses([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err?.response?.data || err.message);
      }
    };
  
    fetchUsernameAndAddresses();
  }, [clientId, token]);
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
      // setLoading(true);
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
      console.log("error");
      
      // setLoading(false);
    }
  };
  
  const selectOrderTable = async ({
    table,
    mode = "dinein",
    restoreDraft = false,
    openTakeawayModal = false,
  }) => {
    const tableIdStr = table.id.toString();
    const resolvedZoneConfigId = table.config_id || null;
  
    setActiveOrderId(null);
    setActiveDineinOrderId(null);
    setHasNewItems(false);
    setCurrentBatchTimestamp(null);
  
    setOrderMode(mode);
    setSelectedTable(tableIdStr);
    setZoneConfigId(resolvedZoneConfigId);
  
    if (mode === "dinein") {
      setDineinTableId(tableIdStr);
    }
  
    if (restoreDraft) {
      const draft = await readDraft(tableIdStr, clientId, token);
  
      if (draft) {
        const restoredCart = (draft.items || []).flatMap(item => {
          const menuItem = menuItems.find(
            mi => Number(mi.id) === Number(item.item_id)
          );
  
          const mainKey =
            item.frontend_unique_key ||
            `${item.item_id}_restored_${Date.now()}`;
  
          const mainEntry = {
            id: Number(item.item_id),
            name: item.item_name || menuItem?.name || "Item",
            unit_price: item.unit_price ?? menuItem?.unit_price ?? 0,
            discount: menuItem?.discount || 0,
            image_id: menuItem?.image_id,
            slug: item.slug || menuItem?.slug,
            category: menuItem?.category_name,
            category_id: menuItem?.category_id || null,
            quantity: item.quantity || 1,
            note: "",
            frontend_unique_key: mainKey,
            batch_timestamp: null,
            is_new_item: true,
            saved_sub_order: false,
            status: "draft",
            is_addon: false,
            parent_item_key: null,
          };
  
          const addonEntries = (item.line_item_id || [])
            .map((addonId, idx) => {
              const addonMenuItem = menuItems.find(
                mi => Number(mi.id) === Number(addonId)
              );
  
              if (!addonMenuItem) return null;
  
              return {
                id: Number(addonId),
                name: addonMenuItem.name,
                unit_price: addonMenuItem.unit_price ?? 0,
                discount: addonMenuItem.discount || 0,
                image_id: addonMenuItem.image_id,
                slug: addonMenuItem.slug,
                category: addonMenuItem.category_name,
                category_id: addonMenuItem.category_id || null,
                quantity: 1,
                note: "",
                frontend_unique_key: `${addonId}_addon_${mainKey}_${idx}`,
                batch_timestamp: null,
                is_new_item: true,
                saved_sub_order: false,
                status: "draft",
                is_addon: true,
                parent_item_key: mainKey,
              };
            })
            .filter(Boolean);
  
          return [mainEntry, ...addonEntries];
        });
  
        setCart(restoredCart);
        setHasNewItems(true);
        setDraftSavedAt(Date.now());
  
        setCustomerDetails({
          customer_id: draft.customer_id || "",
          contact_phone: draft.contact_phone || "",
        });
  
        toast.info("Draft restored for this table.", {
          autoClose: 2000,
        });
      } else {
        setCart([]);
        setDraftSavedAt(null);
        setCustomerDetails({
          customer_id: "",
          contact_phone: "",
        });
      }
    } else {
      setCart([]);
      setCustomerDetails({
        customer_id: "",
        contact_phone: "",
      });
    }
  
    setShowCart(true);
  
    if (openTakeawayModal) {
      setShowTakeawayOrdersModal(true);
    }
  
    goToOrderView();
  };
  const handleTableSelect = async (table) => {
    await selectOrderTable({
      table,
      mode: "dinein",
      restoreDraft: true,
    });
  };

  const handleTakeawaySelect = async () => {
    if (!takeawayTables.length) {
      toast.error("No takeaway table configured");
      return;
    }
  
    const tableIdStr = (
      takeawayTableId || takeawayTables[0].id
    ).toString();
  
    const takeawayTable = tables.find(
      t => String(t.id) === tableIdStr
    );
  
    await selectOrderTable({
      table: takeawayTable,
      mode: "takeaway",
      restoreDraft: false,
      openTakeawayModal: true,
    });
  };
  const handleTakeawayOrderSelected = async (existingOrder) => {
    const tableIdStr = (takeawayTableId || takeawayTables[0].id).toString();
    const takeawayTable = tables.find(t => String(t.id) === tableIdStr);
    const takeawayZoneConfigId = takeawayTable?.config_id || null; 
    setOrderMode('takeaway');
    setSelectedTable(tableIdStr);
    setZoneConfigId(takeawayZoneConfigId);
  
    if (!existingOrder) {
      setActiveOrderId(null);
      setActiveDineinOrderId(null);
      setCart([]);
      setHasNewItems(false);
      setCurrentBatchTimestamp(null);
      setDraftSavedAt(null);
    } else {
      const reconstructedCart = relinkCartItemsToParents(
         (existingOrder.items || []).map(item => {
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
      }));
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
      // setLoading(true);
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

      const reconstructedCart = relinkCartItemsToParents(
        (activeOrder.items || []).map(item => {
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
      }));

      setCart(reconstructedCart);
      setSelectedTable(table.id.toString());
      const tableObj = tables.find(t => t.id === table.id);
      setZoneConfigId(tableObj?.config_id || null);
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
      console.log("error");
      
      // setLoading(false);
    }
  };

  const handleBackToTables = () => {
    // Leave cart & draft untouched — waiter can return to same table
    goToFloor();
  };
  const initializeTakeOrder = useCallback(async () => {
    if (!clientId || !token) return;
  
    try {
      await Promise.all([
        fetchTables(),
        fetchTableOrders()
      ]);
    } catch (err) {
      console.error("TakeOrder initialization failed:", err);
    }
  }, [clientId, token]);
  useEffect(() => {
    initializeTakeOrder();
  }, [initializeTakeOrder]);

  const hasAutoModeSelectRef = useRef(false);

useEffect(() => {
  if (hasAutoModeSelectRef.current) return;
  if (tables.length === 0) return; // wait until tables have actually loaded

  const dineinTableCount = tables.length - takeawayTables.length - walkinTables.length - deliveryTables.length;
  const hasDineinTables = dineinTableCount > 0;

  const availableModes = [
    hasDineinTables && 'dinein',
    walkinTables.length > 0 && 'walkin',
    takeawayTables.length > 0 && 'takeaway',
    deliveryTables.length > 0 && 'delivery',
  ].filter(Boolean);

  hasAutoModeSelectRef.current = true;

  // Only auto-jump when dine-in isn't an option AND exactly one other mode is.
  // If there's a real choice to make (dine-in exists, or multiple non-dinein
  // modes exist), leave the floor view up so the user picks.
  if (!hasDineinTables && availableModes.length === 1) {
    const onlyMode = availableModes[0];
    if (onlyMode === 'walkin') handleWalkInSelect();
    else if (onlyMode === 'takeaway') handleTakeawaySelect();
    else if (onlyMode === 'delivery') handleDeliverySelect();
  }
}, [tables, takeawayTables, walkinTables, deliveryTables]);

  // ─────────────────────────────────────────────────────────────────────────
  // Cart operations
  // ─────────────────────────────────────────────────────────────────────────

  const getTotalPrice = () =>
    cart
      .filter(i => !(i.frontend_unique_key || '').startsWith('cchild_'))
      .reduce((t, i) => t + (i.unit_price || 0) * i.quantity, 0)
      .toFixed(2);

      const addToCart = (item, parentItemKey = null, onCommitted = null,batchOverride = null, alwaysNew = false) => {
        const currentAvailability = getAvailability(item);
        const hasStockTracking = currentAvailability != null;
      
        const commit = () => {
          setHasNewItems(true);
          let batch = batchOverride || currentBatchTimestamp;
          if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
      
          if (hasStockTracking) adjustAvailability(item.id, -1);
      
          if (!parentItemKey && !alwaysNew) {
            const existingIndex = cart.findIndex(
              ci => ci.id === Number(item.id) && ci.is_new_item && !ci.saved_sub_order && !ci.is_addon
            );
            if (existingIndex !== -1) {
              const existingKey = cart[existingIndex].frontend_unique_key;
              setCart(prev => prev.map((ci, idx) => idx === existingIndex ? { ...ci, quantity: ci.quantity + 1 } : ci));
              if (!isMobile) setShowCart(true);
              onCommitted && onCommitted(existingKey);
              return existingKey;
            }
          }
      
          const newItem = buildCartItem(item, {
            batch_timestamp: batch,
            parent_item_key: parentItemKey,
            is_addon: !!parentItemKey,
          });
          setCart(prev => [...prev, newItem]);
          if (!isMobile) setShowCart(true);
          onCommitted && onCommitted(newItem.frontend_unique_key);
          return newItem.frontend_unique_key;
        };
      
        if (hasStockTracking && currentAvailability <= 0) {
          setPendingStockConfirm({ item, onConfirm: commit });
          return null; // added only if user confirms
        }
      
        return commit();
      };

      const removeFromCart = (itemId, uniqueKey = null) => {
        setHasNewItems(true);
        const removed = uniqueKey
          ? cart.filter(i => i.frontend_unique_key === uniqueKey || i.parent_item_key === uniqueKey)
          : cart.filter(i => i.id === itemId);
      
        removed.forEach(i => {
          if (getAvailability(i) != null) adjustAvailability(i.id, i.quantity);
        });
      
        if (uniqueKey) {
          setCart(prev => prev.filter(i => i.frontend_unique_key !== uniqueKey && i.parent_item_key !== uniqueKey));
        } else {
          setCart(prev => prev.filter(i => i.id !== itemId));
        }
      };

  const updateQuantity = (itemId, change, uniqueKey = null) => {
    const cartItem = cart.find(i =>
      uniqueKey ? i.frontend_unique_key === uniqueKey : (i.id === itemId && !i.frontend_unique_key)
    );
    const currentAvailability = cartItem ? getAvailability(cartItem) : null;
    const hasStockTracking = currentAvailability != null;
  
    const commit = () => {
      setHasNewItems(true);
      if (hasStockTracking) adjustAvailability(itemId, -change); // change>0 decrements, change<0 gives back
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
  
    if (change > 0 && hasStockTracking && currentAvailability <= 0) {
      setPendingStockConfirm({ item: cartItem, onConfirm: commit });
      return;
    }
    commit();
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

      const rebuiltOldItems = relinkCartItemsToParents(
        order.items.map(item => {
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
      }));

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
      // setLoading(true);

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
      if (transactionType === 'ITEM_CANCELLED') {
        const currentAvail = availabilityMap[item.id];
        if (currentAvail != null) {
          const restored = Number(currentAvail) + removeQty;
          const menuRecord = menuItems.find(mi => Number(mi.id) === Number(item.id));
          if (menuRecord) {
            adjustAvailability(item.id, removeQty);
            try {
              await axios.post(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
                { id: item.id, client_id: clientId, availability: restored, zone_config_id: menuRecord.zone_config_id ?? null },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              menuCache.patchAvailability(clientId, { [item.id]: restored });
            } catch (err) {
              console.error(`Failed to restore stock for item ${item.id}:`, err);
            }
          }
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
      console.log("error");
      
      // setLoading(false);
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
      // setLoading(true);

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
        if (transactionType === 'ITEM_CANCELLED') {
          const currentAvail = availabilityMap[item.id];
          if (currentAvail != null) {
            const restored = Number(currentAvail) + item.quantity;
            const menuRecord = menuItems.find(mi => Number(mi.id) === Number(item.id));
            if (menuRecord) {
              adjustAvailability(item.id, item.quantity);
              try {
                await axios.post(
                  `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
                  { id: item.id, client_id: clientId, availability: restored, zone_config_id: menuRecord.zone_config_id ?? null },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                menuCache.patchAvailability(clientId, { [item.id]: restored });
              } catch (err) {
                console.error(`Failed to restore stock for item ${item.id}:`, err);
              }
            }
          }
        }
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
      console.log("error");
      
      // setLoading(false);
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
        if (getAvailability(item) != null) adjustAvailability(item.id, -1);
        linkedItems.forEach(comp => {
          if (getAvailability(comp) != null) adjustAvailability(comp.id, -1);
        });
        setHasNewItems(true);
        if (!isMobile) setShowCart(true);
    
      } else {
    // Split real add-ons from packaging/container items
    const packagingItems = linkedItems.filter(li => isPackagingCategoryId(li.category_id, categoriesFlat));
    const regularAddons = linkedItems.filter(li => !isPackagingCategoryId(li.category_id, categoriesFlat));

    if (regularAddons.length > 0) {
      // Show modal with ONLY real add-ons; packaging is auto-handled after selection
      setSelectedMainItem(item);
      setLineItemsDetails(regularAddons);
      setPendingPackagingItems(packagingItems);
      setLineItemsModalOpen(true);
    } else {
      // Nothing but packaging linked — skip modal, add item directly
      let batch = currentBatchTimestamp;
      if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
      const mainKey = addToCart(item);
      attachPackagingIfTakeaway(mainKey, batch, packagingItems);
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

  const selectedAddons = lineItemsDetails.filter(i => selectedAddonIds.includes(i.id));
  const packaging = pendingPackagingItems;

  const attachDependents = (mainKey) => {
    selectedAddons.forEach(addon => {
      const addonEntry = buildCartItem(addon, {
        batch_timestamp: batch,
        parent_item_key: mainKey,
        is_addon: true, _item_type: 'addon',
      });
      setCart(prev => [...prev, addonEntry]);
      if (getAvailability(addon) != null) adjustAvailability(addon.id, -1);
    });
    attachPackagingIfTakeaway(mainKey, batch, packaging);
  };

  // handleAddMainItemWithSelectedAddons
addToCart(selectedMainItem, null, attachDependents, batch, true);

  setHasNewItems(true);
  setLineItemsModalOpen(false);
  setSelectedMainItem(null);
  setLineItemsDetails([]);
  setPendingPackagingItems([]);
};

  const handleAddMainItemOnly = () => {
  if (!selectedMainItem) return;
  let batch = currentBatchTimestamp;
  if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }

  const mainKey = addToCart(selectedMainItem, null, null, batch, true);
  attachPackagingIfTakeaway(mainKey, batch, pendingPackagingItems);

  setLineItemsModalOpen(false);
  setSelectedMainItem(null);
  setLineItemsDetails([]);
  setPendingPackagingItems([]);
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
    if (orderMode === 'delivery' && !customerDetails.shipping_address?.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }
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
      let placedDineinOrderId = activeDineinOrderId;

      if (activeOrderId && activeDineinOrderId) {
        const newOnly = cart.filter(i => i.is_new_item && !i.saved_sub_order);
        if (newOnly.length > 0) {
          const subTotal = newOnly
            .filter(i => !i.is_addon)
            .reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
          const r = await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create-sub-order`,
            { items: buildOrderPayload(newOnly), price: subTotal, total_price: subTotal },
            { headers, params: { client_id: clientId, parent_dinein_order_id: activeDineinOrderId } }
          );
          placedOrderId = activeOrderId;
          placedDineinOrderId = r?.data?.data?.dinein_order_id || activeDineinOrderId;
          // toast.success(`Sub-order ${r.data.data.dinein_order_id} created!`);
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
          placedDineinOrderId = String(existingDraft.id);
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
              customer_id: customerDetails.customer_id || getUserIdFromToken(token) || '',
              contact_phone: customerDetails.contact_phone || '',
              contact_email: customerDetails.contact_email || '',          
            },
            { headers }
          );
          placedOrderId = createRes?.data?.data?.id;
          placedDineinOrderId = createRes?.data?.data?.dinein_order_id || String(placedOrderId);
        }

        if (!['takeaway', 'walkin', 'delivery'].includes(orderMode)) {
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
        let resolvedCustomerId = customerDetails.customer_id;
        try {
          const custRes = await axios.post(
            `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/customer/find_or_create`,
            {
              contact_email: customerDetails.contact_email,
              contact_phone: customerDetails.contact_phone,
              shipping_address: customerDetails.shipping_address,
              customer_id: customerDetails.customer_id,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          resolvedCustomerId = custRes.data?.data?.person_id || resolvedCustomerId;
        } catch (err) {
          console.error('Failed to resolve/create customer:', err.response?.data || err.message);
        }
        await upsertBillingDocumentForCustomer({
          clientId,
          token,
          orderId: placedOrderId,
          tableRef: tableObj?.table_number || `Table ${selectedTable}`,
          customerDetails: { ...customerDetails, customer_id: resolvedCustomerId },
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
          dineinOrderId: placedDineinOrderId,
          timestamp: new Date(),
        },
      });
      const orderedItemIds = new Set(
        cart
          .filter(i => i.is_new_item && !i.saved_sub_order && !i.is_addon && !(i.frontend_unique_key || '').startsWith('cchild_'))
          .map(i => i.id)
      );
      
      // ✅ Reflect the reservation in the UI immediately — but do NOT persist to
      // the DB here. Real deduction happens server-side only when the order is
      // marked "served" (via _deduct_stock_for_order in update_order_status_service).
      const idToAvailability = {};
      Array.from(orderedItemIds).forEach(itemId => {
        const newAvailability = availabilityMap[itemId];
        if (newAvailability == null) return; // item doesn't track stock
        idToAvailability[itemId] = newAvailability;
      });
      
      if (Object.keys(idToAvailability).length > 0) {
        // client-side cache only — no axios call, so DB availability is untouched
        menuCache.patchAvailability(clientId, idToAvailability);
      }
      setCart([]);
      setActiveOrderId(null);
      setActiveDineinOrderId(null);
      setShowCart(false);
      setCurrentView('floor');
      setCurrentBatchTimestamp(null);
      setHasNewItems(false);
      setCustomerDetails({ customer_id: '', contact_phone: '', contact_email: '', shipping_address: '' });
      setSelectedAddressId('');
      // toast.success('Order placed!');
    } catch (err) {
      console.error('ORDER ERROR:', err);
      toast.error('Order failed');
    } finally {
      isPlacingRef.current = false;
      setIsPlacingOrder(false);
    }
  };

  const fetchUniqueCustomers = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/customer/search`,
        { headers: { Authorization: `Bearer ${token}` }, params: { client_id: clientId } }
      );
      setCustomersList(res.data?.data?.customers || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setCustomersList([]);
    }
  };
  
  useEffect(() => {
    if (clientId && token) {
      fetchUniqueCustomers();
    }
  }, [clientId, token]);
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
    setCustomerDetails({ customer_id: '', contact_phone: '', contact_email: '', shipping_address: '' });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Delete order
  // ─────────────────────────────────────────────────────────────────────────

  const handleCancelOrder = async (orderId, tableId, reason) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
  
      // 1. Fetch the order's items BEFORE cancelling, so we know what to restore
      const orderRes = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers }
      );
      const orderGroup = (orderRes.data?.data || []).find(o => o.id === orderId);
  
      // 2. Cancel the order (unchanged)
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/cancel?order_id=${orderId}&reason=${encodeURIComponent(reason || '')}`,
        {},
        { headers }
      );
  
      // 3. Restore availability for every non-cancelled item in that order
      if (orderGroup?.items?.length) {
        const restoreQtyByItemId = {};
        orderGroup.items.forEach(item => {
          if ((item.status || '').toLowerCase() === 'cancelled') return;
          const id = Number(item.item_id);
          restoreQtyByItemId[id] = (restoreQtyByItemId[id] || 0) + (item.quantity || 0);
        });
  
        const idToNewAvailability = {};
        Object.entries(restoreQtyByItemId).forEach(([itemId, qty]) => {
          const menuRecord = menuItems.find(mi => Number(mi.id) === Number(itemId));
          const currentAvail = availabilityMap[itemId] ??
            (menuRecord?.availability != null ? Number(menuRecord.availability) : null);
          if (currentAvail == null) return; // item doesn't track stock
          const restored = Number(currentAvail) + qty;
          idToNewAvailability[itemId] = restored;
          adjustAvailability(itemId, qty); // updates local state immediately
        });
  
        const bulkItems = Object.entries(idToNewAvailability).map(([id, availability]) => ({
          id: Number(id),
          availability,
        }));
  
        if (bulkItems.length > 0) {
          try {
            await axios.post(
              `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/update`,
              { items: bulkItems },
              { headers }
            );
            menuCache.patchAvailability(clientId, idToNewAvailability);
          } catch (err) {
            console.error('Failed to restore stock after order cancel:', err);
          }
        }
      }
  
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
      // setLoading(true);
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
      console.log("error");
      
      // setLoading(false);
    }
  };


  const handlePrintBill = async (orderId) => {
  await openInvoiceForOrder(orderId, customerDetails);
};

const handleBillFromCart = async () => {
  if (!activeOrderId) { toast.error('No active order'); return; }
  await openInvoiceForOrder(activeOrderId, customerDetails);
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
        const dietary = getDietaryFromSlug(item,dietaryOptions);
        return dietary !== null && dietary === selectedDietary;
      });
    }

    // ── 3. Category filter — uses flat list for reliable traversal ──
    if (selectedCategoryId) {
      const ids = getCategoryAndChildrenIds(selectedCategoryId,categoriesFlat); // ← no categories arg needed now
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

  const canPlaceOrder = ['takeaway', 'walkin', 'delivery'].includes(orderMode)
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
    <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-y-auto">

      {/* ══════════════ FLOOR VIEW ══════════════ */}
      {currentView === 'floor' && (
        <TableReservation
        tables={tables.filter(t =>
          !takeawayTables.some(tw => tw.id === t.id) &&
          !walkinTables.some(w => w.id === t.id) &&
          !deliveryTables.some(d => d.id === t.id)
        )}
          orderMode={orderMode}
          tableOrders={tableOrders}
          draftTableIds={draftTableIds}
          hasDinein={tables.length > takeawayTables.length + walkinTables.length + deliveryTables.length}
          hasWalkin={walkinTables.length > 0}
          hasTakeaway={takeawayTables.length > 0}
          hasDelivery={deliveryTables.length > 0}
          onSelectTable={handleTableSelect}
          onSelectTakeaway={handleTakeawaySelect}
          onSelectDineIn={() => setOrderMode('dinein')}
          onSelectWalkIn={handleWalkInSelect}
    onSelectDelivery={handleDeliverySelect}
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
        <div className="w-full max-w-screen-2xl mx-auto px-2 sm:px-3 md:px-4 lg:px-5 py-2 overflow-x-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 w-full min-w-0">

            {/* ── Category sidebar ── */}
            <div className="xl:col-span-1 min-w-0 w-full overflow-hidden">
              <div className="lg:h-[calc(98dvh-4rem)] lg:overflow-y-auto pr-1">
                <CategoryTree
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                  defaultOpenAll
                  zoneConfigId={zoneConfigId}
                  dietaryColorMap={dietaryColorMap}
                  selectedDietary={selectedDietary}
                  onSelectDietary={setSelectedDietary}
                />
              </div>
            </div>

            {/* ── Menu panel + Cart panel ── */}
            <div className="xl:col-span-3 w-full min-w-0 flex flex-col xl:flex-row overflow-hidden gap-2">

              {/* Menu panel */}
              <div className="transition-all duration-300 border-default border-border-default p-2 sm:p-3 rounded-lg flex-1 w-full min-w-0 overflow-x-hidden overflow-y-auto h-[calc(100dvh-10rem)] xl:h-[calc(98dvh-4rem)]">

                {/* Top controls */}
                <div className="space-y-2 mb-2">
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full min-w-0">
                    <button
                      onClick={handleBackToTables}
                      className="p-2 rounded-lg bg-bg-tertiary border border-border-default hover:bg-bg-secondary flex-shrink-0"
                    >
                      <ArrowLeft size={20} />
                    </button>

                    {/* Dietary type pills */}
                    <div className="flex gap-1.5 overflow-x-auto flex-1 min-w-0 whitespace-nowrap py-1">
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
                        const count = menuItems.filter(item => getDietaryFromSlug(item,dietaryOptions) === key).length;
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
                          </button>
                        );
                      })}
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-64 md:w-72 lg:w-80 xl:w-72 flex-shrink-0">
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
                <div className={`grid gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${showCart ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} w-full min-w-0`}>
                  {filteredItems.map(item => {
                    const dp = item.discount && Number(item.discount) > 0
                      ? Number(item.discount).toFixed(0) : null;
                    {/* OLD: const ac = item.line_item_id?.length || 0; */}
                    const ac = (item.line_item_id || []).filter(id => {
                      const li = menuItems.find(mi => Number(mi.id) === Number(id));
                      return li ? !isPackagingCategoryId(li.category_id, categoriesFlat) : true;
                    }).length;
                    const dietary = getDietaryFromSlug(item,dietaryOptions);
                    const dietaryColor = dietary ? (dietaryColorMap[dietary] || '') : '';
                    return (
                      <div
                        key={`${item.id}_${item.zone_config_id ?? 0}`}
                        onClick={() => handleItemClick(item)}
                        className="flex gap-2 items-center bg-bg-primary border-default border-border-default rounded-xl p-2 min-w-0 w-full overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
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
                          {getAvailability(item) != null && (
  <p className={`text-[10px] font-semibold mt-0.5 ${getAvailability(item) <= 5 ? 'text-red-500' : 'text-text-secondary'}`}>
    Qty: {getAvailability(item)}
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

              {/* ── Cart panel (desktop only, slide in) ── */}
              <div
                className={`hidden lg:block transition-all duration-300 ease-in-out
                  ${showCart ? 'w-[22rem] opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
              >
                <div className="border border-gray-300 rounded-xl bg-white shadow-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
                  <div className="flex flex-col h-full p-4">

                    {/* Cart header */}
                    <div className="pb-3 border-b space-y-2">
                      <h2 className="text-lg font-semibold text-gray-800">Your Order</h2>
                      {orderMode === 'delivery' && (
    <DeliveryDetailsSummary
    value={customerDetails}
    onClick={() => setShowDeliveryDetailsModal(true)}
  />
  )}
                          <DeliveryDetailsModal
                                   isOpen={showDeliveryDetailsModal}
                                   onClose={() => setShowDeliveryDetailsModal(false)}
                                   value={customerDetails}
                                   onSave={setCustomerDetails}
                                   customers={customersList} />
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
                  {['dinein', 'takeaway'].includes(orderMode) && (
                      <div className="mt-3">
                          <div className="flex bg-gray-100 rounded-lg p-1">
                               <button onClick={() => {
                                                      setOrderMode('dinein');
                                                      if (dineinTableId) setSelectedTable(dineinTableId);
                                                      syncPackagingForOrderMode('dinein'); }}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
                                                    ${orderMode === 'dinein'
                                                                      ? 'bg-action-primary text-white shadow-sm'
                                                                      : 'text-gray-600 hover:text-gray-800'}`}>
                                <Users size={16} /> Dine In
                               </button>
                               <button
                                       onClick={() => {
                                                      setOrderMode('takeaway');
                                                      setSelectedTable(takeawayTableId?.toString());
                                                      syncPackagingForOrderMode('takeaway'); }}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
                                                    ${orderMode === 'takeaway'
                                                                     ? 'bg-action-primary text-white shadow-sm'
                                                                     : 'text-gray-600 hover:text-gray-800'}`}>
                                <Package size={16} /> Takeaway
                               </button>
                          </div>
                    </div>)}

                    {/* Cart body */}
                    {cart.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                        No items added
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
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

                          {activeOrderId && oldItems.length > 0 && newItems.length > 0 && (
                            <div className="flex items-center gap-2 my-2">
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
                              <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                              <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent" />
                            </div>
                          )}

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

                        <div className="grid grid-cols-2 gap-2 mt-3">
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

                          <button
                            onClick={handleBillFromCart}
                            className="py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1"
                          >
                            <FileText size={16} /> Bill
                          </button>

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
            </div>
          </div>
        </div>
      )}

      {/* ── Floating cart button (mobile) ── */}
      {currentView === 'order' && cart.length > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40 lg:hidden flex items-center gap-2"
        >
          <ShoppingCart size={24} />
          <span className="text-sm font-bold">{cart.length}</span>
        </button>
      )}

      {/* ── Mobile cart bottom sheet ── */}
      {currentView === 'order' && showCart && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90dvh]">
            {/* Sheet handle + close */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">Your Order</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden p-4">
              {/* Table info + total */}
              <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg mb-3">
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

              {draftSavedAt && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg mb-3">
                  <Save size={11} />
                  <span>
                    Draft saved ·{' '}
                    {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {/* Dine-in / Takeaway toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 mb-3 flex-shrink-0">
                <button
                  onClick={() => { setOrderMode('dinein'); if (dineinTableId) setSelectedTable(dineinTableId); syncPackagingForOrderMode('dinein'); }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
                    ${orderMode === 'dinein' ? 'bg-action-primary text-white shadow-sm' : 'text-gray-600'}`}
                >
                  <Users size={16} /> Dine In
                </button>
                <button
                  onClick={() => { setOrderMode('takeaway'); setSelectedTable(takeawayTableId?.toString()); syncPackagingForOrderMode('takeaway'); }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
                    ${orderMode === 'takeaway' ? 'bg-action-primary text-white shadow-sm' : 'text-gray-600'}`}
                >
                  <Package size={16} /> Takeaway
                </button>
              </div>

              {/* Scrollable cart items */}
              <div className="flex-1 overflow-y-auto space-y-2">
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

                {activeOrderId && oldItems.length > 0 && newItems.length > 0 && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
                    <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent" />
                  </div>
                )}

                {batchTimestamps.map((ts, bi) => (
                  <React.Fragment key={ts}>
                    {bi > 0 && (
                      <div className="flex items-center gap-2 my-2">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
                        <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
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

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3 flex-shrink-0">
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

                <button
                  onClick={handleBillFromCart}
                  className="py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1"
                >
                  <FileText size={16} /> Bill
                </button>

                <button
                  onClick={handleSaveDraft}
                  disabled={cart.length === 0}
                  className={`py-2 border rounded-lg text-sm flex items-center justify-center gap-1 font-semibold transition-colors
                    ${cart.length > 0
                      ? 'bg-yellow-50 border-yellow-400 text-yellow-700 hover:bg-yellow-100'
                      : 'opacity-40 cursor-not-allowed text-gray-400 border-gray-200'}`}
                >
                  <Save size={15} /> Save
                </button>

                <button
                  onClick={handleClearCart}
                  className="py-2 border rounded-lg text-sm hover:bg-gray-100"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
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
          setPendingPackagingItems([]);
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
    const existingCombo = prev.find(
      i => i.id === Number(comboModalItem.id) &&
           i.is_new_item &&
           !i.saved_sub_order &&
           !i.is_addon &&
           (i.frontend_unique_key || '').startsWith('combo_')
    );

    if (existingCombo) {
      const updated = prev.map(i => {
        if (i.frontend_unique_key === existingCombo.frontend_unique_key) {
          return { ...i, quantity: i.quantity + 1 };
        }
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
  if (getAvailability(comboModalItem) != null) adjustAvailability(comboModalItem.id, -1);
  comboModalComponents.forEach(comp => {
    if (getAvailability(comp) != null) adjustAvailability(comp.id, -1);
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
            closeInvoiceModal();
            fetchTables();
          }}
          onSave={id => {
            console.log('Invoice saved:', id);
            fetchTables();
          }}
        />
      )}
      <StockConfirmModal
  pending={pendingStockConfirm}
  onCancel={() => setPendingStockConfirm(null)}
  onConfirmed={() => {
    const { onConfirm } = pendingStockConfirm;
    setPendingStockConfirm(null);
    onConfirm && onConfirm();
  }}
/>
    </div>
  );
};

export default TakeOrder;

// =================================================================================        =========================   //