import React, { useState, useEffect } from "react";
import axios from "axios";


function MenuPage() {
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [categories, setCategories] = useState([]);
    const [categoryName, setCategoryName] = useState("");
    const [categoryDescription, setCategoryDescription] = useState("");
    const [itemName, setItemName] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [itemPrice, setItemPrice] = useState("");
    const [itemImageUrl, setItemImageUrl] = useState("");
    const [itemsByCategory, setItemsByCategory] = useState({});

    const clientId = localStorage.getItem("clientId");

    useEffect(() => {
        if (clientId) fetchCategories();
    }, [clientId]);

    const fetchCategories = async () => {
        const res = await axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories`);
        setCategories(res.data);
        for (const category of res.data) {
            const itemsRes = await axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories/${category.id}/items`);
            setItemsByCategory((prev) => ({ ...prev, [category.id]: itemsRes.data }));
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!clientId) return alert("Client ID is missing.");
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/${clientId}/menu/categories`, {
                name: categoryName,
                description: categoryDescription,
                client_id: clientId,
            });
            setCategories([...categories, res.data]);
            setItemsByCategory((prev) => ({ ...prev, [res.data.id]: [] }));
            setCategoryName("");
            setCategoryDescription("");
            setShowCategoryForm(false);
        } catch (error) {
            console.error("Error adding category:", error);
        }
    };

    const handleAddMenuItem = async (e) => {
        e.preventDefault();
        if (!clientId || !selectedCategoryId) return alert("Missing info.");
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/${clientId}/menu/items`, {
                name: itemName,
                description: itemDescription,
                price: parseFloat(itemPrice),
                image_url: itemImageUrl,
                client_id: clientId,
                category_id: selectedCategoryId,
            });
            setItemsByCategory((prev) => ({
                ...prev,
                [selectedCategoryId]: [...(prev[selectedCategoryId] || []), res.data],
            }));
            setItemName("");
            setItemDescription("");
            setItemPrice("");
            setItemImageUrl("");
        } catch (error) {
            console.error("Error adding item:", error);
        }
    };

    return (
        <div className="menu-page-layout">
            <div className="sidebar">
                <h4>Categories</h4>
                <ul className="category-list">
                    {categories.map((cat) => (
                        <li
                            key={cat.id}
                            className={selectedCategoryId === cat.id ? "active" : ""}
                            onClick={() => setSelectedCategoryId(cat.id)}
                        >
                            {cat.name}
                        </li>
                    ))}
                </ul>

                <button
                    className="buttonStyle"
                    onClick={() => setShowCategoryForm(!showCategoryForm)}
                >
                    {showCategoryForm ? "Cancel" : "Add Category"}
                </button>

                {showCategoryForm && (
                    <form className="formStyle" onSubmit={handleAddCategory}>
                        <input
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="Category Name"
                            required
                        />
                        <input
                            value={categoryDescription}
                            onChange={(e) => setCategoryDescription(e.target.value)}
                            placeholder="Description"
                        />
                        <button type="submit">Save</button>
                    </form>
                )}
            </div>

            <div className="form-section">
                {selectedCategoryId ? (
                    <>
                        <h3>Add Item to {categories.find((c) => c.id === selectedCategoryId)?.name}</h3>
                        <form className="formStyle" onSubmit={handleAddMenuItem}>
                            <input
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                placeholder="Item Name"
                                required
                            />
                            <input
                                value={itemDescription}
                                onChange={(e) => setItemDescription(e.target.value)}
                                placeholder="Description"
                            />
                            <input
                                type="number"
                                value={itemPrice}
                                onChange={(e) => setItemPrice(e.target.value)}
                                placeholder="Price"
                                required
                            />
                            <input
                                value={itemImageUrl}
                                onChange={(e) => setItemImageUrl(e.target.value)}
                                placeholder="Image URL"
                            />
                            <button type="submit">Add Item</button>
                        </form>

                        <div className="items-preview">
                            {(itemsByCategory[selectedCategoryId] || []).map((item) => (
                                <div className="item-card" key={item.id}>
                                    <div className="item-info">
                                        <strong>{item.name}</strong>
                                        <p>{item.description}</p>
                                        <p>₹{item.price}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p>Select a category to view or add items.</p>
                )}
            </div>
        </div>
    );
}

export default MenuPage;
