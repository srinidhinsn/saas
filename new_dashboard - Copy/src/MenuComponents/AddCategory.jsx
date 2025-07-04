

import React, { useState } from "react";
import axios from "axios";
// import '../styles/AddCategoryForm.css'

function AddCategoryForm({ clientId, onAdd }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await axios.post(`http://localhost:8000/api/v1/${clientId}/menu/categories`, {
      name,
      description,
      client_id: clientId
    });
    onAdd(res.data);
    setName("");
    setDescription("");
  };

  return (
    <form onSubmit={handleSubmit} className="add-category-form">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category Name"
        className="input-field"
        required
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="input-field input-description"
        required
      />
      {/* <button type="submit" className="btn-add">Add</button> */}
    </form>
  );
}

export default AddCategoryForm;

