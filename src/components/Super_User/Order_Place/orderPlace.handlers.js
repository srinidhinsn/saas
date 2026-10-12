import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getMenuConfig } from '../../utils/menuConfigResolver';
import {
    getDietaryFromSlug, isItemActive,
    buildCartItem, deduplicateOrderItems, getCategoryAndChildrenIds,
} from '../../utils/Menu-utils/menuUtils';
import { useDietaryTypes, useTimings, useZoneConfig } from '../../utils/Menu-utils/useMenuData';
import {
    getUserIdFromToken,
    readDraft,
    writeDraft,
    deleteDraftFromDB,
    getDraftTableIdsFromOrders,
    upsertBillingDocumentForCustomer,
    printKOT,
} from './orderPlace.helpers';
// ─────────────────────────────────────────────────────────────────────────────
// useOrderPlace — all state, effects, and handlers for the Order_Place screen
// ─────────────────────────────────────────────────────────────────────────────

export function useOrderPlace({ clientId, token, onOrderUpdate, realm, screenIds }) {

    // ── View ──────────────────────────────────────────────────────────────────
    const [currentView, setCurrentView] = useState(
        () => screenIds?.includes('super_user_v1') ? 'order' : 'floor'
    );
    const [orderMode, setOrderMode] = useState('dinein');

    // ── Remote data ───────────────────────────────────────────────────────────
    const [tables, setTables] = useState([]);
    const [tableOrders, setTableOrders] = useState({});
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoriesFlat, setCategoriesFlat] = useState([]);
    const [dieterySubCategories, setDieterySubCategories] = useState([]);
    const [sidebarCategories, setSidebarCategories] = useState([]);
    const [counterTree, setCounterTree] = useState([]);
    const [inventoryMap, setInventoryMap] = useState({});
    const [loading, setLoading] = useState(true);

    // ── Order context ─────────────────────────────────────────────────────────
    const [selectedTable, setSelectedTable] = useState('');
    const [takeawayTables, setTakeawayTables] = useState([]);
    const [dineinTableId, setDineinTableId] = useState(null);
    const [takeawayTableId, setTakeawayTableId] = useState(null);
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [activeDineinOrderId, setActiveDineinOrderId] = useState(null);
    const [showTransferModal, setShowTransferModal] = useState(false);

    // ── Cart ──────────────────────────────────────────────────────────────────
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [hasNewItems, setHasNewItems] = useState(false);
    const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const isPlacingRef = useRef(false);

    // ── Drafts ────────────────────────────────────────────────────────────────
    const [draftSavedAt, setDraftSavedAt] = useState(null);
    const [draftTableIds, setDraftTableIds] = useState([]);   // for floor DRAFT badges

    const [customerDetails, setCustomerDetails] = useState({ customer_id: '', contact_phone: '', customer_name: '' });
    const [customerAddresses, setCustomerAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState("");
    const { dietaryOptions, dietaryColorMap } = useDietaryTypes({ clientId, token });
    const { timingOptions } = useTimings({ clientId, token });
    const { sections, zones } = useZoneConfig({ clientId, token });

    // ── UI state ──────────────────────────────────────────────────────────────
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const [cancelOrderModal, setCancelOrderModal] = useState({ isOpen: false, orderId: null, tableId: null });
    const [tablePayConfirmModal, setTablePayConfirmModal] = useState({ isOpen: false, orderId: null, tableId: null });

    const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
    const [selectedMainItem, setSelectedMainItem] = useState(null);
    const [lineItemsDetails, setLineItemsDetails] = useState([]);

    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [invoiceOrderData, setInvoiceOrderData] = useState(null);

    const [oldItemDeleteModal, setOldItemDeleteModal] = useState({ isOpen: false, item: null });

    const searchInputRef = useRef(null);
    const isMobile = window.matchMedia('(max-width: 1024px)').matches;

    const [takeawaySections, setTakeawaySections] = useState([]);
    const [zoneConfigId, setZoneConfigId] = useState(null);
    const [selectedDietary, setSelectedDietary] = useState(null);
    const [stockWarning, setStockWarning] = useState(null);
    const [showTakeawayOrdersModal, setShowTakeawayOrdersModal] = useState(false);
    const menuConfig = useMemo(
        () => (clientId ? getMenuConfig(clientId) : null),
        [clientId]
    );
    const selectedAddress = customerAddresses.find(
        a => String(a.id) === String(selectedAddressId)
    );
    const formattedAddress = selectedAddress
        ? `
${selectedAddress.name || ""}
${selectedAddress.address_line1 || ""}
${selectedAddress.address_line2 || ""}
${selectedAddress.city || ""}
${selectedAddress.state || ""}
${selectedAddress.pincode || ""}
${selectedAddress.country || ""}
`.trim()
        : "";

    const fetchZoneConfig = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const takeawayRoots =
                (import.meta.env.VITE_TAKEAWAY_TABLE_DEFAULT_ROOT || '')
                    .split(',')
                    .map(v => v.trim().toLowerCase())
                    .filter(Boolean);

            const allSections = res.data || [];

            // Dine-in sections — exclude anything that matches takeaway roots
            const dineInSections = takeawayRoots.length > 0
                ? allSections.filter(s =>
                    !takeawayRoots.some(root =>
                        (s.zone || '').toLowerCase().startsWith(root) ||
                        (s.section || '').toLowerCase().startsWith(root)
                    )
                )
                : allSections;

            // Takeaway sections — only those matching takeaway roots
            const takeawaySectionsFiltered = takeawayRoots.length > 0
                ? allSections.filter(s =>
                    takeawayRoots.some(root =>
                        (s.zone || '').toLowerCase().startsWith(root) ||
                        (s.section || '').toLowerCase().startsWith(root)
                    )
                )
                : [];

            setTakeawaySections(takeawaySectionsFiltered);
        } catch (err) {
            console.error('Zone config fetch failed', err);
        }
    };

    useEffect(() => {
        if (!token || !clientId) return;

        const fetchUsernameAndAddresses = async () => {
            try {
                const userId = getUserIdFromToken(token);
                if (!userId) return;

                // ── Get username from /person-details (uses token's user_id directly) ──
                const personRes = await axios.get(
                    `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const username = personRes.data?.data?.person
                    ? null  // person-details has first_name/last_name, not username
                    : null;

                // ── Get username from /users endpoint, match by client_id instead ──
                const usersRes = await axios.get(
                    `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/users`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const users = usersRes.data?.data?.users || [];

                // Match by client_id since IDs differ — there's only one user per client here
                // OR match by the last part of UUID since only last char differs (fragile)
                // SAFEST: just take the first/only user for this client
                const match = users.find(u => u.client_id === clientId) || users[0];

                setCustomerDetails(prev => ({
                    ...prev,
                    customer_id: userId,
                    customer_name: match?.username || '',
                }));

                // Addresses fetch using the DB id (from users list), not token id
                if (match?.id) {
                    try {
                        const addrRes = await axios.get(
                            `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/address`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        const addresses = addrRes.data?.data?.addresses || [];
                        setCustomerAddresses(addresses);
                        if (addresses.length > 0) {
                            setSelectedAddressId(String(addresses[0].id));
                        }
                    } catch {
                        setCustomerAddresses([]);
                    }
                }

            } catch (err) {
                console.error('Failed to fetch user info:', err?.response?.data || err.message);
            }
        };

        fetchUsernameAndAddresses();
    }, [clientId, token]);

    const DIETARY_COLORS = ['bg-green-500', 'bg-red-500', 'bg-yellow-400', 'bg-orange-500', 'bg-purple-500', 'bg-blue-500'];

    const fetchDietaryTypes = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
                { params: { category_id: 'dietary_type' }, headers: { Authorization: `Bearer ${token}` } }
            );
            const opts = res.data?.data || [];
            const map = {};
            opts.forEach((opt, idx) => {
                map[opt.toLowerCase().replace(/[-_\s]/g, '')] = DIETARY_COLORS[idx % DIETARY_COLORS.length];
            });
        } catch (err) {
            console.error('Dietary fetch failed:', err);
        }
    };

    const fetchTimings = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/item-types`,
                {
                    params: { category_id: 'available_timings' },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const raw = res.data?.data || [];
            const parsed = raw.map(v => {
                const match = v.match(/^(.+)\((.+)-(.+)\)$/);
                return {
                    name: (match?.[1] ?? v).trim().toLowerCase(),
                    start: match?.[2] ?? null,
                    end: match?.[3] ?? null,
                    raw: v
                };
            });
        } catch (err) {
            console.error('Timing fetch failed:', err);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Draft helpers
    // ─────────────────────────────────────────────────────────────────────────

    const handleSaveDraft = useCallback(async () => {
        if (!selectedTable || cart.length === 0) {
            toast.warn('Nothing to save — cart is empty.');
            return;
        } const userId = getUserIdFromToken(token);
        const ok = await writeDraft(selectedTable, cart, clientId, token, {
            ...customerDetails,
            customer_id: userId
        }, selectedAddressId);
        if (ok) {
            const now = Date.now();
            setDraftSavedAt(now);
            await fetchTables();                  // refreshes floor DRAFT badges
            toast.success('Draft saved! You can return to this table anytime.');
        } else {
            toast.error('Failed to save draft.');
        }
    }, [selectedTable, cart, clientId, token, customerDetails]);

    // ─────────────────────────────────────────────────────────────────────────
    // Category / tree utilities
    // ─────────────────────────────────────────────────────────────────────────

    const flattenCategoryTree = (tree, level = 0, parentId = null) => {
        let flat = [];
        tree.forEach(c => {
            flat.push({
                id: c.id,
                name: c.name,
                level,
                parentId,
                hasChildren: !!(c.subCategories?.length),
            });
            if (c.subCategories?.length) {
                flat = flat.concat(flattenCategoryTree(c.subCategories, level + 1, c.id));
            }
        });
        return flat;
    };

    const getAddonCategoryId = useCallback((itemCategoryId) => {
        if (!itemCategoryId || !categoriesFlat.length) return null;

        // 1️⃣ Find root node (like "dietery")
        const rootNode = categoriesFlat.find(
            c => c.parentId === null || c.parentId === undefined
        );

        if (!rootNode) return null;

        // 2️⃣ Start from item's category
        let current = categoriesFlat.find(c => c.id === itemCategoryId);

        // 3️⃣ Climb upward until direct child of root
        while (current && current.parentId) {
            if (current.parentId === rootNode.id) {
                const slug = current.name
                    .trim()
                    .toLowerCase()
                    .replace(/[\s-]+/g, "")
                    .replace(/[^a-z0-9]/g, "");

                return `addons_${slug}`;
            }

            current = categoriesFlat.find(c => c.id === current.parentId);
        }

        return null;
    }, [categoriesFlat]);

    const findCategoryNode = (tree, matcher) => {
        for (const c of tree) {
            if (
                c.id?.toLowerCase() === matcher.toLowerCase() ||
                c.name?.toLowerCase() === matcher.toLowerCase()
            ) return c;
            if (c.children?.length) {
                const f = findCategoryNode(c.children, matcher);
                if (f) return f;
            }
        }
        return null;
    };

    const getCategoriesAtLevel = (node, tgt, cur = 0) => {
        if (!node) return [];
        if (cur === tgt) return [node];
        let r = [];
        for (const ch of node.children || []) {
            r = r.concat(getCategoriesAtLevel(ch, tgt, cur + 1));
        }
        return r;
    };

    const findNodeAndChildren = (nodes, id) => {
        for (const n of nodes) {
            if (n.id === id) return n;
            if (n.children?.length) {
                const f = findNodeAndChildren(n.children, id);
                if (f) return f;
            }
        }
        return null;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Determine if a category is a combo category (walks ancestors)
    // ─────────────────────────────────────────────────────────────────────────

    const isComboCategoryId = useCallback((categoryId) => {
        if (!categoryId || !categoriesFlat.length) return false;
        let cur = categoryId;
        const visited = new Set();
        while (cur && !visited.has(cur)) {
            visited.add(cur);
            const cat = categoriesFlat.find(c => c.id === cur);
            if (!cat) break;
            if ((cat.name || '').toLowerCase().includes('combo')) return true;
            cur = cat.parentId ?? null;
        }
        return false;
    }, [categoriesFlat]);

    // ─────────────────────────────────────────────────────────────────────────
    // Data fetching
    // ─────────────────────────────────────────────────────────────────────────

    const fetchCounterTree = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category`,
                {
                    params: { client_id: clientId, category_id: 'counter' },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setCounterTree(res.data.data?.[0]?.subCategories || []);
        } catch (err) {
            console.error('Failed to fetch counter tree:', err);
        }
    };

    const fetchTableOrders = async (tableList) => {
        try {
            const r = await axios.get(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const allOrders = r.data?.data || [];

            // populates the floor DRAFT badges from server
            setDraftTableIds(getDraftTableIdsFromOrders(allOrders));

            const map = {};
            tableList.forEach(table => {
                const s = table.status?.toLowerCase();
                if (s === 'occupied' || s === 'served') {
                    const o = allOrders
                        .filter(o =>
                            o.table_id === table.id &&
                            o.status?.toLowerCase() !== 'completed' &&
                            o.status?.toLowerCase() !== 'draft' &&
                            o.status?.toLowerCase() !== 'cancelled'
                        )
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                    if (o) {
                        map[table.id] = {
                            id: o.id,
                            dinein_order_id: o.dinein_order_id,
                            status: o.status,
                            created_at: o.created_at,
                            order_count: o.order_count || 1,
                            total_price: o.total_price || 0,
                            invoice_status: o.invoice_status || null,
                        };
                    }
                }
            });
            setTableOrders(map);
        } catch (err) {
            console.error('Failed to fetch table orders:', err);
        }
    };

    const fetchTables = async () => {
        const takeawayRoots = (import.meta.env.VITE_TAKEAWAY_TABLE_DEFAULT_ROOT || '')
            .split(',').map(v => v.trim().toLowerCase());

        const [tableRes, configRes] = await Promise.all([
            axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const freshConfigs = configRes.data || [];

        const list = Array.isArray(tableRes.data?.data)
            ? tableRes.data.data.map(t => {
                const matchedConfig = freshConfigs.find(
                    c => c.section?.trim().toLowerCase() === t.section?.trim().toLowerCase()
                        && c.zone?.trim().toLowerCase() === t.location_zone?.trim().toLowerCase()
                );
                return { ...t, table_number: t.name || t.table_number || '-', config_id: matchedConfig?.id || null };
            })
            : [];

        const takeaway = list.filter(t => takeawayRoots.some(root => (t.name || '').toLowerCase().startsWith(root)));
        setTakeawayTables(takeaway);
        if (takeaway.length > 0) setTakeawayTableId(takeaway[0].id);

        list.sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }));
        setTables(list);
        await fetchTableOrders(list);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Initial data load
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchData = async () => {
            if (!clientId || !token || !menuConfig) return;
            try {
                setLoading(true);
                await Promise.all([fetchTables(), fetchCounterTree(), fetchZoneConfig(), fetchDietaryTypes(), fetchTimings()]);

                const [catRes, itemRes, invRes] = await Promise.all([
                    axios.get(
                        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.root}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    ),
                    axios.get(
                        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                            params: {
                                inventory_id: menuConfig.menuInventoryId,
                                ...(zoneConfigId !== null && zoneConfigId !== undefined ? { zone_config_id: zoneConfigId } : {}),
                            }
                        }
                    ),
                    axios.get(
                        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    ),
                ]);

                const iMap = {};
                (invRes.data?.data || []).forEach(i => (iMap[i.id] = i));
                setInventoryMap(iMap);

                const fullTree = catRes.data.data.filter(c => c.name?.toLowerCase() !== 'all');
                const subIds = new Set();
                fullTree.forEach(c => c.subCategories?.forEach(s => subIds.add(s.id)));
                const topLevel = fullTree.filter(c => !subIds.has(c.id));
                const flatCats = flattenCategoryTree(topLevel);
                setCategoriesFlat(
                    flatCats.map(c => ({
                        id: c.id,
                        name: (c.name || '').trim(),
                        parentId: c.parentId ?? c.parent_id ?? null,
                    }))
                );

                const enrichedItems = itemRes.data.data.map(item => {
                    const cat = flatCats.find(c => c.id === item.category_id);
                    return { ...item, category_name: cat?.name || 'Uncategorized' };
                });
                enrichedItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                setMenuItems(enrichedItems);

                const buildTree = () => {
                    const map = new Map();
                    flatCats.forEach(c =>
                        map.set(c.id, {
                            ...c,
                            count: enrichedItems.filter(i => i.category_id === c.id).length,
                            children: [],
                        })
                    );
                    const tree = [];
                    map.forEach(c => {
                        if (c.parentId && map.has(c.parentId)) map.get(c.parentId).children.push(c);
                        else tree.push(c);
                    });
                    return tree;
                };

                const categoryTree = buildTree().map(c =>
                    c.id === menuConfig.root || c.name?.toLowerCase() === menuConfig.root.toLowerCase()
                        ? { ...c, name: 'All Categories', count: c.children.length }
                        : c
                );
                setCategories(categoryTree);
                setSidebarCategories(categoryTree);

                const rootNode = findCategoryNode(categoryTree, menuConfig.root);
                let qc = [];
                if (rootNode) {
                    let l = menuConfig.level;
                    while (l >= 0) {
                        qc = getCategoriesAtLevel(rootNode, l);
                        if (qc.length > 0) break;
                        l--;
                    }
                }
                setDieterySubCategories(qc);
            } catch (err) {
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [clientId, token, realm, menuConfig]);

    useEffect(() => {
        if (!clientId || !token || !menuConfig) return;

        const refetchMenu = async () => {
            try {
                const itemRes = await axios.get(
                    `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            inventory_id: menuConfig.menuInventoryId,
                            // ✅ Always include zoneConfigId (even if null/undefined)
                            ...(zoneConfigId !== null && zoneConfigId !== undefined
                                ? { zone_config_id: zoneConfigId }
                                : {}),
                        }
                    }
                );

                const allItems = itemRes.data.data || [];
                const uniqueKeyToItemMap = new Map();
                allItems.forEach(item => {
                    const existing = uniqueKeyToItemMap.get(item.id);
                    if (!existing || item.zone_config_id === zoneConfigId) {
                        uniqueKeyToItemMap.set(item.id, item);
                    }
                });

                const enriched = Array.from(uniqueKeyToItemMap.values()).map(item => {
                    const cat = categoriesFlat.find(c => c.id === item.category_id);
                    return { ...item, category_name: cat?.name || 'Uncategorized' };
                });
                enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                setMenuItems(enriched);
            } catch (err) {
                console.error('Zone menu refetch failed:', err);
            }
        };

        refetchMenu();
    }, [zoneConfigId, clientId, token, menuConfig, categoriesFlat]);

    // ─────────────────────────────────────────────────────────────────────────
    // Browser history (back button) — push initial floor state once
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        window.history.replaceState({ view: 'floor' }, '');
    }, []);

    const superUserInitialized = useRef(false);
    useEffect(() => {
        if (!screenIds?.includes('super_user_v1')) return;
        if (loading) return; // wait for data to finish loading
        if (superUserInitialized.current) return;

        superUserInitialized.current = true;

        // No takeaway table configured — show toast and stay on floor
        if (!takeawayTables.length) {
            toast.error('Takeaway table not configured. Please contact admin.');
            return;
        }

        const tableIdStr = takeawayTables[0].id.toString();
        const takeawayTable = takeawayTables[0];
        const takeawayZoneConfigId = takeawayTable?.config_id || null;

        setOrderMode('takeaway');
        setSelectedTable(tableIdStr);
        setTakeawayTableId(tableIdStr);
        setActiveOrderId(null);
        setActiveDineinOrderId(null);
        setCart([]);
        setHasNewItems(false);
        setCurrentBatchTimestamp(null);
        setDraftSavedAt(null);
        setCustomerDetails(prev => ({ ...prev, customer_id: '', contact_phone: '' }));
        setZoneConfigId(takeawayZoneConfigId);
        setCurrentView('order');
        setShowCart(true);
        window.history.pushState({ view: 'order' }, '');
    }, [screenIds, loading, takeawayTables, takeawaySections]);

    useEffect(() => {
        const onBack = (e) => {
            if (currentView === 'order') {
                e.preventDefault();
                if (!screenIds?.includes('super_user_v1')) {
                    goToFloor();
                } else {
                    window.history.pushState({ view: 'order' }, '');
                }
            }
        };
        window.addEventListener('popstate', onBack);
        return () => window.removeEventListener('popstate', onBack);
    }, [currentView, screenIds]);

    // ─────────────────────────────────────────────────────────────────────────
    // Navigation helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * goToOrderView — switches to the order view and ensures the cart panel
     * is always visible so the waiter sees items immediately.
     */
    const goToOrderView = () => {
        setCurrentView('order');
        setShowCart(true);
        window.history.pushState({ view: 'order' }, '');
    };

    /**
     * goToFloor — returns to the floor view WITHOUT clearing the cart or draft.
     * The waiter can click back to the same table and pick up right where they left off.
     */
    const goToFloor = () => {
        setCurrentView('floor');
        setShowCart(false);
        setSidebarCategories(categories);
        setSelectedCategoryId(null);
        setSearchQuery('');
        setZoneConfigId(null);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Table / order selection
    // ─────────────────────────────────────────────────────────────────────────

    const handleTransferTable = async (newTable) => {
        if (!activeOrderId) {
            toast.error('No active order to transfer.');
            return;
        }
        try {
            setLoading(true);
            const headers = { Authorization: `Bearer ${token}` };
            const oldTableId = Number(selectedTable);
            const newTableId = newTable.id;

            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                { id: activeOrderId, client_id: clientId, table_id: newTableId },
                { headers }
            );

            const oldTable = tables.find(t => t.id === oldTableId);
            if (oldTable) {
                await axios.post(
                    `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                    { ...oldTable, id: oldTableId, status: 'vacant', table_type: String(oldTable.table_type) },
                    { headers }
                );
            }

            await axios.post(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                { ...newTable, id: newTableId, status: 'Occupied', table_type: String(newTable.table_type) },
                { headers }
            );

            setSelectedTable(newTableId.toString());
            setDineinTableId(newTableId.toString());
            await fetchTables();
            toast.success(`Transferred to Table ${newTable.table_number}`);
        } catch (err) {
            console.error('[Transfer] Failed:', err);
            toast.error('Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    const selectOrderTable = async ({
        table,
        mode = "dinein",
        restoreDraft = false,
        openTakeawayModal = false,
    }) => {
        const tableIdStr = table.id.toString();
        const resolvedZoneConfigId = table.config_id || null;

        setActiveOrderId(null);
        setActiveDineinOrderId(null);
        setHasNewItems(false);
        setCurrentBatchTimestamp(null);

        setOrderMode(mode);
        setSelectedTable(tableIdStr);
        setZoneConfigId(resolvedZoneConfigId);

        if (mode === "dinein") {
            setDineinTableId(tableIdStr);
        }

        if (restoreDraft) {
            const draft = await readDraft(tableIdStr, clientId, token);

            if (draft) {
                const restoredCart = (draft.items || []).flatMap(item => {
                    const menuItem = menuItems.find(
                        mi => Number(mi.id) === Number(item.item_id)
                    );

                    const mainKey =
                        item.frontend_unique_key ||
                        `${item.item_id}_restored_${Date.now()}`;

                    const mainEntry = {
                        id: Number(item.item_id),
                        name: item.item_name || menuItem?.name || "Item",
                        unit_price: item.unit_price ?? menuItem?.unit_price ?? 0,
                        discount: menuItem?.discount || 0,
                        image_id: menuItem?.image_id,
                        slug: item.slug || menuItem?.slug,
                        category: menuItem?.category_name,
                        category_id: menuItem?.category_id || null,
                        quantity: item.quantity || 1,
                        note: "",
                        frontend_unique_key: mainKey,
                        batch_timestamp: null,
                        is_new_item: true,
                        saved_sub_order: false,
                        status: "draft",
                        is_addon: false,
                        parent_item_key: null,
                    };

                    const addonEntries = (item.line_item_id || [])
                        .map((addonId, idx) => {
                            const addonMenuItem = menuItems.find(
                                mi => Number(mi.id) === Number(addonId)
                            );

                            if (!addonMenuItem) return null;

                            return {
                                id: Number(addonId),
                                name: addonMenuItem.name,
                                unit_price: addonMenuItem.unit_price ?? 0,
                                discount: addonMenuItem.discount || 0,
                                image_id: addonMenuItem.image_id,
                                slug: addonMenuItem.slug,
                                category: addonMenuItem.category_name,
                                category_id: addonMenuItem.category_id || null,
                                quantity: 1,
                                note: "",
                                frontend_unique_key: `${addonId}_addon_${mainKey}_${idx}`,
                                batch_timestamp: null,
                                is_new_item: true,
                                saved_sub_order: false,
                                status: "draft",
                                is_addon: true,
                                parent_item_key: mainKey,
                            };
                        })
                        .filter(Boolean);

                    return [mainEntry, ...addonEntries];
                });

                setCart(restoredCart);
                setHasNewItems(true);
                setDraftSavedAt(Date.now());

                setCustomerDetails({
                    customer_id: draft.customer_id || "",
                    contact_phone: draft.contact_phone || "",
                });

                toast.info("Draft restored for this table.", {
                    autoClose: 2000,
                });
            } else {
                setCart([]);
                setDraftSavedAt(null);
                setCustomerDetails({
                    customer_id: "",
                    contact_phone: "",
                });
            }
        } else {
            setCart([]);
            setCustomerDetails({
                customer_id: "",
                contact_phone: "",
            });
        }

        setShowCart(true);

        if (openTakeawayModal) {
            setShowTakeawayOrdersModal(true);
        }

        goToOrderView();
    };

    const handleTableSelect = async (table) => {
        await selectOrderTable({
            table,
            mode: "dinein",
            restoreDraft: true,
        });
    };

    const handleTakeawaySelect = async () => {
        if (!takeawayTables.length) {
            toast.error("No takeaway table configured");
            return;
        }

        const tableIdStr = (
            takeawayTableId || takeawayTables[0].id
        ).toString();

        const takeawayTable = tables.find(
            t => String(t.id) === tableIdStr
        );

        await selectOrderTable({
            table: takeawayTable,
            mode: "takeaway",
            restoreDraft: false,
            openTakeawayModal: true,
        });
    };

    const handleTakeawayOrderSelected = async (existingOrder) => {
        const tableIdStr = (takeawayTableId || takeawayTables[0].id).toString();
        setOrderMode('takeaway');
        setSelectedTable(tableIdStr);

        const takeawayTable = tables.find(t => String(t.id) === tableIdStr);
        const takeawayZoneConfigId = takeawayTable?.config_id || null;
        setZoneConfigId(takeawayZoneConfigId);

        if (!existingOrder) {
            // New order
            setActiveOrderId(null);
            setActiveDineinOrderId(null);
            setCart([]);
            setHasNewItems(false);
            setCurrentBatchTimestamp(null);
            setDraftSavedAt(null);
        } else {
            // Resume existing order — reconstruct cart as old (read-only) items
            const reconstructedCart = (existingOrder.items || []).map(item => {
                const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
                return {
                    id: Number(item.item_id),
                    name: item.item_name || menuItem?.name || 'Unnamed Item',
                    unit_price: item.unit_price || menuItem?.unit_price || 0,
                    quantity: item.quantity || 1,
                    note: item.note || '',
                    image_id: menuItem?.image_id,
                    discount: menuItem?.discount || 0,
                    slug: item.slug || menuItem?.slug,
                    category: menuItem?.category_name,
                    category_id: menuItem?.category_id || null,
                    frontend_unique_key: item.frontend_unique_key,
                    batch_timestamp: null,
                    is_new_item: false,
                    saved_sub_order: true,
                    status: item.status || 'pending',
                    batch_label: item.batch_label,
                    sub_order_id: item.sub_order_id,
                };
            });
            setCart(reconstructedCart);
            if (!screenIds?.includes('super_user_v1')) {
                setActiveOrderId(existingOrder.id);
                setActiveDineinOrderId(existingOrder.dinein_order_id);
            } else {
                setActiveOrderId(null);
                setActiveDineinOrderId(null);
            }
            setHasNewItems(false);
            setCurrentBatchTimestamp(null);
            setDraftSavedAt(null);
        }
        setShowCart(true);
        goToOrderView();
    };

    const handleViewOrder = async (table) => {
        if (menuItems.length === 0) {
            alert('Menu still loading...');
            return;
        }
        try {
            setLoading(true);
            const r = await axios.get(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const allOrders = r.data?.data || [];
            const tableGroups = allOrders.filter(
                o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed'
            );
            if (tableGroups.length === 0) {
                alert('No active order');
                return;
            }
            const activeOrder = tableGroups.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )[0];

            const reconstructedCart = (activeOrder.items || []).map(item => {
                const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
                return {
                    id: Number(item.item_id),
                    order_item_id: item.id,
                    name: item.item_name || menuItem?.name || 'Unnamed Item',
                    unit_price: item.unit_price || menuItem?.unit_price || 0,
                    quantity: item.quantity || 1,
                    note: item.note || '',
                    image_id: menuItem?.image_id,
                    discount: menuItem?.discount || 0,
                    slug: item.slug || menuItem?.slug,
                    category: menuItem?.category_name,
                    category_id: menuItem?.category_id || null,
                    frontend_unique_key: item.frontend_unique_key,
                    batch_timestamp: null,
                    is_new_item: false,
                    saved_sub_order: true,
                    status: item.status || 'pending',
                    batch_label: item.batch_label,
                    sub_order_id: item.sub_order_id,
                };
            });

            setCart(reconstructedCart);
            setSelectedTable(table.id.toString());
            const matchedSection = sections.find(
                s => s.zone === table.location_zone && s.section === table.section
            );
            setZoneConfigId(matchedSection ? matchedSection.id : null);
            setOrderMode('dinein');
            setActiveOrderId(activeOrder.id);
            setActiveDineinOrderId(activeOrder.dinein_order_id);
            setHasNewItems(false);
            setCurrentBatchTimestamp(null);
            setDraftSavedAt(null);
            goToOrderView();
        } catch (err) {
            console.error(err);
            alert('Failed to load order');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToTables = () => {
        // Leave cart & draft untouched — waiter can return to same table
        goToFloor();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Cart operations
    // ─────────────────────────────────────────────────────────────────────────

    const getTotalPrice = () =>
        cart
            .filter(i => !(i.frontend_unique_key || '').startsWith('cchild_'))
            .reduce((t, i) => t + (i.unit_price || 0) * i.quantity, 0)
            .toFixed(2);

    const addToCart = (item, parentItemKey = null) => {
        // Count how many of this item are already in the new (unsaved) cart
        const alreadyInCart = cart
            .filter(i => i.id === item.id && i.is_new_item && !i.saved_sub_order)
            .reduce((sum, i) => sum + i.quantity, 0);

        const available = Number(item.availability ?? Infinity);

        if (available > 0 && alreadyInCart >= available) {
            setStockWarning({
                itemName: item.name,
                available,
            });
            return null;
        }

        setHasNewItems(true);
        let batch = currentBatchTimestamp;
        if (!batch) {
            batch = Date.now();
            setCurrentBatchTimestamp(batch);
        }

        if (!parentItemKey) {
            const existingIndex = cart.findIndex(
                ci => ci.id === Number(item.id) && ci.is_new_item && !ci.saved_sub_order && !ci.is_addon
            );
            if (existingIndex !== -1) {
                setCart(prev =>
                    prev.map((ci, idx) =>
                        idx === existingIndex ? { ...ci, quantity: ci.quantity + 1 } : ci
                    )
                );
                if (!isMobile) setShowCart(true);
                return cart[existingIndex].frontend_unique_key;
            }
        }

        const newItem = buildCartItem(item, {
            batch_timestamp: batch,
            parent_item_key: parentItemKey,
            is_addon: !!parentItemKey,
        });
        setCart(prev => [...prev, newItem]);
        if (!isMobile) setShowCart(true);
        return newItem.frontend_unique_key;
    };

    const removeFromCart = (itemId, uniqueKey = null) => {
        setHasNewItems(true);
        if (uniqueKey) {
            setCart(prev =>
                prev.filter(i =>
                    i.frontend_unique_key !== uniqueKey && i.parent_item_key !== uniqueKey
                )
            );
        } else {
            setCart(prev => prev.filter(i => i.id !== itemId));
        }
    };

    const updateQuantity = (itemId, change, uniqueKey = null) => {
        setHasNewItems(true);
        setCart(prev =>
            prev.map(item => {
                const match = uniqueKey
                    ? item.frontend_unique_key === uniqueKey
                    : item.id === itemId && !item.frontend_unique_key;
                if (!match) return item;
                const q = item.quantity + change;
                return q > 0 ? { ...item, quantity: q } : null;
            }).filter(Boolean)
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Old-item delete
    // ─────────────────────────────────────────────────────────────────────────

    const handleOldItemRequestDelete = (item) => {
        setOldItemDeleteModal({ isOpen: true, item });
    };

    const reloadCartFromServer = useCallback(async (orderId) => {
        try {
            const r = await axios.get(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const allOrders = r.data?.data || [];
            const order = allOrders.find(o => o.id === orderId);

            if (!order || !order.items?.length) {
                setCart([]);
                setActiveOrderId(null);
                setActiveDineinOrderId(null);
                setHasNewItems(false);
                await fetchTables();
                goToFloor();
                toast.info('All items removed — order closed.');
                return;
            }

            const rebuiltOldItems = order.items.map(item => {
                const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
                return {
                    id: Number(item.item_id),
                    order_item_id: item.id,
                    name: item.item_name || menuItem?.name || 'Unnamed Item',
                    unit_price: item.unit_price || menuItem?.unit_price || 0,
                    quantity: item.quantity || 1,
                    note: item.note || '',
                    image_id: menuItem?.image_id,
                    discount: menuItem?.discount || 0,
                    slug: item.slug || menuItem?.slug,
                    category: menuItem?.category_name,
                    category_id: menuItem?.category_id || null,
                    frontend_unique_key: item.frontend_unique_key || String(item.id),
                    batch_timestamp: null,
                    is_new_item: false,
                    saved_sub_order: true,
                    status: item.status || 'pending',
                    batch_label: item.batch_label,
                    sub_order_id: item.sub_order_id,
                    parent_item_key: item.parent_item_key || null,
                };
            });

            setCart(prev => {
                const unsavedNew = prev.filter(ci => ci.is_new_item && !ci.saved_sub_order);
                return [...rebuiltOldItems, ...unsavedNew];
            });
            await fetchTables();
        } catch (err) {
            console.error('[reloadCartFromServer] failed:', err);
            toast.error('Failed to refresh cart after item change.');
        }
    }, [clientId, token, menuItems]);

    const handleOldItemRemoveOne = async (transactionType, reason, removeQty = 1) => {
        const item = oldItemDeleteModal.item;
        setOldItemDeleteModal({ isOpen: false, item: null });

        if (!item || !item.order_item_id) {
            toast.error('Cannot update — item has no DB reference.');
            return;
        }

        try {
            setLoading(true);

            await axios.delete(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
                {
                    params: {
                        client_id: clientId,
                        order_item_id: item.order_item_id,
                        quantity: removeQty,
                        transaction_type: transactionType,
                        reason: reason || undefined,
                    },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const newQty = item.quantity - removeQty;

            // after main item delete, if qty hit zero cascade to children
            if (newQty <= 0 && !item.parent_item_key) {
                const childItems = cart.filter(
                    i => i.order_item_id &&
                        i.parent_item_key === item.frontend_unique_key
                );
                if (childItems.length > 0) {
                    await Promise.all(childItems.map(child =>
                        axios.delete(
                            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
                            {
                                params: {
                                    client_id: clientId,
                                    order_item_id: child.order_item_id,
                                    transaction_type: transactionType,
                                    reason: reason || undefined,
                                },
                                headers: { Authorization: `Bearer ${token}` },
                            }
                        )
                    ));
                }
            }
            toast.success(
                newQty > 0
                    ? `Quantity reduced to ${newQty}. (${transactionType})`
                    : 'Item removed.'
            );
            await reloadCartFromServer(activeOrderId);
        } catch (err) {
            console.error('[handleOldItemRemoveOne] failed:', err);
            toast.error('Failed to update item quantity.');
        } finally {
            setLoading(false);
        }
    };

    const handleOldItemRemoveAll = async (transactionType, reason) => {
        const item = oldItemDeleteModal.item;
        setOldItemDeleteModal({ isOpen: false, item: null });
        if (!item || !item.order_item_id) {
            toast.error('Cannot delete — item has no DB reference.');
            return;
        }

        try {
            setLoading(true);

            // if this is a parent, find all saved children by parent_item_key
            const itemsToDelete = item.parent_item_key
                ? [item]   // it's a child itself — only delete it
                : [
                    item,
                    ...cart.filter(
                        i => i.order_item_id &&
                            i.parent_item_key === item.frontend_unique_key
                    ),
                ];

            await Promise.all(itemsToDelete.map(targetItem =>
                axios.delete(
                    `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
                    {
                        params: {
                            client_id: clientId,
                            order_item_id: targetItem.order_item_id,
                            transaction_type: transactionType,
                            reason: reason || undefined,
                        },
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )
            ));

            toast.success('Item removed.');
            await reloadCartFromServer(activeOrderId);
        } catch (err) {
            console.error('[handleOldItemRemoveAll] failed:', err);
            toast.error('Failed to remove item.');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Item click — addon/combo detection
    // ─────────────────────────────────────────────────────────────────────────

    const handleItemClick = (item) => {

        // if (item.category_id === 'Combos') {
        //   // Add the item to the cart directly
        //   addToCart(item);
        //   return; // Exit early without opening the modal
        // }
        const hasLineItems =
            item.line_item_id &&
            Array.isArray(item.line_item_id) &&
            item.line_item_id.length > 0;

        if (!hasLineItems) {
            addToCart(item);
            return;
        }

        const isCombo = isComboCategoryId(item.category_id);

        // Resolve component / addon items directly by ID
        const linkedItems = item.line_item_id
            .map(id => menuItems.find(mi => Number(mi.id) === Number(id)))
            .filter(Boolean);

        if (isCombo) {
            // ✅ Add combo directly without modal
            let batch = currentBatchTimestamp;
            if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }

            setCart(prev => {
                const existingCombo = prev.find(
                    i => i.id === Number(item.id) &&
                        i.is_new_item &&
                        !i.saved_sub_order &&
                        !i.is_addon &&
                        (i.frontend_unique_key || '').startsWith('combo_')
                );

                if (existingCombo) {
                    return prev.map(i => {
                        if (i.frontend_unique_key === existingCombo.frontend_unique_key) {
                            return { ...i, quantity: i.quantity + 1 };
                        }
                        if (i.parent_item_key === existingCombo.frontend_unique_key && i.is_addon) {
                            return { ...i, quantity: i.quantity + 1 };
                        }
                        return i;
                    });
                }

                const comboParentEntry = buildCartItem(item, {
                    batch_timestamp: batch,
                    is_addon: false,
                    _item_type: 'combo',
                });

                const childEntries = linkedItems.map(comp =>
                    buildCartItem(comp, {
                        batch_timestamp: batch,
                        parent_item_key: comboParentEntry.frontend_unique_key,
                        is_addon: true,
                        _item_type: 'cchild',
                    })
                );

                return [...prev, comboParentEntry, ...childEntries];
            });

            setHasNewItems(true);
            if (!isMobile) setShowCart(true);

        } else {
            // Show addon picker
            if (linkedItems.length > 0) {
                setSelectedMainItem(item);
                setLineItemsDetails(linkedItems);
                setLineItemsModalOpen(true);
            } else {
                addToCart(item);
            }
        }
    };

    const handleAddMainItemWithSelectedAddons = (selectedAddonIds) => {
        if (!selectedMainItem) return;
        let batch = currentBatchTimestamp;
        if (!batch) {
            batch = Date.now();
            setCurrentBatchTimestamp(batch);
        }

        const mainKey = addToCart(selectedMainItem);

        lineItemsDetails
            .filter(i => selectedAddonIds.includes(i.id))
            .forEach(addon => {
                const addonEntry = buildCartItem(addon, {
                    batch_timestamp: batch,
                    parent_item_key: mainKey,
                    is_addon: true, _item_type: 'addon',
                });
                setCart(prev => [...prev, addonEntry]);
            });

        setHasNewItems(true);
        setLineItemsModalOpen(false);
        setSelectedMainItem(null);
        setLineItemsDetails([]);
    };

    const handleAddMainItemOnly = () => {
        if (!selectedMainItem) return;
        addToCart(selectedMainItem);
        setLineItemsModalOpen(false);
        setSelectedMainItem(null);
        setLineItemsDetails([]);
        if (!isMobile) setShowCart(true);
    };

    // Close handler for the line-items (addon picker) modal
    const closeLineItems = () => {
        setLineItemsModalOpen(false);
        setSelectedMainItem(null);
        setLineItemsDetails([]);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Derived values (declared before handlePlaceOrder / return; used by both)
    // ─────────────────────────────────────────────────────────────────────────

    const filteredItems = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        let items = menuItems;

        // ── 1. Timing filter — skip entirely if timings not loaded yet ──
        if (timingOptions.length > 0) {
            items = items.filter(item => isItemActive(item.slug));
        }

        // ── 2. Dietary filter ──
        if (selectedDietary) {
            items = items.filter(item => {
                const dietary = getDietaryFromSlug(item, dietaryOptions);
                return dietary !== null && dietary === selectedDietary;
            });
        }

        // ── 3. Category filter — uses flat list for reliable traversal ──
        if (selectedCategoryId) {
            const ids = getCategoryAndChildrenIds(selectedCategoryId, categoriesFlat);
            items = items.filter(i => ids.includes(i.category_id));
        }

        // ── 4. Search filter ──
        if (!q) return items;
        return items.filter(i =>
            (i.name || '').toLowerCase().includes(q) ||
            (i.category_name || '').toLowerCase().includes(q) ||
            String(i.code || '').toLowerCase().includes(q)
        );
    }, [menuItems, selectedCategoryId, searchQuery, selectedDietary, timingOptions, isItemActive, getCategoryAndChildrenIds]);

    const oldItems = cart.filter(i => !i.is_new_item || i.saved_sub_order);
    const newItems = cart.filter(i => i.is_new_item && !i.saved_sub_order);
    const groupedNewItems = newItems.reduce((acc, item) => {
        const b = item.batch_timestamp || 'default';
        if (!acc[b]) acc[b] = [];
        acc[b].push(item);
        return acc;
    }, {});
    const batchTimestamps = Object.keys(groupedNewItems).sort();

    const canPlaceOrder = (orderMode === 'takeaway' || screenIds?.includes('super_user_v1'))
        ? cart.filter(i => !i.parent_item_key).length > 0
        : activeOrderId
            ? hasNewItems && newItems.filter(i => !i.parent_item_key).length > 0
            : selectedTable && cart.filter(i => !i.parent_item_key).length > 0;

    const selectedCategoryName =
        categoriesFlat.find(c => c.id === selectedCategoryId)?.name || 'All Categories';

    // ─────────────────────────────────────────────────────────────────────────
    // Place order
    //
    // Addons (is_addon: true) are displayed in the cart but must NOT be
    // sent as separate order items to the API. They are visual-only sub-rows
    // that belong to their parent item. Only parent items go in the payload.
    // Combos likewise go as a single item — their components are on the menu
    // record (line_item_id) and are shown by KDS via that reference.
    // ─────────────────────────────────────────────────────────────────────────

    const handlePlaceOrder = async () => {
        if (isPlacingRef.current || !canPlaceOrder) return;
        if (!selectedAddressId) {
            toast.error("Please select address");
            return;
        }
        isPlacingRef.current = true;
        setIsPlacingOrder(true);

        // For KOT printing we want both parent items and their addon rows
        // (addons print indented below the parent on the slip)
        const itemsToPrintKOT = newItems.length > 0 ? [...newItems] : [...cart];

        // For the order API we only send parent (non-addon) items
        const buildOrderPayload = (items) =>
            items
                .filter(i => !(i.frontend_unique_key || '').startsWith('cchild_'))
                .map(i => ({
                    item_id: i.id,
                    item_name: i.name,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    line_total: i.unit_price * i.quantity,
                    status: 'pending',
                    slug: i.slug || '',
                    frontend_unique_key: i.frontend_unique_key,
                }));
        try {
            const headers = { Authorization: `Bearer ${token}` };
            let placedOrderId = null;

            if (activeOrderId && activeDineinOrderId && !screenIds?.includes('super_user_v1')) {
                const newOnly = cart.filter(i => i.is_new_item && !i.saved_sub_order);
                if (newOnly.length > 0) {
                    const subTotal = newOnly
                        .filter(i => !i.is_addon)
                        .reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
                    const r = await axios.post(
                        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create-sub-order`,
                        { items: buildOrderPayload(newOnly), price: subTotal, total_price: subTotal },
                        { headers, params: { client_id: clientId, parent_dinein_order_id: activeDineinOrderId } }
                    );
                    placedOrderId = activeOrderId;
                    toast.success(`Sub-order ${r.data.data.dinein_order_id} created!`);
                }
            } else {
                const existingDraft = await readDraft(selectedTable, clientId, token);
                const total = cart.filter(i => !(i.frontend_unique_key || '').startsWith('cchild_'))
                    .reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
                const itemsPayload = buildOrderPayload(cart);

                if (existingDraft) {
                    // ── Promote draft → pending using existing /dinein/update ──────
                    // Step 1: replace items via existing /order_items/update
                    await axios.post(
                        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${existingDraft.id}`,
                        itemsPayload,
                        { headers }
                    );
                    // Step 2: flip status + fix dinein_order_id via /dinein/update
                    await axios.post(
                        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                        {
                            id: existingDraft.id,
                            status: 'pending',
                            total_price: total,
                            // tells backend to reset dinein_order_id from "DRAFT-X" → "X"
                            dinein_order_id: String(existingDraft.id),
                            customer_id:
                                customerDetails.customer_id ||
                                getUserIdFromToken(token) ||
                                "",
                            delivery_address: selectedAddressId || '',
                        },
                        { headers }
                    );
                    placedOrderId = existingDraft.id;
                } else {
                    const createRes = await axios.post(
                        `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
                        {
                            client_id: clientId,
                            table_id: Number(selectedTable),
                            price: total,
                            gst: 0,
                            cst: 0,
                            total_price: total,
                            status: 'pending',
                            items: itemsPayload,
                            customer_id: customerDetails.customer_id || getUserIdFromToken(token) || "",
                            delivery_address: selectedAddressId || '',
                        },
                        { headers }
                    );
                    placedOrderId = createRes?.data?.data?.id;
                }

                if (orderMode !== 'takeaway') {
                    const tableToUpdate = tables.find(t => t.id.toString() === selectedTable);
                    if (tableToUpdate) {
                        await axios.post(
                            `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                            {
                                ...tableToUpdate,
                                id: Number(selectedTable),
                                status: 'Occupied',
                                table_type: tableToUpdate.table_type.toString(),
                            },
                            { headers }
                        );
                    }
                }
            }
            const finalCustomerDetails = { ...customerDetails };
            const finalSelectedAddressId = selectedAddressId; const finalFormattedAddress = formattedAddress;
            // Clean up on success
            if (placedOrderId) {
                const tableObj = tables.find(t => t.id.toString() === selectedTable);
                const orderSubtotal = cart.filter(i => !(i.frontend_unique_key || '').startsWith('cchild_'))
                    .reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
                await upsertBillingDocumentForCustomer({
                    clientId,
                    token,
                    orderId: placedOrderId,
                    tableRef: tableObj?.table_number || `Table ${selectedTable}`,
                    customerDetails: {
                        ...finalCustomerDetails,
                        customer_id: finalCustomerDetails.customer_id || getUserIdFromToken(token) || "",
                    }, selectedAddressId: finalFormattedAddress || finalSelectedAddressId,
                    orderSubtotal,
                });
            }

            await deleteDraftFromDB(selectedTable, clientId, token);
            await fetchTables();

            // Enrich items for KOT with real category_id from menu data
            const enrichedForKOT = itemsToPrintKOT.map(ci => {
                if (ci.category_id) return ci;
                const mi = menuItems.find(m => Number(m.id) === Number(ci.id));
                return { ...ci, category_id: mi?.category_id || null };
            });
            const tableObj = tables.find(t => t.id.toString() === selectedTable);
            printKOT({
                counterTree,
                categoriesFlat,
                itemsToPrint: enrichedForKOT,
                meta: {
                    tableNumber: tableObj?.table_number || selectedTable,
                    orderMode,
                    dineinOrderId: activeDineinOrderId,
                    timestamp: new Date(),
                },
            });

            setCart([]);
            setActiveOrderId(null);
            setActiveDineinOrderId(null);
            setShowCart(false);
            setCurrentBatchTimestamp(null);
            setHasNewItems(false);
            setCustomerDetails(prev => ({ ...prev, customer_id: '', contact_phone: '' }));
            setSelectedAddressId('');
            if (screenIds?.includes('super_user_v1')) {
                setCurrentView('order');
                setShowCart(true);
            } else {
                setCurrentView('floor');
            }
            toast.success('Order placed!');
        } catch (err) {
            console.error('ORDER ERROR:', err);
            toast.error('Order failed');
        } finally {
            isPlacingRef.current = false;
            setIsPlacingOrder(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Clear cart
    // ─────────────────────────────────────────────────────────────────────────

    const handleClearCart = () => {
        if (cart.length === 0) return;
        setShowClearConfirm(true);
    };

    const confirmClearCart = async () => {
        await deleteDraftFromDB(selectedTable, clientId, token);
        setCart([]);
        setSelectedTable('');
        setShowCart(false);
        setShowClearConfirm(false);
        setActiveOrderId(null);
        setActiveDineinOrderId(null);
        setCurrentBatchTimestamp(null);
        setHasNewItems(false);
        setCustomerDetails(prev => ({ ...prev, customer_id: '', contact_phone: '' }));
        if (!screenIds?.includes('super_user_v1')) {
            setSelectedTable('');
            setCurrentView('floor');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Cancel order
    // ─────────────────────────────────────────────────────────────────────────

    const handleCancelOrder = async (orderId, tableId, reason) => {
        try {
            const headers = { Authorization: `Bearer ${token}` };

            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/cancel?order_id=${orderId}&reason=${encodeURIComponent(reason || '')}`,
                {},
                { headers }
            );

            toast.success('Order cancelled and transaction recorded.');
            await fetchTables();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete order');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Mark as served
    // ─────────────────────────────────────────────────────────────────────────

    const handleMarkAsServed = async (orderId, tableId) => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                { id: orderId, client_id: clientId, status: 'served' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Order marked as served');
            await fetchTables();
        } catch (err) {
            console.error(err);
            toast.error('Failed to mark as served');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Confirm payment from the table grid
    // ─────────────────────────────────────────────────────────────────────────

    const handleConfirmPaymentFromGrid = async (orderId, tableId) => {
        try {
            setLoading(true);
            const headers = { Authorization: `Bearer ${token}` };

            const docsRes = await axios.get(
                `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
                { headers, params: { client_id: clientId } }
            );
            const invoices = (docsRes.data?.data || []).filter(
                d => d.order_id?.toString() === orderId?.toString()
            );
            if (invoices.length > 0) {
                invoices.sort(
                    (a, b) =>
                        (b.document_version || 1) - (a.document_version || 1) ||
                        new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
                );
                const latestDoc = invoices[0];
                await axios.post(
                    `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/update_document`,
                    { id: latestDoc.id, client_id: clientId, payment_status: 'Paid', status: 'Issued' },
                    { headers }
                );
            }

            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                { id: orderId, status: 'served', invoice_status: 'paid' },
                { headers }
            );

            const tableObj = tables.find(t => t.id === tableId);
            if (tableObj) {
                await axios.post(
                    `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                    {
                        id: tableId,
                        client_id: clientId,
                        name: tableObj.name || `Table ${tableId}`,
                        table_type: String(tableObj.table_type || 'Regular'),
                        status: 'vacant',
                        location_zone: tableObj.location_zone || 'Main',
                    },
                    { headers }
                );
            }

            toast.success('Payment confirmed! Table is now free.');
            await fetchTables();
        } catch (err) {
            console.error('[handleConfirmPaymentFromGrid]', err);
            toast.error('Failed to confirm payment');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Bill / Invoice
    // ─────────────────────────────────────────────────────────────────────────

    const combineDuplicateItems = (items) => {
        const m = new Map();
        items.forEach(item => {
            const k = item.item_id.toString();
            if (m.has(k)) m.get(k).quantity += item.quantity || 0;
            else m.set(k, { ...item });
        });
        return Array.from(m.values());
    };

    const fetchBillingDocumentForOrder = async (orderId) => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { client_id: clientId },
                }
            );
            const invoices = (res.data?.data || []).filter(
                d => d.order_id?.toString() === orderId?.toString()
            );
            if (!invoices.length) return null;
            invoices.sort(
                (a, b) =>
                    (b.document_version || 1) - (a.document_version || 1) ||
                    new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
            );
            return invoices[0];
        } catch {
            return null;
        }
    };

    const handlePrintBill = async (orderId) => {
        try {
            setLoading(true);
            const r = await axios.get(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const order = (r.data?.data || []).find(o => o.id === orderId);
            if (!order) { toast.error('Order not found'); return; }

            const enriched = (order.items || []).map(item => {
                const inv = inventoryMap[item.item_id] || {};
                return {
                    ...item,
                    unit_price: item.unit_price ?? inv.unit_price ?? 0,
                    name: item.item_name ?? inv.name ?? 'Unnamed Item',
                };
            });

            const deduplicatedItems = deduplicateOrderItems(enriched);

            const billingDoc = await fetchBillingDocumentForOrder(orderId);
            setInvoiceOrderData({
                ...order,
                items: deduplicatedItems,
                customer_id: billingDoc?.customer_id || order.customer_id || '',
                contact_phone: billingDoc?.contact_phone || order.contact_phone || '',
                contact_email: billingDoc?.contact_email || order.contact_email || '',
            });
            setInvoiceModalOpen(true);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load order');
        } finally {
            setLoading(false);
        }
    };

    const handleBillFromCart = async () => {
        if (!activeOrderId) { toast.error('No active order'); return; }
        try {
            setLoading(true);
            const r = await axios.get(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const order = (r.data?.data || []).find(o => o.id === activeOrderId);
            if (!order) { toast.error('Order not found'); return; }

            const enriched = (order.items || []).map(item => {
                const inv = inventoryMap[item.item_id] || {};
                return {
                    ...item,
                    unit_price: item.unit_price ?? inv.unit_price ?? 0,
                    name: item.item_name ?? inv.name ?? 'Unnamed',
                };
            });

            const deduplicatedItems = deduplicateOrderItems(enriched);

            const billingDoc = await fetchBillingDocumentForOrder(activeOrderId);
            setInvoiceOrderData({
                ...order,
                items: deduplicatedItems,
                customer_id: customerDetails.customer_id || getUserIdFromToken(token) || "",
                contact_phone: customerDetails.contact_phone || billingDoc?.contact_phone || order.contact_phone || '',
                contact_email: billingDoc?.contact_email || order.contact_email || '',
            });
            setInvoiceModalOpen(true);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load order');
        } finally {
            setLoading(false);
        }
    };

    // Close handler for the invoice modal (same behaviour as the original inline onClose)
    const closeInvoice = () => {
        setInvoiceModalOpen(false);
        setInvoiceOrderData(null);
        fetchTables();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Public API of the hook
    // ─────────────────────────────────────────────────────────────────────────

    return {
        // view / mode
        currentView, orderMode, setOrderMode,

        // data
        tables, takeawayTables, tableOrders, draftTableIds, menuItems,
        categoriesFlat, sidebarCategories, inventoryMap, loading,

        // order context
        selectedTable, setSelectedTable,
        dineinTableId, takeawayTableId, setTakeawayTableId,
        activeOrderId, activeDineinOrderId, zoneConfigId,

        // cart
        cart, showCart, setShowCart,
        oldItems, newItems, groupedNewItems, batchTimestamps,
        canPlaceOrder, isPlacingOrder, draftSavedAt, getTotalPrice,

        // customer
        customerDetails, customerAddresses, selectedAddressId, setSelectedAddressId,

        // filters / menu
        filteredItems, selectedCategoryId, setSelectedCategoryId,
        searchQuery, setSearchQuery, searchInputRef,
        selectedDietary, setSelectedDietary, dietaryOptions, dietaryColorMap,
        isComboCategoryId, selectedCategoryName,

        // modal state (kept here so handlers can open/close them)
        modals: {
            cancelOrder: [cancelOrderModal, setCancelOrderModal],
            payConfirm: [tablePayConfirmModal, setTablePayConfirmModal],
            oldItemDelete: [oldItemDeleteModal, setOldItemDeleteModal],
            lineItems: { open: lineItemsModalOpen, mainItem: selectedMainItem, items: lineItemsDetails },
            transfer: [showTransferModal, setShowTransferModal],
            takeaway: [showTakeawayOrdersModal, setShowTakeawayOrdersModal],
            clearConfirm: [showClearConfirm, setShowClearConfirm],
            stockWarning: [stockWarning, setStockWarning],
            invoice: { open: invoiceModalOpen, data: invoiceOrderData },
        },

        // handlers
        handleTableSelect, handleTakeawaySelect, handleTakeawayOrderSelected,
        handleViewOrder, handleBackToTables, handleTransferTable,
        handleItemClick, handleAddMainItemOnly, handleAddMainItemWithSelectedAddons, closeLineItems,
        updateQuantity, removeFromCart,
        handleOldItemRequestDelete, handleOldItemRemoveOne, handleOldItemRemoveAll,
        handlePlaceOrder, handleSaveDraft, handleClearCart, confirmClearCart,
        handleCancelOrder, handleMarkAsServed, handleConfirmPaymentFromGrid,
        handlePrintBill, handleBillFromCart, closeInvoice, fetchTables,
    };
}