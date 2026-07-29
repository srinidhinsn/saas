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
      headerName: 'Total',
      field: 'total_price',
      minWidth: 130,
      valueGetter: (params) => Number(params.data?.total_price ?? 0),
      valueFormatter: (params) => `₹${(params.value || 0).toFixed(2)}`,
      cellRenderer: (params) => (
        <div className="text-sm font-bold text-action-primary">₹{Number(params.value || 0).toFixed(2)}</div>
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-action-primary hover:bg-action-primary/90 text-text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <Eye size={16} />
            View
          </button>
        </div>
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
            <div className="md:w-64">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border-default rounded-lg bg-bg-primary text-text-primary focus:ring-2 focus:ring-action-primary focus:border-action-primary transition-all"
                />
              </div>
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
            <div className="overflow-x-auto">
              <AgGridTable
                columnDefs={billingColumnDefs}
                rowData={filteredOrders}
                domLayout="autoHeight"
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