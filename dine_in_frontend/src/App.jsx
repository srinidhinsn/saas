import React, { useState } from "react";
import TableList from "./components/TableList";
import AddTableForm from "./components/AddTableForm";
import MenuManager from "./components/MenuManager";
import ComboManager from "./components/ComboManager";
import TableOrdersPage from "./pages/TableOrdersPage";
import KitchenDisplay from "./components/KDS/KitchenDisplay";

function App() {
  const [clientId, setClientId] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dine-In Management Portal</h1>

      <input
        type="text"
        placeholder="Enter client ID (UUID)"
        value={clientId}
        onChange={(e) => {
          setClientId(e.target.value);
          setSelectedTableId(""); // reset selected table when client changes
        }}
        className="border px-2 py-1 w-full mb-4"
      />

      {clientId && !selectedTableId && (
        <>
          <h2 className="text-xl font-semibold mt-4 mb-2">Table Management</h2>
          <AddTableForm clientId={clientId} />
          <TableList clientId={clientId} onTableSelect={setSelectedTableId} />

          <hr className="my-6" />

          <MenuManager clientId={clientId} />

          <hr className="my-6" />

          <ComboManager clientId={clientId} />
		  
		  <h2 className="text-xl font-semibold mt-4 mb-2">Kitchen Display System</h2>
		  <KitchenDisplay clientId={clientId} />
        </>
      )}

      {clientId && selectedTableId && (
        <div>
          <button
            onClick={() => setSelectedTableId("")}
            className="mb-4 px-3 py-1 rounded bg-gray-200"
          >
            ← Back to Management Dashboard
          </button>
          <TableOrdersPage clientId={clientId} tableId={selectedTableId} />
        </div>
      )}
    </div>
  );
}

export default App;
