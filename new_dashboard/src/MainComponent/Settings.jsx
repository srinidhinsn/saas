import React, { useState, useEffect } from "react";
import "../styles/Settings.css";

const Settings = () => {
    const [activeCategory, setActiveCategory] = useState(null);
    const [deliveryApps, setDeliveryApps] = useState([{ name: "Swiggy", enabled: true },
    { name: "Zomato", enabled: true }]);
    const [newApp, setNewApp] = useState("");
    const [chargeMode, setChargeMode] = useState("per_km");
    const [roles, setRoles] = useState(["admin", "receptionist", "manager", "waiter"]);
    const [newRole, setNewRole] = useState("");
    const [selectedRole, setSelectedRole] = useState("admin");
    const [conditionalCharge, setConditionalCharge] = useState("none");

    const [chargeRates, setChargeRates] = useState({
        base: 20,
        over500: 10,
        customList: []
    });
    const handleAddRole = () => {
        const role = newRole.trim().toLowerCase();
        if (!role || roles.includes(role)) return;

        setRoles((prev) => [...prev, role]);
        setSelectedRole(role);
        setNewRole("");
    };
    const [containerChargeMode, setContainerChargeMode] = useState("per_item");
    const [containerCharges, setContainerCharges] = useState({ small: 5, large: 10 });
    const handleAddCustomCharge = () => {
        const value = parseInt(chargeRates.custom);
        if (!value || value <= 0) return;

        setChargeRates((prev) => ({
            ...prev,
            customList: [...prev.customList, value],
            custom: "", // reset input
        }));

        setChargeMode(`custom_${value}`); // select newly added radio
    };

    useEffect(() => {
        document.body.classList.add("sidebar-minimized");
        return () => document.body.classList.remove("sidebar-minimized");
    }, []);

    const handleAddDeliveryApp = () => {
        const appName = newApp.trim();
        if (appName && !deliveryApps.some(app => app.name.toLowerCase() === appName.toLowerCase())) {
            setDeliveryApps(prev => [...prev, { name: appName, enabled: true }]);
            setNewApp("");
        }
    };
    const toggleAppStatus = (index) => {
        setDeliveryApps(prev =>
            prev.map((app, i) =>
                i === index ? { ...app, enabled: !app.enabled } : app
            )
        );
    };

    const renderDeliverySettings = () => (
        <div className="delivery-settings-wrapper">
            <h3 className="section-title">Existing Delivery Apps</h3>
            <ul className="delivery-apps-list">
                {deliveryApps.map((app, idx) => (
                    <li key={idx} className="delivery-app-item">
                        <span>{app.name}</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={app.enabled}
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
                    value={newApp}
                    onChange={(e) => setNewApp(e.target.value)}
                />
                <button onClick={handleAddDeliveryApp}>Add App</button>
            </div>

            <div className="delivery-config">
                <h4>Delivery Charge Mode</h4>
                <div className="radio-group">
                    <label>
                        <input
                            type="radio"
                            name="chargeMode"
                            value="per_km"
                            checked={chargeMode === "per_km"}
                            onChange={() => setChargeMode("per_km")}
                        />
                        ₹{chargeRates.base} per KM
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="chargeMode"
                            value="conditional"
                            checked={chargeMode === "conditional"}
                            onChange={() => setChargeMode("conditional")}
                        />
                        ₹{chargeRates.over500} per KM (if order  ₹500)
                    </label>

                    {/* Render all saved custom charges as radio */}
                    {chargeRates.customList.map((value, index) => (
                        <label key={index}>
                            <input
                                type="radio"
                                name="chargeMode"
                                value={`custom_${value}`}
                                checked={chargeMode === `custom_${value}`}
                                onChange={() => setChargeMode(`custom_${value}`)}
                            />
                            ₹{value} per KM (custom)
                        </label>
                    ))}

                    {/* Input for adding new custom */}
                    <label className="custom-charge-label">
                        <input
                            type="radio"
                            name="chargeMode"
                            value="custom"
                            checked={chargeMode === "custom"}
                            onChange={() => setChargeMode("custom")}
                        />
                        Custom:
                        <input
                            type="number"
                            className="inline-charge-input"
                            placeholder="₹/KM"
                            value={chargeRates.custom || ""}
                            onChange={(e) =>
                                setChargeRates((prev) => ({
                                    ...prev,
                                    custom: e.target.value
                                }))
                            }
                        />
                        per KM
                        <button
                            className="save-custom-charge-btn"
                            type="button"
                            onClick={handleAddCustomCharge}
                        >
                            Save
                        </button>
                    </label>
                </div>


                <h4>Container Charge Mode</h4>
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
                    <div>
                        <label>Small Container (₹)</label>
                        <input
                            type="number"
                            value={containerCharges.small}
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
                            value={containerCharges.large}
                            onChange={(e) =>
                                setContainerCharges((prev) => ({
                                    ...prev,
                                    large: +e.target.value
                                }))
                            }
                        />
                    </div>
                </div>

                <button className="save-btn">Save Settings</button>
            </div>
        </div>
    );
    const renderNotificationPreferences = () => (
        <div className="setting-section">
            <h3>Notification Preferences</h3>
            <label><input type="checkbox" /> Sound Alerts</label>
            <label><input type="checkbox" /> Email Notifications</label>
        </div>
    );

    const renderBusinessHours = () => (
        <div className="setting-section">
            <h3>Business Hours</h3>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                <div key={day} className="day-schedule">
                    <label>{day}</label>
                    <input type="time" /> to <input type="time" />
                </div>
            ))}
        </div>
    );

    const renderAppearance = () => (
        <div className="setting-section">
            <h3>Appearance Settings</h3>
            <label>Theme:
                <select>
                    <option>Light</option>
                    <option>Dark</option>
                </select>
            </label>
            <label>Primary Color: <input type="color" /></label>
        </div>
    );

    const renderInvoiceSettings = () => (
        <div className="setting-section">
            <h3>Invoice Settings</h3>
            <label><input type="checkbox" /> Include GST</label>
            <label>Invoice Footer Note:
                <textarea rows="2" placeholder="Enter invoice note here..."></textarea>
            </label>
        </div>
    );

    const renderLanguage = () => (
        <div className="setting-section">
            <h3>Language</h3>
            <select>
                <option>English</option>
                <option>Hindi</option>
                <option>Tamil</option>
                <option>Kannada</option>
            </select>
        </div>
    );

    const renderCurrencyFormat = () => (
        <div className="setting-section">
            <h3>Currency Format</h3>
            <select>
                <option value="INR">₹ (INR)</option>
                <option value="USD">$ (USD)</option>
                <option value="EUR">€ (EUR)</option>
            </select>
        </div>
    );

    const renderDateFormat = () => (
        <div className="setting-section">
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
                <button onClick={() => setActiveCategory("delivery-apps")}>Delivery Apps & Charges</button>
                <button onClick={() => setActiveCategory("users")}>Add Users</button>
                <button onClick={() => setActiveCategory("business-hours")}>Business Hours</button>
                <button onClick={() => setActiveCategory("invoice")}>Invoice Settings</button>
                <button onClick={() => setActiveCategory("currency")}>Currency Format</button>
                <button onClick={() => setActiveCategory("date-format")}>Date Format</button>
            </div>

            <div className="settings-main">
                {activeCategory === "delivery-apps" && renderDeliverySettings()}
                {activeCategory === "users" && (
                    <div className="user-form-container">
                        <div className="form-card">
                            <h3>Add User</h3>
                            <form className="form-fields">
                                <input placeholder="Name" />
                                <input placeholder="Number" />
                                <input placeholder="Client ID" />

                                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                                    {roles.map((role, index) => (
                                        <option key={index} value={role}>
                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                        </option>
                                    ))}
                                </select>

                                <div className="custom-role-input">
                                    <input
                                        type="text"
                                        placeholder="Add New Role"
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="add-role-btn"
                                        onClick={handleAddRole}
                                        disabled={!newRole.trim()}
                                    >
                                        Add
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        padding: "10px 15px",
                                        border: "none",
                                        borderRadius: "5px",
                                        background: "#3a86ff",
                                        color: "white",
                                        fontWeight: "bold",
                                        marginTop: "10px",
                                    }}
                                >
                                    Save User
                                </button>
                            </form>
                        </div>
                    </div>
                )}
                {activeCategory === "notifications" && renderNotificationPreferences()}
                {activeCategory === "business-hours" && renderBusinessHours()}
                {activeCategory === "appearance" && renderAppearance()}
                {activeCategory === "invoice" && renderInvoiceSettings()}
                {activeCategory === "language" && renderLanguage()}
                {activeCategory === "currency" && renderCurrencyFormat()}
                {activeCategory === "date-format" && renderDateFormat()}
            </div>
        </div>
    );
};

export default Settings;
