import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import StatementImportHistory from "@/components/banking/StatementImportHistory";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  applyMapping,
  autoMapColumns,
  parseStatementBytes,
  rememberImport,
  sampleCsv,
  sampleSpreadsheetXml,
  STATEMENT_FIELDS,
} from "@/lib/statementImport";

const ENCODINGS = [
  { value: "utf-8", label: "UTF-8 (Unicode)" },
  { value: "iso-8859-1", label: "ISO-8859-1 (Latin-1)" },
  { value: "windows-1252", label: "Windows-1252" },
];

function downloadText(filename, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BankStatementImport({ open, onClose, bankAccounts = [], companyId, transactions = [], onSuccess }) {
  const [step, setStep] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [file, setFile] = useState(null);
  const [encoding, setEncoding] = useState("utf-8");
  const [table, setTable] = useState(null);
  const [mapping, setMapping] = useState({});
  const [parseError, setParseError] = useState("");
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (open) return;
    setStep(1);
    setShowHistory(false);
    setFile(null);
    setTable(null);
    setMapping({});
    setParseError("");
  }, [open]);

  const preview = useMemo(() => (table ? applyMapping(table, mapping) : []), [table, mapping]);
  const validRows = preview.filter((row) => !row.error);
  const amountMapped = mapping.debit != null || mapping.credit != null || mapping.amount != null;
  const mappingReady = mapping.transaction_date != null && amountMapped;

  const readFile = async (nextFile, nextEncoding = encoding) => {
    if (!nextFile) return;
    if (nextFile.size > 1024 * 1024) {
      setFile(nextFile);
      setTable(null);
      setParseError("The file is larger than 1 MB.");
      return;
    }
    setReading(true);
    setFile(nextFile);
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const parsed = await parseStatementBytes(bytes, nextFile.name, nextEncoding);
      setTable(parsed);
      setMapping(autoMapColumns(parsed.headers));
      setParseError("");
    } catch (error) {
      setTable(null);
      setMapping({});
      setParseError(error?.message || "The file could not be read.");
    }
    setReading(false);
  };

  const assignColumn = (field, column) => {
    setMapping((current) => {
      const next = {};
      Object.entries(current).forEach(([key, index]) => {
        if (index !== column && key !== field) next[key] = index;
      });
      if (field !== "ignore") next[field] = column;
      return next;
    });
  };

  const fieldForColumn = (column) => Object.entries(mapping).find(([, index]) => index === column)?.[0] || "ignore";

  const importRows = async () => {
    if (!selectedAccount || validRows.length === 0) {
      toast.error("Choose an account and map at least one valid transaction");
      return;
    }
    setImporting(true);
    const batchId = `import-${Date.now()}`;
    const account = bankAccounts.find((item) => item.id === selectedAccount);
    try {
      await supabase.entities.BankTransaction.bulkCreate(validRows.map((row) => ({
        company_id: companyId,
        bank_account_id: selectedAccount,
        import_batch_id: batchId,
        transaction_date: row.transaction_date,
        post_date: row.transaction_date,
        description: row.description,
        payee: row.payee || "",
        amount: row.amount,
        transaction_type: row.transaction_type,
        ...(row.balance == null ? {} : { balance: row.balance }),
        reference_number: row.reference_number || "",
        gl_account_id: account?.gl_account_id || null,
        status: "pending",
      })));
      rememberImport(companyId, {
        id: batchId,
        filename: file?.name || "Imported statement",
        accountId: selectedAccount,
        accountName: account?.account_name || account?.institution_name || "Bank account",
        importedAt: new Date().toISOString(),
        count: validRows.length,
        format: table?.format || "",
        status: "imported",
      });
      const skipped = preview.length - validRows.length;
      toast.success(skipped ? `Imported ${validRows.length} transaction(s). Skipped ${skipped} invalid row(s).` : `Imported ${validRows.length} transaction(s)`);
      onSuccess?.();
    } catch (error) {
      toast.error(error?.message || "Failed to import the statement");
    }
    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Import Statements</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-8 border-b py-6">
          {["Configure", "Map Fields", "Preview"].map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${step === index + 1 && !showHistory ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>{index + 1}</div>
              <span className={`text-sm font-medium ${step === index + 1 && !showHistory ? "text-blue-600" : "text-gray-500"}`}>{label}</span>
            </div>
          ))}
        </div>

        {showHistory ? (
          <div className="space-y-4 py-4">
            <h3 className="font-semibold text-[#0A1F44]">Import history</h3>
            <StatementImportHistory companyId={companyId} transactions={transactions} bankAccounts={bankAccounts} />
          </div>
        ) : null}

        {!showHistory && step === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-red-600">Select an account*</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your account for import" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.filter((account) => account.status === "active").map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name || account.institution_name}{account.institution_name ? ` - ${account.institution_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className={`rounded-lg border-2 border-dashed p-12 text-center ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) readFile(dropped);
              }}
            >
              {file ? (
                <div className="space-y-3">
                  <FileText className="mx-auto h-16 w-16 text-green-600" />
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  {reading ? <p className="text-sm text-gray-500">Reading file...</p> : null}
                  <Button type="button" variant="outline" size="sm" onClick={() => { setFile(null); setTable(null); setParseError(""); }}>Remove File</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-16 w-16 text-gray-400" />
                  <p className="font-medium text-gray-700">Drag and drop file to import</p>
                  <input
                    type="file"
                    accept=".csv,.tsv,.xls,.xlsx,.ofx,.qif,.xml,.camt"
                    onChange={(event) => readFile(event.target.files?.[0])}
                    className="hidden"
                    id="statement-upload"
                  />
                  <label htmlFor="statement-upload">
                    <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                      <span><Upload className="mr-2 h-4 w-4" />Choose File</span>
                    </Button>
                  </label>
                  <p className="mt-3 text-xs text-gray-500">Maximum File Size: 1 MB • File format Supported: CSV, TSV, XLS, XLSX, OFX, QIF, CAMT.053 and CAMT.054</p>
                </div>
              )}
            </div>

            {parseError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p> : null}

            <div className="text-sm text-blue-600">
              <p>The sample file uses Date, Description, Debit, Credit, Payee, Reference Number, and Balance.</p>
              <button type="button" className="mt-1 flex items-center gap-1 hover:underline" onClick={() => downloadText("bank-statement-sample.csv", sampleCsv(), "text/csv")}>
                <Download className="h-4 w-4" />
                Download sample file
              </button>
            </div>

            <div className="space-y-2">
              <Label>Character Encoding</Label>
              <Select value={encoding} onValueChange={(value) => { setEncoding(value); if (file) readFile(file, value); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENCODINGS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <h4 className="font-semibold text-gray-900">Page Tips</h4>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-700">
                <li>
                  Download the <button type="button" className="text-blue-600 hover:underline" onClick={() => downloadText("bank-statement-sample.xls", sampleSpreadsheetXml(), "application/vnd.ms-excel")}>sample xls file</button> to see the columns: Date, Description, Debit, Credit, Payee, Reference Number, and Balance.
                </li>
                <li>Withdrawals go in Debit and deposits go in Credit. A single Amount column is also accepted, with a negative amount for a withdrawal.</li>
                <li>OFX, QIF, and CAMT.053 or CAMT.054 files are read directly and do not need this column layout.</li>
              </ul>
            </div>
          </div>
        )}

        {!showHistory && step === 2 && table && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">Match each file column to a transaction field. The first data row is shown so you can check the mapping.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">File column</th>
                    <th className="py-2 pr-3">Sample</th>
                    <th className="py-2">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {table.headers.map((header, index) => (
                    <tr key={`${header}-${index}`} className="border-b">
                      <td className="py-2 pr-3 font-medium">{header || `Column ${index + 1}`}</td>
                      <td className="py-2 pr-3 text-gray-600">{table.rows[0]?.[index] || "-"}</td>
                      <td className="py-2">
                        <Select value={fieldForColumn(index)} onValueChange={(value) => assignColumn(value, index)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">Do not import</SelectItem>
                            {STATEMENT_FIELDS.map((field) => (
                              <SelectItem key={field.key} value={field.key}>{field.label}{field.required ? " *" : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mappingReady ? (
              <div>
                <p className="mb-2 text-sm font-medium">Mapping preview</p>
                <PreviewTable rows={preview.slice(0, 5)} />
              </div>
            ) : (
              <p className="text-sm text-amber-800">Map Date and either Debit and Credit or Amount before continuing.</p>
            )}
          </div>
        )}

        {!showHistory && step === 3 && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-gray-600">{validRows.length} of {preview.length} row(s) are ready to import into {bankAccounts.find((account) => account.id === selectedAccount)?.account_name || "the selected account"}.</p>
            <PreviewTable rows={preview} />
          </div>
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button type="button" variant="ghost" onClick={() => setShowHistory((current) => !current)}>
            {showHistory ? "Back to import" : "Import history"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={importing}>Cancel</Button>
          {!showHistory && step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={importing}>Previous</Button>
          )}
          {!showHistory && step < 3 && (
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (step === 1 && (!selectedAccount || !table)) {
                  toast.error(parseError || "Select an account and upload a statement file");
                  return;
                }
                if (step === 2 && !mappingReady) {
                  toast.error("Map Date and an amount column");
                  return;
                }
                setStep(step + 1);
              }}
            >
              Next
            </Button>
          )}
          {!showHistory && step === 3 && (
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={importRows} disabled={importing || validRows.length === 0}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Import {validRows.length || ""}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewTable({ rows }) {
  return (
    <div className="max-h-64 overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b text-left">
            <th className="px-2 py-2">Date</th>
            <th className="px-2 py-2">Description</th>
            <th className="px-2 py-2">Type</th>
            <th className="px-2 py-2 text-right">Amount</th>
            <th className="px-2 py-2">Payee</th>
            <th className="px-2 py-2">Reference</th>
            <th className="px-2 py-2">Check</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowNumber} className="border-b last:border-0">
              <td className="px-2 py-1.5">{row.transaction_date || "-"}</td>
              <td className="px-2 py-1.5">{row.description}</td>
              <td className="px-2 py-1.5 capitalize">{row.transaction_type || "-"}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{row.amount == null ? "-" : row.amount.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="px-2 py-1.5">{row.payee || "-"}</td>
              <td className="px-2 py-1.5">{row.reference_number || "-"}</td>
              <td className={`px-2 py-1.5 ${row.error ? "text-red-700" : "text-green-700"}`}>{row.error || "Ready"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
