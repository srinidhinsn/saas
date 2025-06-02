import React, { useEffect, useState } from "react";
import axios from "axios";
import AddCategoryForm from "./AddCategoryForm";

function CategoryList({ clientId, onCategorySelect }) {
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

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
  };

  const handleEditSave = async () => {
    const res = await axios.put(`http://localhost:8000/api/v1/${clientId}/menu/categories/${editingId}`, {
      name: editName,
      description: editDescription
    });
    setCategories(categories.map((cat) => (cat.id === editingId ? res.data : cat)));
    setEditingId(null);
  };

  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold">Categories</h3>
      <ul>
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center gap-2 my-1">
            {editingId === cat.id ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="border p-1" />
                <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="border p-1" />
                <button onClick={handleEditSave} className="bg-green-500 text-white px-2">Save</button>
                <button onClick={() => setEditingId(null)} className="bg-gray-300 px-2">Cancel</button>
              </>
            ) : (
              <>
                <span
                  className="cursor-pointer underline"
                  onClick={() => onCategorySelect(cat)}
                >
                  {cat.name}
                </span>
                <button onClick={() => startEdit(cat)} className="bg-yellow-400 text-white px-2">Edit</button>
                <button onClick={() => handleDelete(cat.id)} className="bg-red-500 text-white px-2">Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>

      <AddCategoryForm clientId={clientId} onAdd={(newCat) => setCategories([...categories, newCat])} />
    </div>
  );
}

export default CategoryList;
