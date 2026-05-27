import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import InvoiceModal from './InvoiceModal';
import { Search, Calendar, Eye } from 'lucide-react';

export default function BillingPage({ clientId, token }) {
  const navigate = useNavigate();
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
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const [ordersRes, tablesRes, invRes, billingRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        
        const allOrders = ordersRes.data?.data || [];
        setOrders(allOrders);
        
        const tMap = {};
        (tablesRes.data?.data || []).forEach((t) => (tMap[t.id] = t));
        setTablesMap(tMap);
        
        const iMap = {};
        (invRes.data?.data || []).forEach((i) => (iMap[i.id] = i));
        setInventoryMap(iMap);

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
              <table className="w-full">
                <thead className="bg-bg-tertiary border-b border-border-default">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Table</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Items</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-text-primary uppercase tracking-wider">Payment Status</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-text-primary uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {filteredOrders.map((order, index) => {
                    const tableName = tablesMap[order.table_id]?.name || `Table ${order.table_id}`;
                    const orderTotal = Number(order.total_price ?? 0);

                    return (
                      <tr 
                        key={order.id} 
                        className="hover:bg-bg-tertiary transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-text-primary">#{order.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-text-primary">{tableName}</div>
                          <div className="text-xs text-text-secondary">{order.mode || "Dine-In"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text-primary">{order.items?.length || 0} items</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-action-primary">₹{orderTotal.toFixed(2)}</div>
                        </td>
                        {(() => {
                          const billingDoc = billingDocMap[order.id.toString()];
                          return (
                            <>
                              {/* Total Amount */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-action-primary">
                                  {billingDoc ? `₹${Number(billingDoc.total_amount).toFixed(2)}` : "—"}
                                </div>
                              </td>

                              {/* Payment Status */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                {billingDoc ? (
                                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${billingDoc.payment_status === "paid"
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
                                )}
                              </td>
                            </>
                          );
                        })()}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleSelectOrder(order)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-action-primary hover:bg-action-primary/90 text-text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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