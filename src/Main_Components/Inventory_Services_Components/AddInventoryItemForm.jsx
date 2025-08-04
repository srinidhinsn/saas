import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useParams } from "react-router-dom";

function AddInventoryItemForm({ onItemCreated }) {
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");

    const emptyItem = {
        inventory_id: "",
        line_item_id: "",
        name: "",
        description: "",
        category_id: "",
        realm: "",
        dietary_type: "",
        availability: "",
        unit: "",
        unit_price: "",
        unit_cst: "",
        unit_gst: "",
        unit_total_price: "",
        price: "",
        cst: "",
        gst: "",
        discount: "",
        total_price: "",
        slug: ""
    };

    const [items, setItems] = useState([{ ...emptyItem }]);
    const [categories, setCategories] = useState([]);
    const [lineItems, setLineItems] = useState([]);

    const buildCategoryPath = (categoryId) => {
        const path = [];
        let currentId = categoryId;

        while (currentId) {
            const current = categories.find(cat => cat.id === currentId);
            if (!current) break;
            path.unshift(current.name.trim().replace(/\s+/g, "_"));
            currentId = current.parent_id;
        }

        return path;
    };

    const generateSlug = (categoryId, itemName) => {
        const catPath = buildCategoryPath(categoryId);
        const item = itemName?.trim().replace(/\s+/g, "_") || "";
        if (!catPath.includes(item)) catPath.push(item);

        return `_${catPath.join("_")}`;
    };



    useEffect(() => {
        if (!token || !clientId) return;

        // Fetch categories
        axios.get(`http://localhost:8002/saas/${clientId}/inventory/read_category`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setCategories(res.data.data || []);
            })
            .catch((err) => {
                console.error("Error fetching categories:", err);
            });

        // Fetch line items
        axios.get(`http://localhost:8002/saas/${clientId}/inventory/read`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setLineItems(res.data.data || []);
            })
            .catch((err) => {
                console.error("Error fetching line items:", err);
            });

    }, [clientId]);

    const handleChange = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = value ?? "";

        //slug generating code 
        const name = field === "name" ? value : updated[index].name;
        const catId = field === "category_id" ? value : updated[index].category_id;

        if (name && catId) {
            updated[index].slug = generateSlug(catId, name);
        }
        setItems(updated);
    };

    // const handleLineItemChange = (index, selectedOptions) => {
    //   const selectedIds = Array.from(selectedOptions).map(option => parseInt(option.value));
    //   const updated = [...items];
    //   updated[index].line_item_id = selectedIds;
    //   setItems(updated);
    // };

    const handleAddItem = () => {
        setItems([...items, { ...emptyItem }]);
    };

    const handleCancel = (index) => {
        if (items.length === 1) {
            setItems([{ ...emptyItem }]);
        } else {
            const updated = [...items];
            updated.splice(index, 1);
            setItems(updated);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let created_by = "unknown", updated_by = "unknown";
        try {
            const decoded = jwtDecode(token);
            created_by = decoded.user_id || "unknown";
            updated_by = decoded.user_id || "unknown";
        } catch { }

        try {
            const responses = await Promise.all(
                items.map(async (item) => {
                    const payload = {
                        ...item,
                        client_id: clientId,
                        line_item_id: item.line_item_id ? [parseInt(item.line_item_id)] : [],
                        availability: parseInt(item.availability) || 0,
                        dietary_type: ["veg", "nonveg"].includes(item.dietary_type) ? item.dietary_type : "veg",
                        unit_price: parseFloat(item.unit_price) || 0,
                        unit_cst: parseFloat(item.unit_cst) || 0,
                        unit_gst: parseFloat(item.unit_gst) || 0,
                        unit_total_price: parseFloat(item.unit_total_price) || 0,
                        price: parseFloat(item.price) || 0,
                        cst: parseFloat(item.cst) || 0,
                        gst: parseFloat(item.gst) || 0,
                        discount: parseFloat(item.discount) || 0,
                        total_price: parseFloat(item.total_price) || 0,
                        created_by,
                        updated_by,
                    };


                    console.log("Submitting:", payload);

                    const response = await axios.post(
                        `http://localhost:8002/saas/${clientId}/inventory/create`,
                        payload,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    return response;
                })
            );

            responses.forEach((res) => onItemCreated?.(res.data));
            setItems([{ ...emptyItem }]);
            alert("Inventory item(s) created successfully.");
        } catch (err) {
            console.error("Submit error:", err.response?.data || err);
            alert("Error while creating inventory item(s).");
        }
    };

    if (!token || !clientId) {
        alert("Session expired. Please log in again.");
        return;
    }

    return (
        <form onSubmit={handleSubmit} className="add-menu-item-form">
            {items.map((item, index) => (
                <div key={index} className="form-entry-wrapper">
                    <div className="form-row">
                        <input
                            type="text"
                            value={item.inventory_id || ""}
                            onChange={(e) => handleChange(index, "inventory_id", e.target.value)}
                            placeholder="Inventory ID"
                            className="form-input short"
                        />

                        <select
                            value={item.line_item_id || ""}
                            onChange={(e) => handleChange(index, "line_item_id", e.target.value)}
                            className="form-input"
                        >
                            <option value="">Select Addon</option>
                            {lineItems.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>

                        <input
                            value={item.name || ""}
                            onChange={(e) => handleChange(index, "name", e.target.value)}
                            placeholder="Item Name"
                            className="form-input"
                            required
                        />
                        <input
                            value={item.description || ""}
                            onChange={(e) => handleChange(index, "description", e.target.value)}
                            placeholder="Description"
                            className="form-input"
                        />
                    </div>

                    <div className="form-row">
                        <select
                            value={item.category_id || ""}
                            onChange={(e) => handleChange(index, "category_id", e.target.value)}
                            className="form-input"
                        >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>

                        <input
                            value={item.realm || ""}
                            onChange={(e) => handleChange(index, "realm", e.target.value)}
                            placeholder="Realm"
                            className="form-input"
                        />
                        <select
                            value={item.dietary_type || ""}
                            onChange={(e) => handleChange(index, "dietary_type", e.target.value)}
                            className="form-input"
                        >
                            <option value="">Select Dietary Type</option>
                            <option value="veg">Veg</option>
                            <option value="nonveg">NonVeg</option>
                        </select>

                        <input
                            value={item.availability || ""}
                            onChange={(e) => handleChange(index, "availability", e.target.value)}
                            placeholder="Availability"
                            type="number"
                            className="form-input short"
                        />
                        <input
                            value={item.unit || ""}
                            onChange={(e) => handleChange(index, "unit", e.target.value)}
                            placeholder="Unit (e.g. kg, pcs)"
                            className="form-input short"
                        />
                    </div>

                    <div className="form-row">
                        <input
                            type="number"
                            value={item.unit_price || ""}
                            onChange={(e) => handleChange(index, "unit_price", e.target.value)}
                            placeholder="Unit Price"
                            className="form-input short"
                        />
                        <input
                            type="number"
                            value={item.unit_cst || ""}
                            onChange={(e) => handleChange(index, "unit_cst", e.target.value)}
                            placeholder="Unit CST"
                            className="form-input short"
                        />
                        <input
                            type="number"
                            value={item.unit_gst || ""}
                            onChange={(e) => handleChange(index, "unit_gst", e.target.value)}
                            placeholder="Unit GST"
                            className="form-input short"
                        />
                        <input
                            type="number"
                            value={item.unit_total_price || ""}
                            onChange={(e) => handleChange(index, "unit_total_price", e.target.value)}
                            placeholder="Unit Total Price"
                            className="form-input short"
                        />
                    </div>

                    <div className="form-row">
                        <input
                            type="number"
                            value={item.price || ""}
                            onChange={(e) => handleChange(index, "price", e.target.value)}
                            placeholder="Price"
                            className="form-input short"
                        />
                        <input
                            type="number"
                            value={item.cst || ""}
                            onChange={(e) => handleChange(index, "cst", e.target.value)}
                            placeholder="CST"
                            className="form-input short"
                        />
                        <input
                            type="number"
                            value={item.gst || ""}
                            onChange={(e) => handleChange(index, "gst", e.target.value)}
                            placeholder="GST"
                            className="form-input short"
                        />
                        <input
                            type="number"
                            value={item.discount || ""}
                            onChange={(e) => handleChange(index, "discount", e.target.value)}
                            placeholder="Discount"
                            className="form-input short"
                        />
                        <input
                            type="number"
                            value={item.total_price || ""}
                            onChange={(e) => handleChange(index, "total_price", e.target.value)}
                            placeholder="Total Price"
                            className="form-input short"
                        />
                        <input
                            value={item.slug || ""}
                            onChange={(e) => handleChange(index, "slug", e.target.value)}
                            placeholder="Slug"
                            className="form-input"
                        />
                        <button
                            type="button"
                            className="btn-cancel-row"
                            onClick={() => handleCancel(index)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ))}

            <div className="form-actions">
                <button type="button" className="btn-add-another" onClick={handleAddItem}>
                    + Add Another Item
                </button>
                <button type="submit" className="btn-add-item">
                    Submit
                </button>
            </div>
        </form>
    );
}

export default AddInventoryItemForm;
