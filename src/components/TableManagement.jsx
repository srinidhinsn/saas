import React, { useState } from "react";
import TableList from "./TableList";
import AddTableForm from "./AddTableForm";

function TableManagement({ clientId, onTableSelect }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div style={{ position: "relative", padding: "10px" }}>
      {!showAddForm && (
        <>
          <TableList
            key={refreshKey}
            clientId={clientId}
            onTableSelect={onTableSelect}
          />
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              padding: "8px 12px",
              cursor: "pointer",
              backgroundColor: "#51a097",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Add Table
          </button>
        </>
      )}

      {showAddForm && (
        <div>
          <button
            onClick={() => setShowAddForm(false)}
            style={{
              marginBottom: "10px",
              padding: "6px 10px",
              cursor: "pointer",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            ← Back to Table List
          </button>
          <AddTableForm clientId={clientId} onAddSuccess={handleAddSuccess} />
        </div>
      )}
    </div>
  );
}

export default TableManagement;
