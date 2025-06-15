// import React from "react";

// const OrderCard = ({ order, onStatusChange }) => {
//   const timeAgo = (createdAt) => {
//   const utcDate = new Date(createdAt);
//   const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000); // convert to local

//   const now = new Date();
//   const diffMs = now - localDate;
//   const minutes = Math.floor(diffMs / 60000);
//   const hours = Math.floor(minutes / 60);
//   const days = Math.floor(hours / 24);

//   if (minutes < 1) return "Just now";
//   if (minutes < 60) return `${minutes} min ago`;
//   if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
//   return `${days} day${days > 1 ? "s" : ""} ago`;
// };




//   return (
//     <div className="border rounded p-4 shadow-md bg-white w-full sm:w-80">
//       <h4 className="text-md font-bold mb-1">🪑 Table: {order.table_number}</h4>
//       <p className="text-sm text-gray-500 mb-2">Placed: {timeAgo(order.created_at)}</p>

//       <ul className="text-sm mb-3">
//         {order.items.map((item, idx) => (
//           <li key={idx}>
//             {item.name} × {item.quantity}
//           </li>
//         ))}
//       </ul>

//       <div className="flex justify-between items-center">
//         <span
//           className={`text-xs font-semibold px-2 py-1 rounded ${
//             order.status === "pending" ? "bg-yellow-200" : "bg-blue-200"
//           }`}
//         >
//           {order.status.toUpperCase()}
//         </span>

//         <div className="space-x-2">
//           {order.status === "pending" && (
//             <button
//               onClick={() => onStatusChange(order.order_id, "preparing")}
//               className="text-sm bg-yellow-600 text-white px-2 py-1 rounded"
//             >
//               Start
//             </button>
//           )}
//           {order.status !== "served" && (
//             <button
//               onClick={() => onStatusChange(order.order_id, "served")}
//               className="text-sm bg-green-600 text-white px-2 py-1 rounded"
//             >
//               Serve
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OrderCard;











import React from "react";
import '../../styles/OrderCard.css';

const OrderCard = ({ order, onStatusChange }) => {
  const timeAgo = (createdAt) => {
    const utcDate = new Date(createdAt);
    const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);

    const now = new Date();
    const diffMs = now - localDate;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="order-card">
      <div className="order-header">
        <h4 className="table-number">🪑 Table: {order.table_number}</h4>
        <span className={`status-badge ${order.status}`}>{order.status.toUpperCase()}</span>
      </div>

      <p className="time-placed">Placed: {timeAgo(order.created_at)}</p>

      <ul className="items-list">
        {order.items.map((item, idx) => (
          <li key={idx}>{item.name} × {item.quantity}</li>
        ))}
      </ul>

      <div className="action-buttons">
        {order.status === "pending" && (
          <button
            onClick={() => onStatusChange(order.order_id, "preparing")}
            className="start-btn"
          >
            Start
          </button>
        )}
        {order.status !== "served" && (
          <button
            onClick={() => onStatusChange(order.order_id, "served")}
            className="serve-btn"
          >
            Serve
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderCard;