import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";
import { Badge } from "@/components/ui/badge";

export default function VehicleBulkImportDialog({ open, onClose, onSuccess }) {
  const { selectedCompanyId } = useCompany();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [results, setResults] = useState(null);

  const downloadTemplate = () => {
    const template = `VIN,Stock Number,Invoice Number,Transaction Date,Make,Model,Year,Color,Mileage,Weight,Condition,Purchase Price,Selling Price,Location,Fuel Type,Transmission,Engine Capacity,Features,Vendor Name,Vendor Phone,Vendor Email,Province,Tax Status,Notes
1HGBH41JXMN109186,STK-001,INV-001,2025-01-15,Toyota,Camry,2023,Silver,15000,1500,used,25000,32000,Lot A,petrol,automatic,2.5L,Leather Sunroof,ABC Motors,555-0001,vendor@abc.com,ON,taxable,Great condition
2HGFA16527H123456,STK-002,INV-002,2025-01-16,Honda,Accord,2022,Black,22000,1450,used,23000,29000,Lot B,hybrid,automatic,2.0L,Navigation,XYZ Auto,555-0002,vendor@xyz.com,BC,taxable,
3VWFE21C04M123456,STK-003,INV-003,2025-01-17,Volkswagen,Jetta,2024,White,5000,1400,certified_pre_owned,28000,35000,Lot A,diesel,manual,1.9L,Premium sound,DEF Supply,555-0003,vendor@def.com,AB,zero_rated,Export vehicle`;

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
      setPreviewData(null);
      setErrors([]);
      setResults(null);
    }
  };

  const handleExtract = async () => {
    if (!file || !selectedCompanyId) {
      toast.error("Please select a file and company");
      return;
    }

    setLoading(true);
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
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

      if (result.status === "error" || !result.output?.vehicles) {
        toast.error("Failed to extract data from file");
        setLoading(false);
        return;
      }

      const vehicles = result.output.vehicles;

      if (vehicles.length === 0) {
        toast.error("No vehicle records found in file");
        setLoading(false);
        return;
      }

      // Get company for tax calculation
      const companies = await base44.entities.Company.filter({ id: selectedCompanyId });
      const company = companies[0];

      if (!company) {
        toast.error("Company not found");
        setLoading(false);
        return;
      }

      // Process and validate
      const processed = vehicles.map((v, idx) => {
        const taxes = calculateTaxes(v, company);
        return {
          ...v,
          ...taxes,
          _rowNum: idx + 2
        };
      });

      // Validate
      const validationErrors = [];
      processed.forEach((v) => {
        if (!v.make) validationErrors.push({ row: v._rowNum, field: 'make', message: 'Make is required' });
        if (!v.model) validationErrors.push({ row: v._rowNum, field: 'model', message: 'Model is required' });
        if (!v.year || v.year < 1900 || v.year > 2027) validationErrors.push({ row: v._rowNum, field: 'year', message: 'Valid year required' });
      });

      setPreviewData(processed);
      setErrors(validationErrors);
      setStep(2);
      toast.success(`Extracted ${vehicles.length} records`);
    } catch (error) {
      toast.error("Extraction failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTaxes = (vehicle, company) => {
    if (!vehicle.province || vehicle.tax_status !== 'taxable' || !vehicle.purchase_price) {
      return { tax_gst: 0, tax_pst: 0, tax_hst: 0, tax_total: 0 };
    }

    const provinceCode = vehicle.province.toUpperCase();
    const taxRates = company?.tax_rates?.[provinceCode];
    
    if (!taxRates) {
      return { tax_gst: 0, tax_pst: 0, tax_hst: 0, tax_total: 0 };
    }

    const price = Number(vehicle.purchase_price) || 0;
    const gst = Math.round((price * (taxRates.gst || 0)) / 100 * 100) / 100;
    const pst = Math.round((price * (taxRates.pst || 0)) / 100 * 100) / 100;
    const hst = Math.round((price * (taxRates.hst || 0)) / 100 * 100) / 100;
    const total = gst + pst + hst;

    return { tax_gst: gst, tax_pst: pst, tax_hst: hst, tax_total: total };
  };

  const handleImport = async () => {
    if (!previewData || errors.length > 0) return;

    setLoading(true);
    
    try {
      const vehiclesToCreate = previewData.map(v => ({
        company_id: selectedCompanyId,
        ownership_type: "dealership_owned",
        status: 'in_stock',
        vin: v.vin || '',
        stock_number: v.stock_number || '',
        invoice_number: v.invoice_number || '',
        transaction_date: v.transaction_date || null,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color || '',
        mileage: Number(v.mileage) || 0,
        weight: Number(v.weight) || 0,
        condition: v.condition || 'used',
        purchase_price: Number(v.purchase_price) || 0,
        selling_price: Number(v.selling_price) || 0,
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
        tax_gst: v.tax_gst || 0,
        tax_pst: v.tax_pst || 0,
        tax_hst: v.tax_hst || 0,
        tax_total: v.tax_total || 0,
        total_cost: (Number(v.purchase_price) || 0) + (v.tax_total || 0),
        notes: v.notes || ''
      }));

      const imported = await base44.entities.Vehicle.bulkCreate(vehiclesToCreate);

      setResults({
        success: true,
        total: previewData.length,
        imported: imported.length,
        details: imported.map((v, idx) => ({
          row: idx + 1,
          vehicle: `${v.year} ${v.make} ${v.model}`,
          vin: v.vin || '-',
          status: 'success'
        }))
      });

      setStep(3);
      toast.success(`Successfully imported ${imported.length} vehicles`);
      onSuccess?.();
    } catch (error) {
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
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setErrors([]);
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Vehicles
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Import Guide</h4>
                <p className="text-sm text-blue-800 mb-2">Required fields: Make, Model, Year</p>
                <p className="text-sm text-blue-800">Taxes are auto-calculated based on Province and Purchase Price</p>
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
                        <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-gray-900">Click to upload file</p>
                        <p className="text-sm text-gray-500 mt-1">CSV or Excel</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleClose} variant="outline" className="flex-1">Cancel</Button>
                <Button onClick={handleExtract} disabled={!file || loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting...</> : <><Eye className="w-4 h-4 mr-2" />Preview Data</>}
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Preview */}
          {step === 2 && previewData && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-900">{previewData.length}</p>
                  <p className="text-xs text-blue-700">Total Records</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-900">{previewData.length - errors.length}</p>
                  <p className="text-xs text-green-700">Valid</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-900">{errors.length}</p>
                  <p className="text-xs text-red-700">Errors</p>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">{errors.length} Error(s) - Fix before importing</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-red-800">Row {err.row} • {err.field}: {err.message}</p>
                    ))}
                  </div>
                </div>
              )}

              {errors.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">All records validated successfully</span>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <p className="text-sm font-semibold">Preview ({previewData.length} records)</p>
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Vehicle</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">VIN</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Stock #</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Purchase</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Tax</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((v, idx) => {
                        const hasError = errors.some(e => e.row === v._rowNum);
                        return (
                          <tr key={idx} className={`border-b ${hasError ? 'bg-red-50' : ''}`}>
                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium">{v.year} {v.make} {v.model}</td>
                            <td className="px-3 py-2 font-mono text-xs">{v.vin || '-'}</td>
                            <td className="px-3 py-2 text-xs">{v.stock_number || '-'}</td>
                            <td className="px-3 py-2 text-right">${v.purchase_price?.toLocaleString() || 0}</td>
                            <td className="px-3 py-2 text-right text-xs">${v.tax_total?.toFixed(2) || '0.00'}</td>
                            <td className="px-3 py-2 text-right font-semibold text-blue-600">${((v.purchase_price || 0) + (v.tax_total || 0)).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">Back</Button>
                <Button onClick={handleImport} disabled={errors.length > 0 || loading} className="flex-1 bg-green-600 hover:bg-green-700">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : <><CheckCircle className="w-4 h-4 mr-2" />Import {previewData.length} Vehicles</>}
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Results */}
          {step === 3 && results && (
            <div className="space-y-6">
              <div className="text-center py-4">
                {results.success ? (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Import Successful!</h3>
                    <p className="text-gray-600">Imported {results.imported} vehicles</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Import Failed</h3>
                    <p className="text-red-600">{results.error}</p>
                  </>
                )}
              </div>

              {results.details && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <p className="text-sm font-semibold">Import Details</p>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Vehicle</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">VIN</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.details.map((d, idx) => (
                          <tr key={idx} className="border-b bg-green-50">
                            <td className="px-3 py-2">{d.row}</td>
                            <td className="px-3 py-2 font-medium">{d.vehicle}</td>
                            <td className="px-3 py-2 font-mono text-xs">{d.vin}</td>
                            <td className="px-3 py-2">
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Success
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}