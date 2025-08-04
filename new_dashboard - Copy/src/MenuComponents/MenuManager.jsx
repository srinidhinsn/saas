// import React, { useState } from "react";
// import CategoryList from "./CategoryList";
// import MenuItemList from './MenuList'
// import AddCategoryForm from "./AddCategory";

// function MenuManager({ clientId }) {
//   const [selectedCategory, setSelectedCategory] = useState(null);
//   const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

//   const handleAddCategoryClick = () => {
//     setSelectedCategory(null);
//     setShowAddCategoryForm(true);
//   };

//   const handleCategorySelect = (category) => {
//     setSelectedCategory(category);
//     setShowAddCategoryForm(false);
//   };

//   const handleCategoryAdded = (newCategory) => {
//     setSelectedCategory(newCategory);
//     setShowAddCategoryForm(false);
//   };

//   return (
//     <div className="menu-manager-container" >
//       {/* Sidebar stays fixed height and scrolls independently if needed */}
//       <div className="menu-category-sidebar ">
//         <CategoryList
//           clientId={clientId}
//           onCategorySelect={handleCategorySelect}
//           onAddCategoryClick={handleAddCategoryClick}
//         />
//       </div>

//       {/* Main area is scrollable independently */}
//       <div style={{ flex: 1, overflowY: "auto" }}>
//         {showAddCategoryForm ? (
//           <AddCategoryForm
//             clientId={clientId}
//             onAdd={handleCategoryAdded}
//             onCancel={() => setShowAddCategoryForm(false)}
//           />
//         ) : (
//           <MenuItemList clientId={clientId} category={selectedCategory} />
//         )}
//       </div>
//     </div>
//   );
// }

// export default MenuManager;


// import React, { useState, useEffect } from "react";
// import CategoryList from "./CategoryList";
// import MenuItemList from "./MenuList";
// import AddCategoryForm from "./AddCategory";
// import AddonLayout from "./AddOnLayout";
// // Placeholder components
// // import Addons from "./Addons";
// // import AddonGroups from "./AddonGroups";
// // import Combos from "./Combos";

// function MenuManager({ clientId }) {
//   const [activeTab, setActiveTab] = useState("Categories/Items"); // Default tab
//   const [selectedCategory, setSelectedCategory] = useState({ name: "All" });
//   const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

//   // Always reset to "All" when switching to item tab
//   useEffect(() => {
//     if (activeTab === "Categories/Items") {
//       setSelectedCategory({ name: "All" });
//       setShowAddCategoryForm(false);
//     }
//   }, [activeTab]);

//   const handleAddCategoryClick = () => {
//     setSelectedCategory(null);
//     setShowAddCategoryForm(true);
//   };

//   const handleCategorySelect = (category) => {
//     setSelectedCategory(category);
//     setShowAddCategoryForm(false);
//   };

//   const handleCategoryAdded = (newCategory) => {
//     setSelectedCategory(newCategory);
//     setShowAddCategoryForm(false);
//   };

//   return (
//     <div className="menu-manager-container">
//       {/* Top Navigation Buttons */}
//       <div className="tab-buttons">
//         {[, "Categories/Items", "addons", "combo"].map(tab => (
//           <button
//             key={tab}
//             className={activeTab === tab ? "active" : ""}
//             onClick={() => setActiveTab(tab)}
//           >
//             {
//              tab === "Categories/Items" ? "Categories/Items" :
//              tab === "addons" ? "Addons" :
//              tab === "addonGroups" ? "Addon Groups" :
//              "Combo"}
//           </button>
//         ))}
//       </div>

//       <div className="tab-content">

//         {activeTab === "Categories/Items" && (
//           <div className="menu-manager-item-view">
//             <div className="menu-category-sidebar">
//               <CategoryList
//                 clientId={clientId}
//                 onCategorySelect={handleCategorySelect}
//                 onAddCategoryClick={handleAddCategoryClick}
//               />
//             </div>
//             <div className="menu-items-panel">
//               {showAddCategoryForm ? (
//                 <AddCategoryForm
//                   clientId={clientId}
//                   onAdd={handleCategoryAdded}
//                   onCancel={() => setShowAddCategoryForm(false)}
//                 />
//               ) : (
//                 <MenuItemList
//                   clientId={clientId}
//                   category={selectedCategory}
//                 />
//               )}
//             </div>
//           </div>
//         )}

//         {activeTab === "addons" && <div><AddonLayout clientId={clientId}/></div>}
//         {activeTab === "combo" && <div>Combo Component</div>}
//       </div>
//     </div>
//   );
// }

// export default MenuManager;



//





// import React, { useState, useEffect } from "react";
// import CategoryList from "./CategoryList";
// import MenuItemList from "./MenuList";
// import AddonLayout from "./AddOnLayout";
// import { jwtDecode } from "jwt-decode";

// function MenuManager() {
//   const [clientId, setClientId] = useState(null);
//   const [activeTab, setActiveTab] = useState("Categories/Items");
//   const [selectedCategory, setSelectedCategory] = useState({ name: "All" });
//   const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem("access_token");
//     if (token) {
//       try {
//         const decoded = jwtDecode(token);
//         setClientId(decoded.client_id);
//       } catch (e) {
//         console.error("Failed to decode token:", e);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     if (activeTab === "Categories/Items") {
//       setSelectedCategory({ name: "All" });
//       setShowAddCategoryForm(false);
//     }
//   }, [activeTab]);

//   const handleAddCategoryClick = () => {
//     setSelectedCategory(null);
//     setShowAddCategoryForm(true);
//   };

//   const handleCategorySelect = (category) => {
//     setSelectedCategory(category);
//     setShowAddCategoryForm(false);
//   };

//   const handleCategoryAdded = (newCategory) => {
//     setSelectedCategory(newCategory);
//     setShowAddCategoryForm(false);
//   };

//   if (!clientId) return null;

//   return (
//     <div className="menu-manager-container">
//       {/* Top Navigation Buttons */}
//       <div className="tab-buttons">
//         {["Categories/Items", "addons", "combo"].map(tab => (
//           <button
//             key={tab}
//             className={activeTab === tab ? "active" : ""}
//             onClick={() => setActiveTab(tab)}
//           >
//             {tab === "Categories/Items"
//               ? "Categories/Items"
//               : tab === "addons"
//                 ? "Addons"
//                 : "Combo"}
//           </button>
//         ))}
//       </div>

//       <div className="tab-content">
//         {activeTab === "Categories/Items" && (
//           <div className="menu-manager-item-view">
//             <div className="menu-category-sidebar">
//               <CategoryList
//                 clientId={clientId}
//                 onCategorySelect={setSelectedCategory}
//                 onCategoryAdded={(newCat) => {
//                   setSelectedCategory(newCat); // select the newly added one
//                 }}
//               />

//             </div>
//             <div className="menu-items-panel">
//               <MenuItemList
//                 clientId={clientId}
//                 selectedCategory={selectedCategory}
//               />
//             </div>

//           </div>
//         )}

//         {activeTab === "addons" && (
//           <div><AddonLayout clientId={clientId} /></div>
//         )}

//         {activeTab === "combo" && (
//           <div>Combo Component</div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default MenuManager;


//
//





import React, { useState, useEffect } from "react";
import CategoryList from "./CategoryList";
import MenuItemList from "./MenuList";
import AddonLayout from "./AddOnLayout";
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
    <div className="menu-manager-container">
      <div className="tab-buttons">
        {["Categories/Items", "addons", "combo"].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "Categories/Items" ? "Categories/Items" : tab === "addons" ? "Addons" : "Combo"}
          </button>
        ))}
      </div>

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
  );
}

export default MenuManager;
