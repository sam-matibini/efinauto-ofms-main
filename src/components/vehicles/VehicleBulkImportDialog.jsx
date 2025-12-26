import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertTriangle, Eye, ArrowRight, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";
import { Badge } from "@/components/ui/badge";

export default function VehicleBulkImportDialog({ open, onClose, onSuccess }) {
  const { selectedCompanyId } = useCompany();
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Results
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [results, setResults] = useState(null);

  const downloadTemplate = () => {
    const template = `VIN,Stock Number,Invoice Number,Transaction Date,Make*,Model*,Year*,Color,Mileage,Weight,Condition,Purchase Price,Selling Price,Location,Fuel Type,Transmission,Engine Capacity,Features,Vendor Name,Vendor Phone,Vendor Email,Province,Tax Status,Notes
1HGBH41JXMN109186,STK-001,INV-2025-001,2025-01-15,Toyota,Camry,2023,Silver,15000,1500,used,25000,32000,Lot A,petrol,automatic,2.5L,"Leather, Sunroof",ABC Motors,555-0001,vendor@abc.com,ON,taxable,Great condition
2HGFA16527H123456,STK-002,INV-2025-002,2025-01-16,Honda,Accord,2022,Black,22000,1450,used,23000,29000,Lot B,hybrid,automatic,2.0L,Navigation,XYZ Auto,555-0002,vendor@xyz.com,BC,taxable,
3VWFE21C04M123456,STK-003,INV-2025-003,2025-01-17,Volkswagen,Jetta,2024,White,5000,1400,certified_pre_owned,28000,35000,Lot A,diesel,manual,1.9L,Premium sound,DEF Supply,555-0003,vendor@def.com,AB,zero_rated,Export vehicle

INSTRUCTIONS:
* = Required fields
Valid Conditions: new | used | certified_pre_owned | salvage
Valid Tax Status: taxable | zero_rated | exempt
Valid Fuel Types: petrol | diesel | electric | hybrid | lpg
Valid Transmissions: manual | automatic | semi_automatic
Taxes are auto-calculated based on Province and Purchase Price`;

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
      setValidationErrors([]);
      setResults(null);
    }
  };

  const validateVehicles = async (vehicles) => {
    const errors = [];
    const warnings = [];
    
    // Check for duplicate VINs in file (only for non-empty VINs)
    const vinCount = {};
    vehicles.forEach((v, idx) => {
      if (v.vin && v.vin.length > 0) {
        const vin = v.vin.toUpperCase();
        vinCount[vin] = vinCount[vin] || [];
        vinCount[vin].push(idx + 2);
      }
    });
    
    Object.entries(vinCount).forEach(([vin, rows]) => {
      if (rows.length > 1) {
        rows.forEach(row => {
          errors.push({
            row,
            field: 'vin',
            message: `Duplicate VIN in file: ${vin}`,
            severity: 'error'
          });
        });
      }
    });
    
    // Check for existing VINs in database
    const uniqueVins = vehicles
      .map(v => v.vin)
      .filter(vin => vin && vin.length > 0);
    
    if (uniqueVins.length > 0) {
      const existing = await base44.entities.Vehicle.filter({ 
        company_id: selectedCompanyId,
        vin: { $in: uniqueVins } 
      });
      const existingVINs = new Set(existing.map(v => v.vin?.toUpperCase()));
      
      vehicles.forEach((v, idx) => {
        if (v.vin && v.vin.length > 0 && existingVINs.has(v.vin.toUpperCase())) {
          errors.push({
            row: idx + 2,
            field: 'vin',
            message: `VIN already exists in inventory: ${v.vin}`,
            severity: 'error'
          });
        }
      });
    }

    // Validate each vehicle
    vehicles.forEach((v, idx) => {
      const row = idx + 2;

      // Check required fields
      if (!v.make) {
        errors.push({ row, field: 'make', message: 'Make is required', severity: 'error' });
      }
      if (!v.model) {
        errors.push({ row, field: 'model', message: 'Model is required', severity: 'error' });
      }
      if (!v.year || v.year < 1900 || v.year > new Date().getFullYear() + 2) {
        errors.push({ row, field: 'year', message: 'Year is required and must be valid', severity: 'error' });
      }

      // VIN validation (optional but must be valid if provided)
      if (v.vin && v.vin.length > 0 && v.vin.length < 10) {
        errors.push({ row, field: 'vin', message: 'VIN must be at least 10 characters', severity: 'error' });
      }
    });

    return [...errors, ...warnings];
  };

  const calculateTaxes = (vehicle, company) => {
    try {
      if (!vehicle.province || !vehicle.tax_status || vehicle.tax_status.toLowerCase() !== 'taxable') {
        return { tax_gst: 0, tax_pst: 0, tax_hst: 0, tax_total: 0 };
      }

      const provinceCode = vehicle.province.toUpperCase().trim();
      const taxRates = company?.tax_rates?.[provinceCode];
      
      if (!taxRates) {
        console.warn(`No tax rates found for province: ${provinceCode}`);
        return { tax_gst: 0, tax_pst: 0, tax_hst: 0, tax_total: 0 };
      }

      const price = Number(vehicle.purchase_price) || 0;
      const gst = Math.round((price * (taxRates.gst || 0)) / 100 * 100) / 100;
      const pst = Math.round((price * (taxRates.pst || 0)) / 100 * 100) / 100;
      const hst = Math.round((price * (taxRates.hst || 0)) / 100 * 100) / 100;
      const total = Math.round((gst + pst + hst) * 100) / 100;

      return {
        tax_gst: gst,
        tax_pst: pst,
        tax_hst: hst,
        tax_total: total
      };
    } catch (error) {
      console.error("Tax calculation error:", error);
      return { tax_gst: 0, tax_pst: 0, tax_hst: 0, tax_total: 0 };
    }
  };

  const handleExtract = async () => {
    if (!file || !selectedCompanyId) {
      toast.error("Please select a file and company");
      return;
    }

    setExtracting(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      console.log("File uploaded:", file_url);

      // Extract data with flexible schema
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
                  vin: { type: ["string", "null"] },
                  stock_number: { type: ["string", "null"] },
                  invoice_number: { type: ["string", "null"] },
                  transaction_date: { type: ["string", "null"] },
                  make: { type: ["string", "null"] },
                  model: { type: ["string", "null"] },
                  year: { type: ["number", "string", "null"] },
                  color: { type: ["string", "null"] },
                  mileage: { type: ["number", "string", "null"] },
                  weight: { type: ["number", "string", "null"] },
                  condition: { type: ["string", "null"] },
                  purchase_price: { type: ["number", "string", "null"] },
                  selling_price: { type: ["number", "string", "null"] },
                  location: { type: ["string", "null"] },
                  fuel_type: { type: ["string", "null"] },
                  transmission: { type: ["string", "null"] },
                  engine_capacity: { type: ["string", "null"] },
                  features: { type: ["string", "null"] },
                  vendor_name: { type: ["string", "null"] },
                  vendor_phone: { type: ["string", "null"] },
                  vendor_email: { type: ["string", "null"] },
                  province: { type: ["string", "null"] },
                  tax_status: { type: ["string", "null"] },
                  notes: { type: ["string", "null"] }
                }
              }
            }
          }
        }
      });

      console.log("Extraction result:", extractionResult);

      if (extractionResult.status === "error") {
        toast.error(extractionResult.details || "Failed to extract data from file");
        setExtracting(false);
        return;
      }

      const vehicles = extractionResult.output?.vehicles || [];
      console.log("Extracted vehicles:", vehicles.length);
      
      if (vehicles.length === 0) {
        toast.error("No vehicle records found in file. Please check file format.");
        setExtracting(false);
        return;
      }

      // Normalize data types with proper null/undefined handling
      const normalizedVehicles = vehicles.map(v => {
        const safeString = (val) => (val === null || val === undefined || val === '') ? '' : String(val).trim();
        const safeNumber = (val) => {
          if (val === null || val === undefined || val === '') return 0;
          const num = Number(val);
          return isNaN(num) ? 0 : num;
        };

        return {
          vin: safeString(v.vin),
          stock_number: safeString(v.stock_number),
          invoice_number: safeString(v.invoice_number),
          transaction_date: v.transaction_date || null,
          make: safeString(v.make),
          model: safeString(v.model),
          year: safeNumber(v.year) || null,
          color: safeString(v.color),
          mileage: safeNumber(v.mileage),
          weight: safeNumber(v.weight),
          condition: safeString(v.condition).toLowerCase() || 'used',
          purchase_price: safeNumber(v.purchase_price),
          selling_price: safeNumber(v.selling_price),
          location: safeString(v.location),
          fuel_type: safeString(v.fuel_type).toLowerCase() || 'petrol',
          transmission: safeString(v.transmission).toLowerCase() || 'automatic',
          engine_capacity: safeString(v.engine_capacity),
          features: safeString(v.features),
          vendor_name: safeString(v.vendor_name),
          vendor_phone: safeString(v.vendor_phone),
          vendor_email: safeString(v.vendor_email),
          province: safeString(v.province).toUpperCase(),
          tax_status: safeString(v.tax_status).toLowerCase() || 'taxable',
          notes: safeString(v.notes)
        };
      });

      // Get company for tax calculation
      const companies = await base44.entities.Company.filter({ id: selectedCompanyId });
      const company = companies?.[0];

      if (!company) {
        toast.error("Company not found");
        setExtracting(false);
        return;
      }

      // Calculate taxes for each vehicle
      const vehiclesWithTaxes = normalizedVehicles.map(v => {
        const taxes = calculateTaxes(v, company);
        return { ...v, ...taxes };
      });

      console.log("Vehicles with taxes calculated:", vehiclesWithTaxes);

      setPreviewData(vehiclesWithTaxes);

      // Validate
      const errors = await validateVehicles(vehiclesWithTaxes);
      setValidationErrors(errors);

      setStep(2);
      toast.success(`Extracted ${vehicles.length} record(s) - Review and validate`);
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Extraction failed: " + (error.message || "Unknown error"));
    } finally {
      setExtracting(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || !selectedCompanyId) return;

    const criticalErrors = validationErrors.filter(e => e.severity === 'error');
    if (criticalErrors.length > 0) {
      toast.error("Please fix all errors before importing");
      return;
    }

    setImporting(true);
    const importResults = {
      success: true,
      total: previewData.length,
      imported: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    try {
      // Process each vehicle individually to track success/failure
      for (let idx = 0; idx < previewData.length; idx++) {
        const v = previewData[idx];
        const rowNum = idx + 1;

        // Skip rows with validation errors
        const rowErrors = validationErrors.filter(e => e.row === idx + 2 && e.severity === 'error');
        if (rowErrors.length > 0) {
          importResults.skipped++;
          importResults.details.push({
            row: rowNum,
            vehicle: `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim(),
            vin: v.vin || '-',
            status: 'skipped',
            reason: rowErrors.map(e => e.message).join(', ')
          });
          continue;
        }

        try {
          // Data is already normalized, just need to prepare for database
          const vehicleData = {
            company_id: selectedCompanyId,
            ownership_type: "dealership_owned",
            vin: v.vin ? v.vin.toUpperCase() : '',
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
            tax_gst: v.tax_gst || 0,
            tax_pst: v.tax_pst || 0,
            tax_hst: v.tax_hst || 0,
            tax_total: v.tax_total || 0,
            total_cost: (v.purchase_price || 0) + (v.tax_total || 0),
            notes: v.notes || ''
          };

          console.log(`Importing row ${rowNum}:`, vehicleData);
          await base44.entities.Vehicle.create(vehicleData);
          
          importResults.imported++;
          importResults.details.push({
            row: rowNum,
            vehicle: `${v.year} ${v.make} ${v.model}`,
            vin: v.vin || '-',
            status: 'success',
            reason: 'Imported successfully'
          });
        } catch (error) {
          console.error(`Row ${rowNum} failed:`, error);
          importResults.failed++;
          importResults.details.push({
            row: rowNum,
            vehicle: `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim(),
            vin: v.vin || '-',
            status: 'failed',
            reason: error.message || 'Database error'
          });
        }
      }

      setResults(importResults);
      setStep(3);
      
      if (importResults.failed > 0) {
        toast.error(`Import completed: ${importResults.imported} success, ${importResults.failed} failed`);
      } else {
        toast.success(`Successfully imported ${importResults.imported} vehicles`);
      }
      
      if (importResults.imported > 0) {
        onSuccess?.();
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Import failed: " + error.message);
      setResults({
        success: false,
        total: previewData.length,
        imported: 0,
        failed: previewData.length,
        error: error.message,
        details: []
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setValidationErrors([]);
    setResults(null);
    onClose();
  };

  const criticalErrors = validationErrors.filter(e => e.severity === 'error');
  const warnings = validationErrors.filter(e => e.severity === 'warning');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Vehicles
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="text-sm font-medium">Upload</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
            <span className="text-sm font-medium">Results</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Bulk Import Guide
                </h4>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <p className="font-medium mb-1">📋 Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Download CSV template</li>
                      <li>Fill in vehicle data (Excel/CSV supported)</li>
                      <li>Upload and preview</li>
                      <li>Review validation and fix errors</li>
                      <li>Confirm import</li>
                    </ol>
                  </div>
                  <div className="border-t border-blue-200 pt-2">
                    <p className="font-medium mb-1">✅ Required Fields:</p>
                    <p className="ml-2">Make, Model, Year</p>
                  </div>
                  <div className="border-t border-blue-200 pt-2">
                    <p className="font-medium mb-1">💰 Tax Calculation:</p>
                    <p className="ml-2">Automatically calculated based on Province and Purchase Price</p>
                  </div>
                </div>
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
                  onClick={handleExtract}
                  disabled={!file || extracting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Data
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Preview & Validate */}
          {step === 2 && previewData && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-900">{previewData.length}</p>
                  <p className="text-xs text-blue-700">Total Records</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-900">
                    {previewData.filter((v, idx) => !validationErrors.some(e => e.row === idx + 2 && e.severity === 'error')).length}
                  </p>
                  <p className="text-xs text-green-700">Valid</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-900">{criticalErrors.length}</p>
                  <p className="text-xs text-red-700">Errors</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-900">{warnings.length}</p>
                  <p className="text-xs text-yellow-700">Warnings</p>
                </div>
              </div>

              {/* Validation Summary */}
              {validationErrors.length > 0 && (
                <div className="space-y-2">
                  {criticalErrors.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-900">{criticalErrors.length} Error{criticalErrors.length > 1 ? 's' : ''} - Import Blocked</span>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto bg-white rounded p-2">
                        {criticalErrors.map((err, idx) => (
                          <p key={idx} className="text-xs text-red-800 font-mono">
                            <span className="font-bold">Row {err.row}</span> • {err.field}: {err.message}
                          </p>
                        ))}
                      </div>
                      <p className="text-xs text-red-700 mt-2 font-medium">Fix these errors in your file and re-upload</p>
                    </div>
                  )}
                  {warnings.length > 0 && criticalErrors.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-900">{warnings.length} Warning{warnings.length > 1 ? 's' : ''} - Can proceed with defaults</span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {warnings.slice(0, 5).map((warn, idx) => (
                          <p key={idx} className="text-xs text-yellow-800">
                            Row {warn.row} • {warn.field}: {warn.message}
                          </p>
                        ))}
                        {warnings.length > 5 && (
                          <p className="text-xs text-yellow-700 font-medium">+ {warnings.length - 5} more warnings</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {criticalErrors.length === 0 && validationErrors.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">All records validated successfully</span>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <p className="text-sm font-semibold">Preview ({previewData.length} records)</p>
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">VIN</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Stock #</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Vehicle</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Province</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Purchase</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Tax</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((vehicle, idx) => {
                        const rowErrors = validationErrors.filter(e => e.row === idx + 2);
                        const hasError = rowErrors.some(e => e.severity === 'error');
                        const hasWarning = rowErrors.some(e => e.severity === 'warning');
                        return (
                          <tr key={idx} className={`border-b hover:bg-gray-50 ${hasError ? 'bg-red-50' : hasWarning ? 'bg-yellow-50' : ''}`}>
                            <td className="px-3 py-2 text-gray-500 font-medium">{idx + 1}</td>
                            <td className="px-3 py-2">
                              {hasError ? (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Error
                                </Badge>
                              ) : hasWarning ? (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Warning
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Valid
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{vehicle.vin || '-'}</td>
                            <td className="px-3 py-2 text-xs">{vehicle.stock_number || '-'}</td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                              <p className="text-xs text-gray-500">{vehicle.color}</p>
                            </td>
                            <td className="px-3 py-2 text-xs">{vehicle.province || '-'}</td>
                            <td className="px-3 py-2 text-right font-medium">${vehicle.purchase_price?.toLocaleString() || 0}</td>
                            <td className="px-3 py-2 text-right text-xs text-gray-600">${vehicle.tax_total?.toFixed(2) || '0.00'}</td>
                            <td className="px-3 py-2 text-right font-semibold text-blue-600">
                              ${((vehicle.purchase_price || 0) + (vehicle.tax_total || 0)).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={criticalErrors.length > 0 || importing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Import {previewData.length} Vehicle{previewData.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Results */}
          {step === 3 && results && (
            <div className="space-y-6">
              <div className="text-center py-4">
                {results.failed === 0 && results.imported > 0 ? (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Import Successful!</h3>
                  </>
                ) : results.failed > 0 && results.imported > 0 ? (
                  <>
                    <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Import Completed with Issues</h3>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Import Failed</h3>
                  </>
                )}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-900">{results.total}</p>
                  <p className="text-xs text-blue-700">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-900">{results.imported}</p>
                  <p className="text-xs text-green-700">Imported</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-900">{results.failed || 0}</p>
                  <p className="text-xs text-red-700">Failed</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{results.skipped || 0}</p>
                  <p className="text-xs text-gray-700">Skipped</p>
                </div>
              </div>

              {/* Detailed Results */}
              {results.details && results.details.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <p className="text-sm font-semibold">Import Details</p>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Vehicle</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">VIN</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.details.map((detail, idx) => (
                          <tr key={idx} className={`border-b ${
                            detail.status === 'success' ? 'bg-green-50' :
                            detail.status === 'failed' ? 'bg-red-50' :
                            'bg-gray-50'
                          }`}>
                            <td className="px-3 py-2 text-gray-500 font-medium">{detail.row}</td>
                            <td className="px-3 py-2">
                              {detail.status === 'success' ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Success
                                </Badge>
                              ) : detail.status === 'failed' ? (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Skipped
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 font-medium">{detail.vehicle}</td>
                            <td className="px-3 py-2 font-mono text-xs">{detail.vin || '-'}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{detail.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {results.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{results.error}</p>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}