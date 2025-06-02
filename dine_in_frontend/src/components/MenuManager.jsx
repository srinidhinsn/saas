import React, { useState } from "react";
import CategoryList from "./CategoryList";
import MenuItemList from "./MenuItemList";

function MenuManager({ clientId }) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Menu Management</h2>
      <CategoryList clientId={clientId} onCategorySelect={setSelectedCategory} />
      {selectedCategory && (
        <MenuItemList clientId={clientId} category={selectedCategory} />
      )}
    </div>
  );
}

export default MenuManager;
