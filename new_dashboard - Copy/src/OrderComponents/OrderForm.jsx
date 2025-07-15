import React, { useEffect, useState } from "react";
import axios from "axios";
import Modal from "react-modal";
import { FaUser, FaTable, FaTrash } from "react-icons/fa";
import { BsCash, BsCreditCard, BsQrCode } from "react-icons/bs";
// import api from '../PortExportingPage/api'
// import { useParams } from 'react-router-dom';
Modal.setAppElement("#root");

const OrderForm = ({ table, onOrderCreated }) => {
    const [mode, setMode] = useState(table?.mode || "Dine In");
    const [customerInfoOpen, setCustomerInfoOpen] = useState(false);
    const [customer, setCustomer] = useState({ name: "", phone: "", location: "" });
    const [orderItems, setOrderItems] = useState([]);
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    const [currentItemForNote, setCurrentItemForNote] = useState(null);
    const [noteText, setNoteText] = useState("");
    const [paymentMode, setPaymentMode] = useState("Cash");
    const [splitMode, setSplitMode] = useState(false);
    const [splitPopupOpen, setSplitPopupOpen] = useState(false);
    const [cashPopupOpen, setCashPopupOpen] = useState(false);
    const [cashReceived, setCashReceived] = useState("");
    const [splitAmounts, setSplitAmounts] = useState({ Cash: 0, Card: 0, UPI: 0 });
    const [availableTables, setAvailableTables] = useState([]);
    const [dineInTableModalOpen, setDineInTableModalOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState(table || {});
    const [splitError, setSplitError] = useState("");

    // const { clientId } = useParams();
    const clientId = localStorage.getItem("clientId");

    useEffect(() => {
        setMode(table?.mode || "Dine In");
        setSelectedTable(table || {});
    }, [table]);

    useEffect(() => {
        const handleAddItem = (e) => {
            const { item } = e.detail;
            const exists = orderItems.find(i => i.id === item.id);
            if (exists) {
                setOrderItems(orderItems.map(i =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                ));
            } else {
                setOrderItems([...orderItems, { ...item, quantity: 1, note: "" }]);
            }
        };
        document.addEventListener("add-item", handleAddItem);
        return () => document.removeEventListener("add-item", handleAddItem);
    }, [orderItems]);

    const openNoteEditor = (item) => {
        setCurrentItemForNote(item);
        setNoteText(item.note || "");
        setNotesModalOpen(true);
    };

    const saveNoteToItem = () => {
        setOrderItems(orderItems.map(i =>
            i.id === currentItemForNote.id ? { ...i, note: noteText } : i
        ));
        setNotesModalOpen(false);
    };

    const updateQuantity = (id, delta) => {
        setOrderItems(orderItems.map(i =>
            i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
        ));
    };

    const removeItem = (id) => {
        setOrderItems(orderItems.filter(i => i.id !== id));
    };

    const calculateTotal = () => {
        let total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        if (mode === "Delivery") total += 20;
        if (mode === "Delivery" || mode === "Pick Up") total += 10;
        return total.toFixed(2);
    };
    const handlePlaceOrder = () => {
        if (orderItems.length === 0) {
            alert("Please select at least one item before placing the order.");
            return;
        }

        const totalPaid = Object.values(splitAmounts).reduce((sum, v) => sum + parseFloat(v || 0), 0);
        if (splitMode && Math.abs(totalPaid - calculateTotal()) > 0.01) {
            alert("Split amounts don't match total. Please check.");
            return;
        }

        const payload = {
            tableId: selectedTable?.id,
            status: "new",
            totalPrice: parseFloat(calculateTotal()),
            price: parseFloat(calculateTotal()),
            mode,
            paymentMode,
            customer,
            items: orderItems.map(({ id, quantity, note }) => ({
                itemId: id,
                quantity,
                status: "new",
                note,
            }))


        };
        console.log("Sending payload:", payload);

        axios.post(`http://localhost:8003/saas/${clientId}/dinein/create`, payload)
            .then(res => onOrderCreated?.(res.data))
            .catch(err => {
                console.error(" Order creation failed:", err);
                alert("Order creation failed. Please check console.");
            });
    };

    useEffect(() => {
        if (availableTables.length) {
            console.log("Available Tables:", availableTables.map(t => ({ id: t.id, number: t.table_number, type: t.type })));
        }
    }, [availableTables]);

    return (
        <div className="order-container">
            {/* Header */}
            <div className="order-header">
                <div className="order-tabs">
                    <button
                        className={mode === "Dine In" ? "active" : ""}
                        onClick={async () => {
                            if (mode === "Pick Up") {
                                try {
                                    const res = await axios.get(`http://localhost:8001/saas/${clientId}/tables/read`);


                                    const available = res.data.filter(t => t.status !== "occupied" && t.mode !== "delivery");
                                    setAvailableTables(available);
                                    setDineInTableModalOpen(true);
                                } catch (err) {
                                    console.error("Failed to fetch tables", err);
                                    alert("Unable to load available tables.");
                                }
                            } else {
                                setMode("Dine In");
                            }
                        }}
                    >
                        Dine In
                    </button>

                    <button
                        className={mode === "Delivery" ? "active" : ""}
                        onClick={() => {
                            setMode("Delivery");
                        }}
                    >
                        Delivery
                    </button>

                    <button
                        className={mode === "Pick Up" ? "active" : ""}
                        onClick={() => {
                            setMode("Pick Up");
                        }}
                    >
                        Pick Up
                    </button>
                </div>




                <div className="table-meta">
                    {mode === "Dine In" ? (
                        <div
                            className="table-id clickable"
                            title="Click to change table"
                            onMouseOver={async () => {
                                if (mode === "Dine In") {
                                    try {
                                        const res = await axios.get(`http://localhost:8001/saas/${clientId}/tables/read`);
                                        const available = Array.isArray(res.data)
                                            ? res.data
                                            : res.data?.data || [];

                                        const filtered = available.filter(
                                            t => t.status !== "occupied" && t.mode !== "delivery"
                                        );
                                        setAvailableTables(filtered);

                                        setDineInTableModalOpen(true);
                                    } catch (err) {
                                        console.error("Failed to fetch tables", err);
                                        alert("Unable to load available tables.");
                                    }
                                }
                            }}
                        >
                            <FaTable /> {selectedTable?.table_number || "T1"}


                        </div>

                    ) : (
                        <div className="table-id">Order #{Math.floor(Math.random() * 9000 + 1000)}</div>
                    )}
                    <div className="zone-type">
                        {(mode === "Delivery" || mode === "Pick Up") ? "Charges Apply" : (selectedTable?.type || "Non AC")}
                    </div>
                    <FaUser className="user-icon" onClick={() => setCustomerInfoOpen(true)} />
                </div>
            </div>

            {/* Body */}
            <div className="order-body">
                <div className="order-table-header">
                    <div>ITEMS</div>
                    <div>CHECK ITEMS</div>
                    <div>QTY.</div>
                    <div>PRICE</div>
                </div>
                <ul className="order-items-list">
                    {orderItems.map(item => (
                        <li className="order-row" key={item.id}>
                            <div className="remove-item" onClick={() => removeItem(item.id)}><FaTrash /></div>
                            <div className="item-name" onClick={() => openNoteEditor(item)}>
                                {item.name}
                                {item.note && <small className="note-tag">📝</small>}
                            </div>
                            <div className="qty-control">
                                <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const value = Math.max(1, parseInt(e.target.value) || 1);
                                        setOrderItems(current =>
                                            current.map(i =>
                                                i.id === item.id ? { ...i, quantity: value } : i
                                            )
                                        );
                                    }}
                                />
                                <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                            </div>
                            <div className="price">{(item.price * item.quantity).toFixed(2)}</div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Bottom Section */}
            <div className="order-bottom">
                <div className="split-total">
                    <button className="split-btn" onClick={() => { setSplitMode(true); setSplitPopupOpen(true); }}>Split</button>
                    <div className="total-price">Total ₹{calculateTotal()}</div>
                </div>
                {(mode === "Delivery" || mode === "Pick Up") && (
                    <div className="extra-charges">
                        {mode === "Delivery" && <span style={{ color: 'rgb(244,242,239)' }}>+ ₹20 Delivery Charges</span>}
                        <span style={{ color: 'rgb(244,242,239)' }}>+ ₹10 Container Charges</span>
                    </div>
                )}
                <div className="payment-options">
                    {["Cash", "Card", "UPI"].map(opt => (
                        <button
                            key={opt}
                            className={`payment-btn ${paymentMode === opt ? "selected" : ""} ${opt.toLowerCase()}`}
                            onClick={() => {
                                if (opt === "Cash") {
                                    setCashPopupOpen(true);
                                } else {
                                    setPaymentMode(opt);
                                }
                            }}
                        >
                            {opt === "Cash" && <BsCash />}
                            {opt === "Card" && <BsCreditCard />}
                            {opt === "UPI" && <BsQrCode />}
                            {opt}
                        </button>
                    ))}
                </div>

                <div className="action-buttons">
                    <button className="kot">KOT</button>
                    <button className="print">Bill</button>
                    <button className="bill">eBill</button>
                    <button className="bill" onClick={handlePlaceOrder}>Place Order</button>
                </div>
            </div>

            {/* Customer Info Modal */}
            <Modal
                isOpen={customerInfoOpen}
                onRequestClose={() => setCustomerInfoOpen(false)}
                shouldCloseOnOverlayClick={false}
                className="modal"
                overlayClassName="overlay"
            >

                <h3>Customer Info</h3>
                <input type="text" placeholder="Customer Name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                <input type="text" placeholder="Phone Number" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
                <input type="text" placeholder="Location" value={customer.location} onChange={e => setCustomer({ ...customer, location: e.target.value })} />
                <div className="modal-buttons">
                    <button onClick={() => setCustomerInfoOpen(false)} className="cancel-btn">Cancel</button>
                    <button onClick={() => setCustomerInfoOpen(false)}>Save</button>
                </div>
            </Modal>

            {/* Notes Modal */}
            <Modal
                isOpen={notesModalOpen}
                onRequestClose={() => setNotesModalOpen(false)}
                shouldCloseOnOverlayClick={false}
                className="modal"
                overlayClassName="overlay"
            >

                <h3>Edit Note for {currentItemForNote?.name}</h3>
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} autoFocus />
                <div className="modal-buttons">
                    <button onClick={() => setNotesModalOpen(false)} className="cancel-btn">Cancel</button>
                    <button onClick={saveNoteToItem}>Save Note</button>
                </div>
            </Modal>

            {/* Split Modal */}
            <Modal
                isOpen={splitPopupOpen}
                onRequestClose={() => setSplitPopupOpen(false)}
                shouldCloseOnOverlayClick={false}
                className="modal"
                overlayClassName="overlay"
            >

                <h3>Split Payment</h3>
                <div>Total: ₹{calculateTotal()}</div>
                {["Cash", "Card", "UPI"].map(mode => (
                    <div key={mode} className="split-entry">


                        <label>{mode}:</label>
                        <input
                            type="number"
                            min="0"
                            value={splitAmounts[mode]}
                            onFocus={() => {
                                const total = parseFloat(calculateTotal());
                                const others = Object.entries(splitAmounts)
                                    .filter(([key]) => key !== mode)
                                    .reduce((sum, [, val]) => sum + (parseFloat(val) || 0), 0);
                                const remaining = Math.max(total - others, 0);
                                setSplitAmounts(prev => ({ ...prev, [mode]: remaining }));
                            }}
                            onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setSplitAmounts(prev => ({ ...prev, [mode]: value }));
                            }}
                        />
                    </div>
                ))}
                {splitError && (
                    <div className="split-error">
                        {splitError}
                    </div>
                )}
                <div className="modal-buttons">
                    <button onClick={() => setSplitPopupOpen(false)} className="cancel-btn">Cancel</button>
                    <button
                        onClick={() => {
                            const total = parseFloat(calculateTotal());
                            const enteredTotal = Object.values(splitAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

                            if (enteredTotal < total) {
                                setSplitError(`⚠️ Entered amount ₹${enteredTotal} is less than total ₹${total}.`);
                                return;
                            }

                            setSplitError(""); // Clear previous error
                            setSplitPopupOpen(false);
                        }}
                    >
                        Done
                    </button>

                </div>
            </Modal>

            {/* Cash Modal */}
            <Modal
                isOpen={cashPopupOpen}
                onRequestClose={() => setCashPopupOpen(false)}
                shouldCloseOnOverlayClick={false}
                className="modal"
                overlayClassName="overlay"
            >

                <h3>Cash Payment</h3>
                <div><strong>Total Bill:</strong> ₹{calculateTotal()}</div>
                <input type="number" placeholder="Amount Received" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} />
                {parseFloat(cashReceived) >= parseFloat(calculateTotal()) && (
                    <div style={{ marginTop: "10px", fontWeight: "bold" }}>
                        Return Amount: ₹{(parseFloat(cashReceived) - parseFloat(calculateTotal())).toFixed(2)}
                    </div>
                )}
                {parseFloat(cashReceived) < parseFloat(calculateTotal()) && cashReceived !== "" && (
                    <div style={{ marginTop: "10px", color: "red" }}>
                        Amount received is less than total.
                    </div>
                )}
                <div className="modal-buttons">
                    <button onClick={() => setCashPopupOpen(false)} className="cancel-btn">Cancel</button>
                    <button
                        onClick={() => {
                            if (parseFloat(cashReceived) >= parseFloat(calculateTotal())) {
                                setPaymentMode("Cash");
                                setSplitMode(false);
                                setCashPopupOpen(false);
                            } else {
                                alert("Received amount must be greater than or equal to bill total.");
                            }
                        }}
                    >Confirm</button>
                </div>
            </Modal>


            {/* Pickup Table Selecting */}
            <Modal
                isOpen={dineInTableModalOpen}
                onRequestClose={() => setDineInTableModalOpen(false)}
                className="modal"
                overlayClassName="overlay"
            >
                <h3>Select a Dine In Table</h3>
                <div className="grouped-table-list">
                    {["AC", "Non AC"].map(group => {
                        const groupKey = group.toLowerCase().replace(/\s/g, "");

                        const filtered = availableTables
                            .filter(t => {
                                const typeRaw = t.location_zone || "Non AC";
                                const typeNormalized = typeRaw.toLowerCase().replace(/[\s-]/g, "");
                                return typeNormalized === groupKey;
                            })
                            .sort((a, b) => {
                                const extractParts = (str) => {
                                    const match = (str || "").match(/^([A-Za-z]+)(\d+)$/);
                                    return match ? [match[1], parseInt(match[2])] : ["", 0];
                                };

                                const valA = a.table_number || a.name || "";
                                const valB = b.table_number || b.name || "";

                                const [prefixA, numA] = extractParts(valA);
                                const [prefixB, numB] = extractParts(valB);

                                if (prefixA === prefixB) {
                                    return numA - numB;
                                } else {
                                    return prefixA.localeCompare(prefixB);
                                }
                            });



                        if (filtered.length === 0) return null;

                        return (
                            <div className="table-group" key={group}>
                                <h4>{group} Tables</h4>
                                <div className="table-grid">
                                    {filtered.map(t => (
                                        <div
                                            key={t.id}
                                            className="table-option"
                                            onClick={() => {
                                                setMode("Dine In");
                                                setSelectedTable({
                                                    id: t.id,
                                                    table_number: t.table_number || t.name,
                                                    type: t.location_zone || "Non AC",
                                                    mode: "Dine In",
                                                });


                                                setDineInTableModalOpen(false);
                                            }}
                                        >
                                            {t.table_number || t.name}


                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal>

        </div>
    );
};

export default OrderForm;
