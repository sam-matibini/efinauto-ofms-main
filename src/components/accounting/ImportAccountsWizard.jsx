import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function ImportAccountsWizard({ open, onClose, companyId }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [encoding, setEncoding] = useState("utf-8");
  const [dragActive, setDragActive] = useState(false);
  const [extractedData, setExtractedData] = useState([]);
  const [fileColumns, setFileColumns] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({
    account_code: "",
    account_name: "",
    account_type: "",
    account_category: "",
    balance: "",
    description: ""
  });
  const [saveMapping, setSaveMapping] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const applyFieldMapping = (rawData) => {
    return rawData.map(row => {
      const mapped = {};
      Object.keys(fieldMapping).forEach(targetField => {
        const sourceColumn = fieldMapping[targetField];
        if (sourceColumn && row[sourceColumn] !== undefined) {
          mapped[targetField] = row[sourceColumn];
        }
      });
      return mapped;
    });
  };

  const handleFileSelection = (selectedFile) => {
    const fileType = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'tsv'].includes(fileType)) {
      toast.error("Please upload a CSV, TSV, or Excel file");
      return;
    }
    
    const maxSize = 25 * 1024 * 1024; // 25 MB
    if (selectedFile.size > maxSize) {
      toast.error("File size exceeds 25 MB limit");
      return;
    }
    
    setFile(selectedFile);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
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
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!file) {
        toast.error("Please select a file");
        return;
      }
      
      setUploading(true);
      try {
        const { file_url } = await supabase.integrations.Core.UploadFile({ file });
        
        // Parse CSV to extract headers and data
        const response = await fetch(file_url);
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error("File is empty or invalid");
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
        setFileColumns(headers);
        
        const rawData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
          const row = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          return row;
        });
        
        setExtractedData(rawData);
        
        // Auto-map fields if column names match
        const autoMapping = {};
        const fieldNames = ['account_code', 'account_name', 'account_type', 'account_category', 'balance', 'description'];
        fieldNames.forEach(field => {
          const match = headers.find(h => h.toLowerCase().replace(/_/g, '') === field.replace(/_/g, ''));
          if (match) autoMapping[field] = match;
        });
        setFieldMapping(autoMapping);
        
        setStep(2);
      } catch (error) {
        toast.error(`Upload failed: ${error.message}`);
      } finally {
        setUploading(false);
      }
    } else if (step === 2) {
      // Validate mapping
      if (!fieldMapping.account_code || !fieldMapping.account_name || !fieldMapping.account_type) {
        toast.error("Please map Account Code, Account Name, and Account Type");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      await handleImport();
    }
  };

  const handleImport = async () => {
    setUploading(true);
    
    try {
      if (!companyId) {
        throw new Error("No company selected");
      }

      const mappedAccounts = applyFieldMapping(extractedData);
      const existingAccounts = await supabase.entities.Account.filter({ company_id: companyId });
      const existingCodes = new Set(existingAccounts.map(a => a.account_code));
      
      let created = 0;
      let skipped = 0;
      const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];

      for (const account of mappedAccounts) {
        if (!account.account_code || !account.account_name || !account.account_type) {
          skipped++;
          continue;
        }
        
        const accountType = String(account.account_type).toLowerCase().trim();
        if (!validTypes.includes(accountType)) {
          skipped++;
          continue;
        }

        const accountCode = String(account.account_code).trim();
        if (existingCodes.has(accountCode)) {
          skipped++;
          continue;
        }

        try {
          await supabase.entities.Account.create({
            company_id: companyId,
            account_code: accountCode,
            account_name: String(account.account_name).trim(),
            account_type: accountType,
            account_category: account.account_category ? String(account.account_category).toLowerCase().trim() : 'other',
            balance: parseFloat(String(account.balance || '0').replace(/[^0-9.-]/g, '')) || 0,
            description: account.description ? String(account.description).trim() : ''
          });
          created++;
        } catch (err) {
          skipped++;
        }
      }

      toast.success(`Import complete: ${created} created, ${skipped} skipped`);
      await queryClient.invalidateQueries({ queryKey: ['accounts', companyId] });
      onClose();
      
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setStep(1);
      setFile(null);
      setExtractedData([]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Accounts - Import</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <span className={step >= 1 ? 'font-semibold' : 'text-gray-500'}>Configure</span>
          </div>
          
          <ChevronRight className="w-5 h-5 text-gray-400" />
          
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
            </div>
            <span className={step >= 2 ? 'font-semibold' : 'text-gray-500'}>Map Fields</span>
          </div>
          
          <ChevronRight className="w-5 h-5 text-gray-400" />
          
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
            <span className={step >= 3 ? 'font-semibold' : 'text-gray-500'}>Preview</span>
          </div>
        </div>

        {/* Step 1: Upload File */}
        {step === 1 && (
          <div className="space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-4">Drag and drop file to import</p>
              <div>
                <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload').click()}>
                  Choose File
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {file && (
                <p className="text-sm text-gray-600 mt-3">Selected: {file.name}</p>
              )}
              <p className="text-sm text-gray-500 mt-3">
                Maximum File Size: 25 MB • File Format: CSV, TSV, or XLS
              </p>
            </div>

            <p className="text-sm text-gray-600">
              Download a{" "}
              <button onClick={downloadTemplate} className="text-blue-600 hover:underline">
                sample file
              </button>{" "}
              and compare it to your import file to ensure it's formatted correctly.
            </p>

            <div>
              <Label className="mb-2 block">Character Encoding</Label>
              <Select value={encoding} onValueChange={setEncoding}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf-8">UTF-8 (Unicode)</SelectItem>
                  <SelectItem value="iso-8859-1">ISO-8859-1 (Latin)</SelectItem>
                  <SelectItem value="windows-1252">Windows-1252</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Map Fields */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {extractedData.length} accounts detected. Map the fields from your import file:
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-yellow-900">Field Mapping</p>
              <p className="text-xs text-yellow-800 mt-1">
                {Object.values(fieldMapping).filter(v => v).length > 0 
                  ? "Fields are automatically mapped based on column headers. All fields detected correctly."
                  : "Please assign the appropriate field mappings below."}
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 border-b">File Column</th>
                    <th className="text-left p-3 border-b">Maps To</th>
                    <th className="text-left p-3 border-b">Sample Data</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { field: 'account_code', label: 'Account Code', required: true },
                    { field: 'account_name', label: 'Account Name', required: true },
                    { field: 'account_type', label: 'Account Type', required: true },
                    { field: 'account_category', label: 'Account Category', required: false },
                    { field: 'balance', label: 'Balance', required: false },
                    { field: 'description', label: 'Description', required: false }
                  ].map(({ field, label, required }) => (
                    <tr key={field}>
                      <td className="p-3 border-b">
                        <Select 
                          value={fieldMapping[field] || ""} 
                          onValueChange={(value) => setFieldMapping({...fieldMapping, [field]: value})}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>--None--</SelectItem>
                            {fileColumns.map(col => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 border-b">
                        {label} {required && <span className="text-red-600">*</span>}
                      </td>
                      <td className="p-3 border-b text-gray-600">
                        {fieldMapping[field] && extractedData[0]?.[fieldMapping[field]] || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save-mapping"
                checked={saveMapping}
                onChange={(e) => setSaveMapping(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="save-mapping" className="text-sm">
                Save this preference for future imports
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">Preview</p>
              <p className="text-xs text-blue-800">
                {applyFieldMapping(extractedData).filter(a => a.account_code && a.account_name && a.account_type).length} records ready to be imported
              </p>
              <p className="text-xs text-blue-800 mt-1">
                {extractedData.length - applyFieldMapping(extractedData).filter(a => a.account_code && a.account_name && a.account_type).length} records skipped (missing required fields or unmapped)
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 border-b">Code</th>
                    <th className="text-left p-3 border-b">Name</th>
                    <th className="text-left p-3 border-b">Type</th>
                    <th className="text-left p-3 border-b">Category</th>
                    <th className="text-right p-3 border-b">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {applyFieldMapping(extractedData).slice(0, 50).map((account, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 border-b font-mono text-xs">{account.account_code || '-'}</td>
                      <td className="p-3 border-b">{account.account_name || '-'}</td>
                      <td className="p-3 border-b capitalize">{account.account_type || '-'}</td>
                      <td className="p-3 border-b">{account.account_category || 'other'}</td>
                      <td className="p-3 border-b text-right">{account.balance || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {applyFieldMapping(extractedData).length > 50 && (
              <p className="text-xs text-gray-600 text-center">Showing first 50 of {applyFieldMapping(extractedData).length} records</p>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={uploading}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={uploading} 
            className="bg-blue-600"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {step === 3 ? 'Import' : 'Next'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}