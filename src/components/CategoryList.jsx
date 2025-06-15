// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import AddCategoryForm from "./AddCategoryForm";

// function CategoryList({ clientId, onCategorySelect }) {
//   const [categories, setCategories] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [editName, setEditName] = useState("");
//   const [editDescription, setEditDescription] = useState("");

//   useEffect(() => {
//     axios
//       .get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
//       .then((res) => setCategories(res.data));
//   }, [clientId]);

//   const handleDelete = async (id) => {
//     await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/categories/${id}`);
//     setCategories(categories.filter((cat) => cat.id !== id));
//   };

//   const startEdit = (cat) => {
//     setEditingId(cat.id);
//     setEditName(cat.name);
//     setEditDescription(cat.description);
//   };

//   const handleEditSave = async () => {
//     const res = await axios.put(`http://localhost:8000/api/v1/${clientId}/menu/categories/${editingId}`, {
//       name: editName,
//       description: editDescription
//     });
//     setCategories(categories.map((cat) => (cat.id === editingId ? res.data : cat)));
//     setEditingId(null);
//   };

//   return (
//     <div className="mb-4">
//       <h3 className="text-lg font-semibold">Categories</h3>
//       <ul>
//         {categories.map((cat) => (
//           <li key={cat.id} className="flex items-center gap-2 my-1">
//             {editingId === cat.id ? (
//               <>
//                 <input value={editName} onChange={(e) => setEditName(e.target.value)} className="border p-1" />
//                 <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="border p-1" />
//                 <button onClick={handleEditSave} className="bg-green-500 text-white px-2">Save</button>
//                 <button onClick={() => setEditingId(null)} className="bg-gray-300 px-2">Cancel</button>
//               </>
//             ) : (
//               <>
//                 <span
//                   className="cursor-pointer underline"
//                   onClick={() => onCategorySelect(cat)}
//                 >
//                   {cat.name}
//                 </span>
//                 <button onClick={() => startEdit(cat)} className="bg-yellow-400 text-white px-2">Edit</button>
//                 <button onClick={() => handleDelete(cat.id)} className="bg-red-500 text-white px-2">Delete</button>
//               </>
//             )}
//           </li>
//         ))}
//       </ul>

//       <AddCategoryForm clientId={clientId} onAdd={(newCat) => setCategories([...categories, newCat])} />
//     </div>
//   );
// }

// export default CategoryList;




// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import "../styles/CategoryList.css";

// function CategoryList({ clientId, onCategorySelect }) {
//   const [categories, setCategories] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [editName, setEditName] = useState("");
//   const [editDescription, setEditDescription] = useState("");
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [newName, setNewName] = useState("");
//   const [newDescription, setNewDescription] = useState("");

//   useEffect(() => {
//     axios
//       .get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
//       .then((res) => setCategories(res.data));
//   }, [clientId]);

//   const handleDelete = async (id) => {
//     await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/categories/${id}`);
//     setCategories(categories.filter((cat) => cat.id !== id));
//   };

//   const startEdit = (cat) => {
//     setEditingId(cat.id);
//     setEditName(cat.name);
//     setEditDescription(cat.description);
//     setShowEditModal(true);
//   };

//   const handleEditSave = async () => {
//     const res = await axios.put(`http://localhost:8000/api/v1/${clientId}/menu/categories/${editingId}`, {
//       name: editName,
//       description: editDescription,
//     });
//     setCategories(categories.map((cat) => (cat.id === editingId ? res.data : cat)));
//     setEditingId(null);
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
//         <h3 className="category-list-title">Categories</h3>
//         <button className="add-btn" onClick={() => setShowAddModal(true)}>➕</button>
//       </div>

//       <ul className="category-list">
//         {categories.map((cat) => (
//           <li key={cat.id} className="category-item">
//             <span className="category-name" onClick={() => onCategorySelect(cat)}>{cat.name}</span>
//             <div className="category-actions">
//               <button onClick={() => startEdit(cat)} className="edit-btn">Edit</button>
//               <button onClick={() => handleDelete(cat.id)} className="delete-btn">Delete</button>
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
//             <div className="modal-buttons">
//               <button onClick={handleAddCategory} className="modal-save-btn">Add</button>
//               <button onClick={() => setShowAddModal(false)} className="modal-cancel-btn">Cancel</button>
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
//               <button onClick={async () => {
//                 await handleEditSave();
//                 setShowEditModal(false);
//               }} className="modal-save-btn">Save</button>
//               <button onClick={() => {
//                 setShowEditModal(false);
//                 setEditingId(null);
//               }} className="modal-cancel-btn">Cancel</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default CategoryList;









import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/CategoryList.css";

function CategoryList({ clientId, onCategorySelect }) {
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    axios
      .get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
      .then((res) => setCategories(res.data));
  }, [clientId]);

  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/categories/${id}`);
    setCategories(categories.filter((cat) => cat.id !== id));
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    const res = await axios.put(`http://localhost:8000/api/v1/${clientId}/menu/categories/${editingId}`, {
      name: editName,
      description: editDescription,
    });
    setCategories(categories.map((cat) => (cat.id === editingId ? res.data : cat)));
    setEditingId(null);
  };

  const handleAddCategory = async () => {
    const res = await axios.post(`http://localhost:8000/api/v1/${clientId}/menu/categories`, {
      name: newName,
      description: newDescription,
      client_id: clientId
    });
    setCategories([...categories, res.data]);
    setNewName("");
    setNewDescription("");
    setShowAddModal(false);
  };

  return (
    <div className="category-list-container">
      <div className="category-header">
        {/* 👇 Make this clickable to show all items */}
        <h3 className="category-list-title" onClick={() => onCategorySelect(null)} style={{ cursor: "pointer" }}>
          Categories
        </h3>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>➕</button>
      </div>

      <ul className="category-list">
        {categories.map((cat) => (
          <li key={cat.id} className="category-item">
            <span className="category-name" onClick={() => onCategorySelect(cat)}>{cat.name}</span>
            <div className="category-actions">
              <button onClick={() => startEdit(cat)} className="edit-btn">Edit</button>
              <button onClick={() => handleDelete(cat.id)} className="delete-btn">Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Add New Category</h4>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Category Name" className="modal-input" />
            <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description" className="modal-input" />
            <div className="modal-buttons">
              <button onClick={handleAddCategory} className="modal-save-btn">Add</button>
              <button onClick={() => setShowAddModal(false)} className="modal-cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Edit Category</h4>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Category Name" className="modal-input" />
            <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="modal-input" />
            <div className="modal-buttons">
              <button onClick={async () => {
                await handleEditSave();
                setShowEditModal(false);
              }} className="modal-save-btn">Save</button>
              <button onClick={() => {
                setShowEditModal(false);
                setEditingId(null);
              }} className="modal-cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryList;

