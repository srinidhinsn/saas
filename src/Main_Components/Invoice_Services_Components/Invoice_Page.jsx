import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const InvoiceModal = ({ order, onClose }) => {
  if (!order) return null;

  const { clientId } = useParams();
  const [documentNumber, setDocumentNumber] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper: safe numeric conversion
  const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);

  // Fetch invoice details (document number + payment methods)
  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setLoading(true);
        const url = new URL(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`
        );

        // Append query params
        url.searchParams.append("clientid", clientId);
        url.searchParams.append("orderid", order.id.toString());

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        const data = await response.json();

        // Extract invoice info safely
        const invoices = data?.data || [];
        const invoice = invoices.find(
            (inv) =>
              inv.order_id?.toString() === order.id.toString() ||
              inv.orderid?.toString() === order.id.toString()
          );
          
          if (invoice) {
            setDocumentNumber(
              invoice.status?.toLowerCase() === "draft"
                ? "Draft"
                : invoice.document_number || invoice.documentnumber || ""
            );
            setPaymentMethods(invoice.payment_method || invoice.paymentmethod || []);
          }
          else {
          setDocumentNumber("");
          setPaymentMethods([]);
        }
      } catch (err) {
        console.error("Failed to fetch invoice data:", err);
        setDocumentNumber("");
        setPaymentMethods([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [order.id, clientId]);

  // Calculate totals dynamically
  const subtotal = (order.items || []).reduce(
    (acc, item) => acc + safeNum(item.price) * safeNum(item.quantity),
    0
  );

  const totalAmount = subtotal;

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  const orderTime = order.created_at
    ? new Date(order.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
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
            top: "5px",
            right: "10px",
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
          }}
        >
          &times;
        </button>

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading invoice details...</p>
        ) : (
          <div className="invoice-container">
            {/* Header */}
            <div className="invoice-header">
              <div className="header-content">
                <div>
                  <h1 className="restaurant-name">{clientId}</h1>
                  {/* <p className="restaurant-info">Phone: +91-8939614323</p> */}
                </div>
                <div className="text-right">
                  <h2 className="invoice-title">INVOICE</h2>
                  <p className="restaurant-info">
                    Invoice #: <span>{documentNumber || "N/A"}</span>
                  </p>
                  <p className="restaurant-info">
                    Date: <span>{orderDate}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="customer-info">
              <div className="grid">
                <div>
                  <h3 className="section-title">Bill To:</h3>
                  <div className="info-text">
                    <p>
                      Table: <b>{order.table_name || "N/A"}</b>
                    </p>
                    {/* <p>
                      Waiter: <b>{order.server_name || "N/A"}</b>
                    </p>
                    <p>
                      Guests: <b>{order.guest_count || "N/A"}</b>
                    </p> */}
                  </div>
                </div>
                <div>
                  <h3 className="section-title">Order Details:</h3>
                  <div className="info-text">
                    <p>Time: {orderTime}</p>
                    <p >
                      Payment Method:{" "}
                    <span style={{fontSize:'10px',fontWeight:'600'}}>
                    {paymentMethods.length > 0 ? (
                        paymentMethods.map((p, i) => (
                          <span key={i}>
                            {p.method} ₹{safeNum(p.amount).toFixed(2)}
                            {i + 1 !== paymentMethods.length ? ", " : ""}
                          </span>
                        ))
                      ) : (
                        <span>{order.payment_method || "N/A"}</span>
                      )}
                    </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="invoice-items">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center" }}>
                        No items found
                      </td>
                    </tr>
                  ) : (
                    order.items.map((item) => (
                      <tr key={item.item_id}>
                        <td>{item.item_name || "Unnamed"}</td>
                        <td>{safeNum(item.quantity)}</td>
                        <td>₹{safeNum(item.price).toFixed(2)}</td>
                        <td>₹{(safeNum(item.price) * safeNum(item.quantity)).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Totals */}
              <div className="totals">
                <div className="totals-box">
                  <div className="flex-between">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="total-amount">
                    <span>Total Amount:</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="footer">
              <div className="footer-text">
                <p>Thank you for dining with us!</p>
                <p>@inspiritengineering</p>
              </div>
              <div className="footer-buttons no-print">
                {/* <button onClick={() => window.print()} className="btn-blue">
                  🖨️ Print Invoice
                </button>
                <button
                  onClick={() => alert("Email invoice sent!")}
                  className="btn-orange"
                >
                  📧 Email Invoice
                </button> */}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceModal;
