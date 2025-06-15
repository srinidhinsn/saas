import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/TableList.css";

function OrderSelectionPage({ clientId, onTableSelect }) {
  const [tables, setTables] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId) return;

    axios
      .get(`http://localhost:8000/api/v1/${clientId}/tables`)
      .then((res) => setTables(res.data))
      .catch(() => setError("Could not fetch tables."));
  }, [clientId]);

  return (
    <div className="table-list-container">
      <h2 className="table-list-title">Select a Table</h2>
      {error && <p className="error-message">{error}</p>}
      {tables.length === 0 ? (
        <p>No tables found for this client.</p>
      ) : (
        <ul className="table-list">
          {tables.map((t) => (
            <li
              key={t.id}
              className="table-list-item"
              onClick={() => onTableSelect(t.id)}
            >
              <div className="table-row">
                <div className="table-info">
                  {t.table_number} – {t.table_type}<br />
                  {t.status}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrderSelectionPage;
