
import React, { useState, useEffect } from "react";
import CategoryList from "./CategoryList";
import SwiggyMenuItemList from "./SwiggyMenuList";
import AddCategoryForm from "./AddCategory";
import AddonLayout from "./AddOnLayout";
// Placeholder components
// import Addons from "./Addons";
// import AddonGroups from "./AddonGroups";
// import Combos from "./Combos";

function MenuManager({ clientId }) {
  const [activeTab, setActiveTab] = useState("Categories/Items"); // Default tab
  const [selectedCategory, setSelectedCategory] = useState({ name: "All" });
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

  // Always reset to "All" when switching to item tab
  useEffect(() => {
    if (activeTab === "Categories/Items") {
      setSelectedCategory({ name: "All" });
      setShowAddCategoryForm(false);
    }
  }, [activeTab]);

  const handleAddCategoryClick = () => {
    setSelectedCategory(null);
    setShowAddCategoryForm(true);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowAddCategoryForm(false);
  };

  const handleCategoryAdded = (newCategory) => {
    setSelectedCategory(newCategory);
    setShowAddCategoryForm(false);
  };

  return (
    <div className="menu-manager-container">
      {/* Top Navigation Buttons */}
      <div className="tab-buttons">
        {[, "Categories/Items", "addons", "combo"].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {
             tab === "Categories/Items" ? "Categories/Items" :
             tab === "addons" ? "Addons" :
             tab === "addonGroups" ? "Addon Groups" :
             "Combo"}
          </button>
        ))}
      </div>

      <div className="tab-content">

        {activeTab === "Categories/Items" && (
          <div className="menu-manager-item-view">
            <div className="menu-category-sidebar">
              <CategoryList
                clientId={clientId}
                onCategorySelect={handleCategorySelect}
                onAddCategoryClick={handleAddCategoryClick}
              />
            </div>
            <div className="menu-items-panel">
              {showAddCategoryForm ? (
                <AddCategoryForm
                  clientId={clientId}
                  onAdd={handleCategoryAdded}
                  onCancel={() => setShowAddCategoryForm(false)}
                />
              ) : (
                <SwiggyMenuItemList
                  clientId={clientId}
                  category={selectedCategory}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === "addons" && <div><AddonLayout clientId={clientId}/></div>}
        {activeTab === "combo" && <div>Combo Component</div>}
      </div>
    </div>
  );
}

export default MenuManager;
