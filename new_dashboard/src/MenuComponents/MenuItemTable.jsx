
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

function MenuItemTable({ clientId, tableId, category, onOrderCreated }) {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedItems, setSelectedItems] = useState({});
    const categoryRefs = useRef({});

    useEffect(() => {
        axios.get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
            .then(res => setItems(res.data));
        axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
            .then(res => setCategories(res.data));
    }, [clientId]);

    useEffect(() => {
        if (category && categoryRefs.current[category.id]) {
            categoryRefs.current[category.id].scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }, [category]);

    const getCategoryName = (categoryId) => {
        const cat = categories.find((c) => c.id === categoryId);
        return cat ? cat.name : "-";
    };

    const isCombo = (item) => !!item.combo_items;

    const toggleItem = (item) => {
        setSelectedItems(prev => {
            if (prev[item.id]) {
                const updated = { ...prev };
                delete updated[item.id];
                return updated;
            } else {
                return {
                    ...prev,
                    [item.id]: {
                        item_id: item.id,
                        item_type: isCombo(item) ? "combo" : "item",
                        quantity: 1,
                    }
                };
            }
        });
    };

    const updateQuantity = (itemId, qty) => {
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                quantity: qty < 1 ? 1 : qty,
            }
        }));
    };

    const calculateTotal = () => {
        return Object.values(selectedItems).reduce((sum, item) => {
            const found = items.find((i) => i.id === item.item_id);
            const price = found?.price || 0;
            return sum + price * item.quantity;
        }, 0);
    };

    const handleSubmit = async () => {
        const selected = Object.values(selectedItems);
        if (!selected.length) return alert("Please select items before submitting.");

        try {
            await axios.post(
                `http://localhost:8000/api/v1/${clientId}/orders`,
                { table_id: tableId, items: selected }
            );

            await axios.patch(
                `http://localhost:8000/api/v1/${clientId}/tables/${tableId}/status`,
                { status: "reserved" }
            );

            alert("Order placed successfully!");
            setSelectedItems({});
            onOrderCreated?.();
        } catch (err) {
            console.error("Failed to submit order:", err);
            alert("Error placing order");
        }
    };

    const filteredItems =
        category && category.name !== "All"
            ? items.filter(i => i.category_id === category.id)
            : items;

    return (
        <div className="menu-item-table-container">
            <table className="menu-item-table">
                <thead>
                    <tr>
                        <th style={{ width: "40px" }}></th>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Price (₹)</th>
                        <th>Dietary</th>
                        <th>GST (%)</th>
                        <th>Add-ons</th>
                        <th style={{ width: "80px", textAlign: "center" }}>Qty</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredItems.map((item) => (
                        <tr
                            key={item.id}
                            ref={
                                category && category.id === item.category_id
                                    ? (el) => (categoryRefs.current[category.id] = el)
                                    : null
                            }
                        >
                            <td style={{ textAlign: "center" }}>
                                <input
                                    type="checkbox"
                                    checked={!!selectedItems[item.id]}
                                    onChange={() => toggleItem(item)}
                                />
                            </td>
                            <td>{item.name}</td>
                            <td>{getCategoryName(item.category_id)}</td>
                            <td>{item.price}</td>
                            <td>{item.dietary || "-"}</td>
                            <td>{item.gst || "-"}</td>
                            <td>
                                {Array.isArray(item.add_ons)
                                    ? item.add_ons.join(", ")
                                    : item.add_ons || "-"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                                {selectedItems[item.id] ? (
                                    <input
                                        type="number"
                                        min="1"
                                        value={selectedItems[item.id].quantity}
                                        onChange={(e) =>
                                            updateQuantity(item.id, parseInt(e.target.value) || 1)
                                        }
                                        className="qty-input"
                                    />
                                ) : "-"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="order-form-actions" style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p className="order-total">Total: ₹ {calculateTotal().toFixed(2)}</p>
                <button onClick={handleSubmit} className="btn">Submit Order</button>
            </div>
        </div>
    );
}

export default MenuItemTable;
