import * as XLSX from "xlsx";
import type { Order } from "$lib/types";

export function exportOrdersToExcel(orders: Order[]) {
    if (orders.length === 0) {
        alert("No orders to export.");
        return;
    }

    const exportData = orders.map((order) => ({
        Date: new Date(
            order.order_date || order.created_at || "",
        ).toLocaleDateString(),
        Provider: order.provider,
        Reference: order.sku,
        Description: order.description,
        Amount: order.quantity,
        "Price per unit": order.unit_price,
        Project: order.project_code,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const wscols = [
        { wch: 12 }, // Date
        { wch: 20 }, // Provider
        { wch: 15 }, // Reference
        { wch: 40 }, // Description
        { wch: 10 }, // Amount
        { wch: 15 }, // Price per unit
        { wch: 15 }, // Project
    ];
    ws["!cols"] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `orders_export_${dateStr}.xlsx`);
}
