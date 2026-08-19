import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";

export default function VehicleBulkImportDialog({ open, onClose, onSuccess }) {
  const { selectedCompanyId } = useCompany();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const downloadTemplate = () => {
    const template = `VIN,Stock Number,Invoice Number,Transaction Date,Make,Model,Year,Color,Condition,Purchase Price,Selling Price,Fuel Type,Transmission,Engine Capacity,Features,Vendor Name,Vendor Phone,Vendor Email,Province
1HGBH41JXMN109186,STK-001,INV-001,2024-01-15,Toyota,Camry,2023,Silver,used,25000,32000,petrol,automatic,2.5L,Sunroof|Leather|Backup Camera,ABC Motors,555-0100,abc@example.com,ON
2HGFA16527H123456,STK-002,INV-002,2024-01-16,Honda,Accord,2022,Black,used,23000,29000,petrol,automatic,2.0L,Navigation|Heated Seats,XYZ Auto,555-0200,xyz@example.com,BC
3VWFE21C04M123456,STK-003,INV-003,2024-01-17,Ford,F-150,2024,White,new,35000,42000,diesel,automatic,5.0L,4WD|Tow Package|Bed Liner,Fleet Sales,555-0300,fleet@example.com,AB`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
  };

  const handleImport = async () => {
    if (!file || !selectedCompanyId) {
      toast.error("Please select a file and company");
      return;
    }

    setLoading(true);
    
    try {
      const { file_url } = await supabase.integrations.Core.UploadFile({ file });

      const result = await supabase.integrations.Core.ExtractDataFromUploadedFile({
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
                  condition: { type: "string" },
                  purchase_price: { type: "number" },
                  selling_price: { type: "number" },
                  fuel_type: { type: "string" },
                  transmission: { type: "string" },
                  engine_capacity: { type: "string" },
                  features: { type: "string" },
                  vendor_name: { type: "string" },
                  vendor_phone: { type: "string" },
                  vendor_email: { type: "string" },
                  province: { type: "string" }
                },
                required: ["make", "model", "year"]
              }
            }
          },
          required: ["vehicles"]
        }
      });

      if (result.status === "error" || !result.output?.vehicles) {
        throw new Error(result.details || "Failed to extract data");
      }

      const vehicles = result.output.vehicles;
      
      const companies = await supabase.entities.Company.filter({ id: selectedCompanyId });
      const company = companies[0];

      const imported = [];
      
      for (const v of vehicles) {
        const purchasePrice = Number(v.purchase_price) || 0;
        let taxGst = 0, taxPst = 0, taxHst = 0;

        if (v.province && company?.tax_rates?.[v.province.toUpperCase()]) {
          const rates = company.tax_rates[v.province.toUpperCase()];
          taxGst = Math.round(purchasePrice * (rates.gst || 0) / 100 * 100) / 100;
          taxPst = Math.round(purchasePrice * (rates.pst || 0) / 100 * 100) / 100;
          taxHst = Math.round(purchasePrice * (rates.hst || 0) / 100 * 100) / 100;
        }

        const taxTotal = taxGst + taxPst + taxHst;

        const hasValue = (val) => {
          return val !== null && val !== undefined && String(val).trim() !== '';
        };

        const vehicleData = {
          company_id: selectedCompanyId,
          ownership_type: "dealership_owned",
          status: "in_stock",
          make: v.make,
          model: v.model,
          year: Number(v.year),
          purchase_price: purchasePrice,
          selling_price: Number(v.selling_price) || 0,
          tax_status: "taxable",
          tax_gst: taxGst,
          tax_pst: taxPst,
          tax_hst: taxHst,
          tax_total: taxTotal,
          total_cost: purchasePrice + taxTotal,
          mileage: 0
        };

        if (hasValue(v.condition)) vehicleData.condition = String(v.condition).trim();
        if (hasValue(v.fuel_type)) vehicleData.fuel_type = String(v.fuel_type).trim();
        if (hasValue(v.transmission)) vehicleData.transmission = String(v.transmission).trim();
        if (hasValue(v.vin)) vehicleData.vin = String(v.vin).trim();
        if (hasValue(v.stock_number)) vehicleData.stock_number = String(v.stock_number).trim();
        if (hasValue(v.invoice_number)) vehicleData.invoice_number = String(v.invoice_number).trim();
        if (hasValue(v.transaction_date)) vehicleData.transaction_date = String(v.transaction_date).trim();
        if (hasValue(v.color)) vehicleData.color = String(v.color).trim();
        if (hasValue(v.engine_capacity)) vehicleData.engine = String(v.engine_capacity).trim();
        if (hasValue(v.features)) vehicleData.features = String(v.features).trim();
        if (hasValue(v.vendor_name)) vehicleData.vendor_name = String(v.vendor_name).trim();
        if (hasValue(v.vendor_phone)) vehicleData.vendor_phone = String(v.vendor_phone).trim();
        if (hasValue(v.vendor_email)) vehicleData.vendor_email = String(v.vendor_email).trim();
        if (hasValue(v.province)) vehicleData.province = String(v.province).trim();

        const created = await supabase.entities.Vehicle.create(vehicleData);
        imported.push(created);
      }

      setResults({
        success: true,
        count: imported.length,
        vehicles: imported
      });

      toast.success(`Successfully imported ${imported.length} vehicles`);
      onSuccess?.();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Import failed: " + error.message);
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
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
          <DialogTitle>Bulk Import Vehicles</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!results ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">Required Fields:</p>
                <p className="text-sm text-blue-800">Make, Model, Year</p>
                <p className="text-xs text-blue-700 mt-2">Taxes auto-calculated from Province + Purchase Price</p>
              </div>

              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>

              <div className="border-2 border-dashed rounded-lg p-8">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer block text-center">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  {file ? (
                    <p className="font-semibold">{file.name}</p>
                  ) : (
                    <p className="text-gray-600">Click to upload CSV or Excel</p>
                  )}
                </label>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Vehicles"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              {results.success ? (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Import Successful!</h3>
                  <p className="text-gray-600">Imported {results.count} vehicles</p>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Import Failed</h3>
                  <p className="text-red-600 text-sm">{results.error}</p>
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