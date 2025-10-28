import React, { useState, useEffect } from "react";
import CategoryList from "./CategoryList";
import MenuItemList from "./MenuList";
import { jwtDecode } from "jwt-decode";

function MenuManager({ clientId, realm }) {
  
    const [activeTab, setActiveTab] = useState("Categories/Items");
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [tableId, setTableId] = useState(null)
    useEffect(() => {
        if (tableId) {
            document.body.classList.add("sidebar-minimized");
        } else {
            document.body.classList.remove("sidebar-minimized");
        }
    }, [tableId]);



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
