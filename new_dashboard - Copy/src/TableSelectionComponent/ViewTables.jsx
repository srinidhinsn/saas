

//
//

// //

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useTheme } from "../ThemeChangerComponent/ThemeContext";
// import OrderForm from "../OrderComponents/OrderForm";
// import { useNavigate, useParams } from "react-router-dom";
// import { FiSearch } from "react-icons/fi"; import { useSearchParams } from "react-router-dom";


// const ViewTables = ({ onOrderUpdate, clientId }) => {
//     const { darkMode } = useTheme();
//     const navigate = useNavigate();
//     const { tableId } = useParams();

//     const [tables, setTables] = useState([]);
//     const [selectedTable, setSelectedTable] = useState(null);
//     const [categories, setCategories] = useState([]);
//     const [items, setItems] = useState([]);
//     const [activeCategory, setActiveCategory] = useState(null);
//     const [searchTerm, setSearchTerm] = useState("");
//     const [viewMode, setViewMode] = useState("table");
//     const [modeHistory, setModeHistory] = useState([]);

//     useEffect(() => {
//         if (modeHistory[modeHistory.length - 1] !== viewMode) {
//             setModeHistory(prev => [...prev, viewMode]);
//         }
//     }, [viewMode]);
//     useEffect(() => {
//         const handlePopState = (event) => {
//             if (modeHistory.length > 1) {
//                 event.preventDefault();
//                 const newHistory = [...modeHistory];
//                 newHistory.pop();
//                 const previousMode = newHistory[newHistory.length - 1];
//                 setModeHistory(newHistory);
//                 setViewMode(previousMode);
//             } else {
//                 navigate(-1);
//             }
//         };

//         window.addEventListener("popstate", handlePopState);

//         return () => {
//             window.removeEventListener("popstate", handlePopState);
//         };
//     }, [modeHistory]);
//     useEffect(() => {
//         if (!clientId) return;
//         axios.get(`http://localhost:8000/api/v1/${clientId}/tables`).then(res => setTables(res.data));
//         axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories`).then(res => {
//             setCategories(res.data);
//             setActiveCategory(res.data[0]?.id || null);
//         });
//         axios.get(`http://localhost:8000/api/v1/${clientId}/menu/items`).then(res => setItems(res.data));
//     }, [clientId]);

//     useEffect(() => {
//         if (tableId) {
//             document.body.classList.add("sidebar-minimized");
//         } else {
//             document.body.classList.remove("sidebar-minimized");
//         }
//     }, [tableId]);

//     useEffect(() => {
//         if (tableId && tables.length > 0) {
//             const table = tables.find(t => t.id.toString() === tableId);
//             setSelectedTable(table || null);
//         } else {
//             setSelectedTable(null);
//         }
//     }, [tableId, tables]);

//     const uniqueZones = Array.from(new Set(tables.map(t => t.location_zone))).filter(Boolean);

//     const handleItemClick = (item) => {
//         document.dispatchEvent(new CustomEvent("add-item", { detail: { item } }));
//     };

//     const getItemClass = (item) => {
//         const name = item.name.toLowerCase();
//         if (name.includes("egg")) return "item-card egg";
//         if (["chicken", "mutton", "fish", "keema"].some(w => name.includes(w))) return "item-card non-veg";
//         if (["veg", "paneer", "dal", "juice", "drinks"].some(w => name.includes(w))) return "item-card veg";
//         return "item-card";
//     };

//     const getFilteredItems = () => {
//         return items.filter(
//             i => i.category_id === activeCategory &&
//                 i.name.toLowerCase().includes(searchTerm.toLowerCase())
//         );
//     };

//     const openModeAsTable = (mode) => {
//         document.body.classList.add("sidebar-minimized");
//         setSelectedTable({
//             id: mode,
//             table_number: mode === "pickup" ? "Pickup" : "Delivery",
//             mode: mode === "pickup" ? "Pick Up" : "Delivery"
//         });
//         setViewMode(mode);
//     };

//     return (
//         <div className={`view-tables-wrapper ${darkMode ? "dark" : "light"}`}>
//             {!selectedTable && (
//                 <div className="viewmode-tabs">
//                     <button
//                         className={viewMode === "table" ? "active" : ""}
//                         onClick={() => {
//                             setViewMode("table");
//                             setSelectedTable(null);
//                         }}
//                     >
//                         Table
//                     </button>
//                     <button
//                         className={viewMode === "pickup" ? "active" : ""}
//                         onClick={() => openModeAsTable("pickup")}
//                     >
//                         Pickup
//                     </button>
//                     <button
//                         className={viewMode === "delivery" ? "active" : ""}
//                         onClick={() => openModeAsTable("delivery")}
//                     >
//                         Delivery
//                     </button>
//                 </div>
//             )}

//             {!selectedTable && (
//                 <div className="tables-view">
//                     <h2>Table Reservation</h2>
//                     {uniqueZones.map(zone => (
//                         <div className="zone-group" key={zone}>
//                             <h3 className="zone-title">{zone}</h3>
//                             <div className="zone-section">
//                                 {tables.filter(t => t.location_zone === zone).map(table => (
//                                     <div
//                                         key={table.id}
//                                         className="table-card"
//                                         onClick={() => navigate(`/view-tables/${table.id}`)}
//                                     >
//                                         <div className="table-number">{table.table_number}</div>
//                                         <div className="table-status">{table.status}</div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             )}

//             {selectedTable && (
//                 <div className="order-overlay">
//                     <div className="order-content">
//                         <div className="category-pane full-height">
//                             <div className="search-bar">
//                                 <FiSearch className="search-icon" />
//                                 <input
//                                     type="text"
//                                     placeholder="Search items..."
//                                     value={searchTerm}
//                                     onChange={(e) => setSearchTerm(e.target.value)}
//                                 />
//                             </div>
//                             <ul className="category-list">
//                                 {categories.map(cat => (
//                                     <li
//                                         key={cat.id}
//                                         className={cat.id === activeCategory ? "active" : ""}
//                                         onClick={() => setActiveCategory(cat.id)}
//                                     >
//                                         {cat.name}
//                                     </li>
//                                 ))}
//                             </ul>
//                         </div>

//                         <div className="item-pane">
//                             <div className="items-grid">
//                                 {getFilteredItems().map(item => (
//                                     <div
//                                         key={item.id}
//                                         className={getItemClass(item)}
//                                         onClick={() => handleItemClick(item)}
//                                     >
//                                         <div className="item-name">{item.name}</div>
//                                         <div className="item-price">₹{item.price}</div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>

//                         <div className="order-section">
//                             <OrderForm
//                                 table={selectedTable}
//                                 mode={selectedTable.mode || "Dine In"}
//                                 onOrderCreated={(latestOrder) => {
//                                     navigate('/view-tables');
//                                     axios.get(`http://localhost:8000/api/v1/${clientId}/tables`).then(res => setTables(res.data));
//                                     onOrderUpdate?.(latestOrder);
//                                     setSelectedTable(null);
//                                     setViewMode("table");
//                                     document.body.classList.remove("sidebar-minimized");
//                                 }}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default ViewTables;



//
//



// import React, { useEffect, useState } from "react";
// import { useTheme } from "../ThemeChangerComponent/ThemeContext";
// import OrderForm from "../OrderComponents/OrderForm";
// import { useNavigate, useParams, useSearchParams } from "react-router-dom";
// import { FiSearch } from "react-icons/fi";
// import api from '../PortExportingPage/api'

// const ViewTables = ({ onOrderUpdate, clientId }) => {
//     const { darkMode } = useTheme();
//     const navigate = useNavigate();
//     const { tableId } = useParams();
//     const [searchParams, setSearchParams] = useSearchParams();
//     const modeFromParams = searchParams.get("mode") || "table";

//     const [tables, setTables] = useState([]);
//     const [selectedTable, setSelectedTable] = useState(null);
//     const [categories, setCategories] = useState([]);
//     const [items, setItems] = useState([]);
//     const [activeCategory, setActiveCategory] = useState(null);
//     const [searchTerm, setSearchTerm] = useState("");

//     useEffect(() => {
//         if (!clientId) return;

//         api.get(`/${clientId}/tables`).then(res => setTables(res.data));

//         api.get(`/${clientId}/menu/categories`).then(res => {
//             const allCategory = { id: "all", name: "All" }; // fake one for UI filter
//             const filteredCategories = res.data.filter(cat => cat.name.toLowerCase() !== "all"); // remove real All
//             setCategories([allCategory, ...filteredCategories]);
//             setActiveCategory("all");
//         });


//         api.get(`/${clientId}/menu/items`).then(res => setItems(res.data));
//     }, [clientId]);


//     useEffect(() => {
//         if (tableId) {
//             document.body.classList.add("sidebar-minimized");
//         } else {
//             document.body.classList.remove("sidebar-minimized");
//         }
//     }, [tableId]);

//     useEffect(() => {
//         if (tableId && tables.length > 0) {
//             const table = tables.find(t => t.id.toString() === tableId);
//             setSelectedTable(table || null);
//         } else if (modeFromParams !== "table") {
//             setSelectedTable({
//                 id: modeFromParams,
//                 table_number: modeFromParams === "pickup" ? "Pickup" : "Delivery",
//                 mode: modeFromParams === "pickup" ? "Pick Up" : "Delivery"
//             });
//             document.body.classList.add("sidebar-minimized");
//         } else {
//             setSelectedTable(null);
//         }
//     }, [tableId, tables, modeFromParams]);

//     const uniqueZones = Array.from(new Set(tables.map(t => t.location_zone))).filter(Boolean);

//     const handleItemClick = (item) => {
//         document.dispatchEvent(new CustomEvent("add-item", { detail: { item } }));
//     };

//     const getItemClass = (item) => {
//         const name = item.name.toLowerCase();
//         if (name.includes("egg")) return "item-card egg";
//         if (["chicken", "mutton", "fish", "keema"].some(w => name.includes(w))) return "item-card non-veg";
//         if (["veg", "paneer", "dal", "juice", "drinks"].some(w => name.includes(w))) return "item-card veg";
//         return "item-card";
//     };

//     const getFilteredItems = () => {
//         if (activeCategory === "all") {
//             return items.filter(i =>
//                 i.name.toLowerCase().includes(searchTerm.toLowerCase())
//             );
//         }

//         return items.filter(
//             i =>
//                 i.category_id === activeCategory &&
//                 i.name.toLowerCase().includes(searchTerm.toLowerCase())
//         );
//     };


//     const handleModeClick = (mode) => {
//         setSearchParams({ mode });
//     };

//     return (
//         <div className={`view-tables-wrapper ${darkMode ? "dark" : "light"}`}>
//             {!selectedTable && (
//                 <div className="viewmode-tabs">
//                     <button
//                         className={modeFromParams === "table" ? "active" : ""}
//                         onClick={() => setSearchParams({})}
//                     >
//                         Table
//                     </button>
//                     <button
//                         className={modeFromParams === "pickup" ? "active" : ""}
//                         onClick={() => handleModeClick("pickup")}
//                     >
//                         Pickup
//                     </button>
//                     <button
//                         className={modeFromParams === "delivery" ? "active" : ""}
//                         onClick={() => handleModeClick("delivery")}
//                     >
//                         Delivery
//                     </button>
//                 </div>
//             )}

//             {!selectedTable && (
//                 <div className="tables-view">
//                     <h2>Table Reservation</h2>
//                     {uniqueZones.map(zone => (
//                         <div className="zone-group" key={zone}>
//                             <h3 className="zone-title">{zone}</h3>
//                             <div className="zone-section">

//                                 {tables.filter(t => t.location_zone === zone).map(table => (
//                                     <div
//                                         key={table.id}
//                                         className="table-card"
//                                         onClick={() => navigate(`/view-tables/${table.id}`)}
//                                     >
//                                         <div className="table-number">{table.table_number}</div>
//                                         {/* <div className="table-status">{table.status}</div> */}
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             )}

//             {selectedTable && (
//                 <div className="order-overlay">
//                     <div className="order-content">
//                         <div className="category-pane full-height">
//                             <div className="search-bar">
//                                 <FiSearch className="search-icon" />
//                                 <input
//                                     type="text"
//                                     placeholder="Search items..."
//                                     value={searchTerm}
//                                     onChange={(e) => setSearchTerm(e.target.value)}
//                                 />
//                             </div>
//                             <ul className="category-list">


//                                 {categories.map(cat => (
//                                     <li
//                                         key={cat.id}
//                                         className={cat.id === activeCategory ? "active" : ""}
//                                         onClick={() => setActiveCategory(cat.id)}
//                                     >
//                                         {cat.name}
//                                     </li>
//                                 ))}
//                             </ul>
//                         </div>

//                         <div className="item-pane">
//                             <div className="items-grid">
//                                 {getFilteredItems().map(item => (
//                                     <div
//                                         key={item.id}
//                                         className={getItemClass(item)}
//                                         onClick={() => handleItemClick(item)}
//                                     >
//                                         <div className="item-name">{item.name}</div>
//                                         <div className="item-price">₹{item.price}</div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>

//                         <div className="order-section">
//                             <OrderForm
//                                 table={selectedTable}
//                                 mode={selectedTable.mode || "Dine In"}
//                                 onOrderCreated={(latestOrder) => {
//                                     navigate('/view-tables');
//                                     setSearchParams({});
//                                     api.get(`/${clientId}/tables`).then(res => setTables(res.data));
//                                     onOrderUpdate?.(latestOrder);
//                                     setSelectedTable(null);
//                                     document.body.classList.remove("sidebar-minimized");
//                                 }}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default ViewTables;


// 




import React, { useEffect, useState } from "react";
import { useTheme } from "../ThemeChangerComponent/ThemeContext";
import OrderForm from "../OrderComponents/OrderForm";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import api from '../PortExportingPage/api'
import axios from "axios";


const ViewTables = ({ onOrderUpdate }) => {
    const { darkMode } = useTheme();
    const navigate = useNavigate();
    const { tableId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const modeFromParams = searchParams.get("mode") || "table";
    const { clientId } = useParams();
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const token = localStorage.getItem("access_token");
    useEffect(() => {
        if (!clientId) return;

        axios.get(`http://localhost:8001/saas/${clientId}/tables/read`, {
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


        // Fetch menu categories
        axios.get(`http://localhost:8002/saas/${clientId}/inventory/read_category`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(res => {
                const allCategory = { id: "all", name: "All" };
                const filteredCategories = res.data.data.filter(cat => cat.name?.toLowerCase() !== "all");
                setCategories([allCategory, ...filteredCategories]);
                setActiveCategory("all");
            })

            .catch(err => console.error("❌ Error fetching categories:", err));

        // Fetch menu items
        axios.get(`http://localhost:8002/saas/${clientId}/inventory/read`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(res => {
                const rawItems = res.data.data;
                console.log("Fetched items full:", rawItems);

                const enrichedItems = rawItems.map((item, index) => ({
                    ...item,
                    category: index % 2 === 0 ? "Rice" : "Gravy"
                }));

                setItems(enrichedItems);
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


    const uniqueZones = Array.from(new Set(tables.map(t => t.location_zone))).filter(Boolean);

    const handleItemClick = (item) => {
        document.dispatchEvent(new CustomEvent("add-item", { detail: { item } }));
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
                i.category?.toLowerCase() === activeCategory.toLowerCase() &&
                i.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };






    const handleModeClick = (mode) => {
        setSearchParams({ mode });
    };

    return (
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
                        <div className="category-pane full-height">
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
                                    <li
                                        key={cat.id}
                                        className={cat.name === activeCategory ? "active" : ""}
                                        onClick={() => setActiveCategory(cat.name)} // ✅ use name
                                    >
                                        {cat.name}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="item-pane">
                            <div className="items-grid">
                                {getFilteredItems().map(item => (
                                    <div
                                        key={item.id}
                                        className={getItemClass(item)}
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <div className="item-name">{item.name}</div>
                                        <div className="item-price">₹{item.price}</div>
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
                                    axios
                                        .get(`http://localhost:8001/saas/${clientId}/tables/read`, {
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewTables;
