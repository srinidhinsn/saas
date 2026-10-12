import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import InvoiceModal from './InvoiceModal';
import { Search, Calendar, Eye } from 'lucide-react';
import { menuCache } from '../../utils/Menu-utils/menuCache';
import AgGridTable from '../../utils/AgGridTable';
import { fmt, formatPriceByMode  } from '../../utils/Menu-utils/menuUtils';
import {
  OrderRowActions,
  CancelOrderConfirmModal,
  OldItemDeleteModal,
  OrderItemsViewModal,
  hasInvoiceBeenGenerated
} from '../../utils/BillingUtils';

export default function BillingPage({ clientId, token }) {
  const navigate = useNavigate();
  const hasFetchedRef = useRef(false);
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [inventoryMap, setInventoryMap] = useState({});
  const [billingDocMap, setBillingDocMap] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // New state for filters
  const [searchQuery, setSearchQuery] = useState("");
  const todayDate = new Date().toISOString().split('T')[0];
  const [datePreset, setDatePreset] = useState('today');
  const [customFrom, setCustomFrom] = useState(todayDate);
  const [customTo, setCustomTo] = useState(todayDate);
  const customFromRef = useRef(null);
  const customToRef = useRef(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [cancelOrderModal, setCancelOrderModal] = useState({ isOpen: false, orderId: null });
  const [itemDeleteModal, setItemDeleteModal] = useState({ isOpen: false, item: null, orderId: null });

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    async function fetchAll() {
      try {
        setLoading(true);

        const cachedTables = menuCache.get('billing_tablesMap', clientId);
        const cachedMenu = menuCache.get('billing_menuMap', clientId);

        const [ordersRes, billingRes, tablesRes, invRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`, { headers: { Authorization: `Bearer ${token}` } }),
          cachedTables ? Promise.resolve(null) : axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } }),
          cachedMenu ? Promise.resolve(null) : axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setOrders(ordersRes.data?.data || []);

        if (cachedTables) {
          setTablesMap(cachedTables);
        } else {
          const tMap = {};
          (tablesRes.data?.data || []).forEach((t) => (tMap[t.id] = t));
          setTablesMap(tMap);
          menuCache.set('billing_tablesMap', clientId, tMap);
        }

        if (cachedMenu) {
          setInventoryMap(cachedMenu);
        } else {
          const iMap = {};
          (invRes.data?.data || []).forEach((i) => (iMap[i.id] = i));
          setInventoryMap(iMap);
          menuCache.set('billing_menuMap', clientId, iMap);
        }

        const bMap = {};
        (billingRes.data?.data || []).forEach((doc) => {
          if (doc.order_id != null) bMap[doc.order_id.toString()] = doc;
        });
        setBillingDocMap(bMap);
      } catch (e) {
        toast.error("Error loading data");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [clientId, token]);

  // Filter orders based on search and date
  const getDateRange = () => {
    const now = new Date();
    const toStr = (d) => d.toISOString().split('T')[0];
    const today = toStr(now);
    const subtractDays = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return toStr(d); };
    const subtractMonths = (n) => { const d = new Date(now); d.setMonth(d.getMonth() - n); return toStr(d); };
    switch (datePreset) {
      case 'today': return { from: today, to: today };
      case '1w': return { from: subtractDays(7), to: today };
      case '15d': return { from: subtractDays(15), to: today };
      case '1m': return { from: subtractMonths(1), to: today };
      case '3m': return { from: subtractMonths(3), to: today };
      case '6m': return { from: subtractMonths(6), to: today };
      case 'custom': return { from: customFrom, to: customTo };
      default: return { from: today, to: today };
    }
  };

  useEffect(() => {
    let filtered = [...orders];

    filtered = filtered.filter(order => order.status?.toLowerCase() !== 'cancelled');

    // Date filter
    const { from, to } = getDateRange();
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
      return orderDate >= from && orderDate <= to;
    });

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const tableName = (tablesMap[order.table_id]?.name || '').toLowerCase();
        const orderId = order.id.toString();
        return tableName.includes(query) || orderId.includes(query);
      });
    }

    setFilteredOrders(filtered);
  }, [searchQuery, datePreset, customFrom, customTo, orders, tablesMap]);

  const combineDuplicateItems = (items) => {
    const itemsMap = new Map();
    items.forEach(item => {
      const key = item.item_id.toString();
      if (itemsMap.has(key)) {
        const existing = itemsMap.get(key);
        existing.quantity = (existing.quantity || 0) + (item.quantity || 0);
      } else {
        itemsMap.set(key, { ...item });
      }
    });
    return Array.from(itemsMap.values());
  };

  const getOrderTotal = (order) =>
  (order.items || [])
    .filter(item => !item.parent_item_key)
    .reduce((sum, item) => sum + (Number(item.unit_price ?? item.price) || 0) * (Number(item.quantity) || 0), 0);

const refetchOrders = async () => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data?.data || [];
};

const handleCancelOrder = async (orderId, reason) => {
  const order = orders.find(o => o.id === orderId);
  const tableObj = tablesMap[order?.table_id];
  try {
    await axios.post(
      `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/cancel`,
      {},
      { params: { order_id: orderId, reason: reason || '' }, headers: { Authorization: `Bearer ${token}` } }
    );
    if (tableObj) {
      await axios.post(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
        {
          id: order.table_id,
          client_id: clientId,
          name: tableObj.name,
          table_type: tableObj.table_type,
          status: 'vacant',
          location_zone: tableObj.location_zone,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
    setOrders(prev => prev.filter(o => o.id !== orderId));
    toast.success('Order cancelled and table freed.');
  } catch {
    toast.error('Failed to cancel order');
  }
};

const handleStatusChange = async (orderId, newStatus) => {
  const order = orders.find(o => o.id === orderId);
  if (!order || order.status === 'served') return;
  const tableObj = tablesMap[order.table_id];
  try {
    await axios.post(
      `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
      { id: orderId, client_id: clientId, status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (tableObj) {
      await axios.post(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
        {
          id: order.table_id,
          client_id: clientId,
          name: tableObj.name,
          table_type: tableObj.table_type,
          status: 'vacant',
          location_zone: tableObj.location_zone,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
    toast.success('Order status updated');
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
    setViewOrder(prev => (prev?.id === orderId ? { ...prev, status: newStatus } : prev));
  } catch {
    toast.error('Failed to update order status.');
  }
};

const handleRequestDeleteItem = (item, orderId) => {
  setItemDeleteModal({ isOpen: true, item, orderId });
};

const handleItemRemoveOne = async (transactionType, reason, removeQty) => {
  const { item, orderId } = itemDeleteModal;
  setItemDeleteModal({ isOpen: false, item: null, orderId: null });
  if (!item?.id) { toast.error('Cannot update — item has no DB reference.'); return; }
  try {
    await axios.delete(
      `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
      {
        params: { client_id: clientId, order_item_id: item.id, quantity: removeQty, transaction_type: transactionType, reason: reason || undefined },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const newQty = item.quantity - removeQty;
    toast.success(newQty > 0 ? `Quantity reduced to ${newQty}.` : 'Item removed.');
    const allOrders = await refetchOrders();
    setOrders(allOrders);
    const fresh = allOrders.find(o => o.id === orderId);
    if (fresh && viewOrder?.id === orderId) {
      setViewOrder({ ...fresh, _tableName: tablesMap[fresh.table_id]?.name || String(fresh.table_id) });
    } else if (!fresh && viewOrder?.id === orderId) {
      setViewOrder(null);
      setShowViewModal(false);
    }
  } catch {
    toast.error('Failed to update item.');
  }
};

const handleItemRemoveAll = async (transactionType, reason) => {
  const { item, orderId } = itemDeleteModal;
  setItemDeleteModal({ isOpen: false, item: null, orderId: null });
  if (!item?.id) { toast.error('Cannot delete — item has no DB reference.'); return; }
  try {
    await axios.delete(
      `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
      {
        params: { client_id: clientId, order_item_id: item.id, transaction_type: transactionType, reason: reason || undefined },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    toast.success('Item removed.');
    const allOrders = await refetchOrders();
    setOrders(allOrders);
    const fresh = allOrders.find(o => o.id === orderId);
    if (fresh && viewOrder?.id === orderId) {
      setViewOrder({ ...fresh, _tableName: tablesMap[fresh.table_id]?.name || String(fresh.table_id) });
    } else if (!fresh && viewOrder?.id === orderId) {
      setViewOrder(null);
      setShowViewModal(false);
    }
  } catch {
    toast.error('Failed to remove item.');
  }
};

  const handleSelectOrder = async (order) => {
    if (!order) return;
  

    const enrichedItems = (order.items || []).map((item) => {
      const inv = inventoryMap[item.item_id] || {};
      return {
        ...item,
        unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
        description: item.description ?? inv.description ?? "",
        name: item.item_name ?? inv.name ?? "Unnamed Item",
      };
    });
  
    // Deduplicate by frontend_unique_key — same item across sub-orders should appear once
    // For items without a fkey, fall back to a composite key
    const uniqueKeyToItemMap  = new Map();
    const deduplicatedItems = [];
  
    enrichedItems.forEach(item => {
      const fkey = item.frontend_unique_key || `${item.item_id}_${item.unit_price}_${item.sub_order_id ?? ''}`;
      if (uniqueKeyToItemMap .has(fkey)) {
        // Accumulate quantity for duplicate entries
        uniqueKeyToItemMap.get(fkey).quantity += (item.quantity ?? 0);
      } else {
        const copy = { ...item };
        uniqueKeyToItemMap .set(fkey, copy);
        deduplicatedItems.push(copy);
      }
    });
  
    const updatedOrder = {
      ...order,
      items: deduplicatedItems,
    };

    setSelectedOrder(updatedOrder);
    setInvoiceModalOpen(true);
  };
  // Auto-open invoice when orderId is in URL params
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    
    if (orderIdFromUrl && orders.length > 0 && !selectedOrder && !loading) {
      const matchingOrder = orders.find(order => order.id.toString() === orderIdFromUrl.toString());
      if (matchingOrder) {
        handleSelectOrder(matchingOrder);
      } else {
        toast.info(`Order #${orderIdFromUrl} not found`);
      }
    }
  }, [orders, selectedOrder, loading, searchParams]);

  const handleInvoiceSave = async (draftId) => {
    // Optionally refresh orders or perform other actions after save
    console.log('Invoice saved with ID:', draftId);

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const bMap = {};
      (res.data?.data || []).forEach((doc) => {
        if (doc.order_id != null) bMap[doc.order_id.toString()] = doc;
      });
      setBillingDocMap(bMap);
    } catch (e) {
      toast.error("Failed to refresh billing data");
    }
  };

  const billingColumnDefs = [
    {
      headerName: 'Order ID',
      field: 'id',
      minWidth: 120,
      cellRenderer: (params) => (
        <div className="text-sm font-semibold text-text-primary">#{params.value}</div>
      ),
    },
    {
      headerName: 'Table',
      field: 'table_id',
      minWidth: 150,
      valueGetter: (params) => tablesMap[params.data?.table_id]?.name || `Table ${params.data?.table_id}`,
      cellRenderer: (params) => (
        <div>
          <div className="text-sm font-medium text-text-primary">{params.value}</div>
          <div className="text-xs text-text-secondary">{params.data?.mode || "Dine-In"}</div>
        </div>
      ),
    },
    {
      headerName: 'Items',
      field: 'items',
      minWidth: 100,
      valueGetter: (params) => `${params.data?.items?.length || 0} items`,
    },
    {
      headerName: 'Total Amount',
      colId: 'total_amount',
      minWidth: 150,
      valueGetter: (params) => {
        const billingDoc = billingDocMap[params.data?.id?.toString()];
        return billingDoc ? Number(billingDoc.total_amount) : null;
      },
      cellRenderer: (params) => (
        <div className="text-sm font-bold text-action-primary">
          {params.value != null ? `₹${formatPriceByMode(params.value, clientId)}` : "—"}
        </div>
      ),
    },
    {
  headerName: 'Invoice #',
  colId: 'invoice_number',
  minWidth: 140,
  sortable: false,
  valueGetter: (params) => billingDocMap[params.data?.id?.toString()]?.document_number || '',
  cellRenderer: (params) => (
    <span className="text-sm font-medium text-text-primary">
      {params.value || '—'}
    </span>
  ),
},
    {
      headerName: 'Payment Status',
      colId: 'payment_status',
      minWidth: 160,
      sortable: false,
      valueGetter: (params) => billingDocMap[params.data?.id?.toString()]?.payment_status || '',
      cellRenderer: (params) => {
        const billingDoc = billingDocMap[params.data?.id?.toString()];
        return billingDoc ? (
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${billingDoc.payment_status === "Paid"
              ? "bg-green-100 text-green-700"
              : billingDoc.status === "partial"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}>
            {billingDoc.payment_status?.toUpperCase() ?? "UNKNOWN"}
          </span>
        ) : (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
            NOT BILLED
          </span>
        );
      },
    },
    {
  headerName: 'Actions',
  colId: 'actions',
  minWidth: 240,
  sortable: false,
  filter: false,
  floatingFilter: false,
  cellRenderer: (params) => (
    <OrderRowActions
      order={params.data}
      invoiceGenerated={hasInvoiceBeenGenerated(params.data, billingDocMap)}
      onView={(order) => {
        setViewOrder({ ...order, _tableName: tablesMap[order.table_id]?.name || String(order.table_id) });
        setShowViewModal(true);
      }}
      onPrint={(order) => handleSelectOrder(order)}
      onCancel={(order) => setCancelOrderModal({ isOpen: true, orderId: order.id })}
      onMarkServed={(order) => handleStatusChange(order.id, 'served')}
    />
  ),
},
  ];

  return (
    <div className="min-h-screen bg-bg-primary p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto">

        {/* Header */}
        <div className="bg-action-primary rounded-2xl shadow-xl px-6 py-5 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-text-white font-bold text-2xl shadow-md border border-white/30">
                {clientId.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-text-white">{clientId.toUpperCase()}</h1>
                <div className="text-lg font-bold text-text-white/80">{filteredOrders.length} orders found</div>
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                <input
                  type="text"
                  placeholder="Search by table name or order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border-default rounded-lg bg-bg-primary text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-action-primary focus:border-action-primary transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={datePreset}
                onChange={e => {
                  const val = e.target.value;
                  setDatePreset(val);
                  if (val === 'custom') {
                    setTimeout(() => customFromRef.current?.showPicker?.(), 50);
                  }
                }}
                className="pl-3 pr-8 py-2.5 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm appearance-none cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="1w">Last 1 Week</option>
                <option value="15d">Last 15 Days</option>
                <option value="1m">Last 1 Month</option>
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="custom">Custom Range</option>
              </select>

              {datePreset === 'custom' && (
                <>
                  <input
                    ref={customFromRef}
                    type="date"
                    value={customFrom}
                    max={customTo}
                    onChange={e => {
                      setCustomFrom(e.target.value);
                      setTimeout(() => customToRef.current?.showPicker?.(), 50);
                    }}
                    className="px-3 py-2.5 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm"
                  />
                  <span className="text-text-secondary text-xs font-medium">→</span>
                  <input
                    ref={customToRef}
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={todayDate}
                    onChange={e => setCustomTo(e.target.value)}
                    className="px-3 py-2.5 rounded-lg bg-bg-primary border border-border-default text-text-primary text-sm"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-action-primary/30 border-t-action-primary rounded-full animate-spin"></div>
            <p className="text-text-secondary text-sm mt-4">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-bg-primary rounded-2xl shadow-lg border border-border-default">
            <div className="text-7xl mb-4">📭</div>
            <p className="text-xl font-bold text-text-primary mb-2">No Orders Found</p>
            <p className="text-text-secondary">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="bg-bg-primary rounded-xl shadow-lg border border-border-default overflow-hidden">
            <AgGridTable columnDefs={billingColumnDefs} rowData={filteredOrders} domLayout="normal" height={600} />
          </div>
        )}

        {/* Invoice Modal */}
        {invoiceModalOpen && selectedOrder && (
          <InvoiceModal
            clientId={clientId}
            token={token}
            selectedOrder={selectedOrder}
            tablesMap={tablesMap}
            inventoryMap={inventoryMap}
            onClose={() => setInvoiceModalOpen(false)}
            onSave={handleInvoiceSave}
          />
        )}
        <OrderItemsViewModal
  isOpen={showViewModal}
  onClose={() => { setShowViewModal(false); setViewOrder(null); }}
  order={viewOrder}
  onRequestDeleteItem={(item) => handleRequestDeleteItem(item, viewOrder?.id)}
  getOrderTotal={getOrderTotal}
/>

<CancelOrderConfirmModal
  isOpen={cancelOrderModal.isOpen}
  onClose={() => setCancelOrderModal({ isOpen: false, orderId: null })}
  onConfirm={(reason) => { if (cancelOrderModal.orderId) handleCancelOrder(cancelOrderModal.orderId, reason); }}
/>

<OldItemDeleteModal
  isOpen={itemDeleteModal.isOpen}
  item={itemDeleteModal.item}
  onClose={() => setItemDeleteModal({ isOpen: false, item: null, orderId: null })}
  onRemoveOne={handleItemRemoveOne}
  onRemoveAll={handleItemRemoveAll}
/>
      </div>
    </div>
  );
}