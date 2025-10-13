import React from "react";

const InvoiceModal = ({ order, onClose }) => {
    if (!order) return null;

    const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);

    // Calculate totals dynamically
    const subtotal = (order.items || []).reduce(
        (acc, item) => acc + safeNum(item.price) * safeNum(item.quantity),
        0
    );
    const tax = subtotal * 0.065;
    const serviceCharge = subtotal * 0.10;
    const totalAmount = subtotal + tax + serviceCharge;

    // Format order date/time
    const orderDate = order.created_at
        ? new Date(order.created_at).toLocaleDateString()
        : new Date().toLocaleDateString();

    const orderTime = order.created_at
        ? new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "N/A";

    return (
        <div
            className="modal-overlay"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000,
            }}
        >
            <div
                className="invoice-body"
                style={{
                    background: "#fff",
                    padding: "15px",
                    borderRadius: "8px",
                    width: "90%",
                    maxWidth: "600px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    position: "relative",
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "2px",
                        right: "10px",
                        background: "none",
                        border: "none",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                    }}
                    aria-label="Close modal"
                >
                    &times;
                </button>

                <div className="invoice-container">
                    {/* Header */}
                    <div className="invoice-header">
                        <div className="header-content">
                            <div>
                                <h1 className="restaurant-name">EASYFOOD</h1>
                                <p className="restaurant-info">Ullal Uppanagar,Railway Layout,Bengaluru</p>
                                <p className="restaurant-info">Phone: +91-8939614323</p>
                            </div>
                            <div className="text-right">
                                <h2 className="invoice-title">INVOICE</h2>
                                <p className="restaurant-info">Invoice #: <span id="invoiceNumber">INV-{new Date().getFullYear()}-{String(order.id).padStart(4, "0")}</span></p>
                                <p className="restaurant-info">Date: <span id="invoiceDate">{orderDate}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="customer-info">
                        <div className="grid">
                            <div>
                                <h3 className="section-title">Bill To:</h3>
                                <div className="info-text">
                                    <p className="font-medium">Table : <span id="tableName">{order.table_name}</span></p>
                                    <p>Waiter: <span id="serverName">{order.server_name || "N/A"}</span></p>
                                    <p>Customer: <span id="guestCount">{order.guest_count || "N/A"}</span></p>
                                </div>
                            </div>
                            <div>
                                <h3 className="section-title">Order Details:</h3>
                                <div className="info-text">
                                    <p>Order Time: <span id="orderTime">{orderTime}</span></p>
                                    <p>Payment Method: <span id="paymentMethod">{order.payment_method || "N/A"}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Items */}
                    <div className="invoice-items">
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th className="th-left">Item Name</th>
                                    <th className="th-center">Qty</th>
                                    <th className="th-right">Price</th>
                                    <th className="th-right">Total</th>
                                </tr>
                            </thead>
                            <tbody id="invoiceItems">
                                {(order.items || []).length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: "center", fontStyle: "italic" }}>
                                            No items to display.
                                        </td>
                                    </tr>
                                )}
                                {(order.items || []).map((item) => (
                                    <tr key={item.item_id}>
                                        <td>
                                            <div className="item-name">{item.item_name || "Unnamed Item"}</div>
                                            <div className="item-desc">{item.description || ""}</div>
                                        </td>
                                        <td className="td-center">{safeNum(item.quantity)}</td>
                                        <td className="td-right">₹{safeNum(item.price).toFixed(2)}</td>
                                        <td className="td-right font-medium">₹{(safeNum(item.price) * safeNum(item.quantity)).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="totals">
                            <div className="totals-box">
                                <div className="flex-between">
                                    <span>Subtotal:</span>
                                    <span id="subtotal">₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex-between">
                                    <span>Tax (6.5%):</span>
                                    <span id="tax">₹{tax.toFixed(2)}</span>
                                </div>
                                <div className="flex-between">
                                    <span>Service Charge (10%):</span>
                                    <span id="serviceCharge">₹{serviceCharge.toFixed(2)}</span>
                                </div>
                                <div className="total-amount">
                                    <span>Total Amount:</span>
                                    <span id="totalAmount">₹{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="footer">
                        <div className="footer-text">
                            <p>Thank you for dining with us!</p>
                            <p>Please visit us again soon. Your feedback is valuable to us.</p>
                            <p> @inspiritengineering</p>
                        </div>
                        {/* Footer buttons inside the modal */}
                        <div className="footer-buttons no-print" >
                            <button onClick={() => window.print()} className="btn-blue" >
                                🖨️ Print Invoice
                            </button>
                            <button onClick={() => alert("Email Invoice")} className="btn-orange">
                                📧 Email Invoice
                            </button>
                            {/* <button onClick={() => alert("New Invoice")} className="btn-green">
                                ➕ New Invoice
                            </button> */}
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);

export default InvoiceModal;
