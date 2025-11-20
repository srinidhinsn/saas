import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, X, Check, StickyNote } from 'lucide-react';
import axios from 'axios';
import CategoryTree from '../InventoryServices/CategoryTree';
import { injectThemeVars } from '../../utils/injectThemeVars';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg max-w-lg w-full p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{mainItem?.name}</h3>
        <p className="text-gray-600 mb-4" style={{ color: 'var(--color-text-secondary)' }}>This item comes with the following add-ons:</p>
        
        <div className="space-y-2 mb-6">
          {lineItems.map((item, index) => (
            <div key={item.id} className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: `1px solid var(--color-border-default)` }}>
              <span style={{ color: 'var(--color-text-primary)' }}>{index + 1}. {item.name}</span>
              <span className="font-semibold" style={{ color: 'var(--color-action-success)' }}>Rs.{item.unit_price}</span>
            </div>
          ))}
        </div>

        <p className="text-gray-600 italic mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Would you like to add the main item with all add-ons, or just the main item?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg transition-colors"
            style={{
              border: `1px solid var(--color-border-default)`,
              backgroundColor: 'transparent',
              color: 'var(--color-text-primary)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onAddMainOnly}
            className="flex-1 px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--color-action-primary)',
              color: 'var(--color-text-white)',
            }}
          >
            Main Only
          </button>
          <button
            onClick={onAddWithLineItems}
            className="flex-1 px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--color-action-primary)',
              color: 'var(--color-text-white)',
            }}
          >
            With Add-ons
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Order Page Component
const TakeOrder = ({ clientId, token, onOrderUpdate }) => {
  // ensure CSS vars are injected (idempotent)
  useEffect(() => {
    injectThemeVars();
  }, []);

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
  
  const isPlacingRef = useRef(false);

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

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !token) {
        console.error('Missing clientId or token');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch tables
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
        tableList.sort((a, b) =>
          a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
        );
        setTables(tableList);

        // Fetch categories and items
        const [catRes, itemRes] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
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
            category: cat ? cat.name : "Uncategorized",
            image: item.image_id 
              ? `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/image/${item.image_id}`
              : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'
          };
        });

        setMenuItems(enrichedItems);

        // Build category tree with counts
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

        const categoryTree = [
          { 
            id: 'all',
            name: 'All Categories', 
            count: enrichedItems.length,
            children: []
          },
          ...buildCategoryTree(flatCategories)
        ];

        setCategories(categoryTree);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, token]);

  const availableTables = tables.filter(t =>
    ["vacant", "available"].includes(t.status?.trim().toLowerCase())
  );

  const getFilteredItems = () => {
    if (selectedCategory === 'All Categories') {
      return menuItems;
    }
    return menuItems.filter(item => item.category === selectedCategory);
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

  const generateNextInvoiceId = () => {
    let count = parseInt(localStorage.getItem("invoice_id_counter") || "0", 10);
    count += 1;
    localStorage.setItem("invoice_id_counter", count);
    return `${count}`;
  };

  const handlePlaceOrder = async () => {
    if (isPlacingRef.current) return;

    if (!selectedTable) {
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

      const selectedTableObj = tables.find(t => t.id.toString() === selectedTable);

      const payload = {
        client_id: clientId,
        table_id: selectedTableObj?.id,
        status: "new",
        price: subtotal,
        gst: gstValue,
        cst: cstValue,
        discount: discountValue,
        total_price,
        mode: "Dine In",
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
      
      // Update table status to Occupied
      if (selectedTableObj?.id) {
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
      }

      setTimeout(() => {
        setCart([]);
        setSelectedTable('');
        setOrderPlaced(false);
        setShowCart(false);
        onOrderUpdate?.(res.data);
      }, 3000);

    } catch (err) {
      console.error("Order failed:", err);
      const serverMsg = err?.response?.data?.message || err?.message || "Order failed. Please try again.";
      alert(serverMsg);
    } finally {
      isPlacingRef.current = false;
      setIsPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-action-primary)' }}></div>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="container mx-auto px-4 py-2">
        <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <CategoryTree
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-4">
              <h2 className="text-xl lg:text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {selectedCategory}
                <span className="text-sm ml-2" style={{ color: 'var(--color-text-secondary)' }}>({filteredItems.length} items)</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5">
              {filteredItems.map(item => {
                // Calculate discount percentage
                const discountPercent = item.discount && item.unit_price && Number(item.discount) > 0
                  ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(1).replace(/\.0$/, '')
                  : null;
                
                return (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group relative">
                    <div className="relative h-36 sm:h-40 md:h-44 lg:h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      {/* Discount Badge - Top Left - Only show if discount exists and is greater than 0 */}
                      {discountPercent && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md z-10 shadow-md">
                          {discountPercent}% OFF
                        </div>
                      )}
                      
                      {/* Add-ons Badge - Bottom Left */}
                      {item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0 && (
                        <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-md z-10 shadow-md flex items-center gap-1">
                          <Plus size={12} />
                          <span>{item.line_item_id.length} add-ons</span>
                        </div>
                      )}
                      
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
                        }}
                      />
                      
                      {/* Add Button - Bottom Right */}
                      <button
                        onClick={() => handleItemClick(item)}
                        className="absolute bottom-2 right-2 bg-orange-500 text-white p-2 sm:p-2.5 rounded-full hover:bg-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl z-10 hover:scale-110 active:scale-95"
                        aria-label="Add to order"
                      >
                        <Plus size={18} className="sm:w-5 sm:h-5" />
                      </button>
                    </div>
                    
                    <div className="p-2.5 sm:p-3">
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-1 min-h-[2.5rem] sm:min-h-[3rem] text-gray-800">
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-orange-500 font-bold text-base sm:text-lg">
                          ₹{item.unit_price?.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 truncate max-w-[100px]">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>No items found in this category</p>
              </div>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={() => setShowCart(true)}
            className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 p-4 rounded-full shadow-lg transition-all flex items-center space-x-2 z-40"
            style={{
              backgroundColor: 'var(--color-action-primary)',
              color: 'var(--color-text-white)',
            }}
          >
            <ShoppingCart size={24} />
            <span className="rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-action-primary)' }}>
              {cart.length}
            </span>
          </button>
        )}

        {showCart && (
          <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full md:w-96 lg:w-[28rem] h-full overflow-y-auto" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
              <div className="p-4 lg:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Your Order</h2>
                  <button onClick={() => setShowCart(false)} style={{ color: 'var(--color-text-secondary)' }}>
                    <X size={24} />
                  </button>
                </div>

                {orderPlaced ? (
                  <div className="text-center py-12">
                    <div className="rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--color-action-success)' }}>
                      <Check size={40} style={{ color: 'var(--color-bg-primary)' }} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-action-success)' }}>Order Placed!</h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Your order has been successfully placed.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: `1px solid var(--color-border-default)` }}>
                      <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        <span className="font-semibold">Table:</span>
                        <div className="mt-2">
                          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Select Table</label>
                          <select
                            value={selectedTable}
                            onChange={(e) => setSelectedTable(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg focus:outline-none"
                            style={{
                              border: `1px solid var(--color-border-default)`,
                              backgroundColor: 'var(--color-bg-primary)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            <option value="">Choose a table</option>
                            {availableTables.map(table => (
                              <option key={table.id} value={table.id}>
                                {table.table_number} - {table.location_zone}
                              </option>
                            ))}
                          </select>
                        </div>
                      </p>
                    </div>

                    <div className="space-y-4 mb-6 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center space-x-3 p-3 lg:p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: `1px solid var(--color-border-default)` }}>
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 lg:w-20 lg:h-20 object-cover rounded"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm lg:text-base truncate flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                              {item.name}
                              {item.note && (
                                <button
                                  onClick={() => openNoteEditor(item)}
                                  title="Has note"
                                  style={{ color: 'var(--color-action-primary)' }}
                                >
                                  <StickyNote size={16} />
                                </button>
                              )}
                            </h4>
                            <p style={{ color: 'var(--color-action-primary)', fontWeight: 700 }}>Rs.{item.unit_price?.toFixed(2)}</p>
                            {!item.note && (
                              <button
                                onClick={() => openNoteEditor(item)}
                                className="text-xs mt-1"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                + Add note
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 rounded"
                              style={{ backgroundColor: 'var(--color-bg-primary)', border: `1px solid var(--color-border-default)` }}
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-8 text-center font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 rounded"
                              style={{ backgroundColor: 'var(--color-bg-primary)', border: `1px solid var(--color-border-default)` }}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            title="Remove item"
                            style={{ color: 'var(--color-action-danger)' }}
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 mb-6" style={{ borderColor: 'var(--color-border-default)' }}>
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span style={{ color: 'var(--color-text-primary)' }}>Total:</span>
                        <span style={{ color: 'var(--color-action-primary)', fontWeight: 700 }}>Rs.{getTotalPrice()}</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      disabled={ !selectedTable || cart.length === 0 || isPlacingOrder}
                      className="w-full py-3 rounded-lg font-semibold transition-colors"
                      style={{
                        backgroundColor: selectedTable && cart.length > 0 && !isPlacingOrder ? 'var(--color-action-primary)' : 'var(--color-border-default)',
                        color: selectedTable && cart.length > 0 && !isPlacingOrder ? 'var(--color-text-white)' : 'var(--color-text-secondary)',
                        cursor: selectedTable && cart.length > 0 && !isPlacingOrder ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isPlacingOrder ? "Placing Order..." : "Place Order"}
                    </button>

                    {(!selectedTable) && cart.length > 0 && (
                      <p className="text-sm text-center mt-2" style={{ color: 'var(--color-action-danger)' }}>
                        Select a table
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        itemName={currentItemForNote?.name}
        note={currentItemForNote?.note}
        onSave={saveNoteToItem}
      />

      <LineItemsModal
        isOpen={lineItemsModalOpen}
        onClose={() => setLineItemsModalOpen(false)}
        mainItem={selectedMainItem}
        lineItems={lineItemsDetails}
        onAddWithLineItems={handleAddMainItemWithLineItems}
        onAddMainOnly={handleAddMainItemOnly}
      />
    </div>
  );
};

export default TakeOrder;
