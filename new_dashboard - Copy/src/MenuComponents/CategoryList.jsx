

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { FaEdit, FaTrash } from "react-icons/fa";

// function CategoryList({ clientId, onCategorySelect }) {
//   const [categories, setCategories] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [editName, setEditName] = useState("");
//   const [editDescription, setEditDescription] = useState("");
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [newName, setNewName] = useState("");
//   const [newDescription, setNewDescription] = useState("");
//   const [deleteTarget, setDeleteTarget] = useState(null);
//   const [includeAddons, setIncludeAddons] = useState(false);
//   const [addonGroups, setAddonGroups] = useState([]);
//   const [selectedAddonGroup, setSelectedAddonGroup] = useState("");
//   const [editIncludeAddons, setEditIncludeAddons] = useState(false);
//   const [editAddonGroups, setEditAddonGroups] = useState([]);
//   const [editSelectedAddonGroup, setEditSelectedAddonGroup] = useState("");


//   useEffect(() => {
//     if (includeAddons) {
//       axios.get(`http://localhost:8000/api/v1/${clientId}/addons/groups`)
//         .then(res => setAddonGroups(res.data))
//         .catch(err => console.error("Error fetching addon groups:", err));
//     }
//   }, [includeAddons]);

//   useEffect(() => {
//     if (editIncludeAddons) {
//       axios.get(`http://localhost:8000/api/v1/${clientId}/addons/groups`)
//         .then((res) => setEditAddonGroups(res.data))
//         .catch((err) => console.error("Error fetching addon groups:", err));
//     }
//   }, [editIncludeAddons]);



//   useEffect(() => {
//     axios
//       .get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
//       .then((res) => setCategories(res.data));
//   }, [clientId]);

//   const handleDelete = async (id) => {
//     await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/categories/${id}`);
//     setCategories(categories.filter((cat) => cat.id !== id));
//     setDeleteTarget(null);
//   };

//   const startEdit = (cat) => {
//     setEditingId(cat.id);
//     setEditName(cat.name);
//     setEditDescription(cat.description);
//     setEditIncludeAddons(!!cat.addon_group_id); // true if add-on group exists
//     setEditSelectedAddonGroup(cat.addon_group_id || "");

//     if (cat.addon_group_id) {
//       axios.get(`http://localhost:8000/api/v1/${clientId}/addons/groups`)
//         .then((res) => setEditAddonGroups(res.data))
//         .catch((err) => console.error("Error fetching addon groups:", err));
//     }

//     setShowEditModal(true);
//   };

//   const handleEditSave = async () => {
//     const payload = {
//       name: editName,
//       description: editDescription,
//     };

//     if (editIncludeAddons && editSelectedAddonGroup) {
//       payload.addon_group_id = editSelectedAddonGroup;
//     }

//     const res = await axios.put(`http://localhost:8000/api/v1/${clientId}/menu/categories/${editingId}`, payload);
//     setCategories(categories.map((cat) => (cat.id === editingId ? res.data : cat)));
//     setEditingId(null);
//     setEditIncludeAddons(false);
//     setEditSelectedAddonGroup("");
//   };


//   const handleAddCategory = async () => {
//     const res = await axios.post(`http://localhost:8000/api/v1/${clientId}/menu/categories`, {
//       name: newName,
//       description: newDescription,
//       client_id: clientId
//     });
//     setCategories([...categories, res.data]);
//     setNewName("");
//     setNewDescription("");
//     setShowAddModal(false);
//   };

//   return (
//     <div className="category-list-container">
//       <div className="category-header">
//         {/* 👇 Make this clickable to show all items */}
//         <h3 className="category-list-title">
//           Categories
//         </h3>
//         <button className="add-btn" onClick={() => setShowAddModal(true)}>➕</button>
//       </div>

//       <ul className="category-list">
//         {categories.map((cat) => (
//           <li key={cat.id} className="category-item" onClick={() => onCategorySelect(cat)}>{cat.name}
//             <span className="category-name"></span>
//             {cat.name !== "All" && (
//               <div className="category-actions">
//                 <button onClick={() => startEdit(cat)} className="edit-btn"><FaEdit /></button>
//                 <button onClick={() => setDeleteTarget(cat)} className="delete-btn"><FaTrash /></button>
//               </div>
//             )}
//           </li>
//         ))}
//       </ul>

//       {/* Add Modal */}
//       {showAddModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Add New Category</h4>

//             <input
//               type="text"
//               value={newName}
//               onChange={(e) => setNewName(e.target.value)}
//               placeholder="Category Name"
//               className="modal-input"
//             />
//             <input
//               type="text"
//               value={newDescription}
//               onChange={(e) => setNewDescription(e.target.value)}
//               placeholder="Description"
//               className="modal-input"
//             />

//             <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <input
//                 type="checkbox"
//                 checked={includeAddons}
//                 onChange={(e) => setIncludeAddons(e.target.checked)}
//               />
//               Want to add Add-ons?
//             </label>

//             {includeAddons && (
//               <select
//                 value={selectedAddonGroup}
//                 onChange={(e) => setSelectedAddonGroup(e.target.value)}
//                 className="modal-input"
//               >
//                 <option value="">Select Addon Group</option>
//                 {addonGroups.map((group) => (
//                   <option key={group.id} value={group.id}>{group.name}</option>
//                 ))}
//               </select>
//             )}

//             <div className="modal-buttons">
//               <button onClick={handleAddCategory} className="modal-save-btn">Add</button>
//               <button onClick={() => setShowAddModal(false)} className="modal-cancel-btn">Cancel</button>
//             </div>
//           </div>
//         </div>
//       )}


//       {/* Edit Modal */}
//       {showEditModal && (
//   <div className="modal-overlay">
//     <div className="modal-content">
//       <h4>Edit Category</h4>

//       <input
//         type="text"
//         value={editName}
//         onChange={(e) => setEditName(e.target.value)}
//         placeholder="Category Name"
//         className="modal-input"
//       />
//       <input
//         type="text"
//         value={editDescription}
//         onChange={(e) => setEditDescription(e.target.value)}
//         placeholder="Description"
//         className="modal-input"
//       />

//       <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//         <input
//           type="checkbox"
//           checked={editIncludeAddons}
//           onChange={(e) => setEditIncludeAddons(e.target.checked)}
//         />
//         Want to add Add-ons?
//       </label>

//       {editIncludeAddons && (
//         <select
//           value={editSelectedAddonGroup}
//           onChange={(e) => setEditSelectedAddonGroup(e.target.value)}
//           className="modal-input"
//         >
//           <option value="">Select Addon Group</option>
//           {editAddonGroups.map((group) => (
//             <option key={group.id} value={group.id}>{group.name}</option>
//           ))}
//         </select>
//       )}

//       <div className="modal-buttons">
//         <button
//           onClick={async () => {
//             await handleEditSave();
//             setShowEditModal(false);
//           }}
//           className="modal-save-btn"
//         >
//           Save
//         </button>
//         <button
//           onClick={() => {
//             setShowEditModal(false);
//             setEditingId(null);
//           }}
//           className="modal-cancel-btn"
//         >
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
//               <button onClick={() => handleDelete(deleteTarget.id)} className="modal-save-btn">Yes</button>
//               <button onClick={() => setDeleteTarget(null)} className="modal-cancel-btn">No</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default CategoryList;

//







// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { jwtDecode } from "jwt-decode"; import { useParams } from 'react-router-dom';

// function CategoryList({ onCategorySelect, onCategoryAdded }) {
//   const [categories, setCategories] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [editName, setEditName] = useState("");
//   const [editDescription, setEditDescription] = useState("");
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [newName, setNewName] = useState("");
//   const [newDescription, setNewDescription] = useState("");
//   const [subCategoryInput, setSubCategoryInput] = useState("");
//   const [deleteTarget, setDeleteTarget] = useState(null);
//   const clientId = localStorage.getItem("clientId");
//   const token = localStorage.getItem("access_token");




//   useEffect(() => {
//     if (!token || !clientId) return;
//     axios.get(`http://localhost:8002/saas/${clientId}/inventory/read_category`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     })

//       .then((res) => {
//         setCategories(res.data.data || []);
//       })
//       .catch((err) => {
//         console.error("Error fetching categories:", err);
//       });
//   }, [clientId]);



//   const handleAddCategory = async () => {
//     if (!newName.trim() || !newDescription.trim()) {
//       alert("Name and description are required.");
//       return;
//     }

//     let createdBy = "unknown";
//     let updatedBy = "unknown";

//     try {
//       const decoded = jwtDecode(token);
//       createdBy = decoded.username || decoded.user_id || "unknown";
//       updatedBy = decoded.username || decoded.user_id || "unknown";
//     } catch (err) {
//       console.error("Token decode failed:", err);
//     }

//     // const subCategoriesFormatted = `{"${subCategoryInput
//     //   .split(",")
//     //   .map((s) => s.trim())
//     //   .filter(Boolean)
//     //   .join('","')}"}`;


//     const slug = newName.trim().toLowerCase().replace(/\s+/g, "-");
//     // const subCategoriesArray = subCategoryInput
//     //   .split(",")
//     //   .map((s) => s.trim())
//     //   .filter(Boolean);

//     const payload = {
//       category: {
//         client_id: clientId,
//         name: newName.trim(),
//         description: newDescription.trim(),
//         slug,
//         sub_categories: JSON.stringify(subCategoryInput),
//         created_by: createdBy,
//         updated_by: updatedBy
//       },


//     };

//     try {
//       console.log("Payload being sent:", payload);

//       const res = await axios.post(
//         `http://localhost:8002/saas/${clientId}/inventory/create_category`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`
//           },
//         }
//       );

//       const newCategory = res.data.data;
//       setCategories([...categories, newCategory]);
//       setNewName("");
//       setNewDescription("");
//       setSubCategoryInput(""); // reset subcategories
//       setShowAddModal(false);
//     } catch (err) {
//       console.error("Error adding category:", err.response?.data || err);
//       alert(JSON.stringify(err.response?.data || err, null, 2));
//     }
//   };







//   const startEdit = (cat) => {
//     setEditingId(cat.id);
//     setEditName(cat.name);
//     setEditDescription(cat.description);
//     setShowEditModal(true);
//   };

//   const handleEditSave = async () => {
//     const payload = {
//       id: editingId,
//       name: editName,
//       description: editDescription,
//     };

//     try {
//       const res = await axios.post(
//         `http://localhost:8002/saas/${clientId}/inventory/update_category`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       setCategories(
//         categories.map((cat) => (cat.id === editingId ? res.data.data : cat))
//       );
//       setEditingId(null);
//       setShowEditModal(false);
//     } catch (err) {
//       console.error("Error editing category:", err);
//     }
//   };

//   const handleDelete = async (id) => {
//     const payload = { id };

//     try {
//       await axios.post(
//         `http://localhost:8002/saas/${clientId}/inventory/delete_category`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       setCategories(categories.filter((cat) => cat.id !== id));
//       setDeleteTarget(null);
//     } catch (err) {
//       console.error("Error deleting category:", err);
//     }
//   };

//   return (
//     <div className="category-list-container">
//       <div className="category-header">
//         <h3 className="category-list-title">Categories</h3>
//         <button className="add-btn" onClick={() => setShowAddModal(true)}>
//           ➕
//         </button>
//       </div>

//       <ul className="category-list">
//         {categories.map((cat) => (
//           <li
//             key={cat.id}
//             className="category-item"
//             onClick={() => onCategorySelect(cat)}
//           >
//             {cat.name}
//             <div className="category-actions">
//               <button onClick={() => startEdit(cat)} className="edit-btn">
//                 <FaEdit />
//               </button>
//               <button
//                 onClick={() => setDeleteTarget(cat)}
//                 className="delete-btn"
//               >
//                 <FaTrash />
//               </button>
//             </div>
//           </li>
//         ))}
//       </ul>

//       {showAddModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Add New Category</h4>
//             <input
//               type="text"
//               value={newName}
//               onChange={(e) => setNewName(e.target.value)}
//               placeholder="Category Name"
//               className="modal-input"
//             />
//             <input
//               type="text"
//               value={newDescription}
//               onChange={(e) => setNewDescription(e.target.value)}
//               placeholder="Description"
//               className="modal-input"
//             />
//             <input
//               type="text"
//               value={subCategoryInput}
//               onChange={(e) => setSubCategoryInput(e.target.value)}
//               placeholder="Subcategories (comma separated)"
//               className="modal-input"
//             />

//             <div className="modal-buttons">
//               <button onClick={handleAddCategory} className="modal-save-btn">
//                 Add
//               </button>
//               <button
//                 onClick={() => {
//                   setShowAddModal(false);
//                   setNewName("");
//                   setNewDescription("");
//                 }}
//                 className="modal-cancel-btn"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}


//       {showEditModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Edit Category</h4>
//             <input
//               type="text"
//               value={editName}
//               onChange={(e) => setEditName(e.target.value)}
//               placeholder="Category Name"
//               className="modal-input"
//             />
//             <input
//               type="text"
//               value={editDescription}
//               onChange={(e) => setEditDescription(e.target.value)}
//               placeholder="Description"
//               className="modal-input"
//             />
//             <div className="modal-buttons">
//               <button onClick={handleEditSave} className="modal-save-btn">
//                 Save
//               </button>
//               <button
//                 onClick={() => {
//                   setShowEditModal(false);
//                   setEditingId(null);
//                 }}
//                 className="modal-cancel-btn"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {deleteTarget && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Confirm Delete</h4>
//             <p>
//               Are you sure you want to delete {" "}
//               <strong>{deleteTarget.name}</strong>?
//             </p>
//             <div className="modal-buttons">
//               <button
//                 onClick={() => handleDelete(deleteTarget.id)}
//                 className="modal-save-btn"
//               >
//                 Yes
//               </button>
//               <button
//                 onClick={() => setDeleteTarget(null)}
//                 className="modal-cancel-btn"
//               >
//                 No
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default CategoryList;


//
//






// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { jwtDecode } from "jwt-decode";

// function CategoryList({ onCategorySelect }) {
//   const [categories, setCategories] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [editName, setEditName] = useState("");
//   const [editDescription, setEditDescription] = useState("");
//   const [editSubcategories, setEditSubcategories] = useState([]);
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [newName, setNewName] = useState("");
//   const [newDescription, setNewDescription] = useState("");
//   const [newSubcategories, setNewSubcategories] = useState([]);
//   const [deleteTarget, setDeleteTarget] = useState(null);
//   const [newId, setNewId] = useState("");

//   const clientId = localStorage.getItem("clientId");
//   const token = localStorage.getItem("access_token");

//   useEffect(() => {
//     if (!token || !clientId) return;

//     axios
//       .get(`http://localhost:8002/saas/${clientId}/inventory/read_category?client_id=${clientId}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       })
//       .then((res) => {
//         setCategories(res.data.data || []);
//       })
//       .catch((err) => {
//         console.error("Error fetching categories:", err);
//       });
//   }, [clientId, token]);

//   const toggleSubcategory = (id, isEdit = false) => {
//     const state = isEdit ? editSubcategories : newSubcategories;
//     const setter = isEdit ? setEditSubcategories : setNewSubcategories;

//     setter(
//       state.includes(id)
//         ? state.filter((sid) => sid !== id)
//         : [...state, id]
//     );
//   };

//   const handleAddCategory = async () => {
//     if (!newId.trim() || !newName.trim()) {
//       alert("ID and Name are required");
//       return;
//     }

//     let createdBy = "null";
//     let updatedBy = "null";

//     try {
//       const decoded = jwtDecode(token);
//       createdBy = decoded.user_id;
//       updatedBy = decoded.user_id;
//     } catch (err) {
//       console.error("Token decode failed:", err);
//     }

//     const payload = {
//       id: newId.trim(),
//       client_id: clientId,
//       name: newName.trim(),
//       description: newDescription.trim(),
//       sub_categories: newSubcategories,
//       created_by: createdBy,
//       updated_by: updatedBy,
//     };

//     try {
//       const res = await axios.post(
//         `http://localhost:8002/saas/${clientId}/inventory/create_category`,
//         payload,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       setCategories([...categories, res.data.data]);
//       setNewId("");
//       setNewName("");
//       setNewDescription("");
//       setNewSubcategories([]);
//       setShowAddModal(false);
//     } catch (err) {
//       console.error("Error adding category:", err.response?.data || err);
//       alert(JSON.stringify(err.response?.data || err));
//     }
//   };


//   const startEdit = (cat) => {
//     setEditingId(cat.id);
//     setEditName(cat.name);
//     setEditDescription(cat.description);
//     setEditSubcategories(cat.sub_categories || []);
//     setShowEditModal(true);
//   };

//   const handleEditSave = async () => {
//     const payload = {
//       id: editingId,
//       name: editName.trim(),
//       description: editDescription.trim(),
//       sub_categories: editSubcategories,
//     };

//     try {
//       const res = await axios.post(
//         `http://localhost:8002/saas/${clientId}/inventory/update_category`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const updatedCategory = res.data.data;

//       setCategories((prev) =>
//         prev.map((cat) => (cat.id === editingId ? updatedCategory : cat))
//       );

//       // Reset states
//       setEditingId(null);
//       setShowEditModal(false);
//     } catch (err) {
//       console.error("Error editing category:", err.response?.data || err);
//       alert("Failed to update category.");
//     }
//   };


//   const handleDelete = async (categoryId) => {
//     const category = categories.find((cat) => cat.id === categoryId);
//     if (!category) return;

//     try {
//       const res = await axios.post(
//         `http://localhost:8002/saas/${clientId}/inventory/delete_category?client_id=${clientId}`,
//         {
//           id: category.id,
//           name: category.name, // optional, included for clarity
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       // Update UI
//       const updatedCategories = categories.filter((c) => c.id !== category.id);
//       setCategories(updatedCategories);
//       setDeleteTarget(null); // close modal
//       alert(res.data.message || "Category deleted successfully");
//     } catch (err) {
//       console.error("Delete error:", err.response?.data || err);
//       alert(err.response?.data?.detail || "Failed to delete category");
//     }
//   };




//   return (
//     <div className="category-list-container">
//       <div className="category-header">
//         <h3 className="category-list-title">Categories</h3>
//         <button className="add-btn" onClick={() => setShowAddModal(true)}>
//           ➕
//         </button>
//       </div>

//       <ul className="category-list">
//         {categories.map((cat) => (
//           <li
//             key={cat.id}
//             className="category-item"
//             onClick={() => onCategorySelect(cat)}
//           >
//             {cat.name}
//             <div className="category-actions">
//               <button onClick={() => startEdit(cat)} className="edit-btn">
//                 <FaEdit />
//               </button>
//               <button
//                 onClick={() => setDeleteTarget(cat)}
//                 className="delete-btn"
//               >
//                 <FaTrash />
//               </button>
//             </div>
//           </li>
//         ))}
//       </ul>

//       {/* Add Modal */}
//       {showAddModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Add New Category</h4>
//             <input
//               type="text"
//               value={newId}
//               onChange={(e) => setNewId(e.target.value)}
//               placeholder="Category ID (required)"
//               className="modal-input"
//               required
//             />
//             <input
//               type="text"
//               value={newName}
//               onChange={(e) => setNewName(e.target.value)}
//               placeholder="Category Name"
//               className="modal-input"
//             />
//             <input
//               type="text"
//               value={newDescription}
//               onChange={(e) => setNewDescription(e.target.value)}
//               placeholder="Description"
//               className="modal-input"
//             />
//             <label>Assign as Subcategory under:</label>
//             <div className="subcategory-checkboxes">
//               {categories.map((cat) => (
//                 <label key={cat.id}>
//                   <input
//                     type="checkbox"
//                     checked={newSubcategories.includes(cat.id)}
//                     onChange={() => toggleSubcategory(cat.id)}
//                   />
//                   {cat.name}
//                 </label>
//               ))}
//             </div>
//             <div className="modal-buttons">
//               <button onClick={handleAddCategory} className="modal-save-btn">
//                 Add
//               </button>
//               <button
//                 onClick={() => {
//                   setShowAddModal(false);
//                   setNewId("");
//                   setNewName("");
//                   setNewDescription("");
//                   setNewSubcategories([]);
//                 }}
//                 className="modal-cancel-btn"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Edit Modal */}
//       {showEditModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Edit Category</h4>
//             <input
//               type="text"
//               value={editName}
//               onChange={(e) => setEditName(e.target.value)}
//               placeholder="Category Name"
//               className="modal-input"
//             />
//             <input
//               type="text"
//               value={editDescription}
//               onChange={(e) => setEditDescription(e.target.value)}
//               placeholder="Description"
//               className="modal-input"
//             />
//             <label>Subcategories:</label>
//             <div className="subcategory-checkboxes">
//               {categories
//                 .filter((cat) => cat.id !== editingId)
//                 .map((cat) => (
//                   <label key={cat.id}>
//                     <input
//                       type="checkbox"
//                       checked={editSubcategories.includes(cat.id)}
//                       onChange={() => toggleSubcategory(cat.id, true)}
//                     />
//                     {cat.name}
//                   </label>
//                 ))}
//             </div>
//             <div className="modal-buttons">
//               <button onClick={handleEditSave} className="modal-save-btn">
//                 Save
//               </button>
//               <button
//                 onClick={() => {
//                   setShowEditModal(false);
//                   setEditingId(null);
//                 }}
//                 className="modal-cancel-btn"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Delete Modal */}
//       {/* Delete Modal */}
//       {deleteTarget && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Confirm Delete</h4>
//             <p>
//               Are you sure you want to delete{" "}
//               <strong>{deleteTarget.name}</strong>?
//             </p>
//             <div className="modal-buttons">
//               <button
//                 onClick={() => handleDelete(deleteTarget.id)}
//                 className="modal-save-btn"
//               >
//                 Yes
//               </button>
//               <button
//                 onClick={() => setDeleteTarget(null)}
//                 className="modal-cancel-btn"
//               >
//                 No
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// }

// export default CategoryList;


///

//






import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import { useParams } from "react-router-dom";


function CategoryList({ onCategorySelect }) {
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubcategories, setEditSubcategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSubcategories, setNewSubcategories] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newId, setNewId] = useState(""); const [activeCategory, setActiveCategory] = useState(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState([]);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [editNewSubcategoryName, setEditNewSubcategoryName] = useState("");
  const [parentMap, setParentMap] = useState({});

  const [newParentCategory, setNewParentCategory] = useState("");

  /////////////////////////////////////// /////////////


  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!token || !clientId) return;

    axios
      .get(`http://localhost:8002/saas/${clientId}/inventory/read_category`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        const rawCategories = res.data.data;

        // ✅ New: Recursive function to build parent map
        const tempParentMap = {};
        const traverseAndBuildMap = (cats, parentId = null) => {
          for (const cat of cats) {
            if (parentId) {
              tempParentMap[cat.id] = parentId;
            }
            if (cat.subCategories && cat.subCategories.length > 0) {
              traverseAndBuildMap(cat.subCategories, cat.id);
            }
          }
        };

        traverseAndBuildMap(rawCategories);
        setParentMap(tempParentMap);

        // ✅ Preserve your existing logic for top-level detection
        const subCategoryIds = new Set(Object.keys(tempParentMap));
        const topLevelCategories = rawCategories.filter(
          (cat) => !subCategoryIds.has(cat.id)
        );

        const allCategory = { id: "all", name: "All" };
        setCategories([allCategory, ...topLevelCategories]);
        setActiveCategory("all");
      })

      .catch((err) => console.error("❌ Error fetching categories:", err));
  }, [clientId, token]);



  const toggleCategoryExpand = (id) => {
    setExpandedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const renderCategory = (category, level = 0) => {
    const isParent = level === 0;

    return (
      <div key={category.id} style={{ marginLeft: level * 5 }}>
        <div className="category-item" style={{ display: "flex", alignItems: "center" }}>
          <span
            onClick={() => onCategorySelect(category)}
            style={{
              cursor: "pointer",
              fontWeight: "bold",
              flexGrow: 1,
              color: isParent ? "#003366" : "#444444"
            }}
          >
            {category.name}
          </span>

          {/* Dropdown symbol */}
          {category.subCategories?.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleCategoryExpand(category.id);
              }}
              style={{ cursor: "pointer", marginLeft: 8 }}
            >
              ▾
            </span>
          )}

          {/* Show Edit/Delete only for subcategories (not parent categories) */}
          <>
            <button
              className="btn-edit"
              onClick={(e) => {
                e.stopPropagation();
                startEdit(category);
              }}
            >
              <FaEdit />
            </button>
            <button
              className="btn-delete"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(category);
              }}
            >
              <FaTrash />
            </button>
          </>
        </div>

        {/* Recursive rendering of subcategories */}
        {expandedCategoryIds.includes(category.id) &&
          category.subCategories?.map((sub) =>
            renderCategory(sub, level + 1)
          )}
      </div>
    );
  };




  const toggleSubcategory = (id, isEdit = false) => {
    const state = isEdit ? editSubcategories : newSubcategories;
    const setter = isEdit ? setEditSubcategories : setNewSubcategories;

    setter(
      state.includes(id)
        ? state.filter((sid) => sid !== id)
        : [...state, id]
    );
  };
  const getAllAncestors = (categoryId, parentMap) => {
    const ancestors = [];
    let currentId = categoryId;

    while (parentMap[currentId]) {
      const parentId = parentMap[currentId];
      ancestors.unshift(parentId);
      currentId = parentId;
    }

    return ancestors;
  };
  const buildParentMap = (categories) => {
    const map = {};
    const dfs = (nodes, parent = null) => {
      nodes.forEach((node) => {
        if (parent) map[node.id] = parent;
        if (node.subCategories?.length) dfs(node.subCategories, node.id);
      });
    };
    dfs(categories);
    return map;
  };

  const generateSlugFromParents = (categoryId, currentName, overrideParentMap = null) => {
    const path = [];

    // Build quick map for category lookup
    const categoryMap = {};
    const buildMap = (cats) => {
      for (const cat of cats) {
        categoryMap[cat.id] = cat;
        if (cat.subCategories) buildMap(cat.subCategories);
      }
    };
    buildMap(categories);

    const mapToUse = overrideParentMap || parentMap;

    let currentId = categoryId;
    const ancestors = [];
    while (mapToUse[currentId]) {
      const parentId = mapToUse[currentId];
      ancestors.unshift(parentId);
      currentId = parentId;
    }

    // Add ancestor names slugified (in order)
    ancestors.forEach(id => {
      const cat = categoryMap[id];
      if (cat) path.push(cat.name.trim().replace(/\s+/g, "_"));
    });

    // Add current category name slugified
    if (currentName) {
      path.push(currentName.trim().replace(/\s+/g, "_"));
    } else {
      const cat = categoryMap[categoryId];
      if (cat) path.push(cat.name.trim().replace(/\s+/g, "_"));
    }

    return "_" + path.join(" _");
  };

  const refreshCategoriesAndParentMap = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8002/saas/${clientId}/inventory/read_category`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const rawCategories = response.data.data;

      // Detect top-level categories (those without any parent)
      const subCategoryIds = new Set();
      rawCategories.forEach(cat => {
        cat.subCategories?.forEach(sub => subCategoryIds.add(sub.id));
      });
      const topLevelCategories = rawCategories.filter(cat => !subCategoryIds.has(cat.id));

      setCategories([{ id: "all", name: "All" }, ...topLevelCategories]);
      setParentMap(buildParentMap(rawCategories));
    } catch (error) {
      console.error("Error refreshing categories:", error);
    }
  };






  const handleAddCategory = async () => {
    if (!newId.trim() || !newName.trim()) {
      alert("ID and Name are required");
      return;
    }

    let createdBy = "null";
    let updatedBy = "null";
    try {
      const decoded = jwtDecode(token);
      createdBy = String(decoded.user_id);
      updatedBy = String(decoded.user_id);
    } catch (err) {
      console.error("Token decode failed:", err);
    }

    let finalSubcategories = [...newSubcategories];

    // STEP: Create new subcategory if entered
    if (newSubcategoryName.trim()) {
      const subId = `sub_${Date.now()}`;
      const tempParentMap = { [subId]: newId.trim() }; // new subcategory's parent is newId

      const newSubPayload = {
        id: subId,
        client_id: clientId,
        name: newSubcategoryName.trim(),
        description: "",
        sub_categories: [],
        created_by: createdBy,
        updated_by: updatedBy,
        slug: generateSlugFromParents(subId, newSubcategoryName.trim(), tempParentMap),
      };

      try {
        const subRes = await axios.post(
          `http://localhost:8002/saas/${clientId}/inventory/create_category`,
          newSubPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newSubId = subRes.data.data.id;
        finalSubcategories.push(newSubId);
      } catch (err) {
        console.error("Error creating new subcategory:", err.response?.data || err);
        alert("Failed to create subcategory");
        return;
      }
    }

    // STEP: Generate slug for main new category (after parentMap is initialized)
    // Refresh categories & parentMap before slugging (to ensure latest info)
    await refreshCategoriesAndParentMap();

    const slug = generateSlugFromParents(newId.trim(), newName.trim());

    const mainPayload = {
      id: newId.trim(),
      client_id: clientId,
      name: newName.trim(),
      description: newDescription.trim(),
      sub_categories: finalSubcategories,
      created_by: createdBy,
      updated_by: updatedBy,
      slug,
    };

    try {
      await axios.post(
        `http://localhost:8002/saas/${clientId}/inventory/create_category`,
        mainPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh after creation to update UI and parentMap
      await refreshCategoriesAndParentMap();

      // Reset form & UI
      setNewId("");
      setNewName("");
      setNewDescription("");
      setNewSubcategories([]);
      setNewSubcategoryName("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding main category:", err.response?.data || err);
      alert("Failed to add main category");
    }
  };


  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description);
    setEditSubcategories(cat.sub_categories || []);
    setShowEditModal(true);
  };


  const handleEditSave = async () => {
    let finalEditSubcategories = [...editSubcategories];

    if (!editingId) return;

    let createdBy = "null";
    let updatedBy = "null";
    try {
      const decoded = jwtDecode(token);
      createdBy = String(decoded.user_id);
      updatedBy = String(decoded.user_id);
    } catch (err) {
      console.error("Token decode failed:", err);
    }

    // Handle optional new subcategory creation
    if (editNewSubcategoryName.trim()) {
      const newSubId = `subcat_${Date.now()}`;
      const tempParentMap = { [newSubId]: editingId };

      const newSubPayload = {
        id: newSubId,
        client_id: clientId,
        name: editNewSubcategoryName.trim(),
        description: "",
        sub_categories: [],
        created_by: createdBy,
        updated_by: updatedBy,
        slug: generateSlugFromParents(newSubId, editNewSubcategoryName.trim(), tempParentMap),
      };

      try {
        const subRes = await axios.post(
          `http://localhost:8002/saas/${clientId}/inventory/create_category`,
          newSubPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const createdSubId = subRes.data.data.id;
        finalEditSubcategories.push(createdSubId);
        finalEditSubcategories = [...new Set(finalEditSubcategories)];
      } catch (err) {
        console.error("Error creating subcategory:", err.response?.data || err);
        alert("Failed to create subcategory");
        return;
      }
    }

    // Refresh categories & parentMap before generating slug to ensure up-to-date parentMap
    await refreshCategoriesAndParentMap();

    // Generate updated slug for edited category
    const slug = generateSlugFromParents(editingId, editName.trim());

    // Add existing subcategories if not included already
    try {
      const currentCatRes = await axios.get(
        `http://localhost:8002/saas/${clientId}/inventory/read_category`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const rawCategories = currentCatRes.data.data;
      const parentCategory = rawCategories.find(cat => cat.id === editingId);
      const currentSubIds = parentCategory?.subCategories?.map(sub => sub.id) || [];
      finalEditSubcategories = [...new Set([...currentSubIds, ...finalEditSubcategories])];
    } catch (err) {
      console.error("Error fetching existing subcategories:", err.response?.data || err);
    }

    const payload = {
      id: editingId,
      name: editName.trim(),
      description: editDescription.trim(),
      sub_categories: finalEditSubcategories,
      slug,
    };

    try {
      await axios.post(
        `http://localhost:8002/saas/${clientId}/inventory/update_category`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Refresh categories and parentMap after updating
      await refreshCategoriesAndParentMap();

      setEditingId(null);
      setEditNewSubcategoryName("");
      setShowEditModal(false);
    } catch (err) {
      console.error("Error editing category:", err.response?.data || err);
      alert("Failed to update category.");
    }
  };



  const handleDelete = async () => {
    if (!deleteTarget) return;
    const category = deleteTarget;
    console.log("Deleting category ID:", category.id);

    try {
      const res = await axios.post(
        `http://localhost:8002/saas/${clientId}/inventory/delete_category`,
        { id: category.id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // ✅ Refetch categories after deletion
      const response = await axios.get(
        `http://localhost:8002/saas/${clientId}/inventory/read_category`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const rawCategories = response.data.data;

      const subCategoryIds = new Set();
      rawCategories.forEach(cat => {
        cat.subCategories?.forEach(sub => subCategoryIds.add(sub.id));
      });

      const topLevelCategories = rawCategories.filter(cat => !subCategoryIds.has(cat.id));
      const allCategory = { id: "all", name: "All" };
      setCategories([allCategory, ...topLevelCategories]);
      setActiveCategory("all");
      setDeleteTarget(null);

      alert(res.data.message || "Category deleted successfully");
    } catch (err) {
      console.error("Delete error:", err.response?.data || err);
      alert(err.response?.data?.detail || "Failed to delete category");
    }
  };


  return (
    <div className="category-list-container">
      <div className="category-header">
        <h3 className="category-list-title">Categories</h3>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          ➕
        </button>
      </div>

      <ul className="category-list">
        {categories.map((cat) =>
          cat.name === "All" ? null : renderCategory(cat)
        )}
      </ul>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Add New Category</h4>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="Category ID (required)"
              className="modal-input"
              required
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category Name"
              className="modal-input"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description"
              className="modal-input"
            />
            {/* <input
              type="text"
              value={newSubcategoryName}
              onChange={(e) => setNewSubcategoryName(e.target.value)}
              placeholder="New Subcategory Name (optional)"
              className="modal-input"
            /> */}

            <label>Assign as Subcategory under:</label>
            <div className="subcategory-checkboxes">
              {categories.map((cat) => (
                <label key={cat.id}>
                  <input
                    type="checkbox"
                    checked={newSubcategories.includes(cat.id)}
                    onChange={() => toggleSubcategory(cat.id)}
                  />
                  {cat.name}
                </label>
              ))}
            </div>
            <div className="modal-buttons">
              <button onClick={handleAddCategory} className="modal-save-btn">
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewId("");
                  setNewName("");
                  setNewDescription("");
                  setNewSubcategories([]);
                }}
                className="modal-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Edit Category</h4>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Category Name"
              className="modal-input"
            />
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              className="modal-input"
            />
            <input
              type="text"
              value={editNewSubcategoryName}
              onChange={(e) => setEditNewSubcategoryName(e.target.value)}
              placeholder="New Subcategory Name (optional)"
              className="modal-input"
            />

            <label>Subcategories:</label>
            <div className="subcategory-checkboxes">
              {categories
                .filter((cat) => cat.id !== editingId)
                .map((cat) => (
                  <label key={cat.id}>
                    <input
                      type="checkbox"
                      checked={editSubcategories.includes(cat.id)}
                      onChange={() => toggleSubcategory(cat.id, true)}
                    />
                    {cat.name}
                  </label>
                ))}
            </div>
            <div className="modal-buttons">
              <button onClick={handleEditSave} className="modal-save-btn">
                Save
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingId(null);
                }}
                className="modal-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {/* Delete Modal */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Confirm Delete</h4>
            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="modal-buttons">
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                className="modal-save-btn"
              >
                Yes
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="modal-cancel-btn"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CategoryList;


/////////////////////////////////////////////// /
///////////////////////////////////////////////// /