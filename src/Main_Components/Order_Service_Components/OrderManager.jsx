import React, { useState } from "react";
import Table_Inventory_Order from "../Table_Service_Components/Table_Inventory_Order";
import OrdersVisiblePage from "./OrdersVisiblePage";

const OrderManager = () => {
    const [allOrders, setAllOrders] = useState([]);

    const updateOrders = (newOrder) => {
        setAllOrders(prev => [...prev, newOrder]);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <Table_Inventory_Order onOrderUpdate={updateOrders} />
            <OrdersVisiblePage externalOrders={allOrders} />
        </div>
    );
};

export default OrderManager;
