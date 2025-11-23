import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Sparkles, Loader2, Download, HelpCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BankStatementImport({ open, onClose, bankAccounts, glAccounts, companyId, onSuccess }) {
  const [step, setStep] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [encoding, setEncoding] = useState("UTF-8");

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const handleImport = async () => {
    if (!selectedAccount || !file) {
      toast.error("Please select an account and upload a file");
      return;
    }

    setImporting(true);
    setAiAnalyzing(true);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Use AI to extract transactions from statement
      toast.info("AI is analyzing your statement...");
      const extractedData = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this bank statement and extract all transactions. For each transaction, extract:
        - transaction_date (YYYY-MM-DD format)
        - post_date (if different from transaction date)
        - description (transaction description)
        - payee (merchant/payee name if identifiable)
        - amount (numerical amount)
        - transaction_type (either "debit" for withdrawals/payments or "credit" for deposits)
        - balance (running balance if shown)
        - reference_number (check number or transaction ID if shown)
        
        Return an array of transaction objects. Be thorough and extract all visible transactions.
        Identify patterns and suggest categorization where possible.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            statement_period_start: { type: "string" },
            statement_period_end: { type: "string" },
            opening_balance: { type: "number" },
            closing_balance: { type: "number" },
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  transaction_date: { type: "string" },
                  post_date: { type: "string" },
                  description: { type: "string" },
                  payee: { type: "string" },
                  amount: { type: "number" },
                  transaction_type: { type: "string" },
                  balance: { type: "number" },
                  reference_number: { type: "string" },
                  suggested_category: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiAnalyzing(false);

      if (!extractedData.transactions || extractedData.transactions.length === 0) {
        toast.error("No transactions found in the statement");
        setImporting(false);
        return;
      }

      // Generate import batch ID
      const batchId = `import-${Date.now()}`;

      // Create transactions with AI suggestions
      toast.info(`Importing ${extractedData.transactions.length} transactions...`);
      
      const selectedBankAccount = bankAccounts.find(ba => ba.id === selectedAccount);
      
      const transactionsToCreate = extractedData.transactions.map(t => ({
        company_id: companyId,
        bank_account_id: selectedAccount,
        import_batch_id: batchId,
        transaction_date: t.transaction_date,
        post_date: t.post_date || t.transaction_date,
        description: t.description,
        payee: t.payee,
        amount: Math.abs(t.amount),
        transaction_type: t.transaction_type,
        balance: t.balance,
        reference_number: t.reference_number,
        category: t.suggested_category,
        gl_account_id: selectedBankAccount?.gl_account_id || null,
        status: "pending",
        ai_confidence: 75
      }));

      await base44.entities.BankTransaction.bulkCreate(transactionsToCreate);

      toast.success(`Successfully imported ${transactionsToCreate.length} transactions`);
      onSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import statement: " + error.message);
    }

    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Import Statements</DialogTitle>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-8 py-6 border-b">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className={`text-sm font-medium ${step === 1 ? 'text-blue-600' : 'text-gray-500'}`}>
              Configure
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className={`text-sm font-medium ${step === 2 ? 'text-blue-600' : 'text-gray-500'}`}>
              Map Fields
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
            <span className={`text-sm font-medium ${step === 3 ? 'text-blue-600' : 'text-gray-500'}`}>
              Preview
            </span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-red-600">Select an account*</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your account for import" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts
                    .filter(acc => acc.status === 'active')
                    .map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name} - {acc.institution_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
              {file ? (
                <div className="space-y-3">
                  <FileText className="w-16 h-16 text-green-600 mx-auto" />
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-16 h-16 text-gray-400 mx-auto" />
                  <p className="text-gray-700 font-medium">Drag and drop file to import</p>
                  <input
                    type="file"
                    accept=".pdf,.csv,.xls,.xlsx,.ofx,.tsv,.camt,.camt.053,.camt.054"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="statement-upload"
                  />
                  <label htmlFor="statement-upload">
                    <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-gray-500 mt-3">
                    Maximum File Size: 1 MB • File format Supported: CSV, TSV, XLS, OFX, QIF, CAMT.053 and CAMT.054
                  </p>
                </div>
              )}
            </div>

            <div className="text-sm text-blue-600">
              <p>Ensure that the import file is in the correct format by comparing it with our sample file.</p>
              <button className="flex items-center gap-1 hover:underline mt-1">
                <Download className="w-4 h-4" />
                Download sample file
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Character Encoding</Label>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </div>
              <Select value={encoding} onValueChange={setEncoding}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTF-8">UTF-8 (Unicode)</SelectItem>
                  <SelectItem value="ISO-8859-1">ISO-8859-1 (Latin-1)</SelectItem>
                  <SelectItem value="Windows-1252">Windows-1252</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">Page Tips</h4>
                  <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                    <li>You can download the <button className="text-blue-600 hover:underline">sample xls file</button> to get detailed information about the data fields used while importing.</li>
                    <li>If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.</li>
                  </ul>
                </div>
              </div>
            </div>

            {aiAnalyzing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="font-semibold text-blue-900">Analyzing statement...</p>
                    <p className="text-sm text-blue-800">
                      AI is extracting and categorizing transactions
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="text-center py-12">
              <p className="text-gray-600">Map Fields step - Coming soon</p>
              <p className="text-sm text-gray-500 mt-2">This will allow you to map CSV columns to transaction fields</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="text-center py-12">
              <p className="text-gray-600">Preview step - Coming soon</p>
              <p className="text-sm text-gray-500 mt-2">This will show a preview of transactions before final import</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={importing}>
              Previous
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && (!selectedAccount || !file)) {
                  toast.error("Please select an account and upload a file");
                  return;
                }
                setStep(step + 1);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={!selectedAccount || !file || importing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}