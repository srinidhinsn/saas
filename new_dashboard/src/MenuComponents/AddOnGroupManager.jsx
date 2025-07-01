// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { FaEdit, FaTrash } from "react-icons/fa";

// function AddonGroupList({ clientId, onGroupSelect }) {
//   const [groups, setGroups] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [editName, setEditName] = useState("");
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [newName, setNewName] = useState("");

//   useEffect(() => {
//     axios
//       .get(`http://localhost:8000/api/v1/${clientId}/addon-groups`)
//       .then((res) => setGroups(res.data));
//   }, [clientId]);

//   const handleDelete = async (id) => {
//     await axios.delete(`http://localhost:8000/api/v1/${clientId}/addon-groups/${id}`);
//     setGroups(groups.filter((grp) => grp.id !== id));
//   };

//   const startEdit = (grp) => {
//     setEditingId(grp.id);
//     setEditName(grp.name);
//     setShowEditModal(true);
//   };

//   const handleEditSave = async () => {
//     const res = await axios.put(
//       `http://localhost:8000/api/v1/${clientId}/addon-groups/${editingId}`,
//       { name: editName }
//     );
//     setGroups(groups.map((grp) => (grp.id === editingId ? res.data : grp)));
//     setEditingId(null);
//   };

//   const handleAddGroup = async () => {
//     const res = await axios.post(`http://localhost:8000/api/v1/${clientId}/addon-groups`, {
//       name: newName,
//       client_id: clientId,
//     });
//     setGroups([...groups, res.data]);
//     setNewName("");
//     setShowAddModal(false);
//   };

//   return (
//     <div className="category-list-container">
//       <div className="category-header">
//         <h3 className="category-list-title">Addon Groups</h3>
//         <button className="add-btn" onClick={() => setShowAddModal(true)}>➕</button>
//       </div>

//       <ul className="category-list">
//         {groups.map((grp) => (
//           <li key={grp.id} className="category-item">
//             <span className="category-name" onClick={() => onGroupSelect(grp)}>{grp.name}</span>
//             <div className="category-actions">
//               <button onClick={() => startEdit(grp)} className="edit-btn"><FaEdit /></button>
//               <button onClick={() => handleDelete(grp.id)} className="delete-btn"><FaTrash /></button>
//             </div>
//           </li>
//         ))}
//       </ul>

//       {/* Add Modal */}
//       {showAddModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Add Addon Group</h4>
//             <input
//               type="text"
//               value={newName}
//               onChange={(e) => setNewName(e.target.value)}
//               placeholder="Group Name"
//               className="modal-input"
//             />
//             <div className="modal-buttons">
//               <button onClick={handleAddGroup} className="modal-save-btn">Add</button>
//               <button onClick={() => setShowAddModal(false)} className="modal-cancel-btn">Cancel</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Edit Modal */}
//       {showEditModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <h4>Edit Addon Group</h4>
//             <input
//               type="text"
//               value={editName}
//               onChange={(e) => setEditName(e.target.value)}
//               placeholder="Group Name"
//               className="modal-input"
//             />
//             <div className="modal-buttons">
//               <button
//                 onClick={async () => {
//                   await handleEditSave();
//                   setShowEditModal(false);
//                 }}
//                 className="modal-save-btn"
//               >
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
//     </div>
//   );
// }

// export default AddonGroupList;\\\



import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash } from "react-icons/fa";

function AddonGroupList({ clientId, onGroupSelect }) {
  const [groups, setGroups] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  useEffect(() => {
    fetchGroups();
  }, [clientId]);

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/${clientId}/addons/groups`);
      setGroups(res.data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  };

  const handleAddGroup = async () => {
    if (!newName.trim() || !newCode.trim()) return;

    try {
      const res = await axios.post(`http://localhost:8000/api/v1/${clientId}/addons/groups`, {
        name: newName.trim(),
        code: newCode.trim(),
        client_id: clientId,
      });

      setGroups([...groups, res.data]);
      setNewName("");
      setNewCode("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding group:", err);
      alert("Failed to add group.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Addon Group?")) return;

    try {
      await axios.delete(`http://localhost:8000/api/v1/${clientId}/addons/groups/${id}`);
      setGroups(groups.filter((g) => g.id !== id));
    } catch (err) {
      console.error("Failed to delete group:", err);
      alert("Delete failed.");
    }
  };

  const startEdit = (group) => {
    setEditingId(group.id);
    setEditName(group.name);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;

    try {
      const res = await axios.put(`http://localhost:8000/api/v1/${clientId}/addons/groups/${editingId}`, {
        name: editName.trim(),
      });

      setGroups(groups.map((g) => (g.id === editingId ? res.data : g)));
      setEditingId(null);
      setShowEditModal(false);
    } catch (err) {
      console.error("Edit failed:", err);
      alert("Update failed.");
    }
  };

  return (
    <div className="category-list-container">
      <div className="category-header">
        <h3 className="category-list-title">Addon Groups</h3>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>➕</button>
      </div>

      <ul className="category-list">
        {groups.map((group) => (
          <li key={group.id} className="category-item">
            <span className="category-name" onClick={() => onGroupSelect(group)}>
              {group.name}
            </span>
            <div className="category-actions">
              <button className="edit-btn" onClick={() => startEdit(group)}><FaEdit /></button>
              <button className="delete-btn" onClick={() => handleDelete(group.id)}><FaTrash /></button>
            </div>
          </li>
        ))}
      </ul>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Add Addon Group</h4>
            <input
              type="text"
              placeholder="Addon Group Code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="modal-input"
              required
            />
            <input
              type="text"
              placeholder="Group Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="modal-input"
              required
            />
            <div className="modal-buttons">
              <button onClick={handleAddGroup} className="modal-save-btn">Add</button>
              <button onClick={() => setShowAddModal(false)} className="modal-cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Edit Addon Group</h4>
            <input
              type="text"
              placeholder="Group Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="modal-input"
            />
            <div className="modal-buttons">
              <button onClick={handleEditSave} className="modal-save-btn">Save</button>
              <button onClick={() => setShowEditModal(false)} className="modal-cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddonGroupList;
