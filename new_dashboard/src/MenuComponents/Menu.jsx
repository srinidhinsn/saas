// import React, { useEffect, useState, useRef } from "react";
// import axios from "axios";
// // import "../styles/MenuItemList.css";

// function MenuItemSelector({ clientId, category, onQuantityChange }) {
//   const [items, setItems] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [quantities, setQuantities] = useState({});
//   const categoryRefs = useRef({});

//   useEffect(() => {
//     axios.get(`http://localhost:8000/api/v1/${clientId}/menu/items`)
//       .then(res => setItems(res.data));

//     axios.get(`http://localhost:8000/api/v1/${clientId}/menu/categories`)
//       .then(res => setCategories(res.data));
//   }, [clientId]);

//   useEffect(() => {
//     if (category && categoryRefs.current[category.id]) {
//       categoryRefs.current[category.id].scrollIntoView({ behavior: "smooth", block: "start" });
//     }
//   }, [category]);

//   const handleQuantityChange = (itemId, delta) => {
//     setQuantities((prev) => {
//       const newQty = Math.max(0, (prev[itemId] || 0) + delta);
//       const updated = { ...prev, [itemId]: newQty };
//       if (onQuantityChange) onQuantityChange(itemId, newQty);
//       return updated;
//     });
//   };

//   const renderItemCard = (item) => {
//     const qty = quantities[item.id] || 0;
//     return (
//       <div key={item.id} className="menu-item-card">
//         <div className="menu-item-image-wrapper">
//           {item.image_url ? (
//             <img src={item.image_url} alt={item.name} className="menu-item-image" />
//           ) : (
//             <div className="menu-item-image-placeholder">No Image</div>
//           )}
//         </div>
//         <div className="menu-item-info">
//           <h4 className="menu-item-name">{item.name}</h4>
//           <p className="menu-item-price">₹{item.price}</p>
//           {item.description && <p className="menu-item-desc">{item.description}</p>}
//         </div>
//         <div className="menu-item-actions">
//           <button onClick={() => handleQuantityChange(item.id, -1)} className="btn-edit">-</button>
//           <span>{qty}</span>
//           <button onClick={() => handleQuantityChange(item.id, 1)} className="btn-delete">+</button>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="menu-item-list">
//       <div className="menu-item-header">
//         <h3 className="menu-item-title">
//           {category ? `Items in ${category.name}` : "All Menu Items"}
//         </h3>
//       </div>

//       {category ? (
//         <div ref={(el) => (categoryRefs.current[category.id] = el)}>
//           <div className="menu-item-grid">
//             {items.filter((i) => i.category_id === category.id).map(renderItemCard)}
//           </div>
//         </div>
//       ) : (
//         categories.map((cat) => {
//           const catItems = items.filter(item => item.category_id === cat.id);
//           return (
//             <div key={cat.id} ref={(el) => (categoryRefs.current[cat.id] = el)} id={`category-${cat.id}`}>
//               <h3 className="menu-item-title">{cat.name}</h3>
//               <div className="menu-item-grid">
//                 {catItems.length > 0
//                   ? catItems.map(renderItemCard)
//                   : <p>No items in this category.</p>}
//               </div>
//             </div>
//           );
//         })
//       )}
//     </div>
//   );
// }

// export default MenuItemSelector;



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
