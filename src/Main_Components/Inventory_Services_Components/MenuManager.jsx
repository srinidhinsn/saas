import React, { useState, useEffect } from "react";
import CategoryList from "./CategoryList";
import MenuItemList from "./MenuList";
// import AddonLayout from "./AddOnLayout";
import { jwtDecode } from "jwt-decode";

function MenuManager() {
    const [clientId, setClientId] = useState(null);
    const [activeTab, setActiveTab] = useState("Categories/Items");
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setClientId(decoded.client_id);
            } catch (e) {
                console.error("Failed to decode token:", e);
            }
        }
    }, []);

    useEffect(() => {
        if (activeTab === "Categories/Items") {
            setSelectedCategory(null);
        }
    }, [activeTab]);

    const handleCategorySelect = (category) => {
        if (selectedCategory?.id === category.id) {
            setSelectedCategory(null);
        } else {
            setSelectedCategory(category);
        }
    };

    if (!clientId) return null;

    return (
        <div className="Inventory-Services-component">
            <div className="menu-manager-container">
                {/* <div className="tab-buttons">
                {["Categories/Items", "addons", "combo"].map(tab => (
                    <button
                        key={tab}
                        className={activeTab === tab ? "active" : ""}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === "Categories/Items" ? "Categories/Items" : tab === "addons" ? "Addons" : "Combo"}
                    </button>
                ))}
            </div> */}

                <div className="tab-content">
                    {activeTab === "Categories/Items" && (
                        <div className="menu-manager-item-view">
                            <CategoryList
                                clientId={clientId}
                                onCategorySelect={handleCategorySelect}
                            />
                            <div className="menu-items-panel">
                                <MenuItemList
                                    clientId={clientId}
                                    selectedCategory={selectedCategory}
                                />
                            </div>
                        </div>
                    )}
                    {activeTab === "addons" && <AddonLayout clientId={clientId} />}
                    {activeTab === "combo" && <div>Combo Component</div>}
                </div>
            </div>
        </div>
    );
}

export default MenuManager;
