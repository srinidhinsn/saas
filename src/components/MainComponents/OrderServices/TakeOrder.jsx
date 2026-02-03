import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, X, Check, StickyNote, Search, Users, Package, Trash2 } from 'lucide-react';
import axios from 'axios';
import CategoryTree from '../InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';
import { Eye, Lock, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const TABLE_STATUS_CONFIG = {
  vacant: {
    clickable: true,
    bg: 'bg-action-success',
    border: 'border-border-default',
    badge: 'bg-green-100 text-action-success',
    icon: null,
  },
  available: {
    clickable: true,
    bg: 'bg-action-success',
    border: 'border-border-default',
    badge: 'bg-green-100 text-green-700',
    icon: null,
  },
  occupied: {
    clickable: false,
    bg: 'bg-action-primary',
    border: 'border-action-primary',
    badge: 'bg-red-100 text-action-primary',
    icon: Eye,
    viewable: true,
  },
  served: {
    clickable: false,
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    icon: Eye,
    viewable: true,
  },
  reserved: {
    clickable: false,
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: Lock,
  },
};

const TableReservation = ({
  tables = [],
  orderMode = "dinein",
  onSelectTable,
  onSelectTakeaway,
  onSelectDineIn,
  onViewOrder,
  tableOrders = {},
  onPrintBill,
  onDeleteOrder,
  onMarkAsServed,
}) => {
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedZones, setSelectedZones] = useState([]);

  const toggleFilter = (value, list, setList) => {
    setList(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const uniqueZones = [...new Set(tables.map(t => t.location_zone))];

  const getSectionsByZone = (zone) => {
    return [...new Set(
      filteredTables
        .filter(t => t.location_zone === zone)
        .map(t => t.section || 'Other')
    )];
  };

  const filteredTables = tables.filter(t => {
    if ((t.name || '').toLowerCase().includes('takeaway') || t.id === 500) {
      return false;
    }

    const zoneMatch =
      selectedZones.length === 0 || selectedZones.includes(t.location_zone);

    const sectionMatch =
      selectedSections.length === 0 || selectedSections.includes(t.section);

    return zoneMatch && sectionMatch;
  });

  const visibleZones = [...new Set(filteredTables.map(t => t.location_zone))];

  return (
    <div className="p-4 bg-bg-primary overflow-y-auto h-[calc(100vh-4rem)]">
      {/* FILTER BAR */}
      <div className="mb-3 sticky top-0 z-10 bg-bg-primary">
        <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border-default bg-bg-tertiary">
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl">
            <button
              onClick={() => {
                setSelectedSections([]);
                setSelectedZones([]);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition
                ${selectedSections.length === 0 && selectedZones.length === 0
                  ? "bg-action-primary text-white"
                  : "bg-white text-text-secondary hover:bg-gray-100"}`}
            >
              All
            </button>

            <div className="w-px bg-border-default mx-1" />

            {["AC", "Non-AC"].map(sec => (
              <button
                key={sec}
                onClick={() => toggleFilter(sec, selectedSections, setSelectedSections)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition
                  ${selectedSections.includes(sec)
                    ? "bg-action-primary text-white"
                    : "bg-white text-text-secondary hover:bg-gray-100"}`}
              >
                {sec}
              </button>
            ))}

            <div className="w-px bg-border-default mx-1" />

            {["Ground Floor", "First Floor", "Second Floor", "Garden Area"].map(zone => (
              <button
                key={zone}
                onClick={() => toggleFilter(zone, selectedZones, setSelectedZones)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition
                  ${selectedZones.includes(zone)
                    ? "bg-action-primary text-white"
                    : "bg-white text-text-secondary hover:bg-gray-100"}`}
              >
                {zone}
              </button>
            ))}
          </div>

          <div className="ml-auto flex bg-bg-primary border-2 rounded-full border-action-primary p-1 shadow-sm">
            <button
              onClick={onSelectDineIn}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all
                ${orderMode === "dinein"
                  ? "bg-action-primary text-text-white shadow"
                  : "text-text-secondary hover:bg-gray-100"}`}
            >
              Dine In
            </button>

            <button
              onClick={onSelectTakeaway}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1
                ${orderMode === "takeaway"
                  ? "bg-orange-500 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100"}`}
            >
              <Package size={12} />
              Takeaway
            </button>
          </div>
        </div>
      </div>

      {/* TABLE GRID */}
      {orderMode === "dinein" && visibleZones.map(zone => {
        const sections = getSectionsByZone(zone);

        return (
          <div key={zone} className="mb-10">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {zone}
            </h3>

            {sections.map(section => (
              <div key={section} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-200">
                    {section}
                  </span>
                </div>

                <div className="grid gap-6 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5">
                  {filteredTables
                    .filter(t => t.location_zone === zone && t.section === section)
                    .map(table => {
                      const statusKey = table.status?.toLowerCase();
                      const config = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;
                      const orderInfo = tableOrders[table.id];
                      
                      // Check if table has viewable order (occupied or served status with order info)
                      const hasViewableOrder = (statusKey === 'occupied' || statusKey === 'served') && orderInfo;

                      return (
                        <div
                          key={table.id}
                          className="rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition bg-white"
                        >
                          {/* ===== HEADER ===== */}
                          <div
                            onClick={() => {
                              if (config.clickable) {
                                onSelectTable(table);
                              } else if (hasViewableOrder && onViewOrder) {
                                onViewOrder(table);
                              }
                            }}
                            className={`${config.clickable || hasViewableOrder ? 'cursor-pointer' : ''}`}
                          >
                            <div className="flex justify-between px-3 py-2 bg-action-primary text-white">
                              {/* TABLE NUMBER */}
                              <span className="font-bold text-xl tracking-wide">
                                {table.table_number}
                              </span>

                              {/* ORDER STATUS */}
                              {hasViewableOrder && (
                                <span
                                  className={`text-xl px-2 py-0.5 rounded-full font-semibold
                                    ${orderInfo.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                      orderInfo.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                        orderInfo.status === 'ready' ? 'bg-green-100 text-green-700' :
                                          orderInfo.status === 'served' ? 'bg-purple-100 text-purple-700' :
                                            'bg-gray-100 text-gray-700'}
                                  `}
                                >
                                  {orderInfo.status?.toUpperCase()}
                                </span>
                              )}

                              {/* ORDER ID */}
                              {hasViewableOrder && (
                                <div className="text-xl opacity-90 mt-1">
                                  #{orderInfo.id}
                                </div>
                              )}
                            </div>

                            {/* ===== BODY ===== */}
                            <div className={`p-6 flex justify-between  ${statusKey === 'occupied' ? 'text-blue-600 bg-blue-200' :
                                  statusKey === 'served' ? 'text-purple-600 bg-purple-50' :
                                    statusKey === 'reserved' ? 'text-yellow-600 bg-yellow-50' :
                                      'text-green-600 bg-green-200'} `}>
                              {statusKey === 'vacant' && <span className="text-2xl">-</span>}
                              {(statusKey === 'occupied' || statusKey === 'served') && <Eye size={28} className="text-blue-600" />}
                              
                              {/* ACTION BUTTONS FOR OCCUPIED/SERVED TABLES */}
                              {hasViewableOrder && (
                                <>
                                  {/* Print Bill Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onPrintBill) {
                                        onPrintBill(orderInfo.id, table.id);
                                      }
                                    }}
                                    className="text-yellow-600 hover:scale-110 transition-transform"
                                    title="Print Bill"
                                  >
                                    <Printer size={28} />
                                  </button>
                                  
                                  {/* Delete Order Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onDeleteOrder) {
                                        onDeleteOrder(orderInfo.id, table.id);
                                      }
                                    }}
                                    className="text-red-600 hover:scale-110 transition-transform"
                                    title="Delete Order"
                                  >
                                    <Trash2 size={28} />
                                  </button>
                                </>
                              )}
                              {statusKey === 'reserved' && <Lock size={28} className="text-yellow-600" />}
                            </div>

                            {/* STATUS BADGE
                            <div
                              className={`py-2 text-center text-xs font-semibold border-t rounded
                                ${statusKey === 'occupied' ? 'text-blue-600 bg-blue-50' :
                                  statusKey === 'served' ? 'text-purple-600 bg-purple-50' :
                                    statusKey === 'reserved' ? 'text-yellow-600 bg-yellow-50' :
                                      'text-green-600 bg-green-50'}`}
                            >
                              {table.status?.toUpperCase()}
                            </div> */}
                          </div>

                          {/* MARK AS SERVED BUTTON */}
                          {hasViewableOrder && orderInfo.status === 'ready' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onMarkAsServed) {
                                  onMarkAsServed(orderInfo.id, table.id);
                                }
                              }}
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

      {/* TAKEAWAY INFO */}
      {orderMode === "takeaway" && (
        <div className="text-center mt-10 text-gray-500 text-sm">
          Takeaway selected. Opening menu…
        </div>
      )}
    </div>
  );
};

const NoteModal = ({ isOpen, onClose, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg max-w-md w-full p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Add Note for {itemName}
        </h3>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            style={{
              borderColor: 'var(--color-border-default)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-primary)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddWithLineItems, onAddMainOnly }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg" >
      <div className="rounded-lg max-w-lg w-full p-6 bg-bg-primary">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">{mainItem?.name}</h3>
        <p className="mb-4 text-text-secondary">Item add-ons : </p>

        <div className="space-y-2 mb-6">
          {lineItems.map((item, index) => (
            <div key={item.id} className="flex justify-between items-center p-3 rounded-lg bg-bg-tertiary border-border-default">
              <span className='text-text-primary'>{index + 1}. {item.name}</span>
              <span className="font-semibold text-action-primary">Rs.{item.unit_price}</span>
            </div>
          ))}
        </div>

        <p className="text-text-secondary italic mb-4">
          Want add-ons?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg transition-colors border-border-default bg-bg-tertiary text-text-primary">
            Cancel
          </button>
          <button
            onClick={onAddMainOnly}
            className="flex-1 px-4 py-2 rounded-lg transition-colors bg-action-primary text-text-white">
            Main Only
          </button>
          <button
            onClick={onAddWithLineItems}
            className="flex-1 px-4 py-2 rounded-lg transition-colors bg-action-primary text-text-white">
            With Add-ons
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
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
          <p className="text-sm text-gray-700">
            Are you sure you want to delete this order? This action cannot be undone.
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
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const TakeOrder = ({ clientId, token, onOrderUpdate, realm }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedTable, setSelectedTable] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [currentItemForNote, setCurrentItemForNote] = useState(null);
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const [selectedMainItem, setSelectedMainItem] = useState(null);
  const [lineItemsDetails, setLineItemsDetails] = useState([]);
  const [orderMode, setOrderMode] = useState('dinein');
  const [takeawayTableId, setTakeawayTableId] = useState(null);
  const isPlacingRef = useRef(false);
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showOrderPage, setShowOrderPage] = useState(false);
  const [currentView, setCurrentView] = useState('floor');
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [hasNewItems, setHasNewItems] = useState(false);
  const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [tableOrders, setTableOrders] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const navigate = useNavigate();

  // ============ UTILITY FUNCTIONS ============
  const flattenCategoryTree = (tree, level = 0, parentId = null) => {
    let flatList = [];
    tree.forEach(category => {
      flatList.push({
        id: category.id,
        name: category.name,
        level: level,
        parentId: parentId,
        hasChildren: category.subCategories && category.subCategories.length > 0,
      });
      if (category.subCategories && category.subCategories.length > 0) {
        flatList = flatList.concat(
          flattenCategoryTree(category.subCategories, level + 1, category.id)
        );
      }
    });
    return flatList;
  };

  const generateSlug = (text) =>
    "_" + text.trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");

  const getCategoryAndChildrenNames = (categories, targetName) => {
    const result = new Set();
    const traverse = (nodes, found = false) => {
      for (const node of nodes) {
        const isTarget = node.name === targetName;
        if (isTarget || found) {
          result.add(node.name);
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children, found || isTarget);
        }
      }
    };
    traverse(categories);
    return Array.from(result);
  };

  const fetchTables = async () => {
    const res = await axios.get(
      `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const tableList = Array.isArray(res.data?.data)
      ? res.data.data.map(t => ({
        ...t,
        table_number: t.name || t.table_number || "-",
      }))
      : [];

    const takeawayTable = tableList.find(t => Number(t.id) === 500);
    if (takeawayTable) {
      setTakeawayTableId(takeawayTable.id);
    } else {
      console.warn("⚠️ Takeaway table (id=500) not found");
    }

    tableList.sort((a, b) =>
      a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
    );

    setTables(tableList);
    await fetchTableOrders(tableList);
  };

  const fetchTableOrders = async (tableList) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const allOrders = response.data?.data || [];
      const ordersMap = {};

      tableList.forEach(table => {
        const tableStatus = table.status?.toLowerCase();
        
        // Show orders for both occupied and served tables
        if (tableStatus === 'occupied' || tableStatus === 'served') {
          const tableOrder = allOrders
            .filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

          if (tableOrder) {
            ordersMap[table.id] = {
              id: tableOrder.id,
              status: tableOrder.status,
              order_mode: tableOrder.order_type || 'dinein',
              created_at: tableOrder.created_at,
            };
          }
        }
      });

      setTableOrders(ordersMap);
    } catch (err) {
      console.error("Failed to fetch table orders:", err);
    }
  };

  // Delete Order Handler
  const handleDeleteOrder = async (orderId, tableId) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
        {
          params: { dinein_order_id: orderId, client_id: clientId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update table status to vacant
      const tableObj = tables.find(t => t.id === tableId);
      if (tableObj) {
        await axios.post(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          {
            id: tableId,
            client_id: clientId,
            name: tableObj.name,
            table_type: tableObj.table_type,
            status: 'Vacant',
            location_zone: tableObj.location_zone
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      toast.success('Order deleted successfully');
      
      // Refresh tables
      await fetchTables();
      
      // Close modal
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
    } catch (err) {
      console.error('Delete order error:', err);
      toast.error('Failed to delete order');
    }
  };

  // Mark as Served Handler - UPDATED: Only updates order status, not table status
  const handleMarkAsServed = async (orderId, tableId) => {
    try {
      // Update order status to served
      await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        {
          id: orderId,
          client_id: clientId,
          status: 'served'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // DO NOT UPDATE TABLE STATUS - User will handle this after payment
      
      toast.success('Order marked as served');
      
      // Refresh tables to update order info display
      await fetchTables();
    } catch (err) {
      console.error('Mark as served error:', err.response?.data || err.message);
      toast.error('Failed to mark order as served');
    }
  };

  useEffect(() => {
    setIsOrderFormOpen(showCart);
  }, [showCart]);

  useEffect(() => {
    const onBackButton = (e) => {
      if (currentView === 'order') {
        e.preventDefault();
        setCurrentView('floor');
        setShowCart(false);
        window.history.pushState({ view: 'floor' }, '');
      }
    };

    window.addEventListener('popstate', onBackButton);
    return () => window.removeEventListener('popstate', onBackButton);
  }, [currentView]);

  useEffect(() => {
    window.history.pushState({ view: 'floor' }, '');
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await fetchTables();

        const [catRes, itemRes] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?realm=${realm}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        ]);

        const fullTree = catRes.data.data.filter(
          c => c.name?.toLowerCase() !== "all"
        );

        const subcategoryIds = new Set();
        fullTree.forEach(cat =>
          cat.subCategories?.forEach(sub => subcategoryIds.add(sub.id))
        );

        const topLevelCategories = fullTree.filter(
          cat => !subcategoryIds.has(cat.id)
        );

        const flatCategories = flattenCategoryTree(topLevelCategories);

        const enrichedItems = itemRes.data.data.map(item => {
          const cat = flatCategories.find(c => c.id === item.category_id);
          return { ...item, category: cat?.name || "Uncategorized" };
        });

        setMenuItems(enrichedItems);

        const buildCategoryTree = () => {
          const map = new Map();

          flatCategories.forEach(cat => {
            map.set(cat.id, {
              ...cat,
              count: enrichedItems.filter(i =>
                cat.name === "All Categories"
                  ? true
                  : i.category === cat.name
              ).length,
              children: []
            });
          });

          const tree = [];
          map.forEach(cat => {
            if (cat.parentId && map.has(cat.parentId)) {
              map.get(cat.parentId).children.push(cat);
            } else {
              tree.push(cat);
            }
          });

          return tree;
        };

        const tree = buildCategoryTree().map(cat => {
          if (cat.id === 'dietery' || cat.name?.toLowerCase() === 'dietery') {
            return {
              ...cat,
              name: 'All Categories',
              count: enrichedItems.length
            };
          }
          return cat;
        });

        setCategories(tree);

      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, token, realm]);

  useEffect(() => {
    if (!activeOrderId || menuItems.length === 0 || cart.length === 0) return;

    setCart(prev =>
      prev.map(item => {
        if (item.name !== 'Unnamed Item') return item;
        const menuItem = menuItems.find(
          mi => Number(mi.id) === Number(item.id)
        );

        if (!menuItem) return item;

        return {
          ...item,
          name: menuItem.name,
          unit_price: menuItem.unit_price,
          image_id: menuItem.image_id,
          discount: menuItem.discount || 0,
          slug: menuItem.slug,
          category: menuItem.category,
        };
      })
    );
  }, [menuItems, activeOrderId]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      const t = setTimeout(() => searchInputRef.current.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const getFilteredItems = () => {
    const q = (searchQuery || '').trim().toLowerCase();
    let items = menuItems;

    if (selectedCategory && selectedCategory !== 'All Categories') {
      const allowedCategories = getCategoryAndChildrenNames(
        categories,
        selectedCategory
      );
      items = items.filter(item =>
        allowedCategories.includes(item.category)
      );
    }

    if (!q) return items;

    return items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const code = String(item.code || '').toLowerCase();

      return (
        name.includes(q) ||
        category.includes(q) ||
        code.includes(q)
      );
    });
  };

  const filteredItems = getFilteredItems();

  const handleItemClick = (item) => {
    if (item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0) {
      const lineItems = item.line_item_id
        .map(id => menuItems.find(i => i.id === id))
        .filter(Boolean);

      setSelectedMainItem(item);
      setLineItemsDetails(lineItems);
      setLineItemsModalOpen(true);
    } else {
      addToCart(item);
    }
  };

  const addToCart = (item) => {
    setHasNewItems(true);

    const timestamp = Date.now() + Math.random();
    const uniqueKey = `${item.id}_${timestamp}`;

    let batchTimestamp = currentBatchTimestamp;

    if (!batchTimestamp) {
      batchTimestamp = Date.now();
      setCurrentBatchTimestamp(batchTimestamp);

      if (activeOrderId) {
        localStorage.setItem(
          `order_${activeOrderId}_batch_${batchTimestamp}`,
          JSON.stringify({
            timestamp: batchTimestamp,
            started_at: Date.now(),
          })
        );
      }
    }

    if (activeOrderId) {
      const cartItem = {
        id: Number(item.id),
        name: item.name,
        unit_price: item.unit_price || 0,
        image_id: item.image_id,
        discount: item.discount || 0,
        slug: item.slug,
        category: item.category,
        quantity: 1,
        note: "",
        frontend_unique_key: uniqueKey,
        batch_timestamp: batchTimestamp,
        is_new_item: true,
      };

      setCart(prev => [...prev, cartItem]);

      localStorage.setItem(
        `order_${activeOrderId}_new_item_${uniqueKey}`,
        JSON.stringify({
          item_id: item.id,
          unique_key: uniqueKey,
          added_at: timestamp,
          batch_timestamp: batchTimestamp,
          quantity: 1,
        })
      );
    } else {
      const existingItem = cart.find(i => i.id === item.id && !i.frontend_unique_key);

      if (existingItem) {
        setCart(cart.map(i =>
          i.id === item.id && !i.frontend_unique_key
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ));
      } else {
        const cartItem = {
          id: Number(item.id),
          name: item.name,
          unit_price: item.unit_price || 0,
          image_id: item.image_id,
          discount: item.discount || 0,
          slug: item.slug,
          category: item.category,
          quantity: 1,
          note: "",
        };
        setCart(prev => [...prev, cartItem]);
      }
    }

    if (!isMobile) setShowCart(true);
  };

  const clearDraftForOrder = (orderId) => {
    if (!orderId) return;
    Object.keys(localStorage).forEach(key => {
      if (
        key.startsWith(`order_${orderId}_new_item_`) ||
        key.startsWith(`order_${orderId}_batch_`)
      ) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleAddMainItemWithLineItems = () => {
    if (!selectedMainItem) return;

    const mainItemCopy = { ...selectedMainItem };
    const existingMainItem = cart.find(i => i.id === mainItemCopy.id);

    if (existingMainItem) {
      setCart(cart.map(i =>
        i.id === mainItemCopy.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart(prev => [...prev, { ...mainItemCopy, quantity: 1, note: "" }]);
    }

    lineItemsDetails.forEach(lineItem => {
      const existingLineItem = cart.find(i => i.id === lineItem.id);

      if (existingLineItem) {
        setCart(prev =>
          prev.map(i =>
            i.id === lineItem.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        );
      } else {
        setCart(prev => [
          ...prev,
          {
            id: Number(lineItem.id),
            name: lineItem.name,
            unit_price: lineItem.unit_price,
            image_id: lineItem.image_id,
            discount: lineItem.discount || 0,
            slug: lineItem.slug,
            category: lineItem.category,
            quantity: 1,
            note: "",
          }
        ]);
      }
    });

    setLineItemsModalOpen(false);
    setSelectedMainItem(null);
    setLineItemsDetails([]);
  };

  const handleAddMainItemOnly = () => {
    if (!selectedMainItem) return;

    const mainItemCopy = { ...selectedMainItem };
    const existingMainItem = cart.find(i => i.id === mainItemCopy.id);

    if (existingMainItem) {
      setCart(cart.map(i =>
        i.id === mainItemCopy.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart(prev => [
        ...prev,
        {
          id: Number(mainItemCopy.id),
          name: mainItemCopy.name || mainItemCopy.item_name || 'Unnamed Item',
          unit_price: mainItemCopy.unit_price || 0,
          image_id: mainItemCopy.image_id,
          discount: mainItemCopy.discount || 0,
          slug: mainItemCopy.slug,
          category: mainItemCopy.category,
          quantity: 1,
          note: "",
        }
      ]);
    }

    setLineItemsModalOpen(false);
    setSelectedMainItem(null);
    setLineItemsDetails([]);
  };

  const openNoteEditor = (item) => {
    setCurrentItemForNote(item);
    setNoteModalOpen(true);
  };

  const saveNoteToItem = (noteText) => {
    setCart(cart.map(i =>
      i.id === currentItemForNote.id ? { ...i, note: noteText } : i
    ));
  };

  const removeFromCart = (itemId, uniqueKey = null) => {
    setHasNewItems(true);

    if (uniqueKey) {
      setCart(cart.filter(i => i.frontend_unique_key !== uniqueKey));
    } else {
      setCart(cart.filter(i => i.id !== itemId));
    }
  };

  const updateQuantity = (itemId, change, uniqueKey = null) => {
    setHasNewItems(true);

    setCart(cart
      .map(item => {
        const isMatch = uniqueKey
          ? item.frontend_unique_key === uniqueKey
          : item.id === itemId && !item.frontend_unique_key;

        if (isMatch) {
          const qty = item.quantity + change;
          return qty > 0 ? { ...item, quantity: qty } : null;
        }
        return item;
      })
      .filter(Boolean)
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) =>
      total + ((item.unit_price || 0) * item.quantity), 0
    ).toFixed(2);
  };

  const handlePlaceOrder = async () => {
    if (isPlacingRef.current || !canPlaceOrder) return;

    isPlacingRef.current = true;
    setIsPlacingOrder(true);

    try {
      const subtotal = cart.reduce(
        (s, i) => s + (i.unit_price || 0) * i.quantity,
        0
      );

      const gst = subtotal * 0.05;
      const cst = subtotal * 0.02;
      const total = subtotal + gst + cst;

      const headers = { Authorization: `Bearer ${token}` };

      if (activeOrderId) {
        await axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${activeOrderId}`,
          cart.map(i => ({
            client_id: clientId,
            item_id: i.id,
            order_id: activeOrderId,
            item_name: i.name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            line_total: i.unit_price * i.quantity,
            status: "pending",
            note: i.note || "",
            frontend_unique_key: i.frontend_unique_key || null,
          })),
          { headers }
        );

        await axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
          { id: activeOrderId, total_price: total },
          { headers }
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
          {
            client_id: clientId,
            table_id: Number(selectedTable),
            price: subtotal,
            gst,
            cst,
            total_price: total,
            status: "pending",
            items: cart.map(i => ({
              item_id: i.id,
              item_name: i.name,
              quantity: i.quantity,
              unit_price: i.unit_price,
              line_total: i.unit_price * i.quantity,
              status: "pending"
            }))
          },
          { headers }
        );
      }

      const tableToUpdate = tables.find(t => t.id.toString() === selectedTable);
      if (tableToUpdate) {
        await axios.post(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          {
            ...tableToUpdate,
            id: Number(selectedTable),
            status: "Occupied",
            table_type: tableToUpdate.table_type.toString()
          },
          { headers }
        );
      }

      await fetchTables();

      if (activeOrderId && currentBatchTimestamp) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`order_${activeOrderId}_batch_${currentBatchTimestamp}`)) {
            localStorage.removeItem(key);
          }
        });
      }

      setCart([]);
      setActiveOrderId(null);
      setShowCart(false);
      setCurrentView("floor");
      setCurrentBatchTimestamp(null);
      setHasNewItems(false);

    } catch (err) {
      console.error("ORDER ERROR:", err);
      alert("Order failed");
    } finally {
      isPlacingRef.current = false;
      setIsPlacingOrder(false);
    }
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table.id.toString());
    setCurrentView('order');
    window.history.pushState({ view: 'order' }, '');
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    setCart([]);
    setSelectedTable('');
    setShowOrderPage(false);
    setCurrentView('floor');
    setShowCart(false);
    setShowClearConfirm(false);
    setActiveOrderId(null);
    setCurrentBatchTimestamp(null);
    setHasNewItems(false);
  };

  const handleTakeawaySelect = () => {
    setOrderMode('takeaway');
    setSelectedTable(takeawayTableId.toString());
    setCurrentView('order');
    window.history.pushState({ view: 'order' }, '');
  };

  const handleViewOrder = async (table) => {
    if (menuItems.length === 0) {
      alert("Menu is still loading, please wait...");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const allOrders = response.data?.data || [];
      
      // Include both non-served and served orders (but not completed)
      const tableOrders = allOrders.filter(
        o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed'
      );

      if (tableOrders.length === 0) {
        alert('No active order for this table');
        return;
      }

      const activeOrder = tableOrders.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )[0];

      setActiveOrderId(activeOrder.id);
      setHasNewItems(false);
      setCurrentBatchTimestamp(null);

      const batchGroups = {};

      (activeOrder.items || []).forEach(item => {
        const itemId = Number(item.item_id);
        const menuItem = menuItems.find(mi => Number(mi.id) === itemId);
        const frontendKey = item.frontend_unique_key;

        let batchTimestamp = null;
        if (frontendKey) {
          const parts = frontendKey.split('_');
          batchTimestamp = parts[parts.length - 1];
        }

        const cartItem = {
          id: itemId,
          name: item.item_name || menuItem?.name || 'Unnamed Item',
          unit_price: item.unit_price || menuItem?.unit_price || 0,
          quantity: item.quantity || 1,
          note: item.note || '',
          image_id: menuItem?.image_id,
          discount: menuItem?.discount || 0,
          slug: item.slug || menuItem?.slug,
          category: menuItem?.category,
          frontend_unique_key: frontendKey,
          batch_timestamp: batchTimestamp,
        };

        const groupKey = batchTimestamp || 'original';
        if (!batchGroups[groupKey]) {
          batchGroups[groupKey] = [];
        }
        batchGroups[groupKey].push(cartItem);
      });

      const sortedBatches = Object.keys(batchGroups).sort((a, b) => {
        if (a === 'original') return -1;
        if (b === 'original') return 1;
        return Number(a) - Number(b);
      });

      const reconstructedCart = [];
      sortedBatches.forEach(batchKey => {
        reconstructedCart.push(...batchGroups[batchKey]);
      });

      setCart(reconstructedCart);
      setSelectedTable(table.id.toString());
      setOrderMode('dinein');
      setCurrentView('order');
      setShowCart(true);

      window.history.pushState({ view: 'order' }, '');
    } catch (err) {
      console.error(err);
      alert('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const oldItems = cart.filter(i => !i.batch_timestamp);
  const newItems = cart.filter(i => !!i.batch_timestamp);

  const groupedNewItems = newItems.reduce((acc, item) => {
    const batch = item.batch_timestamp || 'default';
    if (!acc[batch]) acc[batch] = [];
    acc[batch].push(item);
    return acc;
  }, {});

  const batchTimestamps = Object.keys(groupedNewItems).sort();

  const canPlaceOrder =
    orderMode === 'takeaway'
      ? cart.length > 0
      : activeOrderId
        ? hasNewItems
        : selectedTable && cart.length > 0;

  const displayTableName =
    orderMode === 'takeaway'
      ? tables.find(t => t.id === 500)?.table_number || 'Takeaway'
      : tables.find(t => t.id.toString() === selectedTable)?.table_number;

  const handlePrintBill = (orderId, tableId) => {
    navigate(`/saas/${clientId}/billing?orderId=${orderId}`);
  };

  return (
    <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">
      {currentView === 'floor' && (
        <TableReservation
          tables={tables}
          onSelectTable={handleTableSelect}
          onSelectTakeaway={handleTakeawaySelect}
          onSelectDineIn={() => setOrderMode('dinein')}
          onViewOrder={handleViewOrder}
          orderMode={orderMode}
          tableOrders={tableOrders}
          onPrintBill={handlePrintBill}
          onDeleteOrder={(orderId, tableId) => {
            setOrderToDelete({ orderId, tableId });
            setShowDeleteConfirm(true);
          }}
          onMarkAsServed={handleMarkAsServed}
        />
      )}

      {currentView === 'order' && (
        <div className="mx-auto px-2 py-2">
          <div className="grid lg:grid-cols-4 gap-1">

            <div className="w-full lg:col-span-1">
              <div className="lg:h-[calc(98dvh-4rem)] lg:overflow-y-auto pr-1">
                <CategoryTree
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  defaultOpenAll
                />
              </div>
            </div>

            <div className="lg:col-span-3 flex gap-2">

              <div className="transition-all duration-300 border-default border-border-default p-2 rounded-lg flex-1 overflow-y-auto h-[calc(98dvh-4rem)] lg:h-auto lg:max-h-[calc(98dvh-4rem)]">

                <div className="mb-2 flex items-center justify-between lg:flex-row flex-col gap-2">
                  <h2 className="text-xl lg:text-2xl font-semibold text-text-primary truncate">
                    {selectedCategory}
                    <span className="text-sm ml-2">({filteredItems.length})</span>
                  </h2>

                  <div className="relative w-64 max-w-full">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                    />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search items..."
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                    />
                  </div>
                </div>

                <div className={`grid gap-2 grid-cols-2 md:grid-cols-4 ${isOrderFormOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                  {filteredItems.map(item => {
                    const discountPercent =
                      item.discount &&
                        item.unit_price &&
                        Number(item.discount) > 0
                        ? ((Number(item.discount) * 100) / Number(item.unit_price))
                          .toFixed(0)
                        : null;

                    return (
                      <div onClick={() => handleItemClick(item)}
                        key={item.id}
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
                              `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
                            }
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                            {item.name}
                          </h3>

                          {item.description && (
                            <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-1">
                            {discountPercent ? (
                              <>
                                <span className="text-sm font-bold text-action-primary">
                                  ₹{(item.unit_price - item.discount).toFixed(0)}
                                </span>
                                <span className="text-xs line-through text-text-secondary">
                                  ₹{item.unit_price}
                                </span>
                                <span className="text-xs text-action-danger font-semibold">
                                  {discountPercent}% OFF
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-bold text-action-primary">
                                ₹{item.unit_price}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!isMobile && (
                <div className={`transition-all duration-300 ease-in-out ${showCart ? 'w-[22rem] opacity-100 z-30' : 'w-0 opacity-0'}`}>
                  <div className="border border-gray-300 rounded-xl bg-white">
                    <div className="shadow-xl rounded-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
                      <div className="flex flex-col h-full p-4">

                        <div className="pb-3 border-b space-y-2">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-800">
                              Your Order
                            </h2>
                          </div>

                          {cart.length >= 0 && (
                            <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                {orderMode === 'dinein' && selectedTable && (
                                  <>
                                    <span className="font-semibold text-[18px] text-gray-700">
                                      {tables.find(t => t.id.toString() === selectedTable)?.table_number}
                                    </span>

                                    <button
                                      onClick={() => {
                                        setOrderMode('dinein');
                                        setSelectedTable('');
                                        if (activeOrderId && hasNewItems) {
                                          clearDraftForOrder(activeOrderId);
                                        }
                                        setActiveOrderId(null);
                                        setCurrentBatchTimestamp(null);
                                        setHasNewItems(false);
                                        setShowCart(false);
                                        setCurrentView('floor');

                                      }}
                                      className="text-sm text-red-600 hover:underline"
                                    > Transfer
                                    </button>
                                  </>
                                )}
                              </div>

                              <span className="text-base font-bold text-red-600">
                                ₹{getTotalPrice()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => setOrderMode('dinein')}
                              className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
                                ${orderMode === 'dinein'
                                  ? 'bg-action-primary text-text-white shadow'
                                  : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                              <Users size={16} />
                              Dine In
                            </button>

                            <button
                              onClick={() => {
                                setOrderMode('takeaway');
                                setSelectedTable(takeawayTableId?.toString());
                              }}
                              className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
                                ${orderMode === 'takeaway'
                                  ? 'bg-action-primary text-white shadow'
                                  : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                              <Package size={16} />
                              Takeaway
                            </button>
                          </div>
                        </div>

                        {cart.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                            No items added
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                              {oldItems.map(item => (
                                <div
                                  key={`old-${item.id}`}
                                  className="flex items-center gap-2 p-3 rounded-xl border bg-white shadow-sm hover:shadow transition"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border bg-white shrink-0">
                                      <ImagePreview
                                        clientId={clientId}
                                        imageId={item.image_id}
                                        token={token}
                                        alt={item.name}
                                        baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                                        urlBuilder={({ baseUrl, clientId, imageId }) =>
                                          `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
                                        }
                                        className="w-full h-full object-cover"
                                      />
                                    </div>

                                    <div className="min-w-0">
                                      <h4 className="text-sm font-semibold truncate text-gray-800">
                                        {item.name}
                                      </h4>
                                      <p className="text-xs font-bold text-action-primary">
                                        ₹{(item.unit_price - (item.discount || 0)).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateQuantity(item.id, -1, null)}
                                      className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                                    >
                                      <Minus size={14} />
                                    </button>

                                    <span className="w-6 text-center text-sm font-semibold">
                                      {item.quantity}
                                    </span>

                                    <button
                                      onClick={() => updateQuantity(item.id, 1, null)}
                                      className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => removeFromCart(item.id, null)}
                                    className="text-action-primary hover:text-red-700"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}

                              {activeOrderId && newItems.length > 0 && (
                                <div className="flex items-center gap-2 my-2">
                                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
                                  <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                                  <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"></div>
                                </div>
                              )}

                              {batchTimestamps.map((timestamp, batchIndex) => (
                                <React.Fragment key={timestamp}>
                                  {batchIndex > 0 && (
                                    <div className="flex items-center gap-2 my-2">
                                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
                                      <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                                      <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"></div>
                                    </div>
                                  )}

                                  {groupedNewItems[timestamp].map(item => (
                                    <div
                                      key={item.frontend_unique_key || `new-${item.id}`}
                                      className="flex items-center gap-2 p-3 rounded-xl border bg-orange-50 shadow-sm hover:shadow transition"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-lg overflow-hidden border bg-white shrink-0">
                                          <ImagePreview
                                            clientId={clientId}
                                            imageId={item.image_id}
                                            token={token}
                                            alt={item.name}
                                            baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                                            urlBuilder={({ baseUrl, clientId, imageId }) =>
                                              `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
                                            }
                                            className="w-full h-full object-cover"
                                          />
                                        </div>

                                        <div className="min-w-0">
                                          <h4 className="text-sm font-semibold truncate text-gray-800">
                                            {item.name}
                                          </h4>
                                          <p className="text-xs font-bold text-action-primary">
                                            ₹{(item.unit_price - (item.discount || 0)).toFixed(2)}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => updateQuantity(item.id, -1, item.frontend_unique_key)}
                                          className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                                        >
                                          <Minus size={14} />
                                        </button>

                                        <span className="w-6 text-center text-sm font-semibold">
                                          {item.quantity}
                                        </span>

                                        <button
                                          onClick={() => updateQuantity(item.id, 1, item.frontend_unique_key)}
                                          className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                                        >
                                          <Plus size={14} />
                                        </button>
                                      </div>

                                      <button
                                        onClick={() => removeFromCart(item.id, item.frontend_unique_key)}
                                        className="text-action-primary hover:text-red-700"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </React.Fragment>
                              ))}
                            </div>

                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={handlePlaceOrder}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold
                                  ${canPlaceOrder && !isPlacingOrder
                                    ? 'bg-action-primary text-text-white hover:bg-action-danger'
                                    : 'bg-gray-300 cursor-not-allowed'
                                  }`}
                                disabled={!canPlaceOrder || isPlacingOrder}
                              >
                                {isPlacingOrder ? 'Placing...' : 'Place Order'}
                              </button>
                              <button
                                onClick={handleClearCart}
                                className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-100"
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
              )}
            </div>
          </div>
        </div>
      )}

      {isMobile && showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-color-modalsbg animate-fade-in">
          <div className="w-full md:w-96 lg:w-[28rem] h-full overflow-y-auto bg-bg-primary animate-slide-in-right">
            <div className="p-4 lg:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-text-primary">Your Order</h2>
                <button onClick={() => setShowCart(false)} className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity">
                  <X className='h-5 w-5' />
                </button>
              </div>

              {orderPlaced ? (
                <div className="text-center py-12 animate-scale-in">
                  <div className="rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 bg-action-success">
                    <Check size={40} className='text-bg-primary' />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-action-success">Order Placed!</h3>
                  <p className='text-text-secondary'>Your order has been successfully placed.</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 p-4 rounded-lg bg-bg-tertiary border-border-default">
                    <div className="mb-4">
                      <div className="flex gap-2 p-1 bg-bg-tertiary rounded-lg">
                        <button
                          onClick={() => setOrderMode('dinein')}
                          className={`flex-1 px-4 py-2.5 rounded-md transition-all flex items-center justify-center gap-2 font-medium ${orderMode === 'dinein'
                            ? 'bg-action-primary text-text-white shadow-sm'
                            : 'text-text-secondary'
                            }`}
                        >
                          <Users size={18} />
                          Dine In
                        </button>

                        <button
                          onClick={() => {
                            setOrderMode('takeaway');
                            setSelectedTable(takeawayTableId?.toString());
                          }}
                          className={`flex-1 px-4 py-2.5 rounded-md transition-all flex items-center justify-center gap-2 font-medium ${orderMode === 'takeaway'
                            ? 'bg-action-primary text-text-white shadow-sm'
                            : 'text-text-secondary'
                            }`}
                        >
                          <Package size={18} />
                          Takeaway
                        </button>
                      </div>
                    </div>
                    {selectedTable && (
                      <div className="mb-3 flex justify-between items-center">
                        <span className="font-semibold text-gray-800">
                          {displayTableName}
                        </span>

                        <button
                          onClick={() => {
                            setCurrentView('floor');
                            setShowCart(false);
                          }}
                          className="text-xs text-action-danger"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
                    {oldItems.map(item => (
                      <div key={`mobile-old-${item.id}`} className="flex items-center space-x-3 p-3 lg:p-4 rounded-lg bg-bg-tertiary border-border-default animate-slide-up">
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                          <ImagePreview
                            clientId={clientId}
                            imageId={item.image_id}
                            token={token}
                            alt={item.name}
                            baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                            urlBuilder={({ baseUrl, clientId, imageId }) =>
                              `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
                            }
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm lg:text-base truncate flex items-center gap-2 text-text-primary">
                            {item.name}
                            {item.note && (
                              <button
                                onClick={() => openNoteEditor(item)}
                                title="Has note" className='text-action-primary hover:scale-110 transition-transform'>
                                <StickyNote size={16} />
                              </button>
                            )}
                          </h4>
                          <p className='text-action-primary font-bold'>Rs.{item.unit_price?.toFixed(2)}</p>
                          {!item.note && (
                            <button
                              onClick={() => openNoteEditor(item)}
                              className="text-xs mt-1 text-text-secondary hover:text-action-primary transition-colors">
                              + Add note
                            </button>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1, null)}
                            className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-semibold text-text-primary">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1, null)}
                            className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors">
                            <Plus size={16} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id, null)}
                          title="Remove item" className='text-action-danger hover:scale-110 transition-transform'>
                          <X size={20} />
                        </button>
                      </div>
                    ))}

                    {activeOrderId && newItems.length > 0 && (
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                        <span className="text-sm font-bold text-orange-600 px-3">NEW ITEMS</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-orange-500 via-transparent to-transparent"></div>
                      </div>
                    )}

                    {batchTimestamps.map((timestamp, batchIndex) => (
                      <React.Fragment key={`mobile-batch-${timestamp}`}>
                        {batchIndex > 0 && (
                          <div className="flex items-center gap-2 my-3">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                            <span className="text-sm font-bold text-orange-600 px-3">NEW ITEMS</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-orange-500 via-transparent to-transparent"></div>
                          </div>
                        )}

                        {groupedNewItems[timestamp].map(item => (
                          <div key={item.frontend_unique_key || `mobile-new-${item.id}`} className="flex items-center space-x-3 p-3 lg:p-4 rounded-lg bg-orange-50 border border-orange-200 animate-slide-up">
                            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                              <ImagePreview
                                clientId={clientId}
                                imageId={item.image_id}
                                token={token}
                                alt={item.name}
                                baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                                urlBuilder={({ baseUrl, clientId, imageId }) =>
                                  `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
                                }
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm lg:text-base truncate flex items-center gap-2 text-text-primary">
                                {item.name}
                                {item.note && (
                                  <button
                                    onClick={() => openNoteEditor(item)}
                                    title="Has note" className='text-action-primary hover:scale-110 transition-transform'>
                                    <StickyNote size={16} />
                                  </button>
                                )}
                              </h4>
                              <p className='text-action-primary font-bold'>Rs.{item.unit_price?.toFixed(2)}</p>
                              {!item.note && (
                                <button
                                  onClick={() => openNoteEditor(item)}
                                  className="text-xs mt-1 text-text-secondary hover:text-action-primary transition-colors">
                                  + Add note
                                </button>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuantity(item.id, -1, item.frontend_unique_key)}
                                className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="w-8 text-center font-semibold text-text-primary">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1, item.frontend_unique_key)}
                                className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors">
                                <Plus size={16} />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id, item.frontend_unique_key)}
                              title="Remove item" className='text-action-danger hover:scale-110 transition-transform'>
                              <X size={20} />
                            </button>
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-6 border-border-default">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span className='text-text-primary'>Total:</span>
                      <span className='text-action-primary font-bold'>Rs.{getTotalPrice()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={!canPlaceOrder || isPlacingOrder}
                    className={`w-full py-3 rounded-lg font-semibold transition-all
                      ${canPlaceOrder && !isPlacingOrder
                        ? 'bg-action-primary text-text-white hover:shadow-lg'
                        : 'bg-border-default text-text-primary cursor-not-allowed'
                      }`}
                  >
                    {isPlacingOrder ? "Placing Order..." : "Place Order"}
                  </button>

                  {orderMode === 'dinein' && !selectedTable && cart.length > 0 && (
                    <p className="text-sm text-center mt-2 text-action-danger">
                      Select a table
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-80 shadow-xl animate-scale-in">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Clear all items?
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              This will remove all items from the order.
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

      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40"
        >
          <ShoppingCart size={24} />
        </button>
      )}

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
        onAddWithLineItems={handleAddMainItemWithLineItems}
      />

      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          setCurrentItemForNote(null);
        }}
        itemName={currentItemForNote?.name}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setOrderToDelete(null);
        }}
        onConfirm={() => {
          if (orderToDelete) {
            handleDeleteOrder(orderToDelete.orderId, orderToDelete.tableId);
          }
        }}
      />
    </div>
  );
};

export default TakeOrder;