
// import React, { useEffect, useState, useRef } from "react";
// import axios from "axios";
// import AddMenuItemForm from "./AddMenuForm";
// // import "../styles/MenuItemList.css";

// function MenuItemList({ clientId, category }) {
//   const [items, setItems] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [editingItem, setEditingItem] = useState(null);
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [addTargetCategoryId, setAddTargetCategoryId] = useState(null);
//   const categoryRefs = useRef({});

//   useEffect(() => {
//     axios.get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
//       .then(res => setItems(res.data));

//     axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
//       .then(res => setCategories(res.data));
//   }, [clientId]);

//   useEffect(() => {
//     if (category && categoryRefs.current[category.id]) {
//       categoryRefs.current[category.id].scrollIntoView({ behavior: "smooth", block: "start" });
//       setAddTargetCategoryId(category.id);
//     } else {
//       setAddTargetCategoryId(null); 
//     }
//   }, [category]);

//   const handleDelete = async (id) => {
//     await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/items/${id}`);
//     setItems(items.filter((i) => i.id !== id));
//   };

//   const handleEdit = (item) => {
//     setEditingItem({ ...item });
//   };

//   const handleEditSave = async () => {
//     const { id, name, description, price, image_url } = editingItem;

//     const res = await axios.put(
//       `http://localhost:8000/api/v1/${clientId}/menu/items/${id}`,
//       { name, description, price, image_url }
//     );

//     setItems(items.map((i) => (i.id === id ? res.data : i)));
//     setEditingItem(null);
//   };

//   const handleAddNewItem = (newItem) => {
//     setItems([...items, newItem]);
//     setShowAddModal(false);
//   };

//   const renderItemCard = (item) => (
//     <div key={item.id} className="menu-item-card">
//       {editingItem?.id === item.id ? (
//         <div className="menu-item-edit-form">
//           <input className="menu-item-input" value={editingItem.name}
//             onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} placeholder="Name" />
//           <input className="menu-item-input" value={editingItem.description}
//             onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} placeholder="Description" />
//           <input className="menu-item-input" type="number" value={editingItem.price}
//             onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })} placeholder="Price" />
//           <input className="menu-item-input" value={editingItem.image_url}
//             onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })} placeholder="Image URL" />
//           <div className="menu-item-btn-group">
//             <button onClick={handleEditSave} className="btn-save">Save</button>
//             <button onClick={() => setEditingItem(null)} className="btn-cancel">Cancel</button>
//           </div>
//         </div>
//       ) : (
//         <>
//           {/* <div className="menu-item-image-wrapper">
//             {item.image_url ? (
//               <img src={item.image_url} alt={item.name} className="menu-item-image" />
//             ) : 
//             (
//               <div className="menu-item-image-placeholder">No Image</div>
//             )
//             }
//           </div> */}
//           <div className="menu-item-info">
//             <h4 className="menu-item-name">{item.name}</h4>
//             <p className="menu-item-price">₹{item.price}</p>
//             {item.description && <p className="menu-item-desc">{item.description}</p>}
//           </div>
//           <div className="menu-item-actions">
//             <button onClick={() => handleEdit(item)} className="btn-edit">Edit</button>
//             <button onClick={() => handleDelete(item.id)} className="btn-delete">Delete</button>
//           </div>
//         </>
//       )}
//     </div>
//   );

//   return (
//     <div className="menu-item-list">
//       <div className="menu-item-header">
//         <h3 className="menu-item-title">
//           {category ? `Items in ${category.name}` : "All Menu Items"}
//         </h3>
//         <button
//           className="btn-add"
//           onClick={() => {
//             setShowAddModal(true);
//             setEditingItem(null);
//           }}
//         >
//           + Add Item
//         </button>
//       </div>

//       {category ? (
//         <div ref={(el) => (categoryRefs.current[category.id] = el)}>
//           <div className="menu-item-grid">
//             {items.filter((i) => i.category_id === category.id).map(renderItemCard)}
//           </div>
//         </div>
//       ) : (
//         categories.map((cat) => {
//           const catItems = items.filter(item => item.category_id === cat.id);
//           return (
//             <div key={cat.id} ref={(el) => (categoryRefs.current[cat.id] = el)} id={`category-${cat.id}`}>
//               <h3 className="menu-item-title">{cat.name}</h3>
//               <div className="menu-item-grid">
//                 {catItems.length > 0
//                   ? catItems.map(renderItemCard)
//                   : <p>No items in this category.</p>}
//               </div>
//             </div>
//           );
//         })
//       )}

//       {showAddModal && (
//         <div
//           className="modal-overlay"
//           onClick={(e) => {
//             if (e.target.classList.contains("modal-overlay")) setShowAddModal(false);
//           }}
//         >
//           <div className="modal-content">
//             <h3>Add New Menu Item</h3>
//             <AddMenuItemForm
//               clientId={clientId}
//               categoryId={addTargetCategoryId}
//               onAdd={handleAddNewItem}
//             />
//             <button className="btn-cancel modal-close-btn" onClick={() => setShowAddModal(false)}>Close</button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default MenuItemList;

// const handleExcelImport = async (e) => {
//   const file = e.target.files[0];
//   if (!file) return;

//   const reader = new FileReader();
//   reader.onload = async (evt) => {
//     const data = new Uint8Array(evt.target.result);
//     const workbook = XLSX.read(data, { type: "array" });
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];

//     const rows = XLSX.utils.sheet_to_json(sheet).filter(row => row && row.Category);

//     try {

//       const categoryMap = {};
//       categories.forEach(cat => {
//         if (cat.name) {
//           categoryMap[cat.name.trim().toLowerCase()] = cat.id;
//         }
//       });

//       for (const row of rows) {
//         const categoryName = row.Category?.trim()?.toLowerCase();

//         if (!categoryName || !categoryMap[categoryName]) {
//           alert(`Invalid or missing category: "${row.Category}"`);
//           continue;
//         }

//         const payload = {
//           itemCode: parseInt(row.ItemCode),
//           name: row.Name,
//           description: row.Description || "",
//           price: parseFloat(row.Price),
//           image_url: row.ImageURL || "",
//           dietary: row.Dietary || "",
//           gst: parseFloat(row.GST || 0),
//           swiggyPrice: parseFloat(row.SwiggyPrice || 0),
//           zomatoPrice: parseFloat(row.ZomatoPrice || 0),
//           isAvailableSwiggy: row.isAvailableSwiggy === true || row.isAvailableSwiggy === "true",
//           isAvailableZomato: row.isAvailableZomato === true || row.isAvailableZomato === "true",
//           client_id: clientId,
//           category_id: categoryMap[categoryName]
//         };

//         const res = await axios.post(`http://localhost:8000/api/v1/${clientId}/menu/items/upsert`, payload);

//         setItems(prev => {
//           const existingIndex = prev.findIndex(i => i.itemCode === res.data.itemCode);
//           if (existingIndex !== -1) {
//             // Replace existing item
//             const updated = [...prev];
//             updated[existingIndex] = res.data;
//             return updated;
//           } else {
//             // Add new item
//             return [...prev, res.data];
//           }
//         });

//       }

//       alert("Import completed!");
//     } catch (error) {
//       console.error("Import failed:", error);
//       alert("Import failed. Check console.");
//     }
//   };

//   reader.readAsArrayBuffer(file);
// };


// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import * as XLSX from "xlsx";
// import AddMenuItemForm from "./AddMenuForm";
// import { FaEdit, FaTrash } from "react-icons/fa";

// function MenuItemList({ clientId, category }) {
//   const [items, setItems] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [editingItem, setEditingItem] = useState(null);
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [addTargetCategoryId, setAddTargetCategoryId] = useState(null);
//   const [recentlyEditedId, setRecentlyEditedId] = useState(null);
//   const [deleteTarget, setDeleteTarget] = useState(null);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [showDateModal, setShowDateModal] = useState(false);
//   const [targetItem, setTargetItem] = useState(null);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");



//   const isAllCategory = category?.name?.toLowerCase() === "all";

//   useEffect(() => {
//     axios.get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
//       .then(res => setItems(res.data));
//     axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
//       .then(res => setCategories(res.data));
//   }, [clientId]);

//   const handleDelete = async (id) => {
//     await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/items/${id}`);
//     setItems(items.filter((i) => i.id !== id));
//   };

//   // const handleEdit = (item) => {
//   //   setEditingItem({ ...item });
//   // };

//   const handleEdit = (item) => {
//     setEditingItem({ ...item });
//     setShowEditModal(true);
//   };


//   const handleEditSave = async () => {
//     const {
//       id,
//       name,
//       description,
//       price,
//       dietary,
//       gst,
//       swiggyPrice,
//       zomatoPrice,
//       isAvailableSwiggy,
//       isAvailableZomato,
//       imageFile,
//     } = editingItem;

//     try {
//       const formData = new FormData();
//       formData.append("name", name);
//       formData.append("description", description || "");
//       formData.append("price", price);
//       formData.append("dietary", dietary || "");
//       formData.append("gst", gst || 0);
//       formData.append("swiggyPrice", swiggyPrice || 0);
//       formData.append("zomatoPrice", zomatoPrice || 0);
//       formData.append("isAvailableSwiggy", isAvailableSwiggy ? "true" : "false");
//       formData.append("isAvailableZomato", isAvailableZomato ? "true" : "false");

//       if (imageFile) {
//         formData.append("image", imageFile);
//       }

//       const res = await axios.put(
//         `http://localhost:8000/api/v1/${clientId}/menu/items/${id}/upload`,
//         formData,
//         { headers: { "Content-Type": "multipart/form-data" } }
//       );

//       setItems(items.map((i) => (i.id === id ? res.data : i)));
//       setEditingItem(null);
//       setRecentlyEditedId(id);
//       setTimeout(() => setRecentlyEditedId(null), 2000);
//     } catch (error) {
//       console.error("Save failed:", error.response?.data || error.message);
//       alert("Save failed. Please check inputs.");
//     }
//   };

//   const handleAddNewItem = (newItem) => {
//     setItems([...items, newItem]);
//     setShowAddModal(false);
//   };

//   const handleExport = () => {
//     const headers = [
//       "ItemCode", "Name", "Description", "Price", "ImageURL", "Dietary", "GST",
//       "SwiggyPrice", "ZomatoPrice", "isAvailableSwiggy", "isAvailableZomato", "Category"
//     ];

//     const rows = items.map(item => [
//       item.itemCode,
//       item.name || "",
//       item.description || "",
//       item.price || "",
//       item.image_url || "",
//       item.dietary || "",
//       item.gst || "",
//       item.swiggyPrice || "",
//       item.zomatoPrice || "",
//       item.isAvailableSwiggy ? "true" : "false",
//       item.isAvailableZomato ? "true" : "false",
//       categories.find(cat => cat.id === item.category_id)?.name || ""
//     ]);

//     const csvContent = [headers.join(","), ...rows.map(r => r.map(String).join(","))].join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", "menu_items.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };


//   const handleExcelImport = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     const confirmDelete = window.confirm("This will delete all existing menu items. Continue?");
//     if (!confirmDelete) return;

//     try {
//       // 🔥 Delete all menu items first
//       await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/items`);
//       setItems([]); // clear local state as well
//     } catch (deleteErr) {
//       console.error("Failed to delete existing items:", deleteErr);
//       alert("Failed to delete existing items. Import aborted.");
//       return;
//     }

//     const reader = new FileReader();
//     reader.onload = async (evt) => {
//       const data = new Uint8Array(evt.target.result);
//       const workbook = XLSX.read(data, { type: "array" });
//       const sheetName = workbook.SheetNames[0];
//       const sheet = workbook.Sheets[sheetName];

//       const rows = XLSX.utils.sheet_to_json(sheet).filter(row => row && row.Category);

//       try {
//         const categoryMap = {};
//         categories.forEach(cat => {
//           if (cat.name) {
//             categoryMap[cat.name.trim().toLowerCase()] = cat.id;
//           }
//         });

//         for (const row of rows) {
//           const categoryName = row.Category?.trim()?.toLowerCase();

//           if (!categoryName || !categoryMap[categoryName]) {
//             alert(`Invalid or missing category: "${row.Category}"`);
//             continue;
//           }

//           const payload = {
//             itemCode: parseInt(row.ItemCode),
//             name: row.Name,
//             description: row.Description || "",
//             price: parseFloat(row.Price),
//             image_url: row.ImageURL || "",
//             dietary: row.Dietary || "",
//             gst: parseFloat(row.GST || 0),
//             swiggyPrice: parseFloat(row.SwiggyPrice || 0),
//             zomatoPrice: parseFloat(row.ZomatoPrice || 0),
//             isAvailableSwiggy: row.isAvailableSwiggy === true || row.isAvailableSwiggy === "true",
//             isAvailableZomato: row.isAvailableZomato === true || row.isAvailableZomato === "true",
//             client_id: clientId,
//             category_id: categoryMap[categoryName]
//           };

//           const res = await axios.post(
//             `http://localhost:8000/api/v1/${clientId}/menu/items/upsert`,
//             payload
//           );

//           setItems(prev => [...prev, res.data]);
//         }

//         alert("Import completed!");
//       } catch (error) {
//         console.error("Import failed:", error);
//         alert("Import failed. Check console.");
//       }
//     };

//     reader.readAsArrayBuffer(file);
//   };

//   // const toggleAvailability = async (item) => {
//   //   try {
//   //     const res = await axios.put(
//   //       `http://localhost:8000/api/v1/${clientId}/menu/items/${item.id}`,
//   //       { ...item, is_available: !item.is_available }
//   //     );
//   //     setItems((prev) =>
//   //       prev.map((i) => (i.id === item.id ? res.data : i))
//   //     );
//   //   } catch (err) {
//   //     console.error("Toggle failed:", err);
//   //     alert("Failed to update availability.");
//   //   }
//   // };


//   const toggleAvailability = (item) => {
//     if (item.is_available) {
//       setTargetItem(item);         // Save item for confirmation
//       setShowDateModal(true);     // Show confirmation modal before turning OFF
//     } else {
//       // Turn ON directly
//       updateAvailability(item, true);
//     }
//   };

//   // Actual PUT logic
//   const updateAvailability = async (item, newStatus) => {
//     try {
//       const res = await axios.put(
//         `http://localhost:8000/api/v1/${clientId}/menu/items/${item.id}`,
//         { ...item, is_available: newStatus }
//       );
//       setItems((prev) =>
//         prev.map((i) => (i.id === item.id ? res.data : i))
//       );
//       setShowDateModal(false);
//       setTargetItem(null);
//     } catch (err) {
//       console.error("Toggle failed:", err);
//       alert("Failed to update availability.");
//     }
//   };

//   // const handleClearCategoryItems = async () => {
//   //   const confirmClear = window.confirm(`Delete all items in "${category.name}"?`);
//   //   if (!confirmClear) return;

//   //   try {
//   //     const itemsToDelete = items.filter(i => i.category_id === category.id);

//   //     for (const item of itemsToDelete) {
//   //       await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/items/${item.id}`);
//   //     }

//   //     setItems(prev => prev.filter(i => i.category_id !== category.id));
//   //     alert(`All items in "${category.name}" deleted.`);
//   //   } catch (err) {
//   //     console.error("Failed to delete items in category:", err);
//   //     alert("Failed to clear items in this category.");
//   //   }
//   // };

//   const filteredItems = (
//     category && category.name !== "All"
//       ? items.filter(i => i.category_id === category.id)
//       : items
//   ).sort((a, b) => {
//     const catA = categories.find(c => c.id === a.category_id)?.name?.toLowerCase() || '';
//     const catB = categories.find(c => c.id === b.category_id)?.name?.toLowerCase() || '';
//     return catA.localeCompare(catB);
//   });


//   return (
//     <div className="menu-item-table-container">
//       <div className="menu-item-header">
//         <h3 className="menu-item-title">
//           {category ? `Items in ${category.name}` : ""}
//         </h3>

//         {!isAllCategory && (
//           <div className="btns">
//             <button className="btn-add" onClick={() => {
//               setShowAddModal(true);
//               setAddTargetCategoryId(category.id);
//               setEditingItem(null);
//             }}>
//               + Add Item
//             </button>
//             {/* <button style={{ display: "flex", gap: "10px" }} className="btn-add" onClick={handleClearCategoryItems}>
//               Clear Items
//             </button> */}
//           </div>
//         )}

//         {isAllCategory && (
//           <div className="export-buttons">
//             <label className="btn-add" style={{ cursor: "pointer" }}>
//               Import
//               <input type="file" accept=".xlsx, .xls" style={{ display: "none" }} onChange={handleExcelImport} />
//             </label>
//             <button className="btn-add" onClick={handleExport}>Export</button>
//           </div>
//         )}
//       </div>

//       <div className="menu-grid-container">
//         {filteredItems.length === 0 ? (
//           <p className="no-items">No items found.</p>
//         ) : (
//           filteredItems.map((item) => (
//             <div
//               key={item.id}
//               className={`menu-grid-card ${recentlyEditedId === item.id ? "highlight" : ""}`}
//             >
//               <div className="menu-card-image">
//                 {item.image_url ? (
//                   <img src={`http://localhost:8000${item.image_url}`} alt={item.name} />
//                 ) : (
//                   <div className="no-image">No Image</div>
//                 )}
//               </div>
//               <div className="menu-card-body">
//                   <h4>{item.name}</h4>
//                   <p className="menu-card-price">₹{item.price}</p>
//                   {/* <p className="menu-card-code">Code: {item.itemCode || "x"}</p>
//                   <p className="menu-card-code">GST: {item.gst || "x"}%</p>
//                   <p className="menu-card-code">
//                     Category: {categories.find(cat => cat.id === item.category_id)?.name || "N/A"}
//                   </p>
//                   <p className="menu-card-code">Dietary: {item.dietary || "x"}</p>
//                   <p className="menu-card-code">Description: {item.description || "x"}</p> */}
//                 </div>

//               <div className="menu-card-footer">
//                 <button
//                   className={item.is_available ? "btn-on" : "btn-off"}
//                   onClick={() => toggleAvailability(item)}
//                 >
//                   {item.is_available ? "ON" : "OFF"}
//                 </button>
//                 <div>
//                   <button onClick={() => handleEdit(item)} className="btn-edit">
//                     <FaEdit />
//                   </button>
//                   <button onClick={() => setDeleteTarget(item)} className="btn-delete">
//                     <FaTrash />
//                   </button>
//                 </div>
//               </div>


//             </div>

//           ))
//         )}
//       </div>

//       {showAddModal && (
//         <div className="modal-overlay" onClick={(e) => {
//           if (e.target.classList.contains("modal-overlay")) setShowAddModal(false);
//         }}>
//           <div className="menu-modal-content">
//             <h3>Add New Menu Item</h3>
//             <AddMenuItemForm
//               clientId={clientId}
//               categoryId={addTargetCategoryId}
//               onAdd={handleAddNewItem}
//             />
//             <button className="btn-cancel modal-close-btn" onClick={() => setShowAddModal(false)}>Close</button>
//           </div>
//         </div>
//       )}

//       {showEditModal && editingItem && (
//         <div className="modal-overlay" onClick={(e) => {
//           if (e.target.classList.contains("modal-overlay")) setShowEditModal(false);
//         }}>
//           <div className="menu-modal-content">
//             <h3>Edit Menu Item</h3>

//             <form onSubmit={(e) => { e.preventDefault(); handleEditSave(); }} className="add-menu-item-form">
//               <div className="form-entry-wrapper">
//                 {/* Row 1 */}
//                 <div className="form-row">
//                   <input
//                     value={editingItem.itemCode || ""}
//                     onChange={(e) => setEditingItem({ ...editingItem, itemCode: e.target.value })}
//                     placeholder="Item Code"
//                     className="form-input short"
//                     required
//                   />
//                   <input
//                     value={editingItem.name}
//                     onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
//                     placeholder="Item Name"
//                     className="form-input"
//                     required
//                   />
//                   <input
//                     value={editingItem.description}
//                     onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
//                     placeholder="Description"
//                     className="form-input"
//                   />

//                   <input
//                     type="file"
//                     accept="image/*"
//                     onChange={(e) =>
//                       setEditingItem({ ...editingItem, imageFile: e.target.files[0] })
//                     }
//                     className="form-input"
//                   />

//                   <select
//                     value={editingItem.dietary}
//                     onChange={(e) => setEditingItem({ ...editingItem, dietary: e.target.value })}
//                     placeholder="Dietary"
//                     className="form-input"

//                   >
//                     <option value="">Select Dietary</option>
//                     <option value="VEG">VEG</option>
//                     <option value="NON-VEG">NON-VEG</option>
//                   </select>

//                 </div>

//                 {/* Row 2 */}
//                 <div className="form-row">
//                   <input
//                     type="number"
//                     value={editingItem.price}
//                     onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
//                     placeholder="Price"
//                     className="form-input short"
//                     required
//                   />
//                   <input
//                     type="number"
//                     value={editingItem.gst}
//                     onChange={(e) => setEditingItem({ ...editingItem, gst: e.target.value })}
//                     placeholder="GST (%)"
//                     className="form-input short"
//                     required
//                   />
//                   <select
//                     value={editingItem.category_id}
//                     onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
//                     className="form-input"
//                   >
//                     {categories.map(cat => (
//                       <option key={cat.id} value={cat.id}>{cat.name}</option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div className="form-actions">
//                 <button type="submit" className="btn-add">Save</button>
//                 <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}


// {showDateModal && targetItem && (
//   <div className="modal-overlay">
//     <div className="modal-box">
//       <h3>Turn Off Availability</h3>
//       <p>Enter duration to disable <strong>{targetItem.name}</strong>:</p>

//       <div className="date-inputs">
//         <label>
//           From:
//           <input
//             type="date"
//             value={fromDate}
//             onChange={(e) => setFromDate(e.target.value)}
//           />
//         </label>

//         <label>
//           To:
//           <input
//             type="date"
//             value={toDate}
//             onChange={(e) => setToDate(e.target.value)}
//           />
//         </label>
//       </div>

//       <div className="modal-actions">
//         <button
//           className="btn-confirm"
//           onClick={() => updateAvailability(targetItem, false)}
//           disabled={!fromDate || !toDate}
//         >
//           Confirm
//         </button>
//         <button className="btn-cancel" onClick={() => setShowDateModal(false)}>
//           Cancel
//         </button>
//       </div>
//     </div>
//   </div>
// )}


//       {deleteTarget && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Confirm Delete</h4>
//             <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong>?</p>
//             <div className="modal-buttons">
//               <button className="btn-add" onClick={async () => {
//                 await handleDelete(deleteTarget.id);
//                 setDeleteTarget(null);
//               }}>Yes</button>
//               <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>No</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default MenuItemList;


// 
// 






import React, { useEffect, useState } from "react";
import axios from "axios";
import AddMenuItemForm from "./AddMenuForm";

function InventoryItemList({ clientId }) {
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);


  const token = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!clientId || !token) return;

    axios
      .get(`http://localhost:8002/saas/${clientId}/inventory/read`, { headers })
      .then((res) => {
        setItems(res.data.data || []);
      })
      .catch((err) => {
        console.error("Failed to load inventory:", err);
      });
  }, [clientId, token]);

  const handleEdit = (item) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleAddItem = async (newItem) => {
    try {
      const response = await axios.post(
        `http://localhost:8002/saas/${clientId}/inventory/create`,
        newItem,
        { headers }
      );
      setItems((prev) => [...prev, response.data]);
      setShowAddModal(false);
    } catch (err) {
      console.error("Add failed:", err);
      alert("Failed to add item.");
    }
  };

  const handleEditSave = async () => {
    const { inventory_id, name, price } = editingItem;

    try {
      const res = await axios.put(
        `http://localhost:8002/saas/${clientId}/inventory/${inventory_id}`,
        { name, price },
        { headers }
      );

      setItems((prev) =>
        prev.map((i) => (i.inventory_id === inventory_id ? res.data : i))
      );
      setShowEditModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error("Edit failed:", err);
      alert("Edit failed.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(
        `http://localhost:8002/saas/${clientId}/inventory/${id}`,
        { headers }
      );
      setItems(items.filter((i) => i.inventory_id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed.");
    }
  };

  return (
    <div className="menu-items-panel">
      <div className="btns">
        <button className="btn-add" onClick={() => {
          setShowAddModal(true);
          setEditingItem(null);
        }}>
          + Add Item
        </button>
      </div>
      <div className="menu-grid-container">
        {items.length === 0 ? (
          <p className="no-items">No inventory found.</p>
        ) : (
          items.map((item, index) => (
            <div className="menu-grid-card" key={`${item.inventory_id}-${index}`}>
              <div className="menu-card-body">
                <h4>{item.name}</h4>
                <p className="menu-card-price">₹{item.unit_total_price}</p>
              </div>
              <div className="menu-card-footer">
                <button
                  className="btn-edit"
                  onClick={() => handleEdit(item)}
                >
                  Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => setDeleteTarget(item)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>


      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.classList.contains("modal-overlay")) {
              setShowAddModal(false);
            }
          }}
        >
          <div className="menu-modal-content">
            <h3>Add New Inventory Item</h3>
            <AddMenuItemForm
              onSubmit={handleAddItem}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {showEditModal && editingItem && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.classList.contains("modal-overlay")) setShowEditModal(false);
        }}>
          <div className="menu-modal-content">
            <h3>Edit Inventory Item</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleEditSave();
            }} className="add-menu-item-form">
              <div className="form-row">
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="Name"
                  className="form-input"
                  required
                />
                <input
                  type="number"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                  placeholder="Price"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-add">Save</button>
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Confirm Delete</h4>
            <p>Delete <strong>{deleteTarget.name}</strong>?</p>
            <div className="modal-buttons">
              <button className="btn-add" onClick={async () => {
                await handleDelete(deleteTarget.inventory_id);
                setDeleteTarget(null);
              }}>Yes</button>
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryItemList;
