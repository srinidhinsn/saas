import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const InvoiceModal = ({ order, onClose }) => {
  if (!order) return null;

  const { clientId } = useParams();
  const [documentNumber, setDocumentNumber] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  const safeNum = (num) => (typeof num === "number" && !isNaN(num) ? num : 0);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setLoading(true);

        const url = new URL(
          `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/read_document`
        );
        url.searchParams.append("clientid", clientId);
        url.searchParams.append("orderid", order.id.toString());

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        const data = await response.json();
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
        } else {
          setDocumentNumber("");
          setPaymentMethods([]);
        }
      } catch (err) {
        console.error("Failed to fetch invoice:", err);
        setDocumentNumber("");
        setPaymentMethods([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [order.id, clientId]);

  const subtotal = (order.items || []).reduce(
    (acc, item) => acc + safeNum(item.price) * safeNum(item.quantity),
    0
  );

  const orderDate = new Date(order.created_at).toLocaleDateString();
  const orderTime = new Date(order.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black/50 z-[999]">
      
      {/* Modal Container */}
      <div className="relative w-[90%] max-w-lg max-h-[92vh] overflow-y-auto bg-white shadow-xl rounded-2xl p-6 border border-orange-200">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-2 text-gray-600 hover:text-red-500 text-2xl"
        >
          ✕
        </button>

        {loading ? (
          <p className="text-center text-gray-700 font-medium py-6">
            Loading invoice details...
          </p>
        ) : (
          <>
            {/* Header */}
            <div className="border-b pb-4 mb-4">
              <div className="flex justify-between">
                <h1 className="text-2xl font-bold text-orange-600 capitalize">
                  {clientId}
                </h1>

                <div className="text-right">
                  <h2 className="text-lg font-semibold text-gray-700">INVOICE</h2>
                  <p className="text-sm text-gray-600">
                    Invoice #: <span className="font-medium">{documentNumber || "Draft"}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Date: <span className="font-medium">{orderDate}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Section */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Bill To</h3>
                <p className="text-gray-700 text-sm">
                  Table: <span className="font-semibold">{order.table_name}</span>
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700">Order Info</h3>
                <p className="text-sm text-gray-700">Time: {orderTime}</p>

                <p className="text-sm text-gray-700">
                  Payment:{" "}
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map((p, i) => (
                      <span key={i} className="font-medium">
                        {p.method} ₹{safeNum(p.amount).toFixed(2)}
                        {i + 1 !== paymentMethods.length ? ", " : ""}
                      </span>
                    ))
                  ) : (
                    <span className="font-medium">{order.payment_method || "N/A"}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-sm border">
              <thead className="bg-orange-500 text-white">
                <tr>
                  <th className="py-2">Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {order.items?.map((item) => (
                  <tr key={item.item_id}>
                    <td className="py-2">{item.item_name}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td>₹{safeNum(item.price).toFixed(2)}</td>
                    <td className="font-medium">
                      ₹{(safeNum(item.price) * safeNum(item.quantity)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 border-t pt-3">
              <div className="flex justify-between text-gray-700 text-sm">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-lg font-semibold text-orange-600 mt-2">
                <span>Total:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-500 mt-6">
              Thank you for dining with us ❤️
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoiceModal;
