import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, X, Check, StickyNote, Search, Users, Package } from 'lucide-react';
import axios from 'axios';
import CategoryTree from '../../MainComponents/InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';
import { Eye, Lock, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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


const TakeOrder_V1 = ({ clientId, token, onOrderUpdate, realm }) => {
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
    const [orderMode, setOrderMode] = useState('takeaway');
    const [currentView, setCurrentView] = useState('order');
    const [tableModeMap, setTableModeMap] = useState({});

    const TAKEAWAY_TABLE_ID = 501;
    const DELIVERY_TABLE_ID = 502;

    const isPlacingRef = useRef(false);
    const isMobile = window.matchMedia('(max-width: 1024px)').matches;
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showOrderPage, setShowOrderPage] = useState(false);

    const [activeOrderId, setActiveOrderId] = useState(null);
    const [hasNewItems, setHasNewItems] = useState(false);
    const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
    const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
    const [tableOrders, setTableOrders] = useState({});
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
        try {
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

            const modeMap = {};

            tableList.forEach(t => {
                const name = (t.name || '').toLowerCase().trim();

                // More flexible matching with includes()
                if (name.includes('delivery')) {
                    modeMap[t.id] = 'delivery';
                    console.log(`✅ Mapped table "${t.name}" (ID: ${t.id}) → delivery`);
                } else if (name.includes('pickup') || name.includes('takeaway')) {
                    modeMap[t.id] = 'takeaway';
                    console.log(`✅ Mapped table "${t.name}" (ID: ${t.id}) → takeaway`);
                } else {
                    modeMap[t.id] = 'dinein';
                }
            });

            // Validate that we found the required tables
            const hasDelivery = Object.values(modeMap).includes('delivery');
            const hasTakeaway = Object.values(modeMap).includes('takeaway');

            if (!hasDelivery) {
                console.warn('⚠️ No "delivery" table found. Please create a table with "delivery" in its name.');
            }
            if (!hasTakeaway) {
                console.warn('⚠️ No "takeaway/pickup" table found. Please create a table with "takeaway" or "pickup" in its name.');
            }

            tableList.sort((a, b) =>
                a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
            );

            setTables(tableList);
            setTableModeMap(modeMap);

            console.log('📋 Final Mode Map:', modeMap);

            await fetchTableOrders(tableList);
        } catch (error) {
            console.error('❌ Error fetching tables:', error);
        }
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
                if (table.status?.toLowerCase() === 'occupied') {
                    const tableOrder = allOrders
                        .filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'served')
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

    useEffect(() => {
        setIsOrderFormOpen(showCart);
    }, [showCart]);

    useEffect(() => {
        window.history.pushState({ view: 'floor' }, '');
    }, []);
    const getTableIdByMode = (mode) => {
        console.log('🔍 Searching for table with mode:', mode);

        // Find table by mode from the map
        const foundTable = tables.find(t => tableModeMap[t.id] === mode);

        if (foundTable) {
            console.log(`✅ Found table: "${foundTable.name}" (ID: ${foundTable.id})`);
            return foundTable.id;
        }

        // Fallback: Search by name directly if map lookup fails
        console.warn(`⚠️ Mode map lookup failed for "${mode}", trying direct name search...`);

        let fallbackTable = null;

        if (mode === 'takeaway') {
            fallbackTable = tables.find(t => {
                const name = (t.name || '').toLowerCase().trim();
                return name.includes('takeaway') || name.includes('pickup');
            });
        } else if (mode === 'delivery') {
            fallbackTable = tables.find(t => {
                const name = (t.name || '').toLowerCase().trim();
                return name.includes('delivery');
            });
        }

        if (fallbackTable) {
            console.log(`✅ Found via fallback: "${fallbackTable.name}" (ID: ${fallbackTable.id})`);
            return fallbackTable.id;
        }

        console.error(`❌ No table found for mode: ${mode}`);
        console.error('Available tables:', tables.map(t => ({ id: t.id, name: t.name })));
        console.error('Mode map:', tableModeMap);

        return null;
    };

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

    // ✅ FIXED: Always create new cart entry when editing existing order
    const addToCart = (item) => {
        setHasNewItems(true);

        const timestamp = Date.now() + Math.random();
        const uniqueKey = `${item.id}_${timestamp}`;

        let batchTimestamp = currentBatchTimestamp;

        // Create new batch if not exists
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

        // ✅ KEY FIX: When editing existing order, ALWAYS create new cart entry
        if (activeOrderId) {
            // For existing orders, always add as new item with unique key
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

            // Save to localStorage
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
            // For new orders, allow quantity increase
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

        if (uniqueKey && activeOrderId) {
            // 🔥 REMOVE FROM localStorage
            localStorage.removeItem(`order_${activeOrderId}_new_item_${uniqueKey}`);

            setCart(prev =>
                prev.filter(i => i.frontend_unique_key !== uniqueKey)
            );
        } else {
            setCart(prev => prev.filter(i => i.id !== itemId));
        }
    };


    const updateQuantity = (itemId, change, uniqueKey = null) => {
        setHasNewItems(true);

        setCart(prev =>
            prev
                .map(item => {
                    const isMatch = uniqueKey
                        ? item.frontend_unique_key === uniqueKey
                        : item.id === itemId && !item.frontend_unique_key;

                    if (!isMatch) return item;

                    const qty = item.quantity + change;
                    if (qty <= 0) return null;

                    // 🔥 UPDATE localStorage quantity
                    if (uniqueKey && activeOrderId) {
                        const key = `order_${activeOrderId}_new_item_${uniqueKey}`;
                        const stored = JSON.parse(localStorage.getItem(key));
                        if (stored) {
                            localStorage.setItem(
                                key,
                                JSON.stringify({ ...stored, quantity: qty })
                            );
                        }
                    }

                    return { ...item, quantity: qty };
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
                // Update existing order
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
                // Create new order - Get table ID
                const tableId = getTableIdByMode(orderMode);

                if (!tableId) {
                    const availableTables = tables.map(t => `"${t.name}" (ID: ${t.id})`).join(', ');
                    const errorMsg = `Cannot find table for "${orderMode}" mode.\n\n` +
                        `Please ensure you have a table with:\n` +
                        `- "delivery" in its name for Delivery orders\n` +
                        `- "takeaway" or "pickup" in its name for Takeaway orders\n\n` +
                        `Available tables: ${availableTables}`;

                    alert(errorMsg);
                    console.error('Table lookup failed:', {
                        orderMode,
                        tableModeMap,
                        availableTables: tables
                    });
                    return;
                }

                console.log(`✅ Creating order for ${orderMode} using table ID: ${tableId}`);

                // Create new order
                await axios.post(
                    `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
                    {
                        client_id: clientId,
                        table_id: Number(tableId),
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
                        table_type: String(tableToUpdate.table_type ?? "1")
                    },
                    { headers }
                );
            }

            await fetchTables();

            // Clear batch tracking after successful order
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
            setCurrentView("order");
            setCurrentBatchTimestamp(null);
            setHasNewItems(false);

            console.log('✅ Order placed successfully!');

        } catch (err) {
            console.error("❌ ORDER ERROR:", err);
            console.error("Error details:", err.response?.data || err.message);
            alert(`Order failed: ${err.response?.data?.message || err.message}`);
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
        setCurrentView('order');
        setShowCart(false);
        setShowClearConfirm(false);
        setActiveOrderId(null);
        setCurrentBatchTimestamp(null);
        setHasNewItems(false);
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
            const tableOrders = allOrders.filter(
                o => o.table_id === table.id && o.status?.toLowerCase() !== 'served'
            );

            if (tableOrders.length === 0) {
                alert('No active order for this table');
                return;
            }

            const activeOrder = tableOrders.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )[0];

            setActiveOrderId(activeOrder.id);
            setCurrentBatchTimestamp(null);
            setHasNewItems(false);
            setHasNewItems(false);
            setCurrentBatchTimestamp(null);

            // ✅ Group items by their batch timestamp
            const batchGroups = {};

            (activeOrder.items || []).forEach(item => {
                const itemId = Number(item.item_id);
                const menuItem = menuItems.find(mi => Number(mi.id) === itemId);
                const frontendKey = item.frontend_unique_key;

                // Determine batch timestamp
                let batchTimestamp = null;
                if (frontendKey) {
                    // Extract timestamp from unique key (format: itemId_timestamp)
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

                // Group by batch or "original" for items without batch
                const groupKey = batchTimestamp || 'original';
                if (!batchGroups[groupKey]) {
                    batchGroups[groupKey] = [];
                }
                batchGroups[groupKey].push(cartItem);
            });

            // Flatten groups back to cart array, maintaining batch order
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
            const mode = tableModeMap[table.id] || 'dinein';
            setOrderMode(mode);
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

    // ✅ Group cart items by batch
    const oldItems = cart.filter(i => !i.batch_timestamp);
    const newItems = cart.filter(i => !!i.batch_timestamp);

    const groupedNewItems = newItems.reduce((acc, item) => {
        const batch = item.batch_timestamp || 'default';
        if (!acc[batch]) acc[batch] = [];
        acc[batch].push(item);
        return acc;
    }, {});

    const batchTimestamps = Object.keys(groupedNewItems).sort();

    const canPlaceOrder = cart.length > 0;
    useEffect(() => {
        setOrderMode('takeaway');
    }, []);


    const handlePrintBill = (orderId, tableId) => {
        // Navigate to billing page with the order ID
        navigate(`/saas/${clientId}/billing?orderId=${orderId}`);
    };
    // ============ JSX RETURN ============
    return (
        <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">

            {currentView === 'order' && (
                <div className="mx-auto px-2 py-2">
                    <div className="grid lg:grid-cols-4 gap-1">

                        {/* CATEGORY SIDEBAR */}
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

                        {/* MENU + ORDER PANEL */}
                        <div className="lg:col-span-3 flex gap-2">

                            {/* MENU */}
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

                            {/* DESKTOP CART SIDEBAR */}
                            {!isMobile && (
                                <div className={`transition-all duration-300 ease-in-out ${showCart ? 'w-[22rem] opacity-100 z-30' : 'w-0 opacity-0'}`}>
                                    <div className="border border-gray-300 rounded-xl bg-white">
                                        <div className="shadow-xl rounded-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
                                            <div className="flex flex-col h-full p-4">

                                                {/* ================= HEADER ================= */}
                                                <div className="pb-3 border-b space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h2 className="text-lg font-semibold text-gray-800">
                                                            Your Order
                                                        </h2>

                                                        <span className="text-xs text-gray-500">
                                                            {orderMode === 'takeaway' ? 'Takeaway Order' : 'Delivery Order'}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={() => {
                                                                setOrderMode('takeaway');
                                                                const id = getTableIdByMode('takeaway');
                                                                if (id) setSelectedTable(String(id));
                                                            }} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition
                                                                ${orderMode === 'takeaway'
                                                                    ? 'bg-action-primary text-white'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                                              `}
                                                        >
                                                            Takeaway
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setOrderMode('delivery');
                                                                const id = getTableIdByMode('delivery');
                                                                if (id) setSelectedTable(String(id));
                                                            }} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition
                                                                ${orderMode === 'delivery'
                                                                    ? 'bg-action-primary text-white'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                                              `}
                                                        >
                                                            Delivery
                                                        </button>

                                                    </div>

                                                    {/* Order Context */}
                                                    <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                                                        <div className="flex flex-col">
                                                            {orderMode === 'dinein' && selectedTable ? (
                                                                <span className="font-semibold text-gray-700 text-base">
                                                                    Table {tables.find(t => t.id.toString() === selectedTable)?.table_number}
                                                                </span>
                                                            ) : (
                                                                <span className="font-semibold text-gray-700 text-base">
                                                                    Takeaway Order
                                                                </span>
                                                            )}

                                                            <span className="text-xs text-gray-500">
                                                                Add items from the menu
                                                            </span>
                                                        </div>

                                                        <span className="text-base font-bold text-red-600">
                                                            ₹{getTotalPrice()}
                                                        </span>
                                                    </div>

                                                    {/* Transfer */}
                                                    {orderMode === 'dinein' && selectedTable && (
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
                                                                setCurrentView('order');
                                                            }}
                                                            className="text-xs text-red-600 hover:underline self-start"
                                                        >
                                                            Transfer table
                                                        </button>
                                                    )}
                                                </div>

                                                {/* ================= CART CONTENT ================= */}
                                                {cart.length === 0 ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                                                        <ShoppingCart size={44} className="text-gray-300 mb-3" />
                                                        <p className="text-sm font-semibold text-gray-700">
                                                            Order is empty
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Click items from the menu to add them here
                                                        </p>
                                                        <p className="text-[11px] text-gray-400 mt-2 italic">
                                                            You can add multiple items before placing the order
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* ================= ITEMS ================= */}
                                                        <div className="flex-1 overflow-y-auto mt-4 space-y-2">

                                                            {/* OLD ITEMS */}
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

                                                            {/* NEW ITEMS */}
                                                            {activeOrderId && newItems.length > 0 && (
                                                                <div className="flex items-center gap-2 my-2">
                                                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
                                                                    <span className="text-xs font-semibold text-orange-600 px-2">
                                                                        NEW ITEMS
                                                                    </span>
                                                                    <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"></div>
                                                                </div>
                                                            )}

                                                            {batchTimestamps.map(timestamp =>
                                                                groupedNewItems[timestamp].map(item => (
                                                                    <div
                                                                        key={item.frontend_unique_key}
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
                                                                ))
                                                            )}
                                                        </div>

                                                        {/* ================= ACTIONS ================= */}
                                                        <div className="flex gap-2 mt-3">
                                                            <button
                                                                onClick={handlePlaceOrder}
                                                                disabled={!canPlaceOrder || isPlacingOrder}
                                                                className={`flex-1 py-2 rounded-lg text-sm font-semibold
                ${canPlaceOrder && !isPlacingOrder
                                                                        ? 'bg-action-primary text-text-white hover:bg-action-danger'
                                                                        : 'bg-gray-300 cursor-not-allowed'
                                                                    }`}
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

            {/* MOBILE CART - Similar structure with batch grouping */}
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


                                    {/* Mobile Cart Items with Batch Grouping */}
                                    <div className="space-y-4 mb-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
                                        {/* OLD ITEMS */}
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

                                        {/* NEW ITEMS SEPARATOR */}
                                        {activeOrderId && newItems.length > 0 && (
                                            <div className="flex items-center gap-2 my-3">
                                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                                                <span className="text-sm font-bold text-orange-600 px-3">NEW ITEMS</span>
                                                <div className="flex-1 h-px bg-gradient-to-r from-orange-500 via-transparent to-transparent"></div>
                                            </div>
                                        )}

                                        {/* NEW ITEMS - GROUPED BY BATCH */}
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

                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS & FLOATING BUTTON */}
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
        </div>
    );
};

export default TakeOrder_V1;
