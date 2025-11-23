import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BankStatementImport({ open, onClose, bankAccounts, companyId, onSuccess }) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Statement Import
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Select Bank Account *</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Choose account" />
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

          <div className="space-y-2">
            <Label>Upload Bank Statement</Label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              {file ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 text-green-600 mx-auto" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports PDF, CSV, XLS, OFX formats
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.csv,.xls,.xlsx,.ofx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="statement-upload"
                  />
                  <label htmlFor="statement-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>Choose File</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-900">AI-Powered Analysis</h4>
                <p className="text-sm text-purple-800 mt-1">
                  Our AI will automatically:
                </p>
                <ul className="text-sm text-purple-800 mt-2 space-y-1 list-disc list-inside">
                  <li>Extract all transactions from your statement</li>
                  <li>Identify payees and transaction details</li>
                  <li>Suggest categories based on transaction patterns</li>
                  <li>Match with existing transaction rules</li>
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

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedAccount || !file || importing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Import with AI
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}