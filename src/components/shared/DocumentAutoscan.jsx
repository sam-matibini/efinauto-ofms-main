import React, { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ScanLine,
  Loader2,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeDocument,
  AUTOSCAN_PROFILES,
  fieldLabel,
} from "@/lib/documentAutoscan";

function formatFieldValue(value) {
  if (Array.isArray(value)) return `${value.length} line items`;
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}

export default function DocumentAutoscan({
  profile = "vehicle",
  onApply,
  compact = false,
  resetKey,
}) {
  const inputId = useId();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const spec = AUTOSCAN_PROFILES[profile] || AUTOSCAN_PROFILES.vehicle;

  useEffect(() => {
    setFile(null);
    setPastedText("");
    setPasteOpen(false);
    setResult(null);
    setScanning(false);
    setProgress(0);
  }, [profile, resetKey]);

  const handleFiles = (nextFile) => {
    if (!nextFile) return;
    setFile(nextFile);
    setResult(null);
  };

  const runScan = async (sourceFile = file, sourceText = pastedText) => {
    if (!sourceFile && !sourceText.trim()) {
      toast.error("Upload a document or paste its text first");
      return;
    }

    setScanning(true);
    setProgress(5);
    setResult(null);
    try {
      const analysis = await analyzeDocument({
        file: sourceFile,
        pastedText: sourceText,
        profile,
        onProgress: setProgress,
      });
      setResult(analysis);
      const count = Object.keys(analysis.fields || {}).length;
      if (count === 0) {
        toast.warning("Document read, but no matching fields were found. Try a clearer scan or paste the text.");
        return;
      }
      onApply?.(analysis.fields, analysis);
      toast.success(`Filled ${count} field${count === 1 ? "" : "s"} from ${analysis.summary.document_type}`);
    } catch (error) {
      console.error("Document autoscan error:", error);
      toast.error(error.message || "Failed to scan document");
    } finally {
      setScanning(false);
      setProgress(0);
    }
  };

  const fieldEntries = Object.entries(result?.fields || {});

  return (
    <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-3 space-y-3" data-testid={`autoscan-${profile}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
            <ScanLine className="w-4 h-4" />
            Autoscan document
          </p>
          {!compact && (
            <p className="text-xs text-indigo-700 mt-0.5">
              Upload or paste a {spec.title}. Extracted values fill this form so you can review before saving.
            </p>
          )}
        </div>
        {result?.summary?.document_type && (
          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
            {result.summary.document_type}
          </Badge>
        )}
      </div>

      <div
        className={`border-2 border-dashed rounded-md px-3 py-3 text-center transition-colors ${
          dragOver ? "border-indigo-500 bg-indigo-50" : "border-indigo-200 bg-white/70"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          handleFiles(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,image/*"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files?.[0])}
        />
        <label htmlFor={inputId} className="cursor-pointer block">
          <Upload className="w-5 h-5 mx-auto text-indigo-400 mb-1" />
          <p className="text-xs text-gray-700">
            {file ? file.name : "Drop invoice, bill of sale, or receipt — or click to upload"}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">PDF, photo, or text · OCR runs on images</p>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => runScan()}
          disabled={scanning}
          className="bg-indigo-600 hover:bg-indigo-700"
          size="sm"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning{progress ? ` ${progress}%` : ""}...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Scan & fill form
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPasteOpen((open) => !open)}
        >
          <FileText className="w-4 h-4 mr-2" />
          Paste text
        </Button>
        {(file || pastedText || result) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null);
              setPastedText("");
              setResult(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {pasteOpen && (
        <Textarea
          value={pastedText}
          onChange={(event) => setPastedText(event.target.value)}
          placeholder="Paste invoice or bill of sale text here, then click Scan & fill form."
          rows={4}
        />
      )}

      {result?.summary && (
        <div className="rounded-md bg-white/80 border border-indigo-100 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-800">{result.summary.one_liner}</p>
          </div>
          {fieldEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {fieldEntries.map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-[11px] font-normal bg-white">
                  <span className="text-gray-500 mr-1">{fieldLabel(key)}</span>
                  {formatFieldValue(value)}
                </Badge>
              ))}
            </div>
          )}
          {result.source === "local" && (
            <p className="text-[11px] text-gray-500">
              Filled from on-device document reading. Review values before saving.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
