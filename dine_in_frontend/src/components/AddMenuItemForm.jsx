import React, { useState } from "react";
import axios from "axios";

function AddMenuItemForm({ clientId, categoryId, onAdd }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await axios.post(`http://localhost:8000/api/v1/${clientId}/menu/items`, {
      name,
      description,
      price: parseFloat(price),
      image_url: imageUrl,
      client_id: clientId,
      category_id: categoryId
    });
    onAdd(res.data);
    setName(""); setDescription(""); setPrice(""); setImageUrl("");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item Name" className="border p-1" />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="border p-1 ml-2" />
      <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="border p-1 ml-2" />
      <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL" className="border p-1 ml-2" />
      <button type="submit" className="bg-green-600 text-white px-2 py-1 ml-2">Add Item</button>
    </form>
  );
}

export default AddMenuItemForm;
