import React, { useEffect, useState } from "react";
import { useTheme } from "../../ThemeChangerComponent/ThemeProvider";
import OrderForm from "../Order_Service_Components/OrderForm";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import tableServicesPort from "../../Backend_Port_Files/TableServices";
import inventoryServicesPort from "../../Backend_Port_Files/InventoryServices"; import axios from "axios";



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
    useEffect(() => {
        if (!clientId) return;

        tableServicesPort.get(`/${clientId}/tables/read`, {
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



        // Fetch menu items
        inventoryServicesPort.get(`/${clientId}/inventory/read`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(res => {
                const rawItems = res.data.data;
                console.log("Fetched items full:", rawItems);

                axios.all([
                    inventoryServicesPort.get(`/${clientId}/inventory/read_category`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    inventoryServicesPort.get(`/${clientId}/inventory/read`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ])
                    .then(axios.spread((catRes, itemRes) => {
                        const allCategory = { id: "all", name: "All", level: 0 };
                        const fullTree = catRes.data.data.filter(c => c.name?.toLowerCase() !== "all");

                        // 1. Collect all subcategory IDs
                        const subcategoryIds = new Set();
                        fullTree.forEach(cat => {
                            if (cat.subCategories && cat.subCategories.length > 0) {
                                cat.subCategories.forEach(sub => subcategoryIds.add(sub.id));
                            }
                        });

                        // 2. Filter out categories that are subcategories
                        const topLevelCategories = fullTree.filter(cat => !subcategoryIds.has(cat.id));

                        // 3. Flatten only the top-level categories and their nested children
                        const flatCategories = flattenCategoryTree(topLevelCategories);

                        // 4. Set state
                        setCategories([allCategory, ...flatCategories]);


                        setActiveCategory("all");

                        const enriched = itemRes.data.data.map(item => {
                            const cat = categoryList.find(c => c.id === item.category_id);
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

    useEffect(() => {
        axios.all([
            inventoryServicesPort.get(`/${clientId}/inventory/read_category`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            inventoryServicesPort.get(`/${clientId}/inventory/read`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
        ])
            .then(axios.spread((catRes, itemRes) => {
                const allCategory = { id: "all", name: "All" };
                const categoryList = catRes.data.data.filter(c => c.name?.toLowerCase() !== "all");
                setCategories([allCategory, ...categoryList]);
                setActiveCategory("all");

                const enriched = itemRes.data.data.map(item => {
                    const cat = categoryList.find(c => c.id === item.category_id);
                    return {
                        ...item,
                        category: cat ? cat.name : "Uncategorized"
                    };
                });

                setItems(enriched);
            }))

    }, []);
    const groupedItems = categories.map(cat => ({
        categoryName: cat.name,
        items: menuItems.filter(item => item.category_id === cat.id)
    }));



    const uniqueZones = Array.from(new Set(tables.map(t => t.location_zone))).filter(Boolean);


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

    const handleModeClick = (mode) => {
        setSearchParams({ mode });
    };

    const flattenCategoryTree = (tree, level = 0) => {
        let flatList = [];

        tree.forEach(category => {
            flatList.push({
                id: category.id,
                name: category.name,
                level: level,
            });

            if (category.subCategories && category.subCategories.length > 0) {
                flatList = flatList.concat(flattenCategoryTree(category.subCategories, level + 1));
            }
        });

        return flatList;
    };


    return (
        <div className="Table-Selection-container">
            <div className={`view-tables-wrapper ${darkMode ? "dark" : "light"}`}>
                {!selectedTable && (
                    <div className="viewmode-tabs">
                        <button
                            className={modeFromParams === "table" ? "active" : ""}
                            onClick={() => setSearchParams({})}
                        >
                            Table
                        </button>
                        {/* <button
                        className={modeFromParams === "pickup" ? "active" : ""}
                        onClick={() => handleModeClick("pickup")}
                    >
                        Pickup
                    </button>
                    <button
                        className={modeFromParams === "delivery" ? "active" : ""}
                        onClick={() => handleModeClick("delivery")}
                    >
                        Delivery
                    </button> */}
                    </div>
                )}

                {!selectedTable && (
                    <div className="tables-view">
                        <h2>Table Reservation</h2>
                        {uniqueZones.map(zone => (
                            <div className="zone-group" key={zone}>
                                <h3 className="zone-title">{zone}</h3>
                                <div className="zone-section">

                                    {tables.filter(t => t.location_zone === zone).map(table => (
                                        <div
                                            key={table.id}
                                            className="table-card"
                                            onClick={() => navigate(`${table.id}`)
                                            }

                                        >
                                            <div className="table-number">{table.table_number}</div>
                                            {/* <div className="table-status">{table.status}</div> */}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
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
                                    {categories.map(cat => (
                                        <span
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.name)}
                                            className={`category-item ${activeCategory === cat.name ? "active" : ""}`}
                                            style={{ paddingLeft: `${cat.level * 20}px` }} // 👈 Indent visually
                                        >
                                            {cat.name}
                                        </span>
                                    ))}
                                </ul>

                            </div>

                            <div className="item-pane">
                                <div className="grid-layout">
                                    {getFilteredItems().map(item => (
                                        <div
                                            key={item.id}
                                            className="grids"
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
                                    mode={selectedTable.mode || "Dine In"}
                                    onOrderCreated={(latestOrder) => {
                                        navigate('/view-tables');
                                        setSearchParams({});
                                        tableServicesPort
                                            .get(`/${clientId}/tables/read`, {
                                                headers: {
                                                    Authorization: `Bearer ${token}`,
                                                },
                                            })
                                            .then((res) => {
                                                const responseData = Array.isArray(res.data)
                                                    ? res.data
                                                    : res.data?.data || [];

                                                setTables(responseData);
                                            })
                                            .catch((err) => {
                                                console.error("Failed to fetch tables:", err);
                                                setTables([]); // fallback to empty array
                                            });

                                        onOrderUpdate?.(latestOrder);
                                        setSelectedTable(null);
                                        document.body.classList.remove("sidebar-minimized");
                                    }}
                                />
                            </div>
<<<<<<< HEAD

                        </div>

                  
=======


                        </div>

>>>>>>> 7b9886fa8598048a2053da7cf923406307f6842c

                        {/* <div className="item-pane">
  <div className="grid-layout">
    {activeCategory?.toLowerCase() === "all" ? (
      <>
     
        {categories
          .filter(c => c.id !== "all")
          .map(cat => {
            const catItems = items.filter(item => item.category_id === cat.id)
                                   .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
            if (catItems.length === 0) return null;

            return (
              <React.Fragment key={cat.id}>
               <div className="layout">
                 <div className="grids" style={{ width: "100%", pointerEvents: "none", background: "transparent", boxShadow: "none" }}>
                  <strong>{cat.name}</strong>
                </div>
                {catItems.map(item => (
                  <div key={item.id} className="grids" onClick={() => handleItemClick(item)}>
                    <h4>{item.name}</h4>
                    <div className="item-price">₹{item.unit_price}</div>
                  </div>
                ))}
               </div>
              </React.Fragment>
            );
          })}

        {(() => {
          const uncategorizedItems = items.filter(item => !categories.some(c => c.id === item.category_id) || !item.category_id)
                                          .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

          if (uncategorizedItems.length === 0) return null;

          return (
            <React.Fragment key="uncategorized">
              <div className="grids" style={{ width: "100%", pointerEvents: "none", background: "transparent", boxShadow: "none" }}>
                <strong>Uncategorized</strong>
              </div>
              {uncategorizedItems.map(item => (
                <div key={item.id} className="grids" onClick={() => handleItemClick(item)}>
                  <h4>{item.name}</h4>
                  <div className="item-price">₹{item.unit_price}</div>
                </div>
              ))}
            </React.Fragment>
          );
        })()}
      </>
    ) : (
      getFilteredItems().map(item => (
        <div key={item.id} className="grids" onClick={() => handleItemClick(item)}>
          <h4>{item.name}</h4>
          <div className="item-price">₹{item.unit_price}</div>
        </div>
      ))
    )}
  </div>
</div> */}
<<<<<<< HEAD
=======






>>>>>>> 7b9886fa8598048a2053da7cf923406307f6842c
                    </div>
                )}
            </div>
        </div>
    );
};

export default Table_Inventory_Order;
