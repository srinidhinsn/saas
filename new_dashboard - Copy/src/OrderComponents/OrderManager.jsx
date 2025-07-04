// OrderManager.jsx
import React, { useState } from "react";
import ViewTables from "../TableSelectionComponent/ViewTables";
import OrdersVisiblePage from "./OrdersVisiblePage";

const OrderManager = () => {
    const [allOrders, setAllOrders] = useState([]);

    const updateOrders = (newOrder) => {
        setAllOrders(prev => [...prev, newOrder]);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <ViewTables onOrderUpdate={updateOrders} />
            <OrdersVisiblePage externalOrders={allOrders} />
        </div>
    );
};

export default OrderManager;
