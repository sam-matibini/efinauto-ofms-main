import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, FileSpreadsheet, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function ImportAccountsDialog({ open, onClose, companyId }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(fileType)) {
        toast.error("Please upload a CSV or Excel file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    if (!companyId) {
      toast.error("Please select a company first");
      return;
    }

    setUploading(true);
    toast.info("Uploading file...");

    try {
      // Upload the file first
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResponse.file_url;

      toast.info("Extracting account data...");

      // Extract data from the uploaded file
      const extractResponse = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            account_code: { type: "string" },
            account_name: { type: "string" },
            account_type: { type: "string" },
            account_category: { type: "string" },
            balance: { type: "number" },
            description: { type: "string" }
          },
          required: ["account_code", "account_name", "account_type"]
        }
      });

      if (extractResponse.status === "success" && extractResponse.output) {
        let accounts = extractResponse.output;
        
        // Ensure accounts is an array
        if (!Array.isArray(accounts)) {
          accounts = [accounts];
        }
        
        if (accounts.length === 0) {
          toast.error("No accounts found in the file");
          return;
        }
        
        toast.info(`Creating ${accounts.length} accounts...`);

        let created = 0;
        for (const account of accounts) {
          try {
            await base44.entities.Account.create({
              company_id: companyId,
              account_code: String(account.account_code),
              account_name: String(account.account_name),
              account_type: String(account.account_type).toLowerCase(),
              account_category: account.account_category ? String(account.account_category).toLowerCase() : 'other',
              balance: parseFloat(account.balance) || 0,
              description: account.description ? String(account.description) : ''
            });
            created++;
          } catch (err) {
            console.error(`Failed to create account ${account.account_code}:`, err);
          }
        }

        toast.success(`Successfully imported ${created} accounts!`);
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        onClose();
      } else {
        toast.error(`Failed to extract data: ${extractResponse.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(`Import failed: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const downloadTemplate = () => {
    const headers = ['account_code', 'account_name', 'account_type', 'account_category', 'balance', 'description'];
    const sampleData = [
      ['1000', 'Cash', 'asset', 'cash', '0', 'Operating cash account'],
      ['1100', 'Accounts Receivable', 'asset', 'accounts_receivable', '0', 'Customer receivables'],
      ['2000', 'Accounts Payable', 'liability', 'accounts_payable', '0', 'Supplier payables'],
      ['4000', 'Sales Revenue', 'revenue', 'sales_revenue', '0', 'Vehicle and parts sales']
    ];
    
    const csvContent = [headers, ...sampleData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart_of_accounts_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Chart of Accounts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Upload File (CSV or Excel)</Label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploading}
              className="mt-2"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                {file.name}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">Required Columns:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>account_code</strong> (required) - e.g., 1000, 2000</li>
              <li>• <strong>account_name</strong> (required) - e.g., Cash, Sales Revenue</li>
              <li>• <strong>account_type</strong> (required) - asset, liability, equity, revenue, expense</li>
              <li>• <strong>account_category</strong> (optional) - cash, accounts_receivable, etc.</li>
              <li>• <strong>balance</strong> (optional) - opening balance</li>
              <li>• <strong>description</strong> (optional) - account description</li>
            </ul>
          </div>

          <Button variant="outline" onClick={downloadTemplate} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || uploading} className="bg-blue-600">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}