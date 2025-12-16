import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InventoryExport({ vehicles = [], parts = [], type = "vehicles" }) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportToExcel = (data, filename) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${data.map(row => 
                `<tr>${headers.map(h => `<td>${row[h] || ""}</td>`).join("")}</tr>`
              ).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (type === "vehicles") {
        const exportData = vehicles.map(v => ({
          "Stock Number": v.stock_number || "",
          "VIN": v.vin || "",
          "Make": v.make || "",
          "Model": v.model || "",
          "Year": v.year || "",
          "Color": v.color || "",
          "Mileage": v.mileage || 0,
          "Status": v.status || "",
          "Purchase Price": v.purchase_price || 0,
          "Selling Price": v.selling_price || 0,
          "Location": v.location || "",
          "Vendor": v.vendor_name || "",
          "Condition": v.condition || "",
          "Fuel Type": v.fuel_type || "",
          "Transmission": v.transmission || ""
        }));

        if (format === "csv") {
          exportToCSV(exportData, `vehicles_${timestamp}.csv`);
        } else {
          exportToExcel(exportData, `vehicles_${timestamp}.xls`);
        }
      } else if (type === "parts") {
        const exportData = parts.map(p => ({
          "Part Number": p.part_number || "",
          "Name": p.name || "",
          "Description": p.description || "",
          "Category": p.category || "",
          "Quantity": p.quantity || 0,
          "Reorder Level": p.reorder_level || 0,
          "Cost Price": p.cost_price || 0,
          "Selling Price": p.selling_price || 0,
          "Location": p.location || "",
          "Supplier": p.supplier || "",
          "Compatible Makes": p.compatible_makes || "",
          "Compatible Models": p.compatible_models || ""
        }));

        if (format === "csv") {
          exportToCSV(exportData, `parts_${timestamp}.csv`);
        } else {
          exportToExcel(exportData, `parts_${timestamp}.xls`);
        }
      }

      toast.success(`${type} exported successfully`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}