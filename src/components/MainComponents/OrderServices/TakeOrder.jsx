import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, X, Check, StickyNote, Search, Users, Package } from 'lucide-react';
import axios from 'axios';
import CategoryTree from '../InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';




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

    // Validation based on mode
    if (orderMode === 'dinein' && !selectedTable) {
      alert("Please select a table before placing the order.");
      return;
    }

    if (orderMode === 'takeaway' && !takeawayTableId) {
      alert("No takeaway table available. Please contact support.");
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

      // Use appropriate table ID based on mode
      const tableId = orderMode === 'dinein' ? selectedTable : 500;
      const selectedTableObj = orderMode === 'dinein'
        ? tables.find(t => t.id.toString() === selectedTable)
        : tables.find(t => t.id === takeawayTableId);

      const payload = {
        client_id: clientId,
        table_id: tableId,
        status: "new",
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

  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 border-action-primary"></div>
  //         <p className="text-text-secondary">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-bg-primary p-0">

      <div
        className={`fixed top-[80px] right-5 z-50 flex items-center transition-all duration-300 ease-in-out ${searchOpen ? 'w-120' : 'w-22'}`}
        aria-hidden={false}
      >
        <div
          className={`flex items-center gap-2 rounded-full shadow-lg overflow-hidden transition-colors duration-200 ${searchOpen ? 'bg-action-primary px-3 py-2' : 'bg-action-primary p-2'}`}
          title={searchOpen ? 'Search items' : 'Open search'}
          role="button"
          aria-expanded={searchOpen}
        >
          <button
            onClick={() => setSearchOpen(s => !s)}
            aria-label={searchOpen ? 'Close search' : 'Open search'}
            className={`flex items-center justify-center border-none p-0 h-[25px] w-[25px] ${searchOpen ? 'text-text-primary' : 'text-text-white'}`}>
            <Search size={20} />
          </button>

          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className={`transition-all duration-200 bg-action-primary text-text-white outline-none text-sm ${searchOpen ? 'opacity-100 w-full' : 'opacity-0 w-0 pointer-events-none'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // optional: close on Enter or keep open — keeping open so user can refine
              }
            }}
          />
          {searchOpen && (
            <button
              onClick={() => {
                if (searchQuery.trim() !== "") {
                  // First click → clear text
                  setSearchQuery("");
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                } else {
                  // Second click → close search box
                  setSearchOpen(false);
                }
              }}
              aria-label="Clear or close"
              className="ml-1 text-xs px-2 py-1 rounded border-border-default bg-transparent text-text-secondary"
              title={searchQuery.trim() === "" ? "Close" : "Clear search"}
            >
              {searchQuery.trim() === "" ? "Close" : "Clear"}
            </button>

          )}
        </div>
      </div>

      <div className="mx-auto px-4 py-2">
        <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <CategoryTree
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                defaultOpenAll={true}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <h2 className="text-xl lg:text-2xl font-semibold text-text-primary">
                {selectedCategory}
                <span className="text-sm ml-2 text-text-primary">
                  ({filteredItems.length} items)
                </span>
              </h2>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5">
              {filteredItems.map(item => {
                const discountPercent = item.discount && item.unit_price && Number(item.discount) > 0
                  ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(1).replace(/\.0$/, '')
                  : null;

                return (
                  <div key={item.id} className="min-w-0 bg-bg-primary rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group relative"
                  >
                    <div className="relative h-36 sm:h-40 md:h-44 lg:h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">

                      {/* Discount Badge */}
                      {discountPercent && (
                        <div className="absolute top-2 left-2 bg-action-danger text-text-white text-xs font-bold px-2 py-1 rounded-md z-10 shadow-md">
                          {discountPercent}% OFF
                        </div>
                      )}

                      {/* Add-ons Badge */}
                      {item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0 && (
                        <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-md z-10 shadow-md flex items-center gap-1">
                          <Plus size={12} />
                          <span>{item.line_item_id.length} add-ons</span>
                        </div>
                      )}

                      {/* Item Image */}
                      <ImagePreview
                        clientId={clientId}
                        imageId={item.image_id}
                        token={token}
                        alt={item.name}
                        baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                        urlBuilder={({ baseUrl, clientId, imageId }) =>
                          `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
                        }
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />



                      {/* Add Button */}
                      <button
                        onClick={() => handleItemClick(item)}
                        className="absolute bottom-2 right-2 bg-action-primary text-white p-2 sm:p-2.5 rounded-full hover:bg-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl z-10 hover:scale-110 active:scale-95"
                        aria-label="Add to order"
                      >
                        <Plus size={18} className="sm:w-5 sm:h-5" />
                      </button>
                    </div>

                    {/* Item Info */}
                    <div className="p-2.5 sm:p-3">
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-1 min-h-[2.5rem] sm:min-h-[3rem] text-text-primary">
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-action-primary font-bold text-base sm:text-lg">
                          ₹{item.unit_price?.toFixed(2)}
                        </span>
                        <span className="text-xs text-text-secondary truncate max-w-[100px]">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 && (
              <div className="text-center py-12 rounded-lg bg-bg-primary">
                <p className="text-text-secondary text-base">No items found in this category</p>
              </div>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={() => setShowCart(true)}
            className="fixed bottom-6 right-6 bg-action-primary  text-text-white lg:bottom-8 lg:right-8 p-4 rounded-full shadow-lg transition-all flex items-center space-x-2 z-40">
            <ShoppingCart size={24} />
            <span className="rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold bg-bg-primary text-action-primary">
              {cart.length}
            </span>
          </button>
        )}
        {showCart && (
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
                    {/* Order Mode Toggle */}
                    <div className="mb-4">
                      <div className="flex gap-2 p-1 bg-bg-tertiary rounded-lg">
                        <button
                          onClick={() => {
                            setOrderMode('dinein');
                            setSelectedTable('');
                          }}
                          className={`flex-1 px-4 py-2.5 rounded-md transition-all flex items-center justify-center gap-2 font-medium ${orderMode === 'dinein'
                              ? 'bg-action-primary text-text-white shadow-sm'
                              : 'text-text-secondary hover:text-text-primary'
                            }`}>
                          <Users size={18} />
                          <span>Dine In</span>
                        </button>
                        <button
                          onClick={() => {
                            setOrderMode('takeaway');
                            setSelectedTable('');
                          }}
                          className={`flex-1 px-4 py-2.5 rounded-md transition-all flex items-center justify-center gap-2 font-medium ${orderMode === 'takeaway'
                              ? 'bg-action-primary text-text-white shadow-sm'
                              : 'text-text-secondary hover:text-text-primary'
                            }`}>
                          <Package size={18} />
                          <span>Takeaway</span>
                        </button>
                      </div>
                    </div>

                    {/* Table Selection - Only for Dine In */}
                    {orderMode === 'dinein' && (
                      <div className="mb-6 p-4 rounded-lg bg-bg-tertiary border-border-default">
                        <div className="text-sm text-text-primary">
                          <span className="font-semibold">Table:</span>
                          <div className="mt-2">
                            <label className="block text-sm font-semibold mb-2 text-text-primary">Select Table</label>
                            <select
                              value={selectedTable}
                              onChange={(e) => setSelectedTable(e.target.value)}
                              className="w-full px-4 py-2 rounded-lg focus:outline-none border-border-default bg-bg-primary text-text-primary transition-all">
                              <option value="">Choose a table</option>
                              {availableTables.map(table => (
                                <option key={table.id} value={table.id}>
                                  {table.table_number} - {table.location_zone}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Takeaway Info */}
                    {orderMode === 'takeaway' && (
                      <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-action-primary rounded-lg">
                            <Package size={20} className="text-text-white" />
                          </div>
                          <div>
                            <div className="text-sm text-text-secondary">Order Type</div>
                            <div className="font-bold text-text-primary">Takeaway Order</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 mb-6 max-h-[calc(100vh-400px)] overflow-y-auto">
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
                        (orderMode === 'takeaway' && !takeawayTableId) ||
                        cart.length === 0 ||
                        isPlacingOrder
                      }
                      className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
        border-default
        ${(orderMode === 'dinein' ? selectedTable : takeawayTableId) && cart.length > 0 && !isPlacingOrder
                          ? 'text-text-white bg-action-primary cursor-pointer hover:shadow-lg'
                          : 'text-text-primary bg-border-default cursor-not-allowed'
                        }`}>
                      {isPlacingOrder ? "Placing Order..." : "Place Order"}
                    </button>

                    {/* Updated Error Message */}
                    {orderMode === 'dinein' && !selectedTable && cart.length > 0 && (
                      <p className="text-sm text-center mt-2 text-action-danger animate-slide-up">
                        Select a table
                      </p>
                    )}
                    {orderMode === 'takeaway' && !takeawayTableId && cart.length > 0 && (
                      <p className="text-sm text-center mt-2 text-action-danger animate-slide-up">
                        Takeaway not available
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add these CSS animations to your component or global styles */}
        <style>{`
  @keyframes fadeIn {
    from { 
      opacity: 0; 
    }
    to { 
      opacity: 1; 
    }
  }
  
  @keyframes slideInRight {
    from { 
      transform: translateX(100%); 
    }
    to { 
      transform: translateX(0); 
    }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(10px); 
    }
    to { 
      opacity: 1;
      transform: translateY(0); 
    }
  }
  
  @keyframes scaleIn {
    from { 
      opacity: 0;
      transform: scale(0.9); 
    }
    to { 
      opacity: 1;
      transform: scale(1); 
    }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.3s ease-out;
  }
  
  .animate-slide-up {
    animation: slideUp 0.4s ease-out;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.5s ease-out;
  }
`}</style>
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
