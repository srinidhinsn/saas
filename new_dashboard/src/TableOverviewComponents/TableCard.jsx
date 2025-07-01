import React from 'react';
const TableCard = ({ table, orders, onClick }) => {
    const total = orders.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <div className="table-card" onClick={onClick}>
            <div className="table-number">Table {table.number}</div>
            <div className={`table-status ${table.status}`}>{table.status}</div>

            {orders.length > 0 && (
                <div className="table-orders">
                    <ul>
                        {orders.map((item, index) => (
                            <li key={index}>
                                {item.name} — ₹{item.price}
                            </li>
                        ))}
                    </ul>
                    <strong>Total: ₹{total}</strong>
                </div>
            )}
        </div>
    );
};

export default TableCard;
