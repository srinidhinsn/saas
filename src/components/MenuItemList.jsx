// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import AddMenuItemForm from "./AddMenuItemForm";

// function MenuItemList({ clientId, category }) {
//   const [items, setItems] = useState([]);
//   const [editingItem, setEditingItem] = useState(null);

//   useEffect(() => {
//     fetchItems();
//   }, [clientId, category]);

//   const fetchItems = () => {
//     axios
//       .get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
//       .then((res) => {
//         const filtered = res.data.filter((i) => i.category_id === category.id);
//         setItems(filtered);
//       });
//   };

//   const handleDelete = async (id) => {
//     await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/items/${id}`);
//     setItems(items.filter((i) => i.id !== id));
//   };

//   const handleEdit = (item) => {
//     setEditingItem({ ...item });
//   };

//   const handleEditSave = async () => {
//     const { id, name, description, price, image_url } = editingItem;
//     const res = await axios.put(`http://localhost:8000/api/v1/${clientId}/menu/items/${id}`, {
//       name,
//       description,
//       price,
//       image_url
//     });
//     setItems(items.map((i) => (i.id === id ? res.data : i)));
//     setEditingItem(null);
//   };

//   return (
//     <div className="mt-4">
//       <h3 className="text-lg font-semibold">Items in {category.name}</h3>

//       {items.length === 0 ? (
//         <p>No items yet in this category.</p>
//       ) : (
//         <ul className="list-disc ml-5 mt-2">
//           {items.map((item) => (
//             <li key={item.id} className="mb-2">
//               {editingItem?.id === item.id ? (
//                 <div className="flex flex-col gap-2">
//                   <input
//                     className="border p-1"
//                     value={editingItem.name}
//                     onChange={(e) =>
//                       setEditingItem({ ...editingItem, name: e.target.value })
//                     }
//                   />
//                   <input
//                     className="border p-1"
//                     value={editingItem.description}
//                     onChange={(e) =>
//                       setEditingItem({ ...editingItem, description: e.target.value })
//                     }
//                   />
//                   <input
//                     className="border p-1"
//                     type="number"
//                     value={editingItem.price}
//                     onChange={(e) =>
//                       setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })
//                     }
//                   />
//                   <input
//                     className="border p-1"
//                     value={editingItem.image_url}
//                     onChange={(e) =>
//                       setEditingItem({ ...editingItem, image_url: e.target.value })
//                     }
//                   />
//                   <div className="flex gap-2">
//                     <button
//                       onClick={handleEditSave}
//                       className="bg-green-600 text-white px-2 py-1"
//                     >
//                       Save
//                     </button>
//                     <button
//                       onClick={() => setEditingItem(null)}
//                       className="bg-gray-300 px-2 py-1"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <strong>{item.name}</strong> – ₹{item.price}
//                     {item.description && <span> ({item.description})</span>}
//                   </div>
//                   <div className="flex gap-2">
//                     <button
//                       onClick={() => handleEdit(item)}
//                       className="bg-yellow-500 text-white px-2"
//                     >
//                       Edit
//                     </button>
//                     <button
//                       onClick={() => handleDelete(item.id)}
//                       className="bg-red-600 text-white px-2"
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </li>
//           ))}
//         </ul>
//       )}

//       <AddMenuItemForm
//         clientId={clientId}
//         categoryId={category.id}
//         onAdd={(newItem) => setItems([...items, newItem])}
//       />
//     </div>
//   );
// }

// export default MenuItemList;








// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import AddMenuItemForm from "./AddMenuItemForm";
// import "../styles/MenuItemList.css";

// function MenuItemList({ clientId, category }) {
//   const [items, setItems] = useState([]);
//   const [editingItem, setEditingItem] = useState(null);
//   const [showAddModal, setShowAddModal] = useState(false);

//   useEffect(() => {
//     fetchItems();
//   }, [clientId, category]);

//   const fetchItems = () => {
//     axios
//       .get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
//       .then((res) => {
//         const filtered = res.data.filter(
//           (i) => i.category_id === category.id
//         );
//         setItems(filtered);
//       });
//   };

//   const handleDelete = async (id) => {
//     await axios.delete(
//       `http://localhost:8000/api/v1/${clientId}/menu/items/${id}`
//     );
//     setItems(items.filter((i) => i.id !== id));
//   };

//   const handleEdit = (item) => {
//     setEditingItem({ ...item });
//   };

//   const handleEditSave = async () => {
//     const { id, name, description, price, image_url } = editingItem;

//     const res = await axios.put(
//       `http://localhost:8000/api/v1/${clientId}/menu/items/${id}`,
//       {
//         name,
//         description,
//         price,
//         image_url,
//       }
//     );

//     setItems(items.map((i) => (i.id === id ? res.data : i)));
//     setEditingItem(null);
//   };

//   const handleAddNewItem = (newItem) => {
//     setItems([...items, newItem]);
//     setShowAddModal(false);
//   };

//   return (
//     <div className="menu-item-list">
//       <div className="menu-item-header">
//         <h3 className="menu-item-title">Items in {category.name}</h3>
//         <button className="btn-add" onClick={() => setShowAddModal(true)}>
//           + Add Item
//         </button>
//       </div>

//       {items.length === 0 ? (
//         <p>No items yet in this category.</p>
//       ) : (
//         <div className="menu-item-grid">
//           {items.map((item) => (
//             <div key={item.id} className="menu-item-card">
//               {editingItem?.id === item.id ? (
//                 <div className="menu-item-edit-form">
//                   <input
//                     className="menu-item-input"
//                     value={editingItem.name}
//                     onChange={(e) =>
//                       setEditingItem({
//                         ...editingItem,
//                         name: e.target.value,
//                       })
//                     }
//                     placeholder="Name"
//                   />
//                   <input
//                     className="menu-item-input"
//                     value={editingItem.description}
//                     onChange={(e) =>
//                       setEditingItem({
//                         ...editingItem,
//                         description: e.target.value,
//                       })
//                     }
//                     placeholder="Description"
//                   />
//                   <input
//                     className="menu-item-input"
//                     type="number"
//                     value={editingItem.price}
//                     onChange={(e) =>
//                       setEditingItem({
//                         ...editingItem,
//                         price: parseFloat(e.target.value),
//                       })
//                     }
//                     placeholder="Price"
//                   />
//                   <input
//                     className="menu-item-input"
//                     value={editingItem.image_url}
//                     onChange={(e) =>
//                       setEditingItem({
//                         ...editingItem,
//                         image_url: e.target.value,
//                       })
//                     }
//                     placeholder="Image URL"
//                   />
//                   <div className="menu-item-btn-group">
//                     <button onClick={handleEditSave} className="btn-save">
//                       Save
//                     </button>
//                     <button
//                       onClick={() => setEditingItem(null)}
//                       className="btn-cancel"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <>
//                   <div className="menu-item-image-wrapper">
//                     {item.image_url ? (
//                       <img
//                         src={item.image_url}
//                         alt={item.name}
//                         className="menu-item-image"
//                       />
//                     ) : (
//                       <div className="menu-item-image-placeholder">
//                         No Image
//                       </div>
//                     )}
//                   </div>
//                   <div className="menu-item-info">
//                     <h4 className="menu-item-name">{item.name}</h4>
//                     <p className="menu-item-price">₹{item.price}</p>
//                     {item.description && (
//                       <p className="menu-item-desc">{item.description}</p>
//                     )}
//                   </div>
//                   <div className="menu-item-actions">
//                     <button
//                       onClick={() => handleEdit(item)}
//                       className="btn-edit"
//                     >
//                       Edit
//                     </button>
//                     <button
//                       onClick={() => handleDelete(item.id)}
//                       className="btn-delete"
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </>
//               )}
//             </div>
//           ))}
//         </div>
//       )}

//       {showAddModal && (
//         <div
//           className="modal-overlay"
//           onClick={(e) => {
//             if (e.target.classList.contains("modal-overlay")) {
//               setShowAddModal(false);
//             }
//           }}
//         >
//           <div className="modal-content">
//             <h3>Add New Menu Item</h3>
//             <AddMenuItemForm
//               clientId={clientId}
//               categoryId={category.id}
//               onAdd={handleAddNewItem}
//             />
//             <button
//               className="btn-cancel modal-close-btn"
//               onClick={() => setShowAddModal(false)}
//             >
//               Close
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default MenuItemList;


import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import AddMenuItemForm from "./AddMenuItemForm";
import "../styles/MenuItemList.css";

function MenuItemList({ clientId, category }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTargetCategoryId, setAddTargetCategoryId] = useState(null);
  const categoryRefs = useRef({});

  useEffect(() => {
    axios.get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
      .then(res => setItems(res.data));

    axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
      .then(res => setCategories(res.data));
  }, [clientId]);

  useEffect(() => {
    if (category && categoryRefs.current[category.id]) {
      categoryRefs.current[category.id].scrollIntoView({ behavior: "smooth", block: "start" });
      setAddTargetCategoryId(category.id);
    } else {
      setAddTargetCategoryId(null); 
    }
  }, [category]);

  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/items/${id}`);
    setItems(items.filter((i) => i.id !== id));
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item });
  };

  const handleEditSave = async () => {
    const { id, name, description, price, image_url } = editingItem;

    const res = await axios.put(
      `http://localhost:8000/api/v1/${clientId}/menu/items/${id}`,
      { name, description, price, image_url }
    );

    setItems(items.map((i) => (i.id === id ? res.data : i)));
    setEditingItem(null);
  };

  const handleAddNewItem = (newItem) => {
    setItems([...items, newItem]);
    setShowAddModal(false);
  };

  const renderItemCard = (item) => (
    <div key={item.id} className="menu-item-card">
      {editingItem?.id === item.id ? (
        <div className="menu-item-edit-form">
          <input className="menu-item-input" value={editingItem.name}
            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} placeholder="Name" />
          <input className="menu-item-input" value={editingItem.description}
            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} placeholder="Description" />
          <input className="menu-item-input" type="number" value={editingItem.price}
            onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })} placeholder="Price" />
          <input className="menu-item-input" value={editingItem.image_url}
            onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })} placeholder="Image URL" />
          <div className="menu-item-btn-group">
            <button onClick={handleEditSave} className="btn-save">Save</button>
            <button onClick={() => setEditingItem(null)} className="btn-cancel">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="menu-item-image-wrapper">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="menu-item-image" />
            ) : (
              <div className="menu-item-image-placeholder">No Image</div>
            )}
          </div>
          <div className="menu-item-info">
            <h4 className="menu-item-name">{item.name}</h4>
            <p className="menu-item-price">₹{item.price}</p>
            {item.description && <p className="menu-item-desc">{item.description}</p>}
          </div>
          <div className="menu-item-actions">
            <button onClick={() => handleEdit(item)} className="btn-edit">Edit</button>
            <button onClick={() => handleDelete(item.id)} className="btn-delete">Delete</button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="menu-item-list">
      <div className="menu-item-header">
        <h3 className="menu-item-title">
          {category ? `Items in ${category.name}` : "All Menu Items"}
        </h3>
        <button
          className="btn-add"
          onClick={() => {
            setShowAddModal(true);
            setEditingItem(null);
          }}
        >
          + Add Item
        </button>
      </div>

      {category ? (
        <div ref={(el) => (categoryRefs.current[category.id] = el)}>
          <div className="menu-item-grid">
            {items.filter((i) => i.category_id === category.id).map(renderItemCard)}
          </div>
        </div>
      ) : (
        categories.map((cat) => {
          const catItems = items.filter(item => item.category_id === cat.id);
          return (
            <div key={cat.id} ref={(el) => (categoryRefs.current[cat.id] = el)} id={`category-${cat.id}`}>
              <h3 className="menu-item-title">{cat.name}</h3>
              <div className="menu-item-grid">
                {catItems.length > 0
                  ? catItems.map(renderItemCard)
                  : <p>No items in this category.</p>}
              </div>
            </div>
          );
        })
      )}

      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.classList.contains("modal-overlay")) setShowAddModal(false);
          }}
        >
          <div className="modal-content">
            <h3>Add New Menu Item</h3>
            <AddMenuItemForm
              clientId={clientId}
              categoryId={addTargetCategoryId}
              onAdd={handleAddNewItem}
            />
            <button className="btn-cancel modal-close-btn" onClick={() => setShowAddModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuItemList;












