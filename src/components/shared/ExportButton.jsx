import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ExportButton({ data, columns, filename = "export" }) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = columns.map(col => col.label).join(",");
      const rows = data.map(item => 
        columns.map(col => {
          let value = col.accessor(item);
          if (value === null || value === undefined) value = "";
          if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      );
      
      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} records to CSV`);
    } catch (error) {
      toast.error("Failed to export data");
    }
    setExporting(false);
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      // Create Excel-compatible XML format
      const headers = columns.map(col => `<th>${col.label}</th>`).join("");
      const rows = data.map(item => 
        `<tr>${columns.map(col => {
          let value = col.accessor(item);
          if (value === null || value === undefined) value = "";
          return `<td>${value}</td>`;
        }).join("")}</tr>`
      ).join("");
      
      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
        </html>
      `;
      
      const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split("T")[0]}.xls`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} records to Excel`);
    } catch (error) {
      toast.error("Failed to export data");
    }
    setExporting(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting || data.length === 0}>
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}