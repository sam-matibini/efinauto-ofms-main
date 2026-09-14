import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Download, FileSpreadsheet, FileText, Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/api/supabaseClient";

export default function BillOfSaleExport({ sales, company }) {
  const [exporting, setExporting] = useState(false);
  const [bulkPdfOpen, setBulkPdfOpen] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStatus, setPdfStatus] = useState([]);
  const [generatingPdfs, setGeneratingPdfs] = useState(false);

  const exportColumns = [
    { label: "Sale #", accessor: (s) => s.sale_number },
    { label: "BOS #", accessor: (s) => s.bos_number || "" },
    { label: "BOS Status", accessor: (s) => s.bos_status || "" },
    { label: "PST Exempt", accessor: (s) => s.pst_exempt ? "Yes" : "No" },
    { label: "PST Exempt Reason", accessor: (s) => s.pst_exempt_reason || "" },
    { label: "Sale Date", accessor: (s) => s.sale_date || "" },
    { label: "Sale Type", accessor: (s) => s.sale_type || "domestic" },
    { label: "Customer Name", accessor: (s) => s.customer_name },
    { label: "Customer Phone", accessor: (s) => s.customer_phone || "" },
    { label: "Customer Email", accessor: (s) => s.customer_email || "" },
    { label: "Customer Address", accessor: (s) => s.customer_address || "" },
    { label: "Customer City", accessor: (s) => s.customer_city || "" },
    { label: "Province", accessor: (s) => s.province || "" },
    { label: "Postal Code", accessor: (s) => s.customer_postal_code || "" },
    { label: "Vehicle Details", accessor: (s) => s.vehicle_details },
    { label: "VIN", accessor: (s) => s.vehicle_vin || "" },
    { label: "Vehicle Year", accessor: (s) => s.vehicle_year || "" },
    { label: "Vehicle Color", accessor: (s) => s.vehicle_color || "" },
    { label: "Mileage", accessor: (s) => s.vehicle_mileage || "" },
    { label: "Sale Price", accessor: (s) => s.sale_price || 0 },
    { label: "GST", accessor: (s) => s.tax_gst || 0 },
    { label: "PST", accessor: (s) => s.tax_pst || 0 },
    { label: "HST", accessor: (s) => s.tax_hst || 0 },
    { label: "Total Tax", accessor: (s) => s.tax_total || 0 },
    { label: "Grand Total", accessor: (s) => s.grand_total || 0 },
    { label: "Total Paid", accessor: (s) => s.total_paid || 0 },
    { label: "Balance Due", accessor: (s) => s.balance_due || 0 },
    { label: "Payment Status", accessor: (s) => s.payment_status || "" },
    { label: "Status", accessor: (s) => s.status || "" },
    { label: "Salesman", accessor: (s) => s.salesman || "" },
    { label: "Salesman Phone", accessor: (s) => s.salesman_phone || "" },
    { label: "Notes", accessor: (s) => s.notes || "" },
  ];

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = exportColumns.map(col => col.label).join(",");
      const rows = sales.map(item => 
        exportColumns.map(col => {
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
      link.download = `bills_of_sale_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${sales.length} Bills of Sale to CSV`);
    } catch (error) {
      toast.error("Failed to export data");
    }
    setExporting(false);
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      const headers = exportColumns.map(col => `<th style="background:#1e293b;color:white;padding:8px;border:1px solid #ccc;">${col.label}</th>`).join("");
      const rows = sales.map(item => 
        `<tr>${exportColumns.map(col => {
          let value = col.accessor(item);
          if (value === null || value === undefined) value = "";
          return `<td style="padding:6px;border:1px solid #ccc;">${value}</td>`;
        }).join("")}</tr>`
      ).join("");
      
      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"><style>table{border-collapse:collapse;}</style></head>
        <body>
          <h2>Bills of Sale - ${company?.name || 'Export'}</h2>
          <p>Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
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
      link.download = `bills_of_sale_${format(new Date(), 'yyyy-MM-dd')}.xls`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${sales.length} Bills of Sale to Excel`);
    } catch (error) {
      toast.error("Failed to export data");
    }
    setExporting(false);
  };

  const generateBillOfSaleHTML = (sale) => {
    const isExport = sale.sale_type === 'export';
    const companyAddress = [company?.address, company?.city, company?.province, company?.postal_code, company?.country].filter(Boolean).join(', ');
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        ${company?.logo_url ? `<div style="text-align:center;margin-bottom:15px;"><img src="${company.logo_url}" style="height:80px;" /></div>` : ''}
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px;">
          <h2 style="margin:0;">${company?.name || 'Company'}</h2>
          <p style="margin:5px 0;font-size:12px;">${companyAddress}</p>
          <p style="margin:5px 0;font-size:12px;">Tel: ${company?.phone || ''} | Email: ${company?.email || ''}</p>
          <p style="margin:5px 0;font-size:11px;font-weight:bold;">GST#: ${company?.gst_number || ''} | PST#: ${company?.pst_number || ''} | Dealer#: ${company?.dealer_permit_number || ''}</p>
        </div>
        <div style="text-align:center;">
          <h1 style="margin:15px 0;">BILL OF SALE</h1>
          ${sale.bos_number ? `<div style="border:2px solid #333;display:inline-block;padding:10px;margin:10px 0;background:#f9fafb;"><p style="margin:0;font-size:10px;font-weight:bold;">BOS NUMBER</p><p style="margin:5px 0;font-size:16px;font-weight:bold;font-family:monospace;">${sale.bos_number}</p></div>` : ''}
          <p style="margin:10px 0;"><span style="background:${isExport ? '#dcfce7' : '#dbeafe'};padding:5px 15px;border-radius:4px;">${isExport ? 'EXPORT SALE' : 'DOMESTIC SALE'}</span></p>
        </div>
        
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #333;"><strong>Purchaser:</strong> ${sale.customer_name}</td><td style="padding:8px;border-bottom:1px solid #333;"><strong>Date:</strong> ${sale.sale_date || ''}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #333;"><strong>Address:</strong> ${sale.customer_address || ''}</td><td style="padding:8px;border-bottom:1px solid #333;"><strong>Phone:</strong> ${sale.customer_phone || ''}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #333;"><strong>City:</strong> ${sale.customer_city || ''}, ${sale.province || ''} ${sale.customer_postal_code || ''}</td><td style="padding:8px;border-bottom:1px solid #333;"><strong>Email:</strong> ${sale.customer_email || ''}</td></tr>
        </table>

        <table style="width:100%;border:2px solid #333;border-collapse:collapse;margin:20px 0;">
          <tr style="background:#f3f4f6;"><th style="padding:10px;border:1px solid #333;text-align:left;">Vehicle</th><th style="padding:10px;border:1px solid #333;">Year</th><th style="padding:10px;border:1px solid #333;">Color</th><th style="padding:10px;border:1px solid #333;">Mileage</th></tr>
          <tr><td style="padding:10px;border:1px solid #333;">${sale.vehicle_details}</td><td style="padding:10px;border:1px solid #333;text-align:center;">${sale.vehicle_year || ''}</td><td style="padding:10px;border:1px solid #333;text-align:center;">${sale.vehicle_color || ''}</td><td style="padding:10px;border:1px solid #333;text-align:center;">${sale.vehicle_mileage || ''}</td></tr>
          <tr><td colspan="4" style="padding:10px;border:1px solid #333;"><strong>VIN:</strong> ${sale.vehicle_vin || ''}</td></tr>
        </table>

        <table style="width:50%;border:2px solid #333;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border:1px solid #333;"><strong>Sale Price</strong></td><td style="padding:8px;border:1px solid #333;text-align:right;">$${(sale.sale_price || 0).toLocaleString()}</td></tr>
          <tr><td style="padding:8px;border:1px solid #333;"><strong>GST/HST</strong></td><td style="padding:8px;border:1px solid #333;text-align:right;">$${((sale.tax_gst || 0) + (sale.tax_hst || 0)).toFixed(2)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #333;"><strong>PST${sale.pst_exempt ? ' <span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:10px;">EXEMPT</span>' : ''}</strong></td><td style="padding:8px;border:1px solid #333;text-align:right;">$${(sale.tax_pst || 0).toFixed(2)}</td></tr>
          ${sale.pst_exempt && sale.pst_exempt_reason ? `<tr><td colspan="2" style="padding:6px;border:1px solid #333;background:#fef3c7;font-size:11px;"><strong>PST Exemption:</strong> ${sale.pst_exempt_reason.replace(/_/g, ' ')}${sale.pst_exempt_reference ? ` | Ref: ${sale.pst_exempt_reference}` : ''}</td></tr>` : ''}
          <tr style="background:#f3f4f6;"><td style="padding:8px;border:1px solid #333;"><strong>Grand Total</strong></td><td style="padding:8px;border:1px solid #333;text-align:right;font-weight:bold;">$${(sale.grand_total || 0).toLocaleString()}</td></tr>
          <tr><td style="padding:8px;border:1px solid #333;"><strong>Balance Due</strong></td><td style="padding:8px;border:1px solid #333;text-align:right;">$${(sale.balance_due || 0).toLocaleString()}</td></tr>
        </table>

        <p style="font-size:10px;text-align:center;margin:20px 0;font-weight:bold;">ALL VEHICLES ARE SOLD WITHOUT ANY WARRANTIES OR GUARANTEES UNLESS STIPULATED IN WRITING</p>
        
        <div style="display:flex;justify-content:space-between;margin-top:40px;">
          <div style="width:45%;"><p><strong>Purchaser's Signature:</strong></p><div style="border-bottom:1px solid #333;height:40px;"></div></div>
          <div style="width:45%;"><p><strong>Seller's Signature:</strong></p><div style="border-bottom:1px solid #333;height:40px;"></div></div>
        </div>
        <p style="text-align:center;font-size:10px;margin-top:30px;color:#666;">Sale #: ${sale.sale_number} | Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}</p>
      </div>
    `;
  };

  const handleBulkPdfExport = async () => {
    if (sales.length === 0) {
      toast.error("No Bills of Sale to export");
      return;
    }

    setGeneratingPdfs(true);
    setPdfProgress(0);
    setPdfStatus([]);

    const statuses = [];
    
    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];
      try {
        const htmlContent = generateBillOfSaleHTML(sale);
        
        // Create a printable window for each bill
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Bill of Sale - ${sale.sale_number}</title>
            <style>
              @media print { body { margin: 0; } }
              body { font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>${htmlContent}</body>
          </html>
        `);
        printWindow.document.close();
        
        statuses.push({ sale_number: sale.sale_number, status: 'success', customer: sale.customer_name });
      } catch (error) {
        statuses.push({ sale_number: sale.sale_number, status: 'error', customer: sale.customer_name, error: error.message });
      }
      
      setPdfProgress(((i + 1) / sales.length) * 100);
      setPdfStatus([...statuses]);
    }

    setGeneratingPdfs(false);
    toast.success(`Generated ${statuses.filter(s => s.status === 'success').length} Bill of Sale documents`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={exporting || sales.length === 0}>
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export to Excel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setBulkPdfOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
            <span className="text-purple-600 font-medium">AI Bulk PDF Export</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={bulkPdfOpen} onOpenChange={setBulkPdfOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Bulk PDF Export
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Generate printable Bill of Sale documents for all {sales.length} sales. Each document will open in a new tab ready for printing or saving as PDF.
            </p>

            {generatingPdfs && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Generating documents...</span>
                  <span>{Math.round(pdfProgress)}%</span>
                </div>
                <Progress value={pdfProgress} className="h-2" />
              </div>
            )}

            {pdfStatus.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {pdfStatus.map((status, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 text-sm">
                    <div>
                      <span className="font-medium">{status.sale_number}</span>
                      <span className="text-gray-500 ml-2">- {status.customer}</span>
                    </div>
                    {status.status === 'success' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setBulkPdfOpen(false)}>
                Close
              </Button>
              <Button 
                onClick={handleBulkPdfExport}
                disabled={generatingPdfs || sales.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generatingPdfs ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate {sales.length} PDFs
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}