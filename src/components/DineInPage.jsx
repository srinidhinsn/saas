import React, { useState } from "react";
import TableList from './TableList';
import AddTableForm from "./AddTableForm";
import MenuManager from "./MenuManager";
import ComboManager from "./ComboManager";
import KitchenDisplay from "./KDS/KitchenDisplay";
import TableOrdersPage from "../pages/TableOrdersPage";
import Dashboard from './dashboard/Dashboard';
import TableSelectionPage from './TableSelectionPage';
import OrderSummary from './OrderSummary'
import '../styles/App.css';
import ExportOrdersButton from "./ExportOrdersButton";

function App() {
  const [clientId, setClientId] = useState(() => localStorage.getItem("clientId") || "");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [activeSection, setActiveSection] = useState("dash");
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTableList, setRefreshTableList] = useState(false);

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setRefreshTableList((prev) => !prev);
  };

  const handleTableSelection = (tableId) => {
    setSelectedTableId(tableId);
  };
  const handleClientIdChange = (e) => {
    const newClientId = e.target.value;
    setClientId(newClientId);
    setSelectedTableId("");
    localStorage.setItem("clientId", newClientId);
  };

  return (
    <div className="app-container">
      {/* Top bar */}
      <div className="top-bar">
        <div className="top-left">
          <h1>Dine-In Management Software</h1>
          <input
            type="text"
            placeholder="Enter client ID (UUID)"
            value={clientId}
            onChange={

              handleClientIdChange
            }
          />
        </div>
      </div>

      {clientId ? (
        <div className="main-layout">
          {/* Sidebar */}
          <div className="sidebar1">
            <button onClick={() => { setSelectedTableId(""); setActiveSection("dash"); }}>Dashboard</button>
            <button onClick={() => { setSelectedTableId(""); setActiveSection("tableselection"); }}>Order Management</button>
            <button onClick={() => { setSelectedTableId(""); setActiveSection("ordersummary"); }}>Order Summary</button>
            <button onClick={() => { setSelectedTableId(""); setActiveSection("kds"); }}>Kitchen DS</button>
            {/* <button onClick={() => { setSelectedTableId(""); setActiveSection("invoice"); }}>Invoice Report</button> */}
            <button onClick={() => { setSelectedTableId(""); setActiveSection("table"); }}>Table Management</button>
            <button onClick={() => { setSelectedTableId(""); setActiveSection("menu"); }}>Menu Management</button>
            <button onClick={() => { setSelectedTableId(""); setActiveSection("combo"); }}>Combo Management</button>
            <button onClick={() => { setSelectedTableId(""); setActiveSection("report"); }}>Reports</button>
          </div>

          {/* Main content */}
          <div className="main-content">
            {clientId && selectedTableId ? (
              <>
                <button
                  onClick={() => setSelectedTableId("")}
                  style={{
                    backgroundColor: "rgb(255, 77, 77)",
                    height: "50px",
                    width: "150px",
                    borderRadius: "10px",
                    color: "white",
                    border: "none",
                    fontWeight: "bold",
                    marginBottom: "1rem"
                  }}
                >
                  ← Back
                </button>
                <TableOrdersPage clientId={clientId} tableId={selectedTableId} />
              </>
            ) : (
              <>
                {activeSection === "table" && !showAddForm && (
                  <>
                    <div className="top-right-controls">
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="add-table-button"
                        style={{
                          backgroundColor: "rgb(255, 77, 77)",
                          height: "50px",
                          width: "150px",
                          borderRadius: "10px",
                          color: "white",
                          border: "none",
                          fontWeight: "bold",
                        }}
                      >
                        ➕ Add Table
                      </button>
                    </div>
                    <TableList
                      key={refreshTableList}
                      clientId={clientId}
                      onTableSelect={setSelectedTableId}
                    />
                  </>
                )}

                {activeSection === "table" && showAddForm && (
                  <div className="modal-overlay">
                    <div className="modal-content">
                      <AddTableForm
                        clientId={clientId}
                        onAddSuccess={handleAddSuccess}
                        onCancel={() => setShowAddForm(false)}
                      />
                    </div>
                  </div>
                )}

                {activeSection === "dash" && <Dashboard clientId={clientId} />}
                {activeSection === "tableselection" && (
                  <TableSelectionPage
                    clientId={clientId}
                    onTableSelect={handleTableSelection}
                  />
                )}
                {activeSection === "ordersummary" && <OrderSummary clientId={clientId} />}
                {activeSection === "kds" && <KitchenDisplay clientId={clientId} />}
                {activeSection === "menu" && <MenuManager clientId={clientId} />}
                {activeSection === "combo" && <ComboManager clientId={clientId} />}
                {activeSection === "report" && <ExportOrdersButton clientId={clientId} />}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="client-id-warning">
          <h2>Please enter a valid Client ID (UUID) to start using the system.</h2>
        </div>
      )}
    </div>
  );
}

export default App;
