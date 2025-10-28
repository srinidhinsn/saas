import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import OrderForm from '../Order_Service_Components/OrderForm'

export default function ClientOrder({ selectedRealm }) {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");
  const realm = selectedRealm || "";
  const [realms, setRealms] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]); const [activeCategory, setActiveCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  // Load realms dynamically once on mount
  useEffect(() => {
    if (!token || !clientId) return;
    axios
      .get(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realms?realm=realm`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setRealms(res.data.data);
        if (res.data.data.length > 0) setRealm(res.data.data[0]);
        setError("");
      })
      .catch(() => setError("Failed to load realms"));
  }, [clientId, token]);

  // Fetch clients by selected realm
  useEffect(() => {
    if (!realm || !token || !clientId) return;

    axios
      .get(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realm`, {
        params: { realm },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setClients(res.data.data.clients);
        setSelectedClient(null);
        setMenuItems([]);
        setError("");
      })
      .catch(() => setError("Failed to load clients"));
  }, [realm, clientId, token]); // Depend on incoming realm prop

// Add this inside ClientOrder.jsx, above useEffect or inside component
const flattenCategoryTree = (tree, level = 0, parentId = null) => {
  let flatList = [];

  tree.forEach(category => {
    flatList.push({
      id: category.id,
      name: category.name,
      level,
      parentId,
      hasChildren: category.subCategories && category.subCategories.length > 0,
    });

    if (category.subCategories && category.subCategories.length > 0) {
      flatList = flatList.concat(flattenCategoryTree(category.subCategories, level + 1, category.id));
    }
  });

  return flatList;
};

  useEffect(() => {
    if (!selectedClient || !token) return;
  
    axios.all([
      axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
    .then(axios.spread((catRes, itemRes) => {
      const allCategory = { id: "all", name: "All", level: 0 };
      const fullTree = catRes.data.data.filter(c => c.name?.toLowerCase() !== "all");
      const flatCategories = flattenCategoryTree(fullTree);
  
      setCategories([allCategory, ...flatCategories]);
      setActiveCategory("all");
  
      const enrichedItems = itemRes.data.data.map(item => {
        const cat = flatCategories.find(c => c.id === item.category_id);
        return {
          ...item,
          category: cat ? cat.name : "Uncategorized"
        };
      });
  
      setItems(enrichedItems);
      setError("");
    }))
    .catch((err) => {
      console.error("Error loading menu/categories:", err);
      setError("Failed to load menu or categories");
    });
  }, [selectedClient, token]);
  
  // Add item to order
  const addItem = (item) => {
    setOrderItems((prev) => {
      const index = prev.findIndex((i) => i.id === item.id);
      if (index >= 0) {
        const newOrder = [...prev];
        newOrder[index].quantity++;
        return newOrder;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  // Remove item or reduce quantity
  const removeItem = (item) => {
    setOrderItems((prev) => {
      const index = prev.findIndex((i) => i.id === item.id);
      if (index < 0) return prev;
      if (prev[index].quantity > 1) {
        const newOrder = [...prev];
        newOrder[index].quantity--;
        return newOrder;
      } else {
        const newItems = [...prev];
        newItems.splice(index, 1);
        return newItems;
      }
    });
  };

  // Calculate total order price
  const total = orderItems.reduce((t, i) => t + i.unit_price * i.quantity, 0);

  // Place order handler (replace alert with real API call if needed)
  const placeOrder = () => {
    alert(
      `Order for ${selectedClient?.name}:\n` +
      orderItems.map((i) => `${i.name} x${i.quantity}`).join("\n") +
      `\nTotal: Rs.${total.toFixed(2)}`
    );
    setOrderItems([]);
  };
  const handleOrderCreated = (data) => {
    console.log("Order placed:", data);
    setOrderItems([]); // clear after order
  };
  const getFilteredItems = () => {
    if (!items || items.length === 0) return [];
    if (activeCategory?.toLowerCase() === "all") {
      return items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return items.filter(
      i => i.category?.toLowerCase() === activeCategory?.toLowerCase() &&
           i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  useEffect(() => {
    if (!menuItems || menuItems.length === 0) return;
  
    // extract unique categories
    const cats = menuItems
      .map(i => i.category)
      .filter(Boolean)
      .map((name, idx) => ({ id: idx, name, parentId: null, hasChildren: false }));
  
    setCategories([{ id: 'all', name: 'All', parentId: null, hasChildren: false }, ...cats]);
    setActiveCategory("all");
  }, [menuItems]);
  const CategoryNode = ({ category, categories, expandedCategories, setExpandedCategories, activeCategory, setActiveCategory }) => {
    return (
      <li
        className={`category-item ${activeCategory === category.name ? "active" : ""}`}
        onClick={() => setActiveCategory(category.name)}
        style={{ cursor: "pointer", padding: "4px 0" }}
      >
        {category.name}
      </li>
    );
  };
    

  const handleItemClick = (item) => {
    let addonItems = [];

    // Treat line_item_id as an array of IDs
    const addonIds = Array.isArray(item.line_item_id) ? item.line_item_id : [];

    // Get all matching add-on items directly
    addonItems = addonIds
      .map(id => menuItems.find(m => String(m.id) === String(id)))
      .filter(Boolean);  // remove null/undefined

    // Dispatch custom event
    document.dispatchEvent(new CustomEvent("add-item", {
      detail: { item, addonItems }
    }));
  };


  return (
    <div className="client-order-page">
    {/* Sidebar */}
    <div className="client-order-sidebar">
      {error && <p className="error-message">{error}</p>}
      <ul className="client-list">
        {clients.length === 0 ? (
          <li>No clients available</li>
        ) : (
          clients.map((c) => (
            <li
              key={c.id}
              className={`client-list-item ${selectedClient?.id === c.id ? "selected" : ""}`}
              onClick={() => setSelectedClient(c)}
            >
              {c.name}
            </li>
          ))
        )}
      </ul>
    </div>

    {/* Main content */}
    <div className="client-order-main">
      <ul className="category-list">
        {categories
          .filter(cat => !cat.parentId)
          .map(cat => (
            <CategoryNode
              key={cat.id}
              category={cat}
              categories={categories}
              expandedCategories={expandedCategories}
              setExpandedCategories={setExpandedCategories}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
            />
          ))}
      </ul>
      <div className="item-pane">
        <div className="grid-layout">
          {getFilteredItems().map(item => (
            <div
              key={item.id}
              className="menu-card"
              onClick={() => handleItemClick(item)}
            >
              <h4>{item.name}</h4>
              <div className="item-price">₹{item.unit_price}</div>
            </div>
          ))}
        </div>
      </div>

      <OrderForm
        table={{ mode: "Dine In" }}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  </div>
);
}
