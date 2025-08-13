import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Make this a pure function accepting all data & callbacks via params
export const handleExportOrders = ({
    orders,
    exportDate,
    exportPageOption,
    tablesMap,
    onExportComplete,  // callback to reset modal states in your component
}) => {
    let exportOrders = [...orders];

    if (exportDate) {
        exportOrders = exportOrders.filter((o) =>
            o.created_at.startsWith(exportDate)
        );
    }

    if (exportPageOption === "first") {
        exportOrders = exportOrders.slice(0, 10); // adjust page size if needed
    } else if (exportPageOption === "last") {
        exportOrders = exportOrders.slice(-10);
    }

    if (exportOrders.length === 0) {
        alert("No orders found for selected filters.");
        return;
    }

    const dataToExport = exportOrders.map((order) => ({
        "Order ID": order.id,
        "Table Name": tablesMap[String(order.table_id)] ?? "No Table",
        "Items Count": Array.isArray(order.items) ? order.items.length : 0,
        "Total Price": order.total_price,
        Status: order.status,
        "Created At": order.created_at,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    const exportFileName = `Orders_${exportDate || "all"}_${exportPageOption}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    saveAs(blob, exportFileName);

    if (typeof onExportComplete === "function") onExportComplete();
};
