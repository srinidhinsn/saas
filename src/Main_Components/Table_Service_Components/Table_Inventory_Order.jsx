import React, { useEffect, useState } from "react";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import OrderForm from "../Order_Service_Components/OrderForm";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import axios from 'axios';
import { FaCheck, FaUsers, FaClock, FaChartLine } from "react-icons/fa";
import { toast } from 'react-toastify';

const Table_Inventory_Order = ({ onOrderUpdate }) => {
    const { darkMode } = useTheme();
    const navigate = useNavigate();
    const { tableId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const modeFromParams = searchParams.get("mode") || "table";
    const { clientId } = useParams();//useParams() hook in React (specifically from React Router) is used to access URL parameters defined in your application's routes.
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [menuItems, setMenuItems] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState({});




    const token = localStorage.getItem("access_token");

    const available = tables.filter(t => t.status === 'Vacant').length;
    const occupied = tables.filter(t => t.status === 'Occupied').length;
    const reserved = tables.filter(t => t.status === 'Reserved').length;
    const total = tables.length;
    const [tableIds, setTableId] = useState(null)
    useEffect(() => {
        if (tableIds) {
            document.body.classList.add("sidebar-minimized");
        } else {
            document.body.classList.remove("sidebar-minimized");
        }
    }, [tableIds]);
    useEffect(() => {
        if (!clientId) return;

        axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
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



        axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(res => {
                const rawItems = res.data.data;
                console.log("Fetched items full:", rawItems);

                axios.all([
                    axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=dietery`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ])
                    .then(axios.spread((catRes, itemRes) => {
                        const allCategory = { id: "all", name: "All", level: 0 };
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


                        setActiveCategory("all");

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

            })
            .catch(err => console.error("❌ Error fetching menu items:", err));

    }, [clientId]);

    useEffect(() => {
        if (tableId) {
            document.body.classList.add("sidebar-minimized");
        } else {
            document.body.classList.remove("sidebar-minimized");
        }
    }, [tableId]);

    useEffect(() => {
        if (tableId && tables.length > 0) {
            const table = tables.find(t => t.id.toString() === tableId);
            setSelectedTable(table || null);
        } else {
            const isPickup = modeFromParams === "pickup";
            const isDelivery = modeFromParams === "delivery";

            if (isPickup || isDelivery) {
                setSelectedTable({
                    id: modeFromParams,
                    table_number: isPickup ? "Pickup" : "Delivery",
                    mode: isPickup ? "Pick Up" : "Delivery"
                });
                document.body.classList.add("sidebar-minimized");
            } else {
                setSelectedTable(null);
            }
        }
    }, [tableId, tables, modeFromParams]);

    // useEffect(() => {
    //     axios.all([
    //         inventoryServicesPort.get(`/${clientId}/inventory/read_category?category_id=dietery`, {
    //             headers: { Authorization: `Bearer ${token}` },
    //         }),
    //         inventoryServicesPort.get(`/${clientId}/inventory/read`, {
    //             headers: { Authorization: `Bearer ${token}` },
    //         }),
    //     ])
    //         .then(axios.spread((catRes, itemRes) => {
    //             const allCategory = { id: "all", name: "All" };
    //             const categoryList = catRes.data.data.filter(c => c.name?.toLowerCase() !== "all");
    //             setCategories([allCategory, ...categoryList]);
    //             setActiveCategory("all");

    //             const enriched = itemRes.data.data.map(item => {
    //                 const cat = categoryList.find(c => c.id === item.category_id);
    //                 return {
    //                     ...item,
    //                     category: cat ? cat.name : "Uncategorized"
    //                 };
    //             });

    //             setItems(enriched);
    //         }))

    // }, []);

    const groupedItems = categories.map(cat => ({
        categoryName: cat.name,
        items: items.filter(item => item.category_id === cat.id)
    }));


    const uniqueZones = Array.from(
        new Set(
          tables
            .filter(t => ["vacant", "available"].includes(t.status?.trim().toLowerCase()))
            .map(t => t.location_zone)
        )
      ).filter(Boolean);
      


    // const handleItemClick = (item) => {
    //     let addonItems = [];

    //     // Treat line_item_id as an array
    //     const addonIds = Array.isArray(item.line_item_id) ? item.line_item_id : [];

    //     console.log("Item clicked:", item);
    //     console.log("Add-on IDs:", addonIds);

    //     addonIds.forEach(id => {
    //         const addon = items.find(m => String(m.id) === String(id));
    //         if (addon) {
    //             const confirmAddon = window.confirm(`Do you want to add the add-on: ${addon.name}?`);
    //             if (confirmAddon) {
    //                 addonItems.push(addon);
    //             }
    //         }
    //     });

    //     console.log("Final selected add-ons:", addonItems);

    //     // Dispatch main item + all confirmed addons
    //     document.dispatchEvent(new CustomEvent("add-item", {
    //         detail: { item, addonItems }
    //     }));
    // };

    const handleItemClick = (item) => {
        let addonItems = [];

        // Treat line_item_id as an array of IDs
        const addonIds = Array.isArray(item.line_item_id) ? item.line_item_id : [];

        // Get all matching add-on items directly (no confirmation)
        addonItems = addonIds
            .map(id => items.find(m => String(m.id) === String(id)))
            .filter(Boolean);  // remove any null/undefined

        // Dispatch item + all found add-ons
        document.dispatchEvent(new CustomEvent("add-item", {
            detail: { item, addonItems }
        }));
    };


    const fetchTables = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data?.data) {
                setTables(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching tables", error);
        }
    };


    const getItemClass = (item) => {
        const name = item.name.toLowerCase();
        if (name.includes("egg")) return "item-card egg";
        if (["chicken", "mutton", "fish", "keema"].some(w => name.includes(w))) return "item-card non-veg";
        if (["veg", "paneer", "dal", "juice", "drinks"].some(w => name.includes(w))) return "item-card veg";
        return "item-card";
    };
    const getFilteredItems = () => {
        if (activeCategory?.toLowerCase() === "all") {
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

    // const handleModeClick = (mode) => {
    //     setSearchParams({ mode });
    // };

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


    const CategoryNode = ({
        category,
        categories,
        expandedCategories,
        setExpandedCategories,
        activeCategory,
        setActiveCategory,
    }) => {
        const toggleExpand = (e) => {
            e.stopPropagation();
            setExpandedCategories(prev => ({
                ...prev,
                [category.id]: !prev[category.id],
            }));
        };

        const children = categories.filter(c => c.parentId === category.id);

        return (
            <>
                <li
                    className={`category-item ${activeCategory === category.name ? "active" : ""}`}
                    style={{ paddingLeft: `${category.level * 20}px` }}
                    onClick={() => setActiveCategory(category.name)}
                >
                    {/* Arrow only if subcategories exist */}
                    {category.name}
                    {category.hasChildren && (
                        <span
                            onClick={toggleExpand}
                            style={{ cursor: "pointer", marginRight: "5px" }}
                        >
                            {expandedCategories[category.id] ? "▼" : "▶"}
                        </span>
                    )}

                </li>

                {/* Render children only if expanded */}
                {expandedCategories[category.id] &&
                    children.map(child => (
                        <CategoryNode
                            key={child.id}
                            category={child}
                            categories={categories}
                            expandedCategories={expandedCategories}
                            setExpandedCategories={setExpandedCategories}
                            activeCategory={activeCategory}
                            setActiveCategory={setActiveCategory}
                        />
                    ))}
            </>
        );
    };


    return (
        <div className="Table-Selection-container">

            <div className={`view-tables-wrapper ${darkMode ? "dark" : "light"}`}>
  {!selectedTable && (  <>
                        <div className="tm-stats-grid">
                            <div className="tm-stats-card">
                                <div className="tm-stats-flex">
                                    <div className="tm-stats-icon-bg tm-stats-icon-green">
                                        <FaCheck className="tm-icon-available" />
                                    </div>
                                    <div className="tm-stats-text-group">
                                        <p className="tm-stats-label">Available</p>
                                        <p className="tm-stats-value">{available}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="tm-stats-card">
                                <div className="tm-stats-flex">
                                    <div className="tm-stats-icon-bg tm-stats-icon-blue">
                                        <FaUsers className="tm-icon-occupied" />
                                    </div>
                                    <div className="tm-stats-text-group">
                                        <p className="tm-stats-label">Occupied</p>
                                        <p className="tm-stats-value">{occupied}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="tm-stats-card">
                                <div className="tm-stats-flex">
                                    <div className="tm-stats-icon-bg tm-stats-icon-yellow">
                                        <FaClock className="tm-icon-reserved" />
                                    </div>
                                    <div className="tm-stats-text-group">
                                        <p className="tm-stats-label">Reserved</p>
                                        <p className="tm-stats-value">{reserved}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="tm-stats-card">
                                <div className="tm-stats-flex">
                                    <div className="tm-stats-icon-bg tm-stats-icon-purple">
                                        <FaChartLine className="tm-icon-total" />
                                    </div>
                                    <div className="tm-stats-text-group">
                                        <p className="tm-stats-label">Total Tables</p>
                                        <p className="tm-stats-value">{total}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="tables-view">
                            <h2>Table Creation</h2>
                            {uniqueZones.map(zone => (
                                <div className="zone-group" key={zone}>
                                    <h3 className="zone-title">{zone}</h3>
                                    <div className="zone-section">
                                    {tables
  .filter(
    (t) =>
      t.location_zone === zone &&
      ["vacant", "available"].includes(t.status?.trim().toLowerCase())
  )
  .map((table) => (
    <div
      key={table.id}
      className="table-card"
      onClick={() => navigate(`${table.id}`)}
    >
      <div className="table-number">{table.table_number}</div>
      <div className={`table-status-label tm-status-card-${table.status?.toLowerCase()}`}>
        {table.status}
      </div>
    </div>
  ))}


                                    </div>
                                </div>
                            ))}
                        </div>
                    </>

                )}

                {selectedTable && (
                    <div className="order-overlay">
                        <div className="order-content">
                            <div className="category-list-container">
                                <div className="search-bar">
                                    <FiSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search items..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <ul className="category-list">
                                    {categories
                                        .filter(cat => !cat.parentId)
                                        .map(cat => (
                                            <CategoryNode
                                                key={cat.id}
                                                category={cat}
                                                categories={categories}
                                                expandedCategories={expandedCategories}
                                                setExpandedCategories={setExpandedCategories}
                                                activeCategory={activeCategory}
                                                setActiveCategory={setActiveCategory}

                                            />
                                        ))}
                                </ul>


                            </div>

                            <div className="item-pane">
                                <div className="grid-layout">
                                    {getFilteredItems().map(item => (
                                        <div
                                            key={item.id}
                                            className="menu-card"
                                            onClick={() => handleItemClick(item)}
                                        >
                                            <h4>{item.name}</h4>
                                            <div className="item-price">₹{item.unit_price}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="order-section">
                                <OrderForm
                                    table={selectedTable}
                                    mode={selectedTable?.mode || "Dine In"}
                                    onOrderCreated={async (latestOrder) => {
                                        try {
                                            if (!selectedTable?.id) {
                                                console.error("❌ No table_id found in selectedTable");
                                                toast.error("No table selected!");
                                                return;
                                            }

                                            const tableObj = tables?.find(t => t.id === selectedTable.id);

                                            await axios.post(
                                                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
                                                {
                                                    id: selectedTable.id,
                                                    client_id: clientId,
                                                    name: tableObj?.name || tablesMap[selectedTable.id] || `Table ${selectedTable.id}`,
                                                    table_type: tableObj?.table_type, // Preserve actual table_type
                                                    status: "Occupied",               // Correct status set to Occupied
                                                    location_zone: tableObj?.location_zone
                                                },
                                                { headers: { Authorization: `Bearer ${token}` } }
                                            );

                                            await fetchTables();

                                            navigate("/view-tables");
                                            setSearchParams({});
                                            setSelectedTable(null);
                                            document.body.classList.remove("sidebar-minimized");

                                            if (latestOrder) {
                                                onOrderUpdate?.({
                                                    ...latestOrder,
                                                    table_id: selectedTable.id,
                                                });
                                            }
                                        } catch (error) {
                                            console.error("❌ Failed to update table status", error);
                                            toast.error("Failed to update table status");
                                        }
                                    }}
                                />


                            </div>


                        </div>
 </div>
                )}
            </div>
        </div>
    );
};

export default Table_Inventory_Order;