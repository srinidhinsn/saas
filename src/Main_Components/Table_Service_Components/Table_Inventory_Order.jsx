import React, { useEffect, useState, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import axios from 'axios';
import { FaPlus, FaTrash, FaMinus, FaShoppingCart, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { toast } from 'react-toastify';
import Modal from "react-modal";
import ImagePreview from "../../Constants/ImagePreview";

Modal.setAppElement("#root");

const Table_Inventory_Order = ({ onOrderUpdate, clientId, darkMode }) => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState("All Categories");
    const [searchTerm, setSearchTerm] = useState("");
    const [customer, setCustomer] = useState({ name: "", phone: "", location: "" });
    const [orderItems, setOrderItems] = useState([]);
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    const [currentItemForNote, setCurrentItemForNote] = useState(null);
    const [noteText, setNoteText] = useState("");
    const [paymentMode, setPaymentMode] = useState("Cash");
    const [gstRate, setGstRate] = useState(5);
    const [cstRate, setCstRate] = useState(2);
    const [discount, setDiscount] = useState(0);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [isMobileWidth, setIsMobileWidth] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);
    const orderFormRef = useRef(null);
    // Line Items Modal States
    const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
    const [selectedMainItem, setSelectedMainItem] = useState(null);
    const [lineItemsDetails, setLineItemsDetails] = useState([]);

    const containerRef = useRef(null);
    const token = localStorage.getItem("access_token");

    const availableTables = tables.filter(t =>
        ["vacant", "available"].includes(t.status?.trim().toLowerCase())
    );

    // Check scroll position
    const checkScrollPosition = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Show top button if scrolled down more than 300px
        setShowScrollTop(scrollTop > 300);

        // Show bottom button if not at the bottom
        setShowScrollBottom(scrollTop + windowHeight < documentHeight - 50);
    };

    // Add scroll + resize listener and keep mobile width state in sync
    useEffect(() => {
        // Initial checks
        checkScrollPosition();
        setIsMobileWidth(window.innerWidth < 1024);

        const handleResize = () => {
            checkScrollPosition();                // keep existing behavior
            setIsMobileWidth(window.innerWidth < 1024); // update mobile flag
        };

        window.addEventListener('scroll', checkScrollPosition);
        window.addEventListener('resize', handleResize);

        // cleanup
        return () => {
            window.removeEventListener('scroll', checkScrollPosition);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Re-check scroll position when items change
    useEffect(() => {
        setTimeout(checkScrollPosition, 100);
    }, [orderItems, items]);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Scroll to bottom function
    const scrollToBottom = () => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    };

    const calculateSubtotal = () => {
        return orderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    };

    const calculateTotalPrice = () => {
        const subtotal = calculateSubtotal();
        return parseFloat(subtotal.toFixed(2));
    };

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

    const generateSlug = (text) =>
        "_" + text.trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");

    useEffect(() => {
        if (!clientId) return;

        axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const tableList = Array.isArray(res.data?.data) ? res.data.data.map(t => ({
                    ...t,
                    table_number: t.name || t.table_number || "-",
                })) : [];
                tableList.sort((a, b) =>
                    a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
                );
                setTables(tableList);
            })
            .catch(err => console.error("❌ Error fetching tables:", err));

        axios.all([
            axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
        ])
            .then(axios.spread((catRes, itemRes) => {
                const allCategory = { id: "all", name: "All Categories", level: 0 };
                const fullTree = catRes.data.data.filter(c => c.name?.toLowerCase() !== "all");

                const subcategoryIds = new Set();
                fullTree.forEach(cat => {
                    if (cat.subCategories && cat.subCategories.length > 0) {
                        cat.subCategories.forEach(sub => subcategoryIds.add(sub.id));
                    }
                });

                const topLevelCategories = fullTree.filter(cat => !subcategoryIds.has(cat.id));
                const flatCategories = flattenCategoryTree(topLevelCategories);

                setCategories([allCategory, ...flatCategories]);

                const enriched = itemRes.data.data.map(item => {
                    const cat = flatCategories.find(c => c.id === item.category_id);
                    return {
                        ...item,
                        category: cat ? cat.name : "Uncategorized"
                    };
                });

                setItems(enriched);
            }))
            .catch(err => console.error("❌ Error fetching items/categories:", err));
    }, [clientId]);

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

    const getFilteredItems = () => {
        if (activeCategory?.toLowerCase() === "all categories") {
            return items.filter(i =>
                i.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (!items || !Array.isArray(items)) return [];
        return items.filter(
            i =>
                i.category?.toLowerCase() === activeCategory?.toLowerCase() &&
                i.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const handleItemClick = (item) => {
        if (item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0) {
            const lineItems = item.line_item_id
                .map(id => items.find(i => i.id === id))
                .filter(Boolean);

            setSelectedMainItem(item);
            setLineItemsDetails(lineItems);
            setLineItemsModalOpen(true);
        } else {
            addItemToOrder(item);
        }
    };

    const addItemToOrder = (item) => {
        const existingItem = orderItems.find(i => i.id === item.id);
        if (existingItem) {
            setOrderItems(orderItems.map(i =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setOrderItems([...orderItems, { ...item, quantity: 1, note: "" }]);
        }
    };

    const handleAddMainItemWithLineItems = () => {
        if (!selectedMainItem) return;

        const mainItemCopy = { ...selectedMainItem };

        const existingMainItem = orderItems.find(i => i.id === mainItemCopy.id);
        if (existingMainItem) {
            setOrderItems(orderItems.map(i =>
                i.id === mainItemCopy.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setOrderItems(prev => [...prev, { ...mainItemCopy, quantity: 1, note: "" }]);
        }

        lineItemsDetails.forEach(lineItem => {
            const existingLineItem = orderItems.find(i => i.id === lineItem.id);
            if (existingLineItem) {
                setOrderItems(prev => prev.map(i =>
                    i.id === lineItem.id ? { ...i, quantity: i.quantity + 1 } : i
                ));
            } else {
                setOrderItems(prev => [...prev, { ...lineItem, quantity: 1, note: "" }]);
            }
        });

        setLineItemsModalOpen(false);
        setSelectedMainItem(null);
        setLineItemsDetails([]);
    };

    const handleAddMainItemOnly = () => {
        if (!selectedMainItem) return;

        const mainItemCopy = { ...selectedMainItem };
        const existingMainItem = orderItems.find(i => i.id === mainItemCopy.id);

        if (existingMainItem) {
            setOrderItems(orderItems.map(i =>
                i.id === mainItemCopy.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setOrderItems(prev => [...prev, { ...mainItemCopy, quantity: 1, note: "" }]);
        }

        setLineItemsModalOpen(false);
        setSelectedMainItem(null);
        setLineItemsDetails([]);
    };

    const fetchTables = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data?.data) {
                const tableList = Array.isArray(res.data?.data) ? res.data.data.map(t => ({
                    ...t,
                    table_number: t.name || t.table_number || "-",
                })) : [];
                tableList.sort((a, b) =>
                    a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
                );
                setTables(tableList);
            }
        } catch (error) {
            console.error("Error fetching tables", error);
        }
    };

    const openNoteEditor = (item) => {
        setCurrentItemForNote(item);
        setNoteText(item.note || "");
        setNotesModalOpen(true);
    };

    const saveNoteToItem = () => {
        setOrderItems(orderItems.map(i =>
            i.id === currentItemForNote.id ? { ...i, note: noteText } : i
        ));
        setNotesModalOpen(false);
    };

    const updateQuantity = (id, delta) => {
        setOrderItems(orderItems.map(i =>
            i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
        ));
    };

    const removeItem = (id) => {
        setOrderItems(orderItems.filter(i => i.id !== id));
    };

    const handlePlaceOrder = async () => {
        if (isPlacingOrder) return;
        setIsPlacingOrder(true);

        try {
            if (!selectedTable) {
                toast.error("Please select a table before placing the order.");
                setIsPlacingOrder(false);
                return;
            }

            if (orderItems.length === 0) {
                toast.error("Please select at least one item before placing the order.");
                setIsPlacingOrder(false);
                return;
            }

            const subtotal = orderItems.reduce(
                (sum, item) => sum + (item.unit_price || 0) * (item.quantity || 0),
                0
            );

            const gstValue = (subtotal * gstRate) / 100;
            const cstValue = (subtotal * cstRate) / 100;
            const discountValue = discount;
            const total_price = subtotal + gstValue + cstValue - discountValue;

            const dinein_order_id = generateNextOrderId();
            const invoice_id = generateNextInvoiceId();
            const invoice_status = "unpaid";

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
                paymentMode,
                customer,
                dinein_order_id,
                invoice_id,
                invoice_status,
                items: orderItems.map(item => ({
                    client_id: clientId,
                    item_id: Number(item.id),
                    quantity: Number(item.quantity),
                    status: item.status || "pending",
                    note: item.note || "",
                    item_name: item.name,
                    slug: item.slug || generateSlug(item.name),
                    unit_price: item.unit_price || 0,
                    line_total: (item.unit_price || 0) * (item.quantity || 0),
                })),
            };

            console.log("📦 Sending payload:", JSON.stringify(payload, null, 2));

            const res = await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success("Order created successfully!");
            console.log("Order placed:", res.data);

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
                await fetchTables();
            }

            setOrderItems([]);
            setSelectedTable("");
            setPaymentMode("Cash");
            onOrderUpdate?.(res.data);
        } catch (err) {
            console.error("❌ Order failed:", err);
            toast.error("Order failed. Please check console for details.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <div className="Restaurant-Order_Placing" ref={containerRef}>
            <div className={`restaurant-order-system ${darkMode ? "dark-mode" : "light-mode"}`}>
                <div className="order-page-container-full">
                    <div className="order-layout">
                        {/* Menu Section */}
                        <div className="menu-section">
                            <div className="menu-container">
                                <div className="search-filter-bar">
                                    <div className="search-input-wrapper">
                                        <FiSearch className="search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search menu items..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="search-input"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <select
                                            value={activeCategory}
                                            onChange={(e) => setActiveCategory(e.target.value)}
                                            className="category-dropdown"
                                            aria-label="Category"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.name}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Mobile-only "Go to Order" button (screens < 1024px) */}
                                        {isMobileWidth && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (orderFormRef.current) {
                                                        orderFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    } else {
                                                        // fallback: scroll to bottom
                                                        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
                                                    }
                                                }}
                                                className="go-to-order-btn"
                                                aria-label="Go to Order form"
                                                style={{
                                                    padding: '8px ',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    backgroundColor: '#2563eb',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                                    fontSize: '8px'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#1e40af';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#2563eb';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                Go to Order
                                            </button>
                                        )}
                                    </div>

                                </div>

                                <div className="menu-items-grid">
                                    {getFilteredItems().map(item => (
                                        <div
                                            key={item.id}
                                            className="menu-item-card"
                                            onClick={() => handleItemClick(item)}
                                        >
                                            {item.line_item_id && item.line_item_id.length > 0 && (
                                                <div className="line-items-badge">
                                                    +{item.line_item_id.length} items
                                                </div>
                                            )}
                                            <div className="menu-item-image">
                                                <ImagePreview
                                                    clientId={clientId}
                                                    imageId={item.image_id}
                                                    token={token}
                                                />
                                            </div>
                                            <div className="menu-item-content">
                                                <h4 className="menu-item-name">{item.name}</h4>
                                                <div className="menu-item-footer">
                                                    <span className="menu-item-price">₹{item.unit_price}</span>
                                                    <button className="add-item-btn">
                                                        <FaPlus />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Order Sidebar */}
                        <div className="order-sidebar" aria-label="Order Sidebar">
                            <div className="order-sidebar-content" ref={orderFormRef}>
                                <div className="table-selection-section">
                                    <h3 className="sidebar-section-title">Table Selection</h3>
                                    <select
                                        value={selectedTable}
                                        onChange={(e) => setSelectedTable(e.target.value)}
                                        className="table-dropdown"
                                    >
                                        <option value="">Select a table</option>
                                        {availableTables.map(table => (
                                            <option key={table.id} value={table.id}>
                                                {table.table_number} - {table.location_zone}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="order-cart-section">
                                    <div className="cart-header">
                                        <FaShoppingCart className="cart-icon" />
                                        <h3 className="sidebar-section-title">Order Cart</h3>
                                    </div>

                                    {orderItems.length === 0 ? (
                                        <div className="empty-cart">
                                            <FaShoppingCart className="empty-cart-icon" />
                                            <p className="empty-cart-text">Cart is empty</p>
                                        </div>
                                    ) : (
                                        <div className="cart-items-list">
                                            {orderItems.map(item => (
                                                <div key={item.id} className="cart-item">
                                                    <div className="cart-item-header">
                                                        <h4 className="cart-item-name" onClick={() => openNoteEditor(item)}>
                                                            {item.name}
                                                            {item.note && <span className="note-indicator">📝</span>}
                                                        </h4>
                                                        <button
                                                            className="remove-item-btn"
                                                            onClick={() => removeItem(item.id)}
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                    <div className="cart-item-details">
                                                        <span className="cart-item-price">₹{item.unit_price}</span>
                                                        <div className="quantity-controls">
                                                            <button onClick={() => updateQuantity(item.id, -1)}>
                                                                <FaMinus />
                                                            </button>
                                                            <span className="quantity-value">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, 1)}>
                                                                <FaPlus />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="cart-item-total">
                                                        Total: ₹{(item.unit_price * item.quantity).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="cart-summary">
                                                <div className="cart-total">
                                                    <span className="total-label">Total</span>
                                                    <span className="total-value">₹{calculateTotalPrice()}</span>
                                                </div>

                                                <button
                                                    className="place-order-btn"
                                                    onClick={handlePlaceOrder}
                                                    disabled={!selectedTable || orderItems.length === 0 || isPlacingOrder}
                                                >
                                                    {isPlacingOrder ? "Placing Order..." : "Place Order"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll Buttons */}
                <div style={{ position: 'fixed', right: '20px', bottom: '20px', zIndex: 9999 }}>
                    {/* Scroll to Bottom Button */}
                    {showScrollBottom && (
                        <button
                            onClick={scrollToBottom}
                            title="Scroll to bottom"
                            style={{
                                display: 'block',
                                width: '50px',
                                height: '50px',
                                marginBottom: '10px',
                                borderRadius: '50%',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                transition: 'all 0.3s ease',
                                fontSize: '20px',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#1976D2';
                                e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#2196F3';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <FaArrowDown />
                        </button>
                    )}

                    {/* Scroll to Top Button */}
                    {showScrollTop && (
                        <button
                            onClick={scrollToTop}
                            title="Scroll to top"
                            style={{
                                display: 'block',
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                transition: 'all 0.3s ease',
                                fontSize: '20px',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#45a049';
                                e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#4CAF50';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <FaArrowUp />
                        </button>
                    )}
                </div>

                {/* Line Items Modal */}
                <Modal
                    isOpen={lineItemsModalOpen}
                    onRequestClose={() => setLineItemsModalOpen(false)}
                    className="custom-modal"
                    overlayClassName="custom-overlay"
                >
                    <h3>{selectedMainItem?.name}</h3>
                    <p style={{ marginBottom: '20px', color: '#666' }}>
                        This item comes with the following add-ons:
                    </p>

                    <div style={{ marginBottom: '24px' }}>
                        {lineItemsDetails.map((lineItem, index) => (
                            <div key={lineItem.id} style={{
                                padding: '12px',
                                backgroundColor: '#f5f5f5',
                                borderRadius: '8px',
                                marginBottom: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>{index + 1}. {lineItem.name}</span>
                                <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                                    ₹{lineItem.unit_price}
                                </span>
                            </div>
                        ))}
                    </div>

                    <p style={{ marginBottom: '20px', fontStyle: 'italic', color: '#666' }}>
                        Would you like to add the main item with all add-ons, or just the main item?
                    </p>

                    <div className="modal-buttons">
                        <button
                            onClick={() => setLineItemsModalOpen(false)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddMainItemOnly}
                            className="warning-btn"
                            style={{ backgroundColor: '#FF9800' }}
                        >
                            Main Only
                        </button>
                        <button
                            onClick={handleAddMainItemWithLineItems}
                            className="confirm-btn"
                        >
                            With Add-ons
                        </button>
                    </div>
                </Modal>

                {/* Notes Modal */}
                <Modal
                    isOpen={notesModalOpen}
                    onRequestClose={() => setNotesModalOpen(false)}
                    className="custom-modal"
                    overlayClassName="custom-overlay"
                >
                    <h3>Edit Note for {currentItemForNote?.name}</h3>
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        autoFocus
                        placeholder="Add special instructions..."
                    />
                    <div className="modal-buttons">
                        <button onClick={() => setNotesModalOpen(false)} className="cancel-btn">Cancel</button>
                        <button onClick={saveNoteToItem} className="confirm-btn">Save Note</button>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default Table_Inventory_Order;