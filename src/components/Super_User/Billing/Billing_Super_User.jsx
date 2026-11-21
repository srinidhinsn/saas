import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import InvoiceModal from "../../MainComponents/BillingServices/InvoiceModal";
import { Search, Calendar, Eye } from 'lucide-react';
import { useTenant } from "../../../context/TenantContext";
import AgGridTable from '../../utils/AgGridTable';
export default function BillingPage_Super_User({  token }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clientId } = useTenant();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [tablesMap, setTablesMap] = useState({});
  const [inventoryMap, setInventoryMap] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // New state for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const [ordersRes, tablesRes, invRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        
        const allOrders = ordersRes.data?.data || [];
        setOrders(allOrders);
        
        const tMap = {};
        (tablesRes.data?.data || []).forEach((t) => (tMap[t.id] = t));
        setTablesMap(tMap);
        
        const iMap = {};
        (invRes.data?.data || []).forEach((i) => (iMap[i.id] = i));
        setInventoryMap(iMap);
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
    let filtered = [...orders];

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        return orderDate === dateFilter;
      });
    }

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
  }, [searchQuery, dateFilter, orders, tablesMap]);

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

    const combinedItems = combineDuplicateItems(enrichedItems);

    const updatedOrder = {
      ...order,
      items: combinedItems,
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
  };

  const billingColumnDefs = [
    {
      headerName: 'Order ID',
      field: 'id',
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
          <div className="text-ui-sm text-ink-muted">{params.data?.mode || "Dine-In"}</div>
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
      headerName: 'Total',
      field: 'total_price',
      minWidth: 130,
      valueGetter: (params) => Number(params.data?.total_price ?? 0),
      valueFormatter: (params) => `₹${(params.value || 0).toFixed(2)}`,
      cellRenderer: (params) => (
        <div className="text-body-sm font-bold text-brand-dark">₹{Number(params.value || 0).toFixed(2)}</div>
      ),
    },
    {
      headerName: 'Action',
      colId: 'actions',
      minWidth: 140,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params) => (
        <div className="flex items-center justify-center w-full">
          <button
            onClick={() => handleSelectOrder(params.data)}
            className="ui-btn ui-btn-primary !h-7 gap-1.5"
          >
            <Eye size={14} />
            View
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-canvas p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto">

        {/* Header */}
        <div className="ui-panel !p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-panel flex items-center justify-center flex-shrink-0
                              bg-brand-soft text-brand-dark border border-brand-line text-page-title font-bold">
                {clientId.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-page-title text-brand-dark">{clientId.toUpperCase()}</h1>
                <div className="text-ui font-semibold text-ink-muted">{filteredOrders.length} orders found</div>
              </div>
            </div>
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" size={14} />
                <input
                  type="text"
                  placeholder="Search by table name or order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ui-input"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" size={14} />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="ui-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-11 w-11 border-4 border-brand-soft border-t-brand rounded-full animate-spin-slow"></div>
            <p className="text-ink-muted text-ui mt-4">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-surface rounded-panel shadow-panel border border-line border-t-panel border-t-line-panel">
            <div className="text-7xl mb-4">📭</div>
            <p className="text-panel-title text-brand-dark mb-1">No Orders Found</p>
            <p className="ui-hint !mt-0">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="bg-surface rounded-panel shadow-panel border border-line border-t-panel border-t-line-panel overflow-hidden">
            <div className="overflow-x-auto">
              <AgGridTable
                columnDefs={billingColumnDefs}
                rowData={filteredOrders}
                domLayout="normal"
                height={600}
                exportFileName="billing_super_user"
                gridOptions={{ getRowId: (params) => String(params.data.id) }}
              />
            </div>
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
      </div>
    </div>
  );
}