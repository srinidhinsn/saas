import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './table-overview.css'

const Sidebar = ({ table, clientId, onClose, onAddItem }) => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories`);
                setCategories(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            }
        };
        fetchCategories();
    }, [clientId]);

    const handleAdd = (item) => {
        onAddItem(item);
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>{table.name || `Table ${table.number}`}</h3>
                <button className="close-btn" onClick={onClose}>✖</button>
            </div>
            <div className="menu-categories">
                {categories.map((cat) => (
                    <div className="category-card" key={cat.id}>
                        <h4>{cat.name}</h4>
                        <p>{cat.description}</p>
                        {/* Simulate a menu item */}
                        <button
                            className="add-btn"
                            onClick={() => handleAdd({ name: cat.name, price: cat.price || 100 })}
                        >
                            Add Item
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default Sidebar