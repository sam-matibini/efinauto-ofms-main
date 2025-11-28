import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download, Undo2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function VehicleBulkImport({ open, onClose, companyId, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [importedIds, setImportedIds] = useState([]);
  const [undoing, setUndoing] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(fileExt)) {
        toast.error("Please upload a CSV or Excel file");
        return;
      }
      setFile(selectedFile);
      setResults(null);
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
    setProcessing(false);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploading(false);
      setProcessing(true);

      // Extract data from file
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
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
            status: { type: "string" },
            purchase_price: { type: "number" },
            selling_price: { type: "number" },
            fuel_type: { type: "string" },
            transmission: { type: "string" },
            engine_capacity: { type: "string" },
            location: { type: "string" },
            ownership_type: { type: "string" },
            vendor_name: { type: "string" },
            vendor_phone: { type: "string" },
            vendor_email: { type: "string" },
            province: { type: "string" },
            tax_status: { type: "string" },
            tax_gst: { type: "number" },
            tax_pst: { type: "number" },
            tax_hst: { type: "number" },
            tax_total: { type: "number" },
            total_cost: { type: "number" }
          },
          required: ["vin", "make", "model", "year"]
        }
      });

      if (extractResult.status === "error") {
        toast.error("Failed to extract data: " + extractResult.details);
        setProcessing(false);
        return;
      }

      const vehiclesData = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];

      // Prepare vehicles for bulk insert
      const vehiclesToImport = vehiclesData.map(v => ({
        company_id: companyId,
        ownership_type: v.ownership_type || "dealership_owned",
        vin: v.vin,
        stock_number: v.stock_number || "",
        invoice_number: v.invoice_number || "",
        transaction_date: v.transaction_date || "",
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color || "",
        mileage: v.mileage || 0,
        weight: v.weight || 0,
        condition: v.condition || "used",
        status: v.status || "in_stock",
        purchase_price: v.purchase_price || 0,
        selling_price: v.selling_price || 0,
        fuel_type: v.fuel_type || "petrol",
        transmission: v.transmission || "manual",
        engine_capacity: v.engine_capacity || "",
        location: v.location || "",
        vendor_name: v.vendor_name || "",
        vendor_phone: v.vendor_phone || "",
        vendor_email: v.vendor_email || "",
        province: v.province || "",
        tax_status: v.tax_status || "taxable",
        tax_gst: v.tax_gst || 0,
        tax_pst: v.tax_pst || 0,
        tax_hst: v.tax_hst || 0,
        tax_total: v.tax_total || 0,
        total_cost: v.total_cost || 0
      }));

      // Bulk create vehicles
      const createdVehicles = await base44.entities.Vehicle.bulkCreate(vehiclesToImport);
      
      // Store imported IDs for undo functionality
      const ids = createdVehicles.map(v => v.id);
      setImportedIds(ids);

      setResults({
        success: true,
        count: vehiclesToImport.length
      });

      toast.success(`Successfully imported ${vehiclesToImport.length} vehicles!`);
      onImportComplete?.();
      
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import vehicles: " + error.message);
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `vin,stock_number,invoice_number,transaction_date,make,model,year,color,mileage,weight,condition,status,purchase_price,selling_price,fuel_type,transmission,engine_capacity,location,ownership_type,vendor_name,vendor_phone,vendor_email,province,tax_status,tax_gst,tax_pst,tax_hst,tax_total,total_cost
1HGBH41JXMN109186,STK-001,INV-2024-001,2024-01-15,Toyota,Camry,2023,Black,15000,1500,used,in_stock,25000,30000,petrol,automatic,2.5L,Lot A,dealership_owned,Auto Supplier Inc,204-555-1234,supplier@example.com,MB,taxable,1250,1750,0,3000,28000
2HGBH41JXMN109187,STK-002,INV-2024-002,2024-01-20,Honda,Civic,2022,White,20000,1400,used,in_stock,22000,27000,petrol,manual,1.8L,Lot B,dealership_owned,Car Dealers Ltd,416-555-5678,dealer@example.com,ON,taxable,0,0,2860,2860,24860`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicles_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setImportedIds([]);
    onClose();
  };

  const handleUndo = async () => {
    if (importedIds.length === 0) return;
    
    setUndoing(true);
    try {
      for (const id of importedIds) {
        await base44.entities.Vehicle.delete(id);
      }
      toast.success(`Undone import: Deleted ${importedIds.length} vehicles`);
      setImportedIds([]);
      setResults(null);
      setFile(null);
      onImportComplete?.();
    } catch (error) {
      console.error("Undo error:", error);
      toast.error("Failed to undo import: " + error.message);
    } finally {
      setUndoing(false);
    }
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

        <div className="space-y-6 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Import Instructions</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload a CSV or Excel file with vehicle data</li>
              <li>• Required columns: vin, make, model, year</li>
              <li>• Optional columns: stock_number, invoice_number, transaction_date, color, location, mileage, weight, condition, status, prices, fuel_type, transmission</li>
              <li>• Vendor columns: vendor_name, vendor_phone, vendor_email</li>
              <li>• Tax columns: province, tax_status, tax_gst, tax_pst, tax_hst, tax_total, total_cost</li>
              <li>• Download the template below to see the correct format</li>
            </ul>
          </div>

          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Upload File
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={uploading || processing}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileSpreadsheet className="w-4 h-4" />
                {file.name}
              </div>
            )}
          </div>

          {results && (
            <div className={`rounded-lg p-4 ${results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                {results.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900">Import Successful!</h4>
                      <p className="text-sm text-green-800 mt-1">
                        Successfully imported {results.count} vehicle{results.count !== 1 ? 's' : ''} into inventory.
                      </p>
                      {importedIds.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUndo}
                          disabled={undoing}
                          className="mt-3 text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          {undoing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Undoing...
                            </>
                          ) : (
                            <>
                              <Undo2 className="w-4 h-4 mr-2" />
                              Undo Import
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900">Import Failed</h4>
                      <p className="text-sm text-red-800 mt-1">{results.error}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={uploading || processing}>
            {results?.success ? 'Close' : 'Cancel'}
          </Button>
          {!results?.success && (
            <Button
              onClick={handleImport}
              disabled={!file || uploading || processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Vehicles
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}