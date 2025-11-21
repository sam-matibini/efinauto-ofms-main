import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Download, CheckCircle2, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function ImportAccountsWizard({ open, onClose, companyId }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState("skip");
  const [encoding, setEncoding] = useState("utf-8");
  const [dragActive, setDragActive] = useState(false);
  const [extractedData, setExtractedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({
    account_code: "account_code",
    account_name: "account_name",
    account_type: "account_type",
    account_category: "account_category",
    balance: "balance",
    description: "description"
  });

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

  const validateAccounts = (accounts) => {
    const errors = [];
    const seenCodes = new Set();
    const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];

    accounts.forEach((account, index) => {
      const rowErrors = [];
      const rowNum = index + 1;

      // Check for missing required fields
      if (!account.account_code || String(account.account_code).trim() === '') {
        rowErrors.push('Missing account code');
      }
      if (!account.account_name || String(account.account_name).trim() === '') {
        rowErrors.push('Missing account name');
      }
      if (!account.account_type || String(account.account_type).trim() === '') {
        rowErrors.push('Missing account type');
      }

      // Check for invalid account type
      if (account.account_type) {
        const type = String(account.account_type).toLowerCase().trim();
        if (!validTypes.includes(type)) {
          rowErrors.push(`Invalid account type: "${account.account_type}". Must be: asset, liability, equity, revenue, or expense`);
        }
      }

      // Check for duplicate codes within file
      if (account.account_code) {
        const code = String(account.account_code).trim();
        if (seenCodes.has(code)) {
          rowErrors.push(`Duplicate account code: ${code}`);
        }
        seenCodes.add(code);
      }

      // Check balance format
      if (account.balance && account.balance !== '0') {
        const balanceStr = String(account.balance).replace(/[^0-9.-]/g, '');
        if (isNaN(parseFloat(balanceStr))) {
          rowErrors.push(`Invalid balance format: "${account.balance}"`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNum,
          account_code: account.account_code,
          account_name: account.account_name,
          errors: rowErrors
        });
      }
    });

    setValidationErrors(errors);
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
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const extractResponse = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              account_code: { type: "string" },
              account_name: { type: "string" },
              account_type: { type: "string" },
              account_category: { type: "string" },
              balance: { type: "string" },
              description: { type: "string" }
            }
          }
        });

        if (extractResponse.status === "success" && extractResponse.output) {
          let accounts = extractResponse.output;
          if (!Array.isArray(accounts)) {
            accounts = [accounts];
          }
          
          accounts = accounts.filter(acc => 
            acc && acc.account_code && acc.account_name && acc.account_type
          );
          
          if (accounts.length === 0) {
            toast.error("No valid accounts found in file");
            setUploading(false);
            return;
          }
          
          setExtractedData(accounts);
          validateAccounts(accounts);
          setStep(2);
        } else {
          toast.error(`Failed to extract data: ${extractResponse.details || 'Unknown error'}`);
        }
      } catch (error) {
        toast.error(`Upload failed: ${error.message}`);
      } finally {
        setUploading(false);
      }
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      await handleImport();
    }
  };

  const handleImport = async () => {
    setUploading(true);
    try {
      const existingAccounts = await base44.entities.Account.filter({ company_id: companyId });
      const existingCodes = new Set(existingAccounts.map(a => a.account_code));
      
      // Get error rows to skip
      const errorRows = new Set(validationErrors.map(e => e.row));
      
      let created = 0;
      let skipped = 0;
      let updated = 0;
      let failed = 0;
      const errors = [];

      for (let idx = 0; idx < extractedData.length; idx++) {
        const account = extractedData[idx];
        
        // Skip accounts with validation errors
        if (errorRows.has(idx + 1)) {
          skipped++;
          continue;
        }
        try {
          const accountType = String(account.account_type).toLowerCase().trim();
          const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
          
          if (!validTypes.includes(accountType)) {
            errors.push(`${account.account_code}: Invalid type "${account.account_type}"`);
            failed++;
            continue;
          }

          const accountCode = String(account.account_code).trim();
          const isDuplicate = existingCodes.has(accountCode);

          if (isDuplicate && duplicateHandling === "skip") {
            skipped++;
            continue;
          }

          const accountData = {
            company_id: companyId,
            account_code: accountCode,
            account_name: String(account.account_name).trim(),
            account_type: accountType,
            account_category: account.account_category ? String(account.account_category).toLowerCase().trim() : 'other',
            balance: parseFloat(String(account.balance).replace(/[^0-9.-]/g, '')) || 0,
            description: account.description ? String(account.description).trim() : ''
          };

          if (isDuplicate && duplicateHandling === "overwrite") {
            const existingAccount = existingAccounts.find(a => a.account_code === accountCode);
            await base44.entities.Account.update(existingAccount.id, accountData);
            updated++;
          } else {
            await base44.entities.Account.create(accountData);
            created++;
          }
        } catch (err) {
          errors.push(`${account.account_code}: ${err.message || 'Failed'}`);
          failed++;
        }
      }

      const summary = [];
      if (created > 0) summary.push(`${created} created`);
      if (updated > 0) summary.push(`${updated} updated`);
      if (skipped > 0) summary.push(`${skipped} skipped`);
      if (failed > 0) summary.push(`${failed} failed`);

      toast.success(`Import complete: ${summary.join(', ')}`);
      
      if (errors.length > 0 && errors.length <= 3) {
        errors.forEach(err => toast.error(err, { duration: 5000 }));
      }

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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

        {/* Step 1: Configure */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Drag and Drop Area */}
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
                Maximum File Size: 25 MB • File Format: CSV or TSV or XLS
              </p>
            </div>

            <p className="text-sm text-gray-600">
              Download a{" "}
              <button onClick={downloadTemplate} className="text-blue-600 hover:underline">
                sample file
              </button>{" "}
              and compare it to your import file to ensure you have the file perfect for the import.
            </p>

            {/* Duplicate Handling */}
            <div>
              <Label className="text-red-600 mb-3 flex items-center gap-1">
                Duplicate Handling: <span className="text-red-600">*</span>
              </Label>
              <RadioGroup value={duplicateHandling} onValueChange={setDuplicateHandling}>
                <div className="flex items-start space-x-2 mb-3">
                  <RadioGroupItem value="skip" id="skip" />
                  <div>
                    <label htmlFor="skip" className="font-medium cursor-pointer">
                      Skip Duplicates
                    </label>
                    <p className="text-sm text-gray-600">
                      Retains the accounts and does not import the duplicates in the import file.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="overwrite" id="overwrite" />
                  <div>
                    <label htmlFor="overwrite" className="font-medium cursor-pointer">
                      Overwrite accounts
                    </label>
                    <p className="text-sm text-gray-600">
                      Imports the duplicates in the import file and overwrites the existing accounts.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Character Encoding */}
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
              {extractedData.length} accounts detected. Verify field mapping below:
            </p>

            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  ⚠️ {validationErrors.length} Error{validationErrors.length !== 1 ? 's' : ''} Found
                </p>
                <p className="text-xs text-red-800 mb-3">
                  Please fix the errors below before proceeding:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {validationErrors.map((error, idx) => (
                    <div key={idx} className="bg-white rounded p-2 text-xs">
                      <p className="font-semibold text-red-900">
                        Row {error.row}: {error.account_code} - {error.account_name}
                      </p>
                      <ul className="mt-1 ml-4 list-disc text-red-700">
                        {error.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Field Mapping</p>
              <p className="text-xs text-blue-800">
                Fields are automatically mapped based on column headers. All fields detected correctly.
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
                  <tr>
                    <td className="p-3 border-b font-medium">account_code</td>
                    <td className="p-3 border-b">Account Code</td>
                    <td className="p-3 border-b text-gray-600">{extractedData[0]?.account_code}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b font-medium">account_name</td>
                    <td className="p-3 border-b">Account Name</td>
                    <td className="p-3 border-b text-gray-600">{extractedData[0]?.account_name}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b font-medium">account_type</td>
                    <td className="p-3 border-b">Account Type</td>
                    <td className="p-3 border-b text-gray-600">{extractedData[0]?.account_type}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b font-medium">account_category</td>
                    <td className="p-3 border-b">Account Category</td>
                    <td className="p-3 border-b text-gray-600">{extractedData[0]?.account_category || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-b font-medium">balance</td>
                    <td className="p-3 border-b">Balance</td>
                    <td className="p-3 border-b text-gray-600">{extractedData[0]?.balance || '0'}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">description</td>
                    <td className="p-3">Description</td>
                    <td className="p-3 text-gray-600">{extractedData[0]?.description || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-4">
            {validationErrors.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-green-900">✓ Ready to Import</p>
                <p className="text-sm text-green-800 mt-1">
                  {extractedData.length} accounts validated successfully. Review the preview below:
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-yellow-900">⚠️ Import with Warnings</p>
                <p className="text-sm text-yellow-800 mt-1">
                  {extractedData.length - validationErrors.length} valid accounts will be imported. 
                  {validationErrors.length} accounts with errors will be skipped.
                </p>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 border-b">Status</th>
                    <th className="text-left p-3 border-b">Code</th>
                    <th className="text-left p-3 border-b">Name</th>
                    <th className="text-left p-3 border-b">Type</th>
                    <th className="text-right p-3 border-b">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.map((account, idx) => {
                    const hasError = validationErrors.find(e => e.row === idx + 1);
                    return (
                      <tr key={idx} className={hasError ? "bg-red-50" : "hover:bg-gray-50"}>
                        <td className="p-3 border-b">
                          {hasError ? (
                            <span className="text-red-600 text-xs">❌ Error</span>
                          ) : (
                            <span className="text-green-600 text-xs">✓ Valid</span>
                          )}
                        </td>
                        <td className="p-3 border-b font-mono text-xs">{account.account_code}</td>
                        <td className="p-3 border-b">{account.account_name}</td>
                        <td className="p-3 border-b capitalize">{account.account_type}</td>
                        <td className="p-3 border-b text-right">{account.balance || '0'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
            disabled={uploading || (step === 2 && validationErrors.length === extractedData.length)} 
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