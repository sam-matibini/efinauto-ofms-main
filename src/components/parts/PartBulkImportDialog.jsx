import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";

export default function PartBulkImportDialog({ open, onClose, onSuccess }) {
  const { selectedCompanyId } = useCompany();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const downloadTemplate = () => {
    const template = `Part Number,Name,Description,Category,Compatible Makes,Compatible Models,Quantity,Reorder Level,Cost Price,Selling Price,Supplier,Location,Vendor Name,Vendor Phone,Vendor Email,Invoice Number,Purchase Date,Province,Tax Status,Notes
P-001,Oil Filter,High-quality oil filter,filters,Toyota;Honda,Camry;Accord,50,10,8.50,15.99,ABC Parts,Shelf A1,ABC Supply,555-1001,vendor@abc.com,INV-100,2025-01-15,ON,taxable,
P-002,Brake Pads,Ceramic brake pads - front,brakes,Ford;Chevrolet,F-150;Silverado,30,5,45.00,89.99,Brake Pro,Shelf B2,Brake Pro Ltd,555-1002,brake@pro.com,INV-101,2025-01-16,BC,taxable,
P-003,Air Filter,Premium cabin air filter,filters,Toyota;Nissan,All models,75,15,6.25,12.99,Filter King,Shelf A3,Filter Supply,555-1003,filter@king.com,INV-102,2025-01-17,AB,zero_rated,Export item`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parts_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/)) {
        toast.error("Please upload a CSV or Excel file");
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedCompanyId) {
      toast.error("Please select a file and company");
      return;
    }

    setImporting(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data using AI
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            parts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  part_number: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  compatible_makes: { type: "string" },
                  compatible_models: { type: "string" },
                  quantity: { type: "number" },
                  reorder_level: { type: "number" },
                  cost_price: { type: "number" },
                  selling_price: { type: "number" },
                  supplier: { type: "string" },
                  location: { type: "string" },
                  vendor_name: { type: "string" },
                  vendor_phone: { type: "string" },
                  vendor_email: { type: "string" },
                  invoice_number: { type: "string" },
                  purchase_date: { type: "string" },
                  province: { type: "string" },
                  tax_status: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extractionResult.status === "error") {
        toast.error(extractionResult.details || "Failed to extract data");
        setImporting(false);
        return;
      }

      const parts = extractionResult.output?.parts || [];
      
      if (parts.length === 0) {
        toast.error("No valid part records found in file");
        setImporting(false);
        return;
      }

      // Prepare parts for import
      const partsToImport = parts.map(p => ({
        company_id: selectedCompanyId,
        part_number: p.part_number || '',
        name: p.name || '',
        description: p.description || '',
        category: p.category || 'other',
        compatible_makes: p.compatible_makes || '',
        compatible_models: p.compatible_models || '',
        quantity: p.quantity || 0,
        reorder_level: p.reorder_level || 5,
        cost_price: p.cost_price || 0,
        selling_price: p.selling_price || 0,
        supplier: p.supplier || '',
        location: p.location || '',
        vendor_name: p.vendor_name || '',
        vendor_phone: p.vendor_phone || '',
        vendor_email: p.vendor_email || '',
        invoice_number: p.invoice_number || '',
        purchase_date: p.purchase_date || null,
        province: p.province || '',
        tax_status: p.tax_status || 'taxable',
        notes: p.notes || ''
      }));

      // Bulk create parts
      const imported = await base44.entities.Part.bulkCreate(partsToImport);

      setResults({
        success: true,
        total: parts.length,
        imported: imported.length,
        failed: parts.length - imported.length
      });

      toast.success(`Successfully imported ${imported.length} parts`);
      onSuccess?.();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import parts: " + error.message);
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Parts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!results ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to Import:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download the CSV template below</li>
                  <li>Fill in your parts data (Excel or CSV)</li>
                  <li>Upload the completed file</li>
                  <li>Review and confirm import</li>
                </ol>
              </div>

              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bulk-import-parts-file"
                />
                <label htmlFor="bulk-import-parts-file" className="cursor-pointer">
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    {file ? (
                      <div>
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-gray-900">Click to upload file</p>
                        <p className="text-sm text-gray-500 mt-1">CSV or Excel (.csv, .xlsx, .xls)</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Parts
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              {results.success ? (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Import Successful!</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                    <p className="text-sm text-green-800">
                      <strong>Total Records:</strong> {results.total}
                    </p>
                    <p className="text-sm text-green-800">
                      <strong>Successfully Imported:</strong> {results.imported}
                    </p>
                    {results.failed > 0 && (
                      <p className="text-sm text-amber-800">
                        <strong>Failed:</strong> {results.failed}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Import Failed</h3>
                  <p className="text-gray-600">{results.error}</p>
                </>
              )}
              <Button onClick={handleClose} className="mt-6">Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}