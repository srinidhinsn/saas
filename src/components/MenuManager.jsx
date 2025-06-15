// import React, { useState } from "react";
// import CategoryList from "./CategoryList";
// import MenuItemList from "./MenuItemList";

// function MenuManager({ clientId }) {
//   const [selectedCategory, setSelectedCategory] = useState(null);

//   return (
//     <div className="p-4">
//       <h2 className="text-xl font-bold mb-4">Menu Management</h2>
//       <CategoryList clientId={clientId} onCategorySelect={setSelectedCategory} />
//       {selectedCategory && (
//         <MenuItemList clientId={clientId} category={selectedCategory} />
//       )}
//     </div>
//   );
// }

// export default MenuManager;



// import React, { useState } from "react";
// import CategoryList from "./CategoryList";
// import MenuItemList from "./MenuItemList";
// import AddCategoryForm from "./AddCategoryForm";

// function MenuManager({ clientId }) {
//   const [selectedCategory, setSelectedCategory] = useState(null);
//   const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

//   // Called when the + Add button is clicked
//   const handleAddCategoryClick = () => {
//     setSelectedCategory(null); // Clear any selected category
//     setShowAddCategoryForm(true); // Show add form
//   };

//   // Called when a category is selected
//   const handleCategorySelect = (category) => {
//     setSelectedCategory(category);
//     setShowAddCategoryForm(false); // Hide add form if open
//   };

//   // After successful category add
//   const handleCategoryAdded = (newCategory) => {
//     setSelectedCategory(newCategory);
//     setShowAddCategoryForm(false);
//   };

//   return (
//     <div style={{ display: "flex", height: "100%" }}>
//       {/* Left sidebar: categories with add button */}
//       <CategoryList
//         clientId={clientId}
//         onCategorySelect={handleCategorySelect}
//         onAddCategoryClick={handleAddCategoryClick}
//       />

//       {/* Main content area */}
//       <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
//         {showAddCategoryForm ? (
//           <AddCategoryForm
//             clientId={clientId}
//             onAdd={(newCat) => handleCategoryAdded(newCat)}
//             onCancel={() => setShowAddCategoryForm(false)}
//           />
//         ) : selectedCategory ? (
//           <MenuItemList clientId={clientId} category={selectedCategory} />
//         ) : (
//           <p>Select a category or click "Add" to create one.</p>
//         )}
//       </div>
//     </div>
//   );
// }

// export default MenuManager;







import React, { useState } from "react";
import CategoryList from "./CategoryList";
import MenuItemList from "./MenuItemList";
import AddCategoryForm from "./AddCategoryForm";

function MenuManager({ clientId }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar stays fixed height and scrolls independently if needed */}
      <div style={{  overflowY: "auto" }}>
        <CategoryList
          clientId={clientId}
          onCategorySelect={handleCategorySelect}
          onAddCategoryClick={handleAddCategoryClick}
        />
      </div>

      {/* Main area is scrollable independently */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {showAddCategoryForm ? (
          <AddCategoryForm
            clientId={clientId}
            onAdd={handleCategoryAdded}
            onCancel={() => setShowAddCategoryForm(false)}
          />
        ) : (
          <MenuItemList clientId={clientId} category={selectedCategory} />
        )}
      </div>
    </div>
  );
}

export default MenuManager;
