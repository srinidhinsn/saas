// import React, { useState, useEffect } from "react";
// import "../styles/Settings.css";

// const Settings = () => {
//     const [activeCategory, setActiveCategory] = useState(null);
//     const [deliveryApps, setDeliveryApps] = useState([{ name: "Swiggy", enabled: true },
//     { name: "Zomato", enabled: true }]);
//     const [newApp, setNewApp] = useState("");
//     const [chargeMode, setChargeMode] = useState("per_km");
//     const [roles, setRoles] = useState(["admin", "receptionist", "manager", "waiter"]);
//     const [newRole, setNewRole] = useState("");
//     const [selectedRole, setSelectedRole] = useState("admin");
//     const [conditionalCharge, setConditionalCharge] = useState("none");

//     const [chargeRates, setChargeRates] = useState({
//         base: 20,
//         over500: 10,
//         customList: []
//     });
//     const handleAddRole = () => {
//         const role = newRole.trim().toLowerCase();
//         if (!role || roles.includes(role)) return;

//         setRoles((prev) => [...prev, role]);
//         setSelectedRole(role);
//         setNewRole("");
//     };
//     const [containerChargeMode, setContainerChargeMode] = useState("per_item");
//     const [containerCharges, setContainerCharges] = useState({ small: 5, large: 10 });
//     const handleAddCustomCharge = () => {
//         const value = parseInt(chargeRates.custom);
//         if (!value || value <= 0) return;

//         setChargeRates((prev) => ({
//             ...prev,
//             customList: [...prev.customList, value],
//             custom: "", // reset input
//         }));

//         setChargeMode(`custom_${value}`); // select newly added radio
//     };

//     useEffect(() => {
//         document.body.classList.add("sidebar-minimized");
//         return () => document.body.classList.remove("sidebar-minimized");
//     }, []);

//     const handleAddDeliveryApp = () => {
//         const appName = newApp.trim();
//         if (appName && !deliveryApps.some(app => app.name.toLowerCase() === appName.toLowerCase())) {
//             setDeliveryApps(prev => [...prev, { name: appName, enabled: true }]);
//             setNewApp("");
//         }
//     };
//     const toggleAppStatus = (index) => {
//         setDeliveryApps(prev =>
//             prev.map((app, i) =>
//                 i === index ? { ...app, enabled: !app.enabled } : app
//             )
//         );
//     };

//     const renderDeliverySettings = () => (
//         <div className="delivery-settings-wrapper">
//             <h3 className="section-title">Existing Delivery Apps</h3>
//             <ul className="delivery-apps-list">
//                 {deliveryApps.map((app, idx) => (
//                     <li key={idx} className="delivery-app-item">
//                         <span>{app.name}</span>
//                         <label className="switch">
//                             <input
//                                 type="checkbox"
//                                 checked={app.enabled}
//                                 onChange={() => toggleAppStatus(idx)}
//                             />
//                             <span className="slider round"></span>
//                         </label>
//                     </li>
//                 ))}
//             </ul>


//             <div className="new-app-section">
//                 <input
//                     type="text"
//                     placeholder="Add New Delivery App"
//                     value={newApp}
//                     onChange={(e) => setNewApp(e.target.value)}
//                 />
//                 <button onClick={handleAddDeliveryApp}>Add App</button>
//             </div>

//             <div className="delivery-config">
//                 <h4>Delivery Charge Mode</h4>
//                 <div className="radio-group">
//                     <label>
//                         <input
//                             type="radio"
//                             name="chargeMode"
//                             value="per_km"
//                             checked={chargeMode === "per_km"}
//                             onChange={() => setChargeMode("per_km")}
//                         />
//                         ₹{chargeRates.base} per KM
//                     </label>

//                     <label>
//                         <input
//                             type="radio"
//                             name="chargeMode"
//                             value="conditional"
//                             checked={chargeMode === "conditional"}
//                             onChange={() => setChargeMode("conditional")}
//                         />
//                         ₹{chargeRates.over500} per KM (if order  ₹500)
//                     </label>

//                     {/* Render all saved custom charges as radio */}
//                     {chargeRates.customList.map((value, index) => (
//                         <label key={index}>
//                             <input
//                                 type="radio"
//                                 name="chargeMode"
//                                 value={`custom_${value}`}
//                                 checked={chargeMode === `custom_${value}`}
//                                 onChange={() => setChargeMode(`custom_${value}`)}
//                             />
//                             ₹{value} per KM (custom)
//                         </label>
//                     ))}

//                     {/* Input for adding new custom */}
//                     <label className="custom-charge-label">
//                         <input
//                             type="radio"
//                             name="chargeMode"
//                             value="custom"
//                             checked={chargeMode === "custom"}
//                             onChange={() => setChargeMode("custom")}
//                         />
//                         Custom:
//                         <input
//                             type="number"
//                             className="inline-charge-input"
//                             placeholder="₹/KM"
//                             value={chargeRates.custom || ""}
//                             onChange={(e) =>
//                                 setChargeRates((prev) => ({
//                                     ...prev,
//                                     custom: e.target.value
//                                 }))
//                             }
//                         />
//                         per KM
//                         <button
//                             className="save-custom-charge-btn"
//                             type="button"
//                             onClick={handleAddCustomCharge}
//                         >
//                             Save
//                         </button>
//                     </label>
//                 </div>


//                 <h4>Container Charge Mode</h4>
//                 <div className="radio-group">
//                     <label>
//                         <input
//                             type="radio"
//                             name="containerMode"
//                             value="per_item"
//                             checked={containerChargeMode === "per_item"}
//                             onChange={() => setContainerChargeMode("per_item")}
//                         />
//                         Per Item
//                     </label>
//                     <label>
//                         <input
//                             type="radio"
//                             name="containerMode"
//                             value="per_order"
//                             checked={containerChargeMode === "per_order"}
//                             onChange={() => setContainerChargeMode("per_order")}
//                         />
//                         Per Order
//                     </label>
//                 </div>

//                 <div className="container-charges">
//                     <div>
//                         <label>Small Container (₹)</label>
//                         <input
//                             type="number"
//                             value={containerCharges.small}
//                             onChange={(e) =>
//                                 setContainerCharges((prev) => ({
//                                     ...prev,
//                                     small: +e.target.value
//                                 }))
//                             }
//                         />
//                     </div>
//                     <div>
//                         <label>Large Container (₹)</label>
//                         <input
//                             type="number"
//                             value={containerCharges.large}
//                             onChange={(e) =>
//                                 setContainerCharges((prev) => ({
//                                     ...prev,
//                                     large: +e.target.value
//                                 }))
//                             }
//                         />
//                     </div>
//                 </div>

//                 <button className="save-btn">Save Settings</button>
//             </div>
//         </div>
//     );
//     const renderNotificationPreferences = () => (
//         <div className="setting-section">
//             <h3>Notification Preferences</h3>
//             <label><input type="checkbox" /> Sound Alerts</label>
//             <label><input type="checkbox" /> Email Notifications</label>
//         </div>
//     );

//     const renderBusinessHours = () => (
//         <div className="setting-section">
//             <h3>Business Hours</h3>
//             {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
//                 <div key={day} className="day-schedule">
//                     <label>{day}</label>
//                     <input type="time" /> to <input type="time" />
//                 </div>
//             ))}
//         </div>
//     );

//     const renderAppearance = () => (
//         <div className="setting-section">
//             <h3>Appearance Settings</h3>
//             <label>Theme:
//                 <select>
//                     <option>Light</option>
//                     <option>Dark</option>
//                 </select>
//             </label>
//             <label>Primary Color: <input type="color" /></label>
//         </div>
//     );

//     const renderInvoiceSettings = () => (
//         <div className="setting-section">
//             <h3>Invoice Settings</h3>
//             <label><input type="checkbox" /> Include GST</label>
//             <label>Invoice Footer Note:
//                 <textarea rows="2" placeholder="Enter invoice note here..."></textarea>
//             </label>
//         </div>
//     );

//     const renderLanguage = () => (
//         <div className="setting-section">
//             <h3>Language</h3>
//             <select>
//                 <option>English</option>
//                 <option>Hindi</option>
//                 <option>Tamil</option>
//                 <option>Kannada</option>
//             </select>
//         </div>
//     );

//     const renderCurrencyFormat = () => (
//         <div className="setting-section">
//             <h3>Currency Format</h3>
//             <select>
//                 <option value="INR">₹ (INR)</option>
//                 <option value="USD">$ (USD)</option>
//                 <option value="EUR">€ (EUR)</option>
//             </select>
//         </div>
//     );

//     const renderDateFormat = () => (
//         <div className="setting-section">
//             <h3>Date Format</h3>
//             <select>
//                 <option value="DD/MM/YYYY">DD/MM/YYYY</option>
//                 <option value="MM/DD/YYYY">MM/DD/YYYY</option>
//                 <option value="YYYY-MM-DD">YYYY-MM-DD</option>
//             </select>
//         </div>
//     );


//     return (
//         <div className="settings-wrapper">
//             <div className="settings-sidebar">
//                 <h2 className="settings-title">Settings</h2>
//                 <button onClick={() => setActiveCategory("delivery-apps")}>Delivery Apps & Charges</button>
//                 <button onClick={() => setActiveCategory("users")}>Add Users</button>
//                 <button onClick={() => setActiveCategory("business-hours")}>Business Hours</button>
//                 <button onClick={() => setActiveCategory("invoice")}>Invoice Settings</button>
//                 <button onClick={() => setActiveCategory("currency")}>Currency Format</button>
//                 <button onClick={() => setActiveCategory("date-format")}>Date Format</button>
//             </div>

//             <div className="settings-main">
//                 {activeCategory === "delivery-apps" && renderDeliverySettings()}
//                 {activeCategory === "users" && (
//                     <div className="user-form-container">
//                         <div className="form-card">
//                             <h3>Add User</h3>
//                             <form className="form-fields">
//                                 <input placeholder="Name" />
//                                 <input placeholder="Number" />
//                                 <input placeholder="Client ID" />

//                                 <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
//                                     {roles.map((role, index) => (
//                                         <option key={index} value={role}>
//                                             {role.charAt(0).toUpperCase() + role.slice(1)}
//                                         </option>
//                                     ))}
//                                 </select>

//                                 <div className="custom-role-input">
//                                     <input
//                                         type="text"
//                                         placeholder="Add New Role"
//                                         value={newRole}
//                                         onChange={(e) => setNewRole(e.target.value)}
//                                     />
//                                     <button
//                                         type="button"
//                                         className="add-role-btn"
//                                         onClick={handleAddRole}
//                                         disabled={!newRole.trim()}
//                                     >
//                                         Add
//                                     </button>
//                                 </div>

//                                 <button
//                                     type="submit"
//                                     style={{
//                                         padding: "10px 15px",
//                                         border: "none",
//                                         borderRadius: "5px",
//                                         background: "#3a86ff",
//                                         color: "white",
//                                         fontWeight: "bold",
//                                         marginTop: "10px",
//                                     }}
//                                 >
//                                     Save User
//                                 </button>
//                             </form>
//                         </div>
//                     </div>
//                 )}
//                 {activeCategory === "notifications" && renderNotificationPreferences()}
//                 {activeCategory === "business-hours" && renderBusinessHours()}
//                 {activeCategory === "appearance" && renderAppearance()}
//                 {activeCategory === "invoice" && renderInvoiceSettings()}
//                 {activeCategory === "language" && renderLanguage()}
//                 {activeCategory === "currency" && renderCurrencyFormat()}
//                 {activeCategory === "date-format" && renderDateFormat()}
//             </div>
//         </div>
//     );
// };

// export default Settings;



// 




// import React, { useState, useEffect } from "react";
// import "../styles/Settings.css";

// const Settings = () => {
//     const [deliveryApps, setDeliveryApps] = useState([
//         { name: "Swiggy", enabled: true },
//         { name: "Zomato", enabled: true }
//     ]);
//     const [newApp, setNewApp] = useState("");
//     const [chargeMode, setChargeMode] = useState("per_km");
//     const [containerChargeMode, setContainerChargeMode] = useState("per_item");
//     const [containerCharges, setContainerCharges] = useState({ small: 5, large: 10 });
//     const [chargeRates, setChargeRates] = useState({
//         base: 20,
//         over500: 10,
//         customList: []
//     });
//     const [roles, setRoles] = useState(["admin", "receptionist", "manager", "waiter"]);
//     const [newRole, setNewRole] = useState("");
//     const [selectedRole, setSelectedRole] = useState("admin");

//     useEffect(() => {
//         document.body.classList.add("sidebar-minimized");
//         return () => document.body.classList.remove("sidebar-minimized");
//     }, []);

//     const handleAddDeliveryApp = () => {
//         const appName = newApp.trim();
//         if (appName && !deliveryApps.some(app => app.name.toLowerCase() === appName.toLowerCase())) {
//             setDeliveryApps(prev => [...prev, { name: appName, enabled: true }]);
//             setNewApp("");
//         }
//     };

//     const toggleAppStatus = (index) => {
//         setDeliveryApps(prev =>
//             prev.map((app, i) =>
//                 i === index ? { ...app, enabled: !app.enabled } : app
//             )
//         );
//     };

//     const handleAddCustomCharge = () => {
//         const value = parseInt(chargeRates.custom);
//         if (!value || value <= 0) return;
//         setChargeRates((prev) => ({
//             ...prev,
//             customList: [...prev.customList, value],
//             custom: ""
//         }));
//         setChargeMode(`custom_${value}`);
//     };

//     const handleAddRole = () => {
//         const role = newRole.trim().toLowerCase();
//         if (!role || roles.includes(role)) return;
//         setRoles((prev) => [...prev, role]);
//         setSelectedRole(role);
//         setNewRole("");
//     };

//     const renderDeliverySettings = () => (
//         <div className="delivery-settings-wrapper">
//             <h3 className="section-title">Delivery Apps & Charges</h3>
//             <ul className="delivery-apps-list">
//                 {deliveryApps.map((app, idx) => (
//                     <li key={idx} className="delivery-app-item">
//                         <span>{app.name}</span>
//                         <label className="switch">
//                             <input
//                                 type="checkbox"
//                                 checked={app.enabled}
//                                 onChange={() => toggleAppStatus(idx)}
//                             />
//                             <span className="slider round"></span>
//                         </label>
//                     </li>
//                 ))}
//             </ul>

//             <div className="new-app-section">
//                 <input
//                     type="text"
//                     placeholder="Add New Delivery App"
//                     value={newApp}
//                     onChange={(e) => setNewApp(e.target.value)}
//                 />
//                 <button onClick={handleAddDeliveryApp}>Add App</button>
//             </div>

//             <div className="delivery-config">
//                 <h4>Delivery Charge Mode</h4>
//                 <div className="radio-group">
//                     <label>
//                         <input
//                             type="radio"
//                             name="chargeMode"
//                             value="per_km"
//                             checked={chargeMode === "per_km"}
//                             onChange={() => setChargeMode("per_km")}
//                         />
//                         ₹{chargeRates.base} per KM
//                     </label>

//                     <label>
//                         <input
//                             type="radio"
//                             name="chargeMode"
//                             value="conditional"
//                             checked={chargeMode === "conditional"}
//                             onChange={() => setChargeMode("conditional")}
//                         />
//                         ₹{chargeRates.over500} per KM (if order ₹500)
//                     </label>

//                     {chargeRates.customList.map((value, index) => (
//                         <label key={index}>
//                             <input
//                                 type="radio"
//                                 name="chargeMode"
//                                 value={`custom_${value}`}
//                                 checked={chargeMode === `custom_${value}`}
//                                 onChange={() => setChargeMode(`custom_${value}`)}
//                             />
//                             ₹{value} per KM (custom)
//                         </label>
//                     ))}

//                     <label className="custom-charge-label">
//                         <input
//                             type="radio"
//                             name="chargeMode"
//                             value="custom"
//                             checked={chargeMode === "custom"}
//                             onChange={() => setChargeMode("custom")}
//                         />
//                         Custom:
//                         <input
//                             type="number"
//                             className="inline-charge-input"
//                             placeholder="₹/KM"
//                             value={chargeRates.custom || ""}
//                             onChange={(e) =>
//                                 setChargeRates((prev) => ({
//                                     ...prev,
//                                     custom: e.target.value
//                                 }))
//                             }
//                         />
//                         per KM
//                         <button
//                             className="save-custom-charge-btn"
//                             type="button"
//                             onClick={handleAddCustomCharge}
//                         >
//                             Save
//                         </button>
//                     </label>
//                 </div>

//                 <h4>Container Charge Mode</h4>
//                 <div className="radio-group">
//                     <label>
//                         <input
//                             type="radio"
//                             name="containerMode"
//                             value="per_item"
//                             checked={containerChargeMode === "per_item"}
//                             onChange={() => setContainerChargeMode("per_item")}
//                         />
//                         Per Item
//                     </label>
//                     <label>
//                         <input
//                             type="radio"
//                             name="containerMode"
//                             value="per_order"
//                             checked={containerChargeMode === "per_order"}
//                             onChange={() => setContainerChargeMode("per_order")}
//                         />
//                         Per Order
//                     </label>
//                 </div>

//                 <div className="container-charges">
//                     <div>
//                         <label>Small Container (₹)</label>
//                         <input
//                             type="number"
//                             value={containerCharges.small}
//                             onChange={(e) =>
//                                 setContainerCharges((prev) => ({
//                                     ...prev,
//                                     small: +e.target.value
//                                 }))
//                             }
//                         />
//                     </div>
//                     <div>
//                         <label>Large Container (₹)</label>
//                         <input
//                             type="number"
//                             value={containerCharges.large}
//                             onChange={(e) =>
//                                 setContainerCharges((prev) => ({
//                                     ...prev,
//                                     large: +e.target.value
//                                 }))
//                             }
//                         />
//                     </div>
//                 </div>

//                 <button className="save-btn">Save Settings</button>
//             </div>
//         </div>
//     );



//     const renderBusinessHours = () => (
//         <div className="setting-section" id="business-section">
//             <h3>Business Hours</h3>
//             {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
//                 <div key={day} className="day-schedule">
//                     <label>{day}</label>
//                     <input type="time" /> to <input type="time" />
//                 </div>
//             ))}
//         </div>
//     );



//     const renderInvoiceSettings = () => (
//         <div className="setting-section" id="invoice-section">
//             <h3>Invoice Settings</h3>
//             <label><input type="checkbox" /> Include GST</label>
//             <label>Invoice Footer Note:
//                 <textarea rows="2" placeholder="Enter invoice note here..."></textarea>
//             </label>
//         </div>
//     );

//     const renderCurrencyFormat = () => (
//         <div className="setting-section" id="currency-section">
//             <h3>Currency Format</h3>
//             <select>
//                 <option value="INR">₹ (INR)</option>
//                 <option value="USD">$ (USD)</option>
//                 <option value="EUR">€ (EUR)</option>
//             </select>
//         </div>
//     );

//     const renderDateFormat = () => (
//         <div className="setting-section" id="date-section">
//             <h3>Date Format</h3>
//             <select>
//                 <option value="DD/MM/YYYY">DD/MM/YYYY</option>
//                 <option value="MM/DD/YYYY">MM/DD/YYYY</option>
//                 <option value="YYYY-MM-DD">YYYY-MM-DD</option>
//             </select>
//         </div>
//     );

//     return (
//         <div className="settings-wrapper">
//             <div className="settings-sidebar">
//                 <h2 className="settings-title">Settings</h2>
//                 <button onClick={() => document.getElementById("delivery-section").scrollIntoView({ behavior: "smooth" })}>Delivery Apps & Charges</button>
//                 <button onClick={() => document.getElementById("users-section").scrollIntoView({ behavior: "smooth" })}>Add Users</button>
//                 <button onClick={() => document.getElementById("business-section").scrollIntoView({ behavior: "smooth" })}>Business Hours</button>
//                 <button onClick={() => document.getElementById("invoice-section").scrollIntoView({ behavior: "smooth" })}>Invoice Settings</button>
//                 <button onClick={() => document.getElementById("currency-section").scrollIntoView({ behavior: "smooth" })}>Currency Format</button>
//                 <button onClick={() => document.getElementById("date-section").scrollIntoView({ behavior: "smooth" })}>Date Format</button>
//             </div>

//             <div className="settings-main">
//                 <div id="delivery-section">{renderDeliverySettings()}</div>

//                 <div id="users-section">
//                     <div className="user-form-container">
//                         <div className="form-card">
//                             <h3>Add User</h3>
//                             <form className="form-fields">
//                                 <input placeholder="Name" />
//                                 <input placeholder="Number" />
//                                 <input placeholder="Client ID" />

//                                 <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
//                                     {roles.map((role, index) => (
//                                         <option key={index} value={role}>
//                                             {role.charAt(0).toUpperCase() + role.slice(1)}
//                                         </option>
//                                     ))}
//                                 </select>

//                                 <div className="custom-role-input">
//                                     <input
//                                         type="text"
//                                         placeholder="Add New Role"
//                                         value={newRole}
//                                         onChange={(e) => setNewRole(e.target.value)}
//                                     />
//                                     <button
//                                         type="button"
//                                         className="add-role-btn"
//                                         onClick={handleAddRole}
//                                         disabled={!newRole.trim()}
//                                     >
//                                         Add
//                                     </button>
//                                 </div>

//                                 <button
//                                     type="submit"
//                                     style={{
//                                         padding: "10px 15px",
//                                         border: "none",
//                                         borderRadius: "5px",
//                                         background: "#3a86ff",
//                                         color: "white",
//                                         fontWeight: "bold",
//                                         marginTop: "10px",
//                                     }}
//                                 >
//                                     Save User
//                                 </button>
//                             </form>
//                         </div>
//                     </div>
//                 </div>

//                 {renderBusinessHours()}
//                 {renderInvoiceSettings()}
//                 {renderCurrencyFormat()}
//                 {renderDateFormat()}
//             </div>
//         </div>
//     );
// };

// export default Settings;



import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Settings.css";

const Settings = () => {
    const [deliveryApps, setDeliveryApps] = useState([]);
    const [newApp, setNewApp] = useState("");
    const [chargeMode, setChargeMode] = useState("per_km");
    const [containerChargeMode, setContainerChargeMode] = useState("per_item");
    const [containerCharges, setContainerCharges] = useState({ small: 5, large: 10 });
    const [pin, setPin] = useState("");
    const [users, setUsers] = useState([]);
    const [name, setName] = useState("");
    const [number, setNumber] = useState("");
    const [clientId, setClientId] = useState("");
    const [permissions, setPermissions] = useState({});

    const [roles, setRoles] = useState(["admin", "receptionist", "manager", "waiter"]);
    const [newRole, setNewRole] = useState("");
    const [selectedRole, setSelectedRole] = useState("admin");

    const [businessEnabled, setBusinessEnabled] = useState(false);
    const [timezone, setTimezone] = useState("UTC+05:30 India Standard Time");
    const [businessHours, setBusinessHours] = useState({
        Monday: { enabled: true, from: "09:00", to: "18:00" },
        Tuesday: { enabled: true, from: "09:00", to: "18:00" },
        Wednesday: { enabled: true, from: "09:00", to: "18:00" },
        Thursday: { enabled: true, from: "09:00", to: "18:00" },
        Friday: { enabled: true, from: "09:00", to: "18:00" },
        Saturday: { enabled: false, from: "09:00", to: "18:00" },
        Sunday: { enabled: false, from: "09:00", to: "18:00" },
    });
    const defaultBusinessHours = {
        Monday: { enabled: true, from: "09:00", to: "18:00" },
        Tuesday: { enabled: true, from: "09:00", to: "18:00" },
        Wednesday: { enabled: true, from: "09:00", to: "18:00" },
        Thursday: { enabled: true, from: "09:00", to: "18:00" },
        Friday: { enabled: true, from: "09:00", to: "18:00" },
        Saturday: { enabled: false, from: "09:00", to: "18:00" },
        Sunday: { enabled: false, from: "09:00", to: "18:00" },
    };

    const [customCharges, setCustomCharges] = useState([]);
    const [newType, setNewType] = useState("order");
    const [newPrice, setNewPrice] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingPrice, setEditingPrice] = useState("");

    const collectSettingsPayload = (updatedDeliveryApps = deliveryApps) => ({
        client_id: clientId,
        delivery_apps: updatedDeliveryApps,
        charge_mode: chargeMode,
        container_charge_mode: containerChargeMode,
        container_charges: containerCharges,
        users,
        permissions,
        roles,
        business_enabled: businessEnabled,
        timezone,
        business_hours: businessHours,
        custom_charges: customCharges
    });

    useEffect(() => {
        document.body.classList.add("sidebar-minimized");

        const storedClientId = localStorage.getItem("clientId");
        if (storedClientId) {
            setClientId(storedClientId ?? "");
            fetchSettings(storedClientId);
        } else {
            console.error("No clientId found in localStorage");
        }

        return () => document.body.classList.remove("sidebar-minimized");
    }, []);

    const fetchSettings = async (cid) => {
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/settings/${cid}`);

            const data = res.data;

            setClientId(data.client_id ?? "");
            setDeliveryApps(data.delivery_apps ?? []);
            setChargeMode(data.charge_mode ?? "per_km");
            setContainerChargeMode(data.container_charge_mode ?? "per_item");
            setContainerCharges(data.container_charges ?? { small: 5, large: 10 });
            setUsers(data.users ?? []);
            setPermissions(data.permissions ?? {});
            setRoles(data.roles ?? ["admin"]);
            setBusinessEnabled(data.business_enabled ?? false);
            setTimezone(data.timezone ?? "UTC+05:30 India Standard Time");
            setBusinessHours(defaultBusinessHours);

            setCustomCharges(data.custom_charges ?? []);
        } catch (err) {
            console.error("Failed to load settings", err);
        }
    };

    const handleSaveSettings = async (overridePayload = null) => {
        const payload = overridePayload || {
            client_id: clientId,
            delivery_apps: deliveryApps,
            charge_mode: chargeMode,
            container_charge_mode: containerChargeMode,
            container_charges: containerCharges,
            users,
            permissions,
            roles,
            business_enabled: businessEnabled,
            timezone,
            business_hours: businessHours,
            custom_charges: customCharges
        };

        try {
            await axios.put(`http://localhost:8000/api/v1/settings/${clientId}`, payload);
        } catch (err) {
            alert("Failed to save settings");
            console.error(err);
        }
    };

    const handleAddDeliveryApp = () => {
        const appName = newApp.trim();
        if (appName && !deliveryApps.some(app => app.name.toLowerCase() === appName.toLowerCase())) {
            const updatedApps = [...deliveryApps, { name: appName, enabled: true }];
            setDeliveryApps(updatedApps);
            setNewApp("");

            // Save to backend immediately
            handleSaveSettings({
                ...collectSettingsPayload(updatedApps)
            });
        }
    };

    const toggleAppStatus = (index) => {
        setDeliveryApps(prev =>
            prev.map((app, i) =>
                i === index ? { ...app, enabled: !app.enabled } : app
            )
        );
    };

    const handleSaveUser = (e) => {
        e.preventDefault();
        const newUser = {
            name: name ?? "",
            number: number ?? "",
            clientId: clientId ?? "",
            role: selectedRole,
            pin: pin ?? ""
        };

        setUsers(prev => [...prev, newUser]);

        setName("");
        setNumber("");
        setClientId("");
        setPin("");
        setSelectedRole("admin");
    };

    const handleDeleteUser = (indexToDelete) => {
        setUsers(prev => prev.filter((_, index) => index !== indexToDelete));
    };

    const handleAddRole = () => {
        const role = newRole.trim().toLowerCase();
        if (!role || roles.includes(role)) return;
        setRoles((prev) => [...prev, role]);
        setSelectedRole(role);
        setNewRole("");
    };

    const handleAddCustomChargeRow = () => {
        if (!newPrice || isNaN(newPrice)) return;
        const updated = [...customCharges, { type: newType, price: parseFloat(newPrice) }];
        setCustomCharges(updated);
        setNewPrice("");
        setNewType("order");

        handleSaveSettings({
            ...collectSettingsPayload(deliveryApps),
            custom_charges: updated
        });
    };

    const handleEditRow = (index) => {
        setEditingIndex(index);
        setEditingPrice(customCharges[index].price?.toString() ?? "");
    };

    const handleSaveEdit = (index) => {
        const updated = [...customCharges];
        updated[index].price = parseFloat(editingPrice);
        setCustomCharges(updated);
        setEditingIndex(null);

        handleSaveSettings({
            ...collectSettingsPayload(deliveryApps),
            custom_charges: updated
        });
    };

    const handleDeleteRow = (index) => {
        const updated = [...customCharges];
        updated.splice(index, 1);
        setCustomCharges(updated);

        handleSaveSettings({
            ...collectSettingsPayload(deliveryApps),
            custom_charges: updated
        });
    };

    const renderDeliverySettings = () => (
        <div className="delivery-settings-wrapper" id="delivery-section">
            <h3 className="section-title">Delivery Apps & Charges</h3>
            <ul className="delivery-apps-list">
                {deliveryApps.map((app, idx) => (
                    <li key={idx} className="delivery-app-item">
                        <span>{app.name}</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={app.enabled ?? false}
                                onChange={() => toggleAppStatus(idx)}
                            />
                            <span className="slider round"></span>
                        </label>
                    </li>
                ))}
            </ul>

            <div className="new-app-section">
                <input
                    type="text"
                    placeholder="Add New Delivery App"
                    value={newApp ?? ""}
                    onChange={(e) => setNewApp(e.target.value)}
                />
                <button onClick={handleAddDeliveryApp}>Add App</button>
            </div>

            <div className="custom-charge-form">
                <h4>Custom Charges</h4>
                <select value={newType ?? "order"} onChange={(e) => setNewType(e.target.value)}>
                    <option value="order">Order</option>
                    <option value="kms">KMs</option>
                </select>
                <input
                    type="number"
                    placeholder="Enter price"
                    value={newPrice ?? ""}
                    onChange={(e) => setNewPrice(e.target.value)}
                />
                <button onClick={handleAddCustomChargeRow}>Add</button>

                <div className="editable-charge-list">
                    {customCharges.map((charge, index) => (
                        <div key={index} className="editable-charge-row">
                            <span className="charge-type">{charge.type?.toUpperCase() ?? ""}</span>
                            {editingIndex === index ? (
                                <>
                                    <input
                                        type="number"
                                        value={editingPrice ?? ""}
                                        onChange={(e) => setEditingPrice(e.target.value)}
                                    />
                                    <button className="save-btn" onClick={() => handleSaveEdit(index)}>Save</button>
                                    <button className="cancel-btn" onClick={() => setEditingIndex(null)}>Cancel</button>
                                </>
                            ) : (
                                <>
                                    <span className="charge-price">₹{charge.price?.toFixed(2) ?? "0.00"}</span>
                                    <button onClick={() => handleEditRow(index)}>Edit</button>
                                    <button onClick={() => handleDeleteRow(index)}>Delete</button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <h4 style={{ margin: '10px', color: 'rgb(166, 165, 165)', fontSize: '.8rem' }}>Container Charge Mode</h4>
            <div className="radio-group">
                <label>
                    <input
                        type="radio"
                        name="containerMode"
                        value="per_item"
                        checked={containerChargeMode === "per_item"}
                        onChange={() => setContainerChargeMode("per_item")}
                    />
                    Per Item
                </label>
                <label>
                    <input
                        type="radio"
                        name="containerMode"
                        value="per_order"
                        checked={containerChargeMode === "per_order"}
                        onChange={() => setContainerChargeMode("per_order")}
                    />
                    Per Order
                </label>
            </div>

            <div className="container-charges">
                {containerChargeMode === "per_order" && (
                    <div>
                        <label>Minimum Order Amount for Container Charges (₹)</label>
                        <input
                            type="number"
                            value={containerCharges.minOrder ?? ""}
                            onChange={(e) =>
                                setContainerCharges((prev) => ({
                                    ...prev,
                                    minOrder: +e.target.value
                                }))
                            }
                        />
                    </div>
                )}

                <div>
                    <label>Small Container (₹)</label>
                    <input
                        type="number"
                        value={containerCharges.small ?? ""}
                        onChange={(e) =>
                            setContainerCharges((prev) => ({
                                ...prev,
                                small: +e.target.value
                            }))
                        }
                    />
                </div>
                <div>
                    <label>Large Container (₹)</label>
                    <input
                        type="number"
                        value={containerCharges.large ?? ""}
                        onChange={(e) =>
                            setContainerCharges((prev) => ({
                                ...prev,
                                large: +e.target.value
                            }))
                        }
                    />
                </div>
            </div>

            <button className="save-btn" onClick={() => handleSaveSettings()}>Save Settings</button>
        </div>
    );

    const renderBusinessHours = () => (
        <div className="setting-section" id="business-section">
            <h3>Business Hours</h3>
            <div className="toggle-row">
                <span>Enable</span>
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={businessEnabled}
                        onChange={() => setBusinessEnabled(!businessEnabled)}
                    />
                    <span className="slider round"></span>
                </label>
            </div>
            <div className="timezone-selector">
                <label>Timezone</label>
                <select value={timezone ?? ""} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="UTC+05:30 India Standard Time">UTC+05:30 India Standard Time</option>
                    <option value="UTC+00:00 GMT">UTC+00:00 GMT</option>
                    <option value="UTC+08:00 Pacific Time">UTC+08:00 Pacific Time</option>
                </select>
            </div>

            {Object.entries(businessHours).map(([day, data]) => (
                <div key={day} className="day-schedule">
                    <label className="day-label">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={data.enabled ?? false}
                                onChange={() =>
                                    setBusinessHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], enabled: !prev[day].enabled }
                                    }))
                                }
                            />
                            <span className="slider round"></span>
                        </label>
                        {day}
                    </label>
                    {data.enabled ? (
                        <>
                            <input
                                type="time"
                                value={data.from ?? ""}
                                onChange={(e) =>
                                    setBusinessHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], from: e.target.value }
                                    }))
                                }
                            />
                            <span>to</span>
                            <input
                                type="time"
                                value={data.to ?? ""}
                                onChange={(e) =>
                                    setBusinessHours(prev => ({
                                        ...prev,
                                        [day]: { ...prev[day], to: e.target.value }
                                    }))
                                }
                            />
                        </>
                    ) : (
                        <span className="closed-label">Closed</span>
                    )}
                </div>
            ))}
        </div>
    );

    const renderInvoiceSettings = () => (
        <div className="setting-section" id="invoice-section">
            <h3>Invoice Settings</h3>
            <label><input type="checkbox" /> Include GST</label>
            <label>Invoice Footer Note:
                <textarea rows="2" placeholder="Enter invoice note here..."></textarea>
            </label>
        </div>
    );

    const renderCurrencyFormat = () => (
        <div className="setting-section" id="currency-section">
            <h3>Currency Format</h3>
            <select>
                <option value="INR">₹ (INR)</option>
                <option value="USD">$ (USD)</option>
                <option value="EUR">€ (EUR)</option>
            </select>
        </div>
    );

    const renderDateFormat = () => (
        <div className="setting-section" id="date-section">
            <h3>Date Format</h3>
            <select>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
        </div>
    );

    return (
        <div className="settings-wrapper">
            <div className="settings-sidebar">
                <h2 className="settings-title">Settings</h2>
                <button onClick={() => document.getElementById("delivery-section").scrollIntoView({ behavior: "smooth" })}>Delivery Apps & Charges</button>
                <button onClick={() => document.getElementById("users-section").scrollIntoView({ behavior: "smooth" })}>Add Users</button>
                <button onClick={() => document.getElementById("business-section").scrollIntoView({ behavior: "smooth" })}>Business Hours</button>
                <button onClick={() => document.getElementById("invoice-section").scrollIntoView({ behavior: "smooth" })}>Invoice Settings</button>
                <button onClick={() => document.getElementById("currency-section").scrollIntoView({ behavior: "smooth" })}>Currency Format</button>
                <button onClick={() => document.getElementById("date-section").scrollIntoView({ behavior: "smooth" })}>Date Format</button>
            </div>

            <div className="settings-main">
                {renderDeliverySettings()}
                <hr style={{ margin: '20px', border: '1px dashed black' }} />
                <div id="users-section">
                    <div className="user-form-container">
                        <div className="form-card">
                            <h3>Add User</h3>
                            <form className="form-fields" onSubmit={handleSaveUser}>
                                <input placeholder="Name" value={name ?? ""} onChange={(e) => setName(e.target.value)} />
                                <input placeholder="Number" value={number ?? ""} onChange={(e) => setNumber(e.target.value)} />
                                <input placeholder="Client ID" value={clientId ?? ""} onChange={(e) => setClientId(e.target.value)} />
                                <input placeholder="PIN" value={pin ?? ""} onChange={(e) => setPin(e.target.value)} />

                                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                                    {roles.map((role) => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>

                                <button type="submit">Add User</button>
                            </form>
                        </div>

                        <div className="form-card">
                            <h3>Manage Roles</h3>
                            <input
                                placeholder="Add new role"
                                value={newRole ?? ""}
                                onChange={(e) => setNewRole(e.target.value)}
                            />
                            <button onClick={handleAddRole}>Add Role</button>
                            <ul>
                                {roles.map((role, i) => (
                                    <li key={i}>{role}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="users-list">
                        <h3>Users List</h3>
                        {users.length === 0 && <p>No users added yet</p>}
                        {users.map((user, idx) => (
                            <div key={idx} className="user-item">
                                <span>{user.name}</span> - <span>{user.number}</span> - <span>{user.role}</span>
                                <button onClick={() => handleDeleteUser(idx)}>Delete</button>
                            </div>
                        ))}
                    </div>
                </div>
                <hr style={{ margin: '20px', border: '1px dashed black' }} />
                {renderBusinessHours()}
                <hr style={{ margin: '20px', border: '1px dashed black' }} />
                {renderInvoiceSettings()}
                <hr style={{ margin: '20px', border: '1px dashed black' }} />
                {renderCurrencyFormat()}
                <hr style={{ margin: '20px', border: '1px dashed black' }} />
                {renderDateFormat()}
            </div>
        </div>
    );
};

export default Settings;
