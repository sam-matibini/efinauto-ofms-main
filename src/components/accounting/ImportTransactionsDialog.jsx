import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";

export default function ImportTransactionsDialog({ open, onClose }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (fileType !== 'csv' && fileType !== 'xlsx' && fileType !== 'xls') {
        toast.error("Please upload a CSV or Excel file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setImporting(true);
    try {
      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      // Extract data from file
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: {
          type: "object",
          properties: {
            transaction_date: { type: "string" },
            transaction_type: { type: "string" },
            category: { type: "string" },
            amount: { type: "number" },
            description: { type: "string" },
            reference_number: { type: "string" },
            customer_name: { type: "string" },
            payment_method: { type: "string" },
            status: { type: "string" }
          }
        }
      });

      if (extractResult.status === 'error') {
        toast.error(`Import failed: ${extractResult.details}`);
        setImporting(false);
        return;
      }

      // Bulk create transactions
      const transactions = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];
      const transactionsWithCompany = transactions.map(t => ({
        ...t,
        company_id: selectedCompanyId,
        transaction_number: t.reference_number || `IMP-${Date.now()}`,
        status: t.status || 'completed'
      }));

      await base44.entities.Transaction.bulkCreate(transactionsWithCompany);

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Successfully imported ${transactions.length} transactions!`);
      onClose();
      setFile(null);
    } catch (error) {
      toast.error("Import failed: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      ['transaction_date', 'transaction_type', 'category', 'amount', 'description', 'reference_number', 'customer_name', 'payment_method', 'status'],
      ['2025-01-15', 'sale_revenue', 'revenue', '1500', 'Vehicle sale', 'SALE-001', 'John Doe', 'credit_card', 'completed'],
      ['2025-01-16', 'parts_purchase', 'expense', '500', 'Parts purchase', 'PO-001', 'Supplier Inc', 'bank_transfer', 'completed']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions-import-template.csv';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV/Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              File Requirements
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 ml-5 list-disc">
              <li>Accepted formats: CSV, XLSX, XLS</li>
              <li>Required columns: transaction_date, amount, category</li>
              <li>Optional columns: transaction_type, description, reference_number, customer_name, payment_method, status</li>
              <li>Date format: YYYY-MM-DD</li>
              <li>Category: revenue or expense</li>
            </ul>
          </div>

          <div>
            <Button variant="outline" onClick={downloadTemplate} className="w-full mb-4">
              <Download className="w-4 h-4 mr-2" />
              Download Template CSV
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Select File</Label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">CSV or Excel file</p>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? 'Importing...' : 'Import Transactions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}