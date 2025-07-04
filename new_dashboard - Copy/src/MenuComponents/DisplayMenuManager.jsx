import React, { useState } from "react";
import Category from './Category'
import Menu from './Menu'

function MenuManager({ clientId }) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  return (
    <div className="menu-manager-container1">
      {/* Sidebar with category list */}
      <div className="menu-category-sidebar">
        <Category
          clientId={clientId}
          onCategorySelect={handleCategorySelect}
        />
      </div>

      {/* Main scrollable content: menu items with quantity selection */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Menu
          clientId={clientId}
          category={selectedCategory}
          onQuantityChange={(itemId, qty) => {
            console.log("Quantity changed:", itemId, qty); 
          }}
        />
      </div>
    </div>
  );
}

export default MenuManager;
