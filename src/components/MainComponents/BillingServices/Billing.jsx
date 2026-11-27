import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import InvoiceModal from './InvoiceModal';
import { Search, Eye } from 'lucide-react';
import { menuCache } from '../../utils/Menu-utils/menuCache';
import AgGridTable from '../../utils/AgGridTable';
import { fmt, formatPriceByMode } from '../../utils/Menu-utils/menuUtils';
import { DateRangeFilter, getDateRangeFromPreset } from '../../utils/dateRange';

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
  const todayDate = new Date().toISOString().split('T')[0];
  const [datePreset, setDatePreset] = useState('today');
  const [customFrom, setCustomFrom] = useState(todayDate);
  const [customTo, setCustomTo] = useState(todayDate);
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
useEffect(() => {
  let filtered = orders.filter(o => o.status?.toLowerCase() !== 'cancelled');

  const { from, to } = getDateRangeFromPreset(datePreset, customFrom, customTo);

  filtered = filtered.filter(order => {
    const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
    return orderDate >= from && orderDate <= to;
  });

  setFilteredOrders(filtered);
}, [datePreset, customFrom, customTo, orders]);

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
    const uniqueKeyToItemMap = new Map();
    const deduplicatedItems = [];

    enrichedItems.forEach(item => {
      const fkey = item.frontend_unique_key || `${item.item_id}_${item.unit_price}_${item.sub_order_id ?? ''}`;
      if (uniqueKeyToItemMap.has(fkey)) {
        // Accumulate quantity for duplicate entries
        uniqueKeyToItemMap.get(fkey).quantity += (item.quantity ?? 0);
      } else {
        const copy = { ...item };
        uniqueKeyToItemMap.set(fkey, copy);
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
  const SERVICE_LABELS = {
    dinein: 'Dine-In', takeaway: 'TakeAway', walkin: 'Walk-in', delivery: 'Delivery',
  };
  
  const getServiceLabel = (order, table) => {
    const raw = order?.mode || order?.order_type || order?.service_type
             || table?.name || '';
    const key = String(raw).toLowerCase().replace(/[\s_-]/g, '');
    return SERVICE_LABELS[key] || raw || '—';
  };
  const billingColumnDefs = [
    {
      headerName: 'Order ID',
      field: 'dinein_order_id',
      minWidth: 120,
      cellRenderer: (params) => (
        <div className="text-body-sm font-bold text-brand-dark">#{params.value}</div>
      ),
    },
    {
      headerName: 'Table',
      field: 'table_id',
      minWidth: 150,
      valueGetter: (params) => tablesMap[params.data?.table_id]?.name || `Table ${params.data?.table_id}`,
      cellRenderer: (params) => (
        <div>
          <div className="text-body-sm font-semibold text-ink">{params.value}</div>
          <div className="text-ui-sm text-ink-muted">{getServiceLabel(params.data, tablesMap[params.data?.table_id])}</div>
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
        <div className="text-body-sm font-bold text-brand-dark">
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
        <span className="text-body-sm font-semibold text-ink">
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
          <span className={`inline-flex px-2.5 py-1 rounded-badge text-micro font-bold ${billingDoc.payment_status === "Paid"
            ? "bg-state-vacant-bg text-state-vacant"
            : billingDoc.status === "partial"
              ? "bg-state-reserved-bg text-state-reserved"
              : "bg-state-occupied-bg text-state-occupied"
            }`}>
            {billingDoc.payment_status?.toUpperCase() ?? "UNKNOWN"}
          </span>
        ) : (
          <span className="inline-flex px-2.5 py-1 rounded-badge text-micro font-bold bg-brand-light text-ink-muted">
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

  const billingToolbarLeft = (
  <div className="flex flex-wrap items-end gap-4">
    <span className="text-panel-title text-brand-dark whitespace-nowrap">
      {filteredOrders.length} orders found
    </span>

    <DateRangeFilter
      datePreset={datePreset}
      setDatePreset={setDatePreset}
      customFrom={customFrom}
      setCustomFrom={setCustomFrom}
      customTo={customTo}
      setCustomTo={setCustomTo}
    />
  </div>
);
  return (
    <div className="min-h-screen bg-canvas p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto">

        {/* Orders Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-11 w-11 border-4 border-brand-soft border-t-brand rounded-full animate-spin-slow"></div>
            <p className="text-ink-muted text-ui mt-4">Loading orders...</p>
          </div>
        ) : (
          <div className="bg-surface rounded-panel shadow-panel border border-line border-t-panel border-t-line-panel overflow-hidden">
            <AgGridTable
              columnDefs={billingColumnDefs}
              rowData={filteredOrders}
              domLayout="normal"
              height={600}
              exportFileName="billing-orders"
              toolbarLeft={billingToolbarLeft}
              overlayNoRowsTemplate={
                '<div style="text-align:center"><div style="font-size:48px">📭</div><div style="font-weight:700">No Orders Found</div><div style="opacity:.7;font-size:13px">Try adjusting your filters</div></div>'
              }
            />
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
          invoiceGenerated={viewOrder ? hasInvoiceBeenGenerated(viewOrder, billingDocMap) : false}
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