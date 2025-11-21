import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ImportAccountsDialog({ open, onClose, companyId, onImportSuccess }) {
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
          type: "array",
          items: {
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
        }
      });

      if (extractResponse.status === "success" && extractResponse.output) {
        const accounts = Array.isArray(extractResponse.output) ? extractResponse.output : [extractResponse.output];
        
        toast.info(`Creating ${accounts.length} accounts...`);

        // Create accounts
        for (const account of accounts) {
          await base44.entities.Account.create({
            company_id: companyId,
            account_code: account.account_code,
            account_name: account.account_name,
            account_type: account.account_type,
            account_category: account.account_category || 'general',
            balance: account.balance || 0,
            description: account.description || ''
          });
        }

        toast.success(`Successfully imported ${accounts.length} accounts!`);
        onImportSuccess();
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
            <p className="text-sm font-semibold text-blue-900 mb-2">File Format:</p>
            <p className="text-xs text-blue-800">
              Your file should have columns: account_code, account_name, account_type, account_category (optional), balance (optional), description (optional)
            </p>
            <p className="text-xs text-blue-800 mt-1">
              Valid account types: asset, liability, equity, revenue, expense
            </p>
          </div>

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