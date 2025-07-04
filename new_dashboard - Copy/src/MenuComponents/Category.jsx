import React, { useEffect, useState } from "react";
import axios from "axios";
import '../App.css'
// import "../styles/CategoryList.css";

function CategoryListView({ clientId, onCategorySelect }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios
      .get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
      .then((res) => setCategories(res.data));
  }, [clientId]);

  return (
    <div className="category-list-container">
      <h3 className="category-list-title">Categories</h3>
      <ul className="category-list">
        {categories.map((cat) => (
          <li key={cat.id} className="category-item" onClick={() => onCategorySelect?.(cat)}>
            {cat.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CategoryListView;
