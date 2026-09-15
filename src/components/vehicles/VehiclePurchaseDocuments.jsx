import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExternalLink, FileText, Paperclip, Trash2, Loader2 } from "lucide-react";
import {
  addPurchaseDocument,
  documentTypeLabel,
  removePurchaseDocument,
  uploadVehiclePurchaseDocument,
} from "@/lib/vehiclePurchaseDocuments";

export default function VehiclePurchaseDocuments({
  documents = [],
  onChange,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const list = Array.isArray(documents) ? documents : [];

  const attachFiles = async (files) => {
    const nextFiles = Array.from(files || []);
    if (!nextFiles.length) return;
    setUploading(true);
    try {
      let next = list;
      for (const file of nextFiles) {
        const doc = await uploadVehiclePurchaseDocument(file);
        next = addPurchaseDocument(next, doc);
      }
      onChange(next);
      toast.success(nextFiles.length === 1 ? "Document attached" : `${nextFiles.length} documents attached`);
    } catch (error) {
      toast.error(error.message || "Could not attach the document");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Purchase documents
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Keep the original bill of sale or invoice on this vehicle for CRA and MPI reference.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
          Attach file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/*"
          className="hidden"
          multiple
          onChange={(event) => attachFiles(event.target.files)}
        />
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500">No bill of sale or invoice attached yet.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((doc) => (
            <li
              key={doc.id || doc.url}
              className="flex items-center gap-3 rounded-md border bg-white px-3 py-2"
            >
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-[11px] text-gray-500">
                  {documentTypeLabel(doc.document_type)}
                  {doc.attached_at ? ` · ${new Date(doc.attached_at).toLocaleDateString()}` : ""}
                </p>
              </div>
              {doc.url && (
                <Button type="button" size="sm" variant="ghost" asChild>
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    <span className="sr-only">Open {doc.name}</span>
                  </a>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={() => onChange(removePurchaseDocument(list, doc.id || doc.url))}
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Remove {doc.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Label className="sr-only">Attached purchase documents</Label>
    </div>
  );
}
