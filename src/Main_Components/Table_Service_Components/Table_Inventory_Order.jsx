import React, { useEffect, useState } from "react";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import { useNavigate, useParams } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import axios from 'axios';
import { FaCheck, FaUsers, FaClock, FaChartLine, FaPlus, FaTrash, FaMinus, FaShoppingCart } from "react-icons/fa";
import { BsCash, BsCreditCard, BsQrCode } from "react-icons/bs";
import { toast } from 'react-toastify';
import ImagePreview from "../../Constants/ImagePreview";


const Table_Inventory_Order = ({ onOrderUpdate }) => {
    const { darkMode } = useTheme();
    const navigate = useNavigate();
    const { clientId } = useParams();

    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState("All Categories");
    const [searchTerm, setSearchTerm] = useState("");

    // Order Form States
    const [customer, setCustomer] = useState({ name: "", phone: "", location: "" });
    const [orderItems, setOrderItems] = useState([]);
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    const [currentItemForNote, setCurrentItemForNote] = useState(null);
    const [noteText, setNoteText] = useState("");
    const [paymentMode, setPaymentMode] = useState("Cash");
    const [cashPopupOpen, setCashPopupOpen] = useState(false);
    const [cashReceived, setCashReceived] = useState("");
    const [gstRate, setGstRate] = useState(5);
    const [cstRate, setCstRate] = useState(2);
    const [discount, setDiscount] = useState(0);

    const token = localStorage.getItem("access_token");

    // Filter only vacant/available tables for dropdown
    const availableTables = tables.filter(t =>
        ["vacant", "available"].includes(t.status?.trim().toLowerCase())
    );

    const available = tables.filter(t => t.status === 'Vacant').length;
    const occupied = tables.filter(t => t.status === 'Occupied').length;
    const reserved = tables.filter(t => t.status === 'Reserved').length;
    const total = tables.length;

    // Calculations
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
            axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=dietery`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
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

    const handleItemClick = (item) => {
        const existingItem = orderItems.find(i => i.id === item.id);
        if (existingItem) {
            setOrderItems(orderItems.map(i =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setOrderItems([...orderItems, { ...item, quantity: 1, note: "" }]);
        }
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

    const handlePlaceOrder = () => {
        if (!selectedTable) {
            toast.error("Please select a table before placing the order.");
            return;
        }

        if (orderItems.length === 0) {
            toast.error("Please select at least one item before placing the order.");
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
                status: item.status || "new",
                note: item.note || "",
                item_name: item.name,
                slug: item.slug || generateSlug(item.name),
                unit_price: item.unit_price || 0,
                line_total: (item.unit_price || 0) * (item.quantity || 0),
            })),
        };

        console.log("📦 Sending payload:", JSON.stringify(payload, null, 2));

        axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
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
                            location_zone: selectedTableObj?.location_zone
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    await fetchTables();
                }

                // Clear order after success
                setOrderItems([]);
                setSelectedTable("");
                setPaymentMode("Cash");
                setCashReceived("");

                onOrderUpdate?.(res.data);
                navigate(`/saas/${clientId}/main/kds-page`);
            })
            .catch((err) => {
                console.error("❌ Order failed:", err);
                if (err.response?.status === 422) {
                    console.error("🔍 422 Error:", JSON.stringify(err.response.data, null, 2));
                }
                toast.error("Order failed. Please check console for details.");
            });
    };

    return (
        <div className="Restaurant-Order_Placing">
            <div className={`restaurant-order-system ${darkMode ? "dark-mode" : "light-mode"}`}>
                <div className="order-page-container-full">
                    {/* <div className="page-header-main">
                    <div>
                        <h1 className="page-title">Place Order</h1>
                        <p className="page-subtitle">Dine-in order management</p>
                    </div>
                </div> */}

                    {/* Stats Cards */}
                    {/* <div className="stats-grid-inline">
                    <div className="stat-card available">
                        <div className="stat-icon"><FaCheck /></div>
                        <div className="stat-content">
                            <p className="stat-label">Available</p>
                            <p className="stat-value">{available}</p>
                        </div>
                    </div>
                    <div className="stat-card occupied">
                        <div className="stat-icon"><FaUsers /></div>
                        <div className="stat-content">
                            <p className="stat-label">Occupied</p>
                            <p className="stat-value">{occupied}</p>
                        </div>
                    </div>
                    <div className="stat-card reserved">
                        <div className="stat-icon"><FaClock /></div>
                        <div className="stat-content">
                            <p className="stat-label">Reserved</p>
                            <p className="stat-value">{reserved}</p>
                        </div>
                    </div>
                    <div className="stat-card total">
                        <div className="stat-icon"><FaChartLine /></div>
                        <div className="stat-content">
                            <p className="stat-label">Total Tables</p>
                            <p className="stat-value">{total}</p>
                        </div>
                    </div>
                </div> */}

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
                                    <select
                                        value={activeCategory}
                                        onChange={(e) => setActiveCategory(e.target.value)}
                                        className="category-dropdown"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="menu-items-grid">
                                    {getFilteredItems().map(item => (
                                        <div
                                            key={item.id}
                                            className="menu-item-card"
                                            onClick={() => handleItemClick(item)}
                                        >
                                            <div className="menu-item-image">
                                                <img
                                                    src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"}
                                                    alt={item.name}
                                                    onError={(e) => {
                                                        e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                                                    }}
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

                        <div className="item-pane">
                            <div className="menu-grid">
                                {getFilteredItems().map(item => (
                                    <div key={item.id} className="menu-card" onClick={() => handleItemClick(item)}>
                                        <div className="discount">
                                            {item.discount && item.unit_price ? (
                                                <p className="discount">
                                                    {((item.discount * 100) / item.unit_price)}% OFF
                                                </p>
                                            ) : (
                                                <p className="discount"></p>
                                            )}
                                        </div>
                                        <div className="menu-info" key={item.id}>
                                            <div className="info">
                                                <h4>{item.name}</h4>
                                                <p className="price">{item.unit_price}</p>

                                            </div>
                                            <div className="img">
                                                <ImagePreview
                                                    clientId={clientId}
                                                    imageId={item.image_id}
                                                    token={token}
                                                />
                                            </div>
                                        </div>
                                        <div className="footer-info">
                                            <h6 className="desc">Description : {item.description}</h6>
                                        </div>
                                    </div>
                                ))}
                                </div>
                        </div>
                        {/* Order Sidebar */}
                        <div className="order-sidebar">
                            <div className="order-sidebar-content">
                                {/* Table Selection Section */}
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

                                {/* Order Cart Section */}
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
                                                {/* 
                                            <div className="payment-methods">
                                                <button
                                                    className={`payment-method-btn cash ${paymentMode === "Cash" ? "active" : ""}`}
                                                    onClick={() => setCashPopupOpen(true)}
                                                >
                                                    <BsCash /> Cash
                                                </button>
                                                <button
                                                    className={`payment-method-btn card ${paymentMode === "Card" ? "active" : ""}`}
                                                    onClick={() => setPaymentMode("Card")}
                                                >
                                                    <BsCreditCard /> Card
                                                </button>
                                                <button
                                                    className={`payment-method-btn upi ${paymentMode === "UPI" ? "active" : ""}`}
                                                    onClick={() => setPaymentMode("UPI")}
                                                >
                                                    <BsQrCode /> UPI
                                                </button>
                                            </div> */}

                                                <button
                                                    className="place-order-btn"
                                                    onClick={handlePlaceOrder}
                                                    disabled={!selectedTable || orderItems.length === 0}
                                                >
                                                    Place Order
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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

                {/* Cash Payment Modal */}
                <Modal
                    isOpen={cashPopupOpen}
                    onRequestClose={() => setCashPopupOpen(false)}
                    className="custom-modal"
                    overlayClassName="custom-overlay"
                >
                    <h3>Cash Payment</h3>
                    <div className="modal-info"><strong>Total Bill:</strong> ₹{calculateTotalPrice()}</div>
                    <input
                        type="number"
                        placeholder="Amount Received"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                    />
                    {parseFloat(cashReceived) >= parseFloat(calculateTotalPrice()) && cashReceived !== "" && (
                        <div className="return-amount">
                            Return Amount: ₹{(parseFloat(cashReceived) - parseFloat(calculateTotalPrice())).toFixed(2)}
                        </div>
                    )}
                    {parseFloat(cashReceived) < parseFloat(calculateTotalPrice()) && cashReceived !== "" && (
                        <div className="error-message">Amount received is less than total.</div>
                    )}
                    <div className="modal-buttons">
                        <button onClick={() => setCashPopupOpen(false)} className="cancel-btn">Cancel</button>
                        <button
                            onClick={() => {
                                if (parseFloat(cashReceived) >= parseFloat(calculateTotalPrice())) {
                                    setPaymentMode("Cash");
                                    setCashPopupOpen(false);
                                } else {
                                    toast.error("Received amount must be greater than or equal to bill total.");
                                }
                            }}
                            className="confirm-btn"
                        >
                            Confirm
                        </button>
                    </div>
                </Modal>
            </div>
    
        </div>
    );
};

export default Table_Inventory_Order;