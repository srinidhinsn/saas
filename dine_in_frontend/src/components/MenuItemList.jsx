import React, { useEffect, useState } from "react";
import axios from "axios";
import AddMenuItemForm from "./AddMenuItemForm";

function MenuItemList({ clientId, category }) {
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchItems();
  }, [clientId, category]);

  const fetchItems = () => {
    axios
      .get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
      .then((res) => {
        const filtered = res.data.filter((i) => i.category_id === category.id);
        setItems(filtered);
      });
  };

  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:8000/api/v1/${clientId}/menu/items/${id}`);
    setItems(items.filter((i) => i.id !== id));
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item });
  };

  const handleEditSave = async () => {
    const { id, name, description, price, image_url } = editingItem;
    const res = await axios.put(`http://localhost:8000/api/v1/${clientId}/menu/items/${id}`, {
      name,
      description,
      price,
      image_url
    });
    setItems(items.map((i) => (i.id === id ? res.data : i)));
    setEditingItem(null);
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold">Items in {category.name}</h3>

      {items.length === 0 ? (
        <p>No items yet in this category.</p>
      ) : (
        <ul className="list-disc ml-5 mt-2">
          {items.map((item) => (
            <li key={item.id} className="mb-2">
              {editingItem?.id === item.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    className="border p-1"
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                  />
                  <input
                    className="border p-1"
                    value={editingItem.description}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, description: e.target.value })
                    }
                  />
                  <input
                    className="border p-1"
                    type="number"
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })
                    }
                  />
                  <input
                    className="border p-1"
                    value={editingItem.image_url}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, image_url: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditSave}
                      className="bg-green-600 text-white px-2 py-1"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="bg-gray-300 px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <strong>{item.name}</strong> – ₹{item.price}
                    {item.description && <span> ({item.description})</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-yellow-500 text-white px-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-600 text-white px-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <AddMenuItemForm
        clientId={clientId}
        categoryId={category.id}
        onAdd={(newItem) => setItems([...items, newItem])}
      />
    </div>
  );
}

export default MenuItemList;
