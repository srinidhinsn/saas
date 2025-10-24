import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function ClientOrder() {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");

  const [realms, setRealms] = useState([]);
  const [realm, setRealm] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [error, setError] = useState("");

  // Load realms dynamically once on mount
  useEffect(() => {
    if (!token || !clientId) return;
    axios
      .get(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realms`, {
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
      .then((res) => {
        setClients(res.data.data.clients);
        setSelectedClient(null);
        setMenuItems([]);
        setError("");
      })
      .catch(() => setError("Failed to load clients"));
  }, [realm, clientId, token]);

  // Fetch menu items for selected client
  useEffect(() => {
    if (!selectedClient || !token) return;
    axios
      .get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${selectedClient.id}/menu/read`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMenuItems(res.data.data);
        setOrderItems([]);
        setError("");
      })
      .catch(() => setError("Failed to load menu items"));
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

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h3>Select Realm</h3>
        <select
          value={realm}
          onChange={(e) => setRealm(e.target.value)}
          style={styles.select}
        >
          {realms.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <h3>Clients</h3>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <ul style={styles.list}>
          {clients.length === 0 ? (
            <li>No clients available</li>
          ) : (
            clients.map((c) => (
              <li
                key={c.id}
                style={{
                  ...styles.listItem,
                  ...(selectedClient?.id === c.id ? styles.selected : {}),
                }}
                onClick={() => setSelectedClient(c)}
              >
                {c.name}
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Main content */}
      <div style={styles.main}>
        <div style={styles.menu}>
          <h3>Menu for {selectedClient?.name || "..."}</h3>
          {menuItems.length === 0 ? (
            <p>No menu items</p>
          ) : (
            menuItems.map((item) => (
              <div key={item.id} style={styles.menuItem}>
                <span>
                  {item.name} - Rs.{item.unit_price}
                </span>
                <button onClick={() => addItem(item)} style={styles.button}>
                  Add
                </button>
              </div>
            ))
          )}
        </div>

        <div style={styles.order}>
          <h3>Order Form</h3>
          {orderItems.length === 0 ? (
            <p>No items added</p>
          ) : (
            orderItems.map((item) => (
              <div key={item.id} style={styles.menuItem}>
                <span>
                  {item.name} x {item.quantity} - Rs.
                  {(item.unit_price * item.quantity).toFixed(2)}
                </span>
                <button onClick={() => removeItem(item)} style={styles.button}>
                  Remove
                </button>
              </div>
            ))
          )}
          <div style={styles.orderSummary}>
            <strong>Total: Rs.{total.toFixed(2)}</strong>
            <button
              disabled={orderItems.length === 0}
              onClick={placeOrder}
              style={styles.placeOrderBtn}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    height: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    flex: "0 0 250px",
    borderRight: "1px solid #ccc",
    padding: 10,
    overflowY: "auto",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    padding: 10,
  },
  menu: {
    flex: 1,
    marginRight: 10,
  },
  order: {
    flex: 1,
    borderLeft: "1px solid #ccc",
    paddingLeft: 10,
  },
  list: {
    listStyle: "none",
    padding: 0,
  },
  listItem: {
    padding: 8,
    cursor: "pointer",
    borderBottom: "1px solid #eee",
  },
  selected: {
    backgroundColor: "#d0ebff",
  },
  menuItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 6,
  },
  button: {
    cursor: "pointer",
    padding: "4px 8px",
    backgroundColor: "#007bff",
    border: "none",
    color: "#fff",
    borderRadius: 4,
    fontSize: 14,
  },
  placeOrderBtn: {
    marginTop: 10,
    width: "100%",
    padding: 10,
    backgroundColor: "#28a745",
    border: "none",
    borderRadius: 4,
    fontSize: 16,
    color: "#fff",
    cursor: "pointer",
  },
  select: {
    width: "100%",
    padding: 6,
    marginBottom: 10,
  },
  orderSummary: {
    marginTop: 10,
  },
  '@media(max-width:768px)': {
    page: {
      flexDirection: "column",
    },
    main: {
      flexDirection: "column",
    },
    menu: {
      marginBottom: 10,
    },
  },
};
