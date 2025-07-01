import React, { useState } from "react";
import axios from "axios";

function AddMenuItemForm({ clientId, categoryId, onAdd }) {
    const emptyItem = {
        name: "",
        description: "",
        price: "",
        imageUrl: "",
        itemId: "",
        dietary: "",
        gst: ""
    };

    const [items, setItems] = useState([{ ...emptyItem }]);

    const handleChange = (index, field, value) => {
        const updatedItems = [...items];
        updatedItems[index][field] = value;
        setItems(updatedItems);
    };

    const handleAddItem = () => {
        setItems([...items, { ...emptyItem }]);
    };

    const handleCancel = (index) => {
        if (items.length === 1) {
            setItems([{ ...emptyItem }]);
        } else {
            const newItems = [...items];
            newItems.splice(index, 1);
            setItems(newItems);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const responses = await Promise.all(
                items.map((item) =>
                    axios.post(`http://localhost:8000/api/v1/${clientId}/menu/items`, {
                        name: item.name,
                        description: item.description,
                        price: parseFloat(item.price),
                        image_url: item.imageUrl,
                        dietary: item.dietary,
                        gst: parseFloat(item.gst),
                        client_id: clientId,
                        category_id: categoryId
                    })
                )
            );

            responses.forEach((res) => onAdd(res.data));
            setItems([{ ...emptyItem }]);
        } catch (err) {
            console.error("Submission error:", err);
            alert("One or more items failed to submit.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="add-menu-item-form">
            {items.map((item, index) => (
                <div key={index} className="form-row">
                    <input value={item.name} onChange={(e) => handleChange(index, "name", e.target.value)} placeholder="Item Name" className="form-input" />
                    <input value={item.description} onChange={(e) => handleChange(index, "description", e.target.value)} placeholder="Description" className="form-input" />
                    <input type="number" value={item.price} onChange={(e) => handleChange(index, "price", e.target.value)} placeholder="Price" className="form-input" />
                    <input value={item.imageUrl} onChange={(e) => handleChange(index, "imageUrl", e.target.value)} placeholder="Image URL" className="form-input" />
                    <input value={item.dietary} onChange={(e) => handleChange(index, "dietary", e.target.value)} placeholder="Dietary" className="form-input" />
                    <input type="number" value={item.gst} onChange={(e) => handleChange(index, "gst", e.target.value)} placeholder="GST (%)" className="form-input" />
                    <button type="button" className="btn-cancel-row" onClick={() => handleCancel(index)}>Cancel</button>
                </div>
            ))}
            <div className="form-actions">
                <button type="button" className="btn-add-another" onClick={handleAddItem}>+ Add Another Item</button>
                <button type="submit" className="btn-add-item">Submit All</button>
            </div>
        </form>
    );
}

export default AddMenuItemForm;
