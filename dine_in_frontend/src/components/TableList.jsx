import React, { useEffect, useState } from "react";
import axios from "axios";

function TableList({ clientId, onTableSelect }) {
  const [tables, setTables] = useState([]);
  const [error, setError] = useState("");
  const [editingTable, setEditingTable] = useState(null);
  const [editForm, setEditForm] = useState({
    table_number: "",
    table_type: "",
    status: "",
    location_zone: "",
    qr_code_url: ""
  });

  useEffect(() => {
    if (!clientId) return;

    axios
      .get(`http://localhost:8000/api/v1/${clientId}/tables`)
      .then((res) => setTables(res.data))
      .catch((err) => setError("Could not fetch tables."));
  }, [clientId]);

  const handleDelete = async (tableId) => {
    if (window.confirm("Are you sure you want to delete this table?")) {
      await axios.delete(`http://localhost:8000/api/v1/${clientId}/tables/${tableId}`);
      setTables(tables.filter((t) => t.id !== tableId));
    }
  };

  const handleEditClick = (table) => {
    setEditingTable(table.id);
    setEditForm({
      table_number: table.table_number,
      table_type: table.table_type,
      status: table.status,
      location_zone: table.location_zone,
      qr_code_url: table.qr_code_url || ""
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await axios.put(`http://localhost:8000/api/v1/${clientId}/tables/${editingTable}`, editForm);
    const updated = await axios.get(`http://localhost:8000/api/v1/${clientId}/tables`);
    setTables(updated.data);
    setEditingTable(null);
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Tables</h2>
      {error && <p className="text-red-500">{error}</p>}
      {tables.length === 0 ? (
        <p>No tables found for this client.</p>
      ) : (
        <ul className="list-none ml-0">
          {tables.map((t) => (
            <li
              key={t.id}
              className="mb-4 p-2 border rounded cursor-pointer hover:bg-blue-50"
              onClick={() => {
                if (editingTable !== t.id) onTableSelect(t.id);
              }}
            >
              {editingTable === t.id ? (
                <form onSubmit={handleEditSubmit} className="space-y-2">
                  <input
                    name="table_number"
                    value={editForm.table_number}
                    onChange={handleEditChange}
                    placeholder="Table Number"
                    className="border p-1 w-full"
                  />
                  <input
                    name="table_type"
                    value={editForm.table_type}
                    onChange={handleEditChange}
                    placeholder="Table Type"
                    className="border p-1 w-full"
                  />
                  <input
                    name="status"
                    value={editForm.status}
                    onChange={handleEditChange}
                    placeholder="Status"
                    className="border p-1 w-full"
                  />
                  <input
                    name="location_zone"
                    value={editForm.location_zone}
                    onChange={handleEditChange}
                    placeholder="Location Zone"
                    className="border p-1 w-full"
                  />
                  <input
                    name="qr_code_url"
                    value={editForm.qr_code_url}
                    onChange={handleEditChange}
                    placeholder="QR Code URL"
                    className="border p-1 w-full"
                  />
                  <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTable(null)}
                    className="ml-2 text-gray-500"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    {t.table_number} – {t.table_type} – {t.status} – {t.location_zone}
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering select
                        handleEditClick(t);
                      }}
                      className="text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering select
                        handleDelete(t.id);
                      }}
                      className="text-red-600"
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
    </div>
  );
}

export default TableList;
