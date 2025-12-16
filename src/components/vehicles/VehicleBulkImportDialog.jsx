import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";

export default function VehicleBulkImportDialog({ open, onClose, onSuccess }) {
  const { selectedCompanyId } = useCompany();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const downloadTemplate = () => {
    const template = `VIN,Stock Number,Invoice Number,Transaction Date,Make,Model,Year,Color,Mileage,Weight,Condition,Purchase Price,Selling Price,Location,Fuel Type,Transmission,Engine Capacity,Features,Vendor Name,Vendor Phone,Vendor Email,Province,Tax Status,Notes
1HGBH41JXMN109186,STK-001,INV-001,2025-01-15,Toyota,Camry,2023,Silver,15000,1500,used,25000,32000,Lot A,petrol,automatic,2.5L,"Leather seats, Sunroof",ABC Motors,555-0001,vendor@abc.com,ON,taxable,
2HGFA16527H123456,STK-002,INV-002,2025-01-16,Honda,Accord,2022,Black,22000,1450,used,23000,29000,Lot B,hybrid,automatic,2.0L,"Navigation, Backup camera",XYZ Auto,555-0002,vendor@xyz.com,BC,taxable,
3VWFE21C04W123456,STK-003,INV-003,2025-01-17,Volkswagen,Jetta,2024,White,5000,1400,certified_pre_owned,28000,35000,Lot A,diesel,manual,1.9L,"Premium sound",DEF Supply,555-0003,vendor@def.com,AB,zero_rated,Export vehicle`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle_import_template.csv';
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
            vehicles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vin: { type: "string" },
                  stock_number: { type: "string" },
                  invoice_number: { type: "string" },
                  transaction_date: { type: "string" },
                  make: { type: "string" },
                  model: { type: "string" },
                  year: { type: "number" },
                  color: { type: "string" },
                  mileage: { type: "number" },
                  weight: { type: "number" },
                  condition: { type: "string" },
                  purchase_price: { type: "number" },
                  selling_price: { type: "number" },
                  location: { type: "string" },
                  fuel_type: { type: "string" },
                  transmission: { type: "string" },
                  engine_capacity: { type: "string" },
                  features: { type: "string" },
                  vendor_name: { type: "string" },
                  vendor_phone: { type: "string" },
                  vendor_email: { type: "string" },
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

      const vehicles = extractionResult.output?.vehicles || [];
      
      if (vehicles.length === 0) {
        toast.error("No valid vehicle records found in file");
        setImporting(false);
        return;
      }

      // Prepare vehicles for import
      const vehiclesToImport = vehicles.map(v => ({
        company_id: selectedCompanyId,
        ownership_type: "dealership_owned",
        vin: v.vin || '',
        stock_number: v.stock_number || '',
        invoice_number: v.invoice_number || '',
        transaction_date: v.transaction_date || null,
        make: v.make || '',
        model: v.model || '',
        year: v.year || null,
        color: v.color || '',
        mileage: v.mileage || 0,
        weight: v.weight || 0,
        condition: v.condition || 'used',
        status: 'in_stock',
        purchase_price: v.purchase_price || 0,
        selling_price: v.selling_price || 0,
        location: v.location || '',
        fuel_type: v.fuel_type || 'petrol',
        transmission: v.transmission || 'automatic',
        engine_capacity: v.engine_capacity || '',
        features: v.features || '',
        vendor_name: v.vendor_name || '',
        vendor_phone: v.vendor_phone || '',
        vendor_email: v.vendor_email || '',
        province: v.province || '',
        tax_status: v.tax_status || 'taxable',
        notes: v.notes || ''
      }));

      // Bulk create vehicles
      const imported = await base44.entities.Vehicle.bulkCreate(vehiclesToImport);

      setResults({
        success: true,
        total: vehicles.length,
        imported: imported.length,
        failed: vehicles.length - imported.length
      });

      toast.success(`Successfully imported ${imported.length} vehicles`);
      onSuccess?.();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import vehicles: " + error.message);
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
            Bulk Import Vehicles
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!results ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to Import:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download the CSV template below</li>
                  <li>Fill in your vehicle data (Excel or CSV)</li>
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
                  id="bulk-import-file"
                />
                <label htmlFor="bulk-import-file" className="cursor-pointer">
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
                      Import Vehicles
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