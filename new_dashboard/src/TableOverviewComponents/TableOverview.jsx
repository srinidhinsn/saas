import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TableCard from './TableCard';

const TableOverview = ({ tables, clientId }) => {
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableOrders, setTableOrders] = useState({}); // { [tableId]: [{name, price}] }

    const handleAddItem = (tableId, item) => {
        setTableOrders((prev) => {
            const existing = prev[tableId] || [];
            return {
                ...prev,
                [tableId]: [...existing, item],
            };
        });
    };

    const handleCloseSidebar = () => setSelectedTable(null);

    if (!tables || !Array.isArray(tables)) {
        return <div className="loading">Loading tables...</div>;
    }

    return (
        <div className="table-overview">
            <div className="table-grid">
                {tables.map((table) => (
                    <TableCard
                        key={table.id}
                        table={table}
                        orders={tableOrders[table.id] || []}
                        onClick={() => setSelectedTable(table)}
                    />
                ))}
            </div>

            {selectedTable && (
                <Sidebar
                    table={selectedTable}
                    clientId={clientId}
                    onClose={handleCloseSidebar}
                    onAddItem={(item) => handleAddItem(selectedTable.id, item)}
                />
            )}
        </div>
    );
};

export default TableOverview;
