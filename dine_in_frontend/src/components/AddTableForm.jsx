import React, { useState } from "react";
import axios from "axios";

function AddTableForm({ clientId }) {
  const [form, setForm] = useState({
    table_number: "",
    table_type: "",
    status: "Vacant",
    location_zone: "",
    qr_code_url: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, client_id: clientId };

    try {
      await axios.post(`http://localhost:8000/api/v1/${clientId}/tables`, payload);
      setMessage("✅ Table added successfully!");
      setForm({
        table_number: "",
        table_type: "",
        status: "Vacant",
        location_zone: "",
        qr_code_url: "",
      });
    } catch (err) {
      setMessage("❌ Failed to add table.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Add New Table</h2>

      {["table_number", "table_type", "location_zone", "qr_code_url"].map((field) => (
        <input
          key={field}
          className="border p-2 w-full mb-2"
          placeholder={field.replace("_", " ").toUpperCase()}
          name={field}
          value={form[field]}
          onChange={handleChange}
        />
      ))}

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        type="submit"
      >
        Add Table
      </button>

      {message && <p className="mt-2">{message}</p>}
    </form>
  );
}

export default AddTableForm;
