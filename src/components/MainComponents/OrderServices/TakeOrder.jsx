import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, X, Check, StickyNote, Search, Users, Package } from 'lucide-react';
import axios from 'axios';
import CategoryTree from '../InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';
import { Eye, Lock } from 'lucide-react';
import { TbExchange } from "react-icons/tb";
const TABLE_STATUS_CONFIG = {
  vacant: {
    clickable: true,
    bg: 'bg-green-50',
    border: 'border-gray-500',
    badge: 'bg-green-100 text-green-700',
    icon: null,
  },
  available: {
    clickable: true,
    bg: 'bg-green-50',
    border: 'border-green-500',
    badge: 'bg-green-100 text-green-700',
    icon: null,
  },
  occupied: {
    clickable: false,
    bg: 'bg-red-50',
    border: 'border-red-400',
    badge: 'bg-red-100 text-red-700',
    icon: Eye,
    viewable: true, // Add this flag
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
  onSelectDineIn, onViewOrder,
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
    <div
      className="
    p-4
    bg-bg-primary
    overflow-y-auto
    h-[calc(100vh-4rem)]
  "
    >

      {/* 🔁 DINE-IN / TAKEAWAY TOGGLE */}
      <div className="flex justify-center mb-2">
        <div className="flex bg-bg-primary border-2 rounded-full border-action-primary p-1 shadow-sm">

          {/* DINE IN */}
          <button
            onClick={onSelectDineIn}
            className={`px-5 py-2 text-sm font-semibold rounded-full transition-all
              ${orderMode === "dinein"
                ? "bg-action-primary text-text-white shadow"
                : "text-text-secondary hover:bg-gray-100"}
            `}
          >
            Dine In
          </button>

          {/* TAKEAWAY */}
          <button
            onClick={onSelectTakeaway}
            className={`px-5 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-1
              ${orderMode === "takeaway"
                ? "bg-orange-500 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"}
            `}
          >
            <Package size={14} />
            Takeaway
          </button>

        </div>
      </div>
      {/* 🔍 FILTER BAR */}
      <div className="mb-3 sticky top-0 z-10 bg-bg-primary">
        <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border-default bg-bg-tertiary">

          {/* SECTION */}
          {["AC", "Non-AC"].map(sec => (
            <button
              key={sec}
              onClick={() => toggleFilter(sec, selectedSections, setSelectedSections)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition
          ${selectedSections.includes(sec)
                  ? "bg-action-primary text-white"
                  : "bg-white text-text-secondary hover:bg-gray-100"
                }`}
            >
              {sec}
            </button>
          ))}

          <div className="w-px bg-border-default mx-1" />

          {/* ZONES */}
          {["Ground Floor", "First Floor", "Second Floor", "Garden Area"].map(zone => (
            <button
              key={zone}
              onClick={() => toggleFilter(zone, selectedZones, setSelectedZones)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition
          ${selectedZones.includes(zone)
                  ? "bg-action-primary text-white"
                  : "bg-white text-text-secondary hover:bg-gray-100"
                }`}
            >
              {zone}
            </button>
          ))}

          {(selectedSections.length > 0 || selectedZones.length > 0) && (
            <button
              onClick={() => {
                setSelectedSections([]);
                setSelectedZones([]);
              }}
              className="ml-auto text-xs text-action-danger font-semibold hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>


      {/* 🪑 TABLE GRID – ONLY FOR DINE-IN */}
      {orderMode === "dinein" && visibleZones.map(zone => {

        const sections = getSectionsByZone(zone);

        return (
          <div key={zone} className="mb-10">

            {/* 🟦 ZONE TITLE */}
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {zone}
            </h3>

            {/* 🔽 SECTION LOOP */}
            {sections.map(section => (
              <div key={section} className="mb-6">

                {/* 🟨 SECTION TITLE */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-200">
                    {section}
                  </span>
                </div>

                {/* 🪑 TABLE GRID */}
                <div
                  className="
    grid gap-4
    grid-cols-2
    sm:grid-cols-4
    md:grid-cols-5
    lg:grid-cols-6
    xl:grid-cols-10
  "
                >
                  {filteredTables
                    .filter(t =>
                      t.location_zone === zone &&
                      t.section === section
                    )
                    .map(table => {
                      const statusKey = table.status?.toLowerCase();
                      const config =
                        TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;

                      return (
                        <div
                          key={table.id}
                          onClick={() => {
                            if (config.clickable) {
                              onSelectTable(table);
                            } else if (statusKey === 'occupied' && onViewOrder) {
                              onViewOrder(table);
                            }
                          }}
                          className="
            rounded-xl overflow-hidden
            border shadow-sm
            hover:shadow-md
            transition
            cursor-pointer
            bg-white
          "
                        >
                          {/* HEADER */}
                          <div className="bg-action-primary text-white px-3 py-2 text-center">
                            <span className="font-semibold text-sm">
                              {table.table_number}
                            </span>
                          </div>

                          {/* ICON */}
                          <div className="h-20 flex items-center justify-center">
                            {statusKey === 'vacant' && <span>-</span>}
                            {statusKey === 'occupied' && <Eye size={28} />}
                            {statusKey === 'reserved' && <Lock size={28} />}
                          </div>

                          {/* STATUS */}
                          <div
                            className={`py-2 text-center text-sm font-semibold border-t
              ${statusKey === 'occupied'
                                ? 'text-blue-600'
                                : statusKey === 'reserved'
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}
                          >
                            {table.status?.toUpperCase()}
                          </div>
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

// Line Items Modal Component
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

const TakeOrder = ({ clientId, token, onOrderUpdate, realm }) => {

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);


  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedTable, setSelectedTable] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
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
  const [orderMode, setOrderMode] = useState('dinein'); // 'dinein' or 'takeaway'
  const [takeawayTableId, setTakeawayTableId] = useState(null);
  const isPlacingRef = useRef(false);
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showOrderPage, setShowOrderPage] = useState(false);
  const [currentView, setCurrentView] = useState('floor');
  // Flatten category tree
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

  useEffect(() => {
    const onBackButton = (e) => {
      // If user is on order view → go back to table view
      if (currentView === 'order') {
        e.preventDefault();

        setCurrentView('floor');
        setShowCart(false);

        // push state again to block leaving page
        window.history.pushState({ view: 'floor' }, '');
      }
    };

    window.addEventListener('popstate', onBackButton);

    return () => {
      window.removeEventListener('popstate', onBackButton);
    };
  }, [currentView]);
  useEffect(() => {
    window.history.pushState({ view: 'floor' }, '');
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !token) {
        console.error('Missing clientId or token');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const tablesRes = await axios.get(
          `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const tableList = Array.isArray(tablesRes.data?.data)
          ? tablesRes.data.data.map(t => ({
            ...t,
            table_number: t.name || t.table_number || "-",
          }))
          : [];



        // Find or identify Takeaway table
        let takeawayTable = tableList.find(t =>
          (t.name || '').toLowerCase().includes('takeaway') ||
          (t.table_number || '').toLowerCase().includes('takeaway')
        );

        // If no Takeaway table exists, use first available table as fallback
        if (!takeawayTable && tableList.length > 0) {
          takeawayTable = tableList[0];
        }

        if (takeawayTable) {
          setTakeawayTableId(takeawayTable.id);
        }

        tableList.sort((a, b) =>
          a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
        );
        setTables(tableList);

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

        const fullTree = catRes.data.data.filter(c => c.name?.toLowerCase() !== "all");
        const subcategoryIds = new Set();
        fullTree.forEach(cat => {
          if (cat.subCategories && cat.subCategories.length > 0) {
            cat.subCategories.forEach(sub => subcategoryIds.add(sub.id));
          }
        });

        const topLevelCategories = fullTree.filter(cat => !subcategoryIds.has(cat.id));
        const flatCategories = flattenCategoryTree(topLevelCategories);

        const enrichedItems = itemRes.data.data.map(item => {
          const cat = flatCategories.find(c => c.id === item.category_id);
          return {
            ...item,
            category: cat ? cat.name : "Uncategorized"
          };
        });

        setMenuItems(enrichedItems);

        const getCategoryCount = (categoryName) => {
          return enrichedItems.filter(item => {
            if (categoryName === 'All Categories') return true;
            return item.category === categoryName;
          }).length;
        };

        const buildCategoryTree = (flatCats) => {
          const categoryMap = new Map();
          flatCats.forEach(cat => {
            categoryMap.set(cat.id, {
              ...cat,
              count: getCategoryCount(cat.name),
              children: []
            });
          });

          const tree = [];
          categoryMap.forEach(cat => {
            if (cat.parentId && categoryMap.has(cat.parentId)) {
              categoryMap.get(cat.parentId).children.push(cat);
            } else {
              tree.push(cat);
            }
          });

          return tree;
        };

        const categoryTree = buildCategoryTree(flatCategories).map(cat => {
          if (cat.id === 'dietery' || cat.name.toLowerCase() === 'dietery') {
            return {
              ...cat,
              name: 'All Categories',
              count: enrichedItems.length
            };
          }
          return cat;
        });

        setCategories(categoryTree);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, token, realm]);
  const availableTables = tables.filter(t =>
    ["vacant", "available"].includes(t.status?.trim().toLowerCase())
  );
  const acTables = availableTables.filter(t =>
    (t.table_type || t.location_zone || '')
      .toLowerCase()
      .includes('ac')
  );

  const nonAcTables = availableTables.filter(t =>
    !(t.table_type || t.location_zone || '')
      .toLowerCase()
      .includes('ac')
  );

  const getFilteredItems = () => {
    const q = (searchQuery || '').trim().toLowerCase();

    let items = menuItems;
    if (selectedCategory && selectedCategory !== 'All Categories') {
      items = items.filter(item => item.category === selectedCategory);
    }

    if (q.length === 0) return items;

    return items.filter(item =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q)
    );
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
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1, note: '' }]);
    }
    if (!isMobile) {
      setShowCart(true);
    }
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
        setCart(prev => prev.map(i =>
          i.id === lineItem.id ? { ...i, quantity: i.quantity + 1 } : i
        ));
      } else {
        setCart(prev => [...prev, { ...lineItem, quantity: 1, note: "" }]);
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
      setCart(prev => [...prev, { ...mainItemCopy, quantity: 1, note: "" }]);
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

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, change) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + ((item.unit_price || 0) * item.quantity), 0).toFixed(2);
  };

  const generateSlug = (text) =>
    "_" + text.trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");

  const generateNextOrderId = () => {
    let count = parseInt(localStorage.getItem("order_id_counter") || "2", 10);
    count += 1;
    localStorage.setItem("order_id_counter", count);
    return `order_${count}`;
  };
  // const handleClearCart = () => {
  //   if (cart.length === 0) return;
  //   const ok = window.confirm("Clear all items from the order?");
  //   if (ok) {
  //     setCart([]);
  //     setSelectedTable('');
  //   }
  // };

  const generateNextInvoiceId = () => {
    let count = parseInt(localStorage.getItem("invoice_id_counter") || "0", 10);
    count += 1;
    localStorage.setItem("invoice_id_counter", count);
    return `${count}`;
  };

  const handlePlaceOrder = async () => {
    if (isPlacingRef.current) return;

    // Validation based on mode
    if (orderMode === 'dinein' && !selectedTable) {
      alert("Please select a table before placing the order.");
      return;
    }


    if (cart.length === 0) {
      alert("Please select at least one item before placing the order.");
      return;
    }

    isPlacingRef.current = true;
    setIsPlacingOrder(true);

    try {
      const subtotal = cart.reduce(
        (sum, item) => sum + (item.unit_price || 0) * (item.quantity || 0),
        0
      );

      const gstValue = (subtotal * 5) / 100;
      const cstValue = (subtotal * 2) / 100;
      const discountValue = 0;
      const total_price = subtotal + gstValue + cstValue - discountValue;

      const dinein_order_id = generateNextOrderId();
      const invoice_id = generateNextInvoiceId();

      const tableId = orderMode === 'dinein' ? Number(selectedTable) : 500;

      const selectedTableObj = orderMode === 'dinein'
        ? tables.find(t => t.id.toString() === selectedTable)
        : null; // Don't need table object for takeaway

      // Check if table already has an active order
      let existingOrderId = null;
      try {
        const ordersResponse = await axios.get(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const allOrders = ordersResponse.data?.data || [];
        const existingOrder = allOrders.find(order =>
          order.id === tableId &&
          order.status?.toLowerCase() !== 'served'
        );

        if (existingOrder) {
          existingOrderId = existingOrder.id;
        }
      } catch (err) {
        console.warn('Could not check for existing orders:', err);
      }

      // If existing order found, update it instead of creating new
      if (existingOrderId) {
        const itemsPayload = cart.map(item => ({
          client_id: clientId,
          item_id: Number(item.id),
          quantity: Number(item.quantity),
          status: "pending",
          note: item.note || "",
          item_name: item.name,
          slug: item.slug || generateSlug(item.name),
          unit_price: item.unit_price || 0,
          line_total: (item.unit_price || 0) * (item.quantity || 0),
          order_id: existingOrderId
        }));

        // Update existing order items
        await axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${existingOrderId}`,
          itemsPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update order total and other details
        await axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
          {
            id: existingOrderId,
            total_price: total_price,
            price: subtotal,
            gst: gstValue,
            cst: cstValue,
            discount: discountValue
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setOrderPlaced(true);
        setCart([]);
        setSelectedTable('');
        setShowCart(false);

        setTimeout(() => {
          setOrderPlaced(false);
          setCurrentView('floor');
        }, 1500);

        onOrderUpdate?.({ success: true, orderId: existingOrderId, updated: true });

        return; // Exit early - don't create new order
      }

      // No existing order - create new one
      const payload = {
        client_id: clientId,
        table_id: tableId,
        status: "pending",
        price: subtotal,
        gst: gstValue,
        cst: cstValue,
        discount: discountValue,
        total_price,
        mode: orderMode === 'dinein' ? "Dine In" : "Takeaway",
        paymentMode: "Cash",
        dinein_order_id,
        invoice_id,
        invoice_status: "unpaid",
        items: cart.map(item => ({
          client_id: clientId,
          item_id: Number(item.id),
          quantity: Number(item.quantity),
          status: "pending",
          note: item.note || "",
          item_name: item.name,
          slug: item.slug || generateSlug(item.name),
          unit_price: item.unit_price || 0,
          line_total: (item.unit_price || 0) * (item.quantity || 0),
        })),
      };

      const headers = {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': dinein_order_id
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
        payload,
        { headers }
      );

      setOrderPlaced(true);

      // Update table status only for dine-in orders
      if (orderMode === 'dinein' && selectedTableObj?.id) {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
            {
              id: selectedTableObj.id,
              client_id: clientId,
              name: selectedTableObj?.name || `Table ${selectedTableObj.id}`,
              table_type: selectedTableObj?.table_type,
              status: "Occupied",
              location_zone: selectedTableObj?.location_zone,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (tableUpdateError) {
          console.warn('Table status update failed:', tableUpdateError);
          // Don't fail the entire order if table update fails
        }
      }
      // For takeaway, skip table update entirely since it causes 403 error

      setCart([]);
      setSelectedTable('');
      setShowCart(false);

      setTimeout(() => {
        setOrderPlaced(false);
        setCurrentView('floor');
      }, 1500);

      onOrderUpdate?.(res.data);

    } catch (err) {
      console.error("Order failed:", err);
      const serverMsg = err?.response?.data?.message || err?.message || "Order failed. Please try again.";
      alert(serverMsg);
    } finally {
      isPlacingRef.current = false;
      setIsPlacingOrder(false);
    }
  };


  const handleTableSelect = (table) => {
    setSelectedTable(table.id.toString());
    setCurrentView('order');

    // 🔥 push fake state so back button stays inside this page
    window.history.pushState({ view: 'order' }, '');
  };


  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      // small timeout to ensure input is visible before focusing (nice in some browsers)
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
  };

  const handleTakeawaySelect = () => {
    if (!takeawayTableId) {
      alert("Takeaway table not configured");
      return;
    }

    setOrderMode('takeaway');
    setSelectedTable(takeawayTableId.toString());
    setCurrentView('order');

    // keep back-button behavior consistent
    window.history.pushState({ view: 'order' }, '');
  };


  // if (loading) {
  //   return (
  //     <div className="flex items-center h-[calc(100vh-6rem)] justify-center bg-bg-secondary">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 border-action-primary"></div>
  //         <p className="text-text-secondary">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }
  const displayTableName =
    orderMode === 'takeaway'
      ? tables.find(t => t.id === 500)?.table_number || 'Takeaway'
      : tables.find(t => t.id.toString() === selectedTable)?.table_number;
  const handleViewOrder = async (table) => {
    try {
      setLoading(true);

      // Fetch ALL orders (like OrderSummary does)
      const response = await axios.get(
        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const allOrders = response.data?.data || [];

      // Find orders for this specific table
      const tableOrders = allOrders.filter(order =>
        order.table_id === table.id
        &&
        order.status?.toLowerCase() !== 'served'
      );

      if (tableOrders.length === 0) {
        alert('No active orders found for this table');
        setLoading(false);
        return;
      }

      // Get the most recent active order
      const activeOrder = tableOrders.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )[0];

      // Load order items into cart
      if (activeOrder.items && activeOrder.items.length > 0) {
        const cartItems = activeOrder.items.map(item => {
          // Find matching menu item for additional details
          const menuItem = menuItems.find(mi => mi.id === item.item_id);

          return {
            id: item.item_id,
            name: item.item_name || menuItem?.name,
            unit_price: item.unit_price || item.price,
            quantity: item.quantity || 1,
            note: item.note || '',
            image_id: menuItem?.image_id,
            discount: menuItem?.discount || 0,
            slug: item.slug || menuItem?.slug,
            category: menuItem?.category,
          };
        });

        setCart(cartItems);
        setSelectedTable(table.id.toString());
        setOrderMode('dinein');
        setCurrentView('order');

        // Show cart (desktop auto-shows, mobile needs explicit show)
        if (!isMobile) {
          setShowCart(true);
        } else {
          setShowCart(true);
        }

        // Push state for back button
        window.history.pushState({ view: 'order' }, '');
      } else {
        alert('Order found but has no items');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unable to load order details';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-hidden">
      {currentView === 'floor' && (
        <TableReservation
          tables={tables}
          onSelectTable={handleTableSelect}
          onSelectTakeaway={handleTakeawaySelect}
          onSelectDineIn={() => setOrderMode('dinein')}
          onViewOrder={handleViewOrder}
          orderMode={orderMode}
        />
      )}


      {/* Search Floating Button */}
      <div
        className={`fixed top-[80px] right-5 z-10 flex items-center transition-all duration-300 ease-in-out ${searchOpen ? 'w-120' : 'w-22'
          }`}
      >
        <div
          className={`flex items-center gap-2 rounded-full shadow-lg overflow-hidden transition-colors duration-200 ${searchOpen ? 'bg-action-primary px-3 py-2' : 'bg-action-primary p-2'
            }`}
        >
          <button
            onClick={() => setSearchOpen(s => !s)}
            className={`h-[25px] w-[25px] flex items-center justify-center ${searchOpen ? 'text-text-primary' : 'text-text-white'
              }`}
          >
            <Search size={20} />
          </button>

          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className={`transition-all duration-200 bg-action-primary text-text-white outline-none text-sm ${searchOpen ? 'opacity-100 w-full' : 'opacity-0 w-0 pointer-events-none'
              }`}
          />

          {searchOpen && (
            <button
              onClick={() => {
                if (searchQuery) setSearchQuery('');
                else setSearchOpen(false);
              }}
              className="ml-1 text-xs px-2 py-1 rounded border-border-default text-text-secondary"
            >
              {searchQuery ? 'Clear' : 'Close'}
            </button>
          )}
        </div>
      </div>
      {currentView === 'order' && (
        <div className="mx-auto px-2 py-2">
          <div className="grid lg:grid-cols-4 gap-1">

            {/* CATEGORY SIDEBAR */}
            <div className="lg:col-span-1">
              <div className="
lg:sticky lg:top-24
lg:h-[calc(100dvh-4rem)]
lg:overflow-y-auto
pr-1
">

                <CategoryTree
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  defaultOpenAll
                />
              </div>
            </div>


            {/* MENU + ORDER PANEL */}
            <div className="lg:col-span-3 flex gap-2">

              {/* MENU */}
              <div
                className="
            transition-all duration-300
            border-default border-border-default p-4 rounded-lg
            flex-1
            overflow-y-auto
            h-[calc(100dvh-4rem)]
            lg:h-auto
            lg:max-h-[calc(100dvh-4rem)]
            "
              >



                <div className="mb-4">
                  <h2 className="text-xl lg:text-2xl font-semibold text-text-primary">
                    {selectedCategory}
                    <span className="text-sm ml-2">({filteredItems.length} items)</span>
                  </h2>
                </div>
                <div
                  className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
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
                        className="
                      flex gap-2 items-center
                      bg-bg-primary
                      border border-border-default
                      rounded-xl
                      p-1
                      shadow-sm
                      hover:shadow-md
                      transition
                    "
                      >
                        {/* IMAGE */}
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

                        {/* INFO */}
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
                                <span className="text-xs line-through  text-text-secondary">
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

              {/* ORDER PANEL (INLINE – DESKTOP ONLY) */}
              {!isMobile && (
                <>
                  {/* CART SIDEBAR */}
                  <div
                    className={`transition-all duration-300 ease-in-out
            ${showCart ? 'w-[22rem] opacity-100 z-30' : 'w-0 opacity-0'}`}
                  >
                    {/* ✅ OUTER BORDER WRAPPER */}
                    <div className="h-full border border-gray-300 rounded-xl bg-white">

                      {/* INNER STICKY CONTAINER */}
                      <div
                        className="shadow-xl rounded-xl
               lg:sticky lg:top-10
               lg:h-[calc(100dvh-4rem)]
               flex flex-col"
                      >
                        <div className="flex flex-col h-full p-4">

                          {/* HEADER */}
                          <div className="pb-3 border-b space-y-2">

                            {/* Top row */}
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setShowCart(false)}
                                className="p-1 rounded hover:bg-gray-100"
                              >
                                <X size={18} />
                              </button>

                              <h2 className="text-lg font-semibold text-gray-800">
                                Your Order
                              </h2>
                            </div>

                            {/* Single info row */}
                            {cart.length > 0 && (
                              <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">

                                {/* LEFT : TABLE + CHANGE */}
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
                                          setCurrentView('floor');
                                          setShowCart(false);
                                        }}
                                        className="text-sm text-red-600 hover:underline"
                                      > <TbExchange />
                                      </button>
                                    </>
                                  )}
                                </div>

                                {/* RIGHT : TOTAL PRICE */}
                                <span className="text-base font-bold text-red-600">
                                  ₹{getTotalPrice()}
                                </span>
                              </div>
                            )}
                          </div>




                          {/* EMPTY STATE */}
                          {cart.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                              No items added
                            </div>
                          ) : (
                            <>
                              {/* ORDER MODE */}
                              <div className="mt-3">
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                  <button
                                    onClick={() => {
                                      setOrderMode('dinein');
                                    }}

                                    className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
                             ${orderMode === 'dinein'
                                        ? 'bg-red-600 text-white shadow'
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
                                        ? 'bg-red-600 text-white shadow'
                                        : 'text-gray-600 hover:text-gray-800'
                                      }`}
                                  >
                                    <Package size={16} />
                                    Takeaway
                                  </button>
                                </div>
                              </div>

                              {/* TABLE SELECT */}


                              {/* CART ITEMS */}
                              <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                                {cart.map(item => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-2 p-3 rounded-xl border bg-white shadow-sm hover:shadow transition
"
                                  >

                                    {/* IMAGE + INFO */}
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
                                        <p className="text-xs text-red-600">
                                          ₹{(item.unit_price - (item.discount || 0)).toFixed(2)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* QUANTITY */}
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                                      >
                                        <Minus size={14} />
                                      </button>

                                      <span className="w-6 text-center text-sm font-semibold">
                                        {item.quantity}
                                      </span>

                                      <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>

                                    {/* REMOVE */}
                                    <button
                                      onClick={() => removeFromCart(item.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {/* ACTIONS */}
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={handleClearCart}
                                  className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-100"
                                >
                                  Clear
                                </button>

                                <button
                                  onClick={handlePlaceOrder}
                                  disabled={
                                    (orderMode === 'dinein' && !selectedTable) ||
                                    cart.length === 0 ||
                                    isPlacingOrder
                                  }
                                  className={`flex-1 py-2 rounded-lg text-sm font-semibold
                           ${!isPlacingOrder &&
                                      cart.length > 0 &&
                                      (orderMode === 'takeaway' || selectedTable)
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : 'bg-gray-300 cursor-not-allowed'
                                    }`}
                                >
                                  {isPlacingOrder ? 'Placing...' : 'Place Order'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
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
                <button onClick={() => setShowCart(false)} className='text-text-secondary hover:text-text-primary transition-colors'>
                  <X size={24} />
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
                    {/* Order Mode Toggle (MOBILE) */}
                    <div className="mb-4">
                      <div className="flex gap-2 p-1 bg-bg-tertiary rounded-lg">
                        <button
                          onClick={() => {
                            setOrderMode('dinein');
                          }}
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
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 lg:p-4 rounded-lg bg-bg-tertiary border-border-default animate-slide-up">
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
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-semibold text-text-primary">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors">
                            <Plus size={16} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          title="Remove item" className='text-action-danger hover:scale-110 transition-transform'>
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-6 border-border-default" >
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span className='text-text-primary'>Total:</span>
                      <span className='text-action-primary font-bold'>Rs.{getTotalPrice()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={
                      (orderMode === 'dinein' && !selectedTable) ||
                      cart.length === 0 ||
                      isPlacingOrder
                    }
                    className={`w-full py-3 rounded-lg font-semibold transition-all
                      ${((orderMode === 'dinein' ? selectedTable : true) &&
                        cart.length > 0 &&
                        !isPlacingOrder)
                        ? 'bg-action-primary text-text-white hover:shadow-lg'
                        : 'bg-border-default text-text-primary cursor-not-allowed'
                      }
                    `}
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
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40"
        >
          <ShoppingCart size={24} />
        </button>
      )}
      {/* Line Items (Add-ons) Modal */}
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

      {/* Notes Modal */}
      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          setCurrentItemForNote(null);
        }}
        itemName={currentItemForNote?.name}
      />

    </div>
  );

};

export default TakeOrder;