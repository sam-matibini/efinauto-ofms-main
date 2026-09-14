import React, { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import SignaturePad from "@/components/shared/SignaturePad";
import { toast } from "sonner";
import { PenLine, Upload, BookmarkPlus, Trash2, Check } from "lucide-react";
import {
  deleteSalesmanProfile,
  fileToDataUrl,
  listSalesmanProfiles,
  saveSalesmanProfile,
} from "@/lib/salesmanProfiles";

export default function SalesmanSection({ value, onChange, userId }) {
  const uploadId = useId();
  const [mode, setMode] = useState(value?.seller_signature_url ? "preview" : "draw");
  const [remember, setRemember] = useState(true);
  const [profiles, setProfiles] = useState([]);

  const refreshProfiles = () => setProfiles(listSalesmanProfiles(userId));

  useEffect(() => {
    refreshProfiles();
  }, [userId]);

  useEffect(() => {
    if (value?.seller_signature_url) setMode("preview");
  }, [value?.seller_signature_url]);

  const apply = (patch) => onChange({ ...value, ...patch });

  const handleDrawn = (dataUrl) => {
    apply({
      seller_signature_url: dataUrl,
      seller_name: value.salesman || "",
      seller_signed_at: new Date().toISOString(),
    });
    setMode("preview");
    toast.success("Signature captured");
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image of the signature");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      apply({
        seller_signature_url: dataUrl,
        seller_name: value.salesman || "",
        seller_signed_at: new Date().toISOString(),
      });
      setMode("preview");
      toast.success("Signature uploaded");
    } catch {
      toast.error("Could not read that image");
    }
  };

  const handleSaveForReuse = () => {
    if (!value.salesman?.trim()) {
      toast.error("Enter the salesman's name before saving");
      return;
    }
    if (!value.seller_signature_url) {
      toast.error("Draw or upload a signature first");
      return;
    }
    saveSalesmanProfile(userId, {
      name: value.salesman,
      phone: value.salesman_phone,
      signature: value.seller_signature_url,
      isDefault: remember,
    });
    refreshProfiles();
    toast.success(remember ? "Saved as your default salesman signature" : "Signature saved for reuse");
  };

  const handleUseProfile = (profile) => {
    apply({
      salesman: profile.name,
      salesman_phone: profile.phone,
      seller_name: profile.name,
      seller_signature_url: profile.signature,
      seller_signed_at: new Date().toISOString(),
    });
    setMode("preview");
    toast.success(`Loaded ${profile.name}'s signature`);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Salesman</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Name, telephone, and signature appear on the Bill of Sale. Draw a signature, upload one, or reuse a saved signature.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Salesman's Name</Label>
          <Input
            value={value.salesman || ""}
            onChange={(e) => apply({ salesman: e.target.value, seller_name: e.target.value })}
            placeholder="e.g., Alex Mensah"
          />
        </div>
        <div className="space-y-2">
          <Label>Salesman's Telephone</Label>
          <Input
            type="tel"
            value={value.salesman_phone || ""}
            onChange={(e) => apply({ salesman_phone: e.target.value })}
            placeholder="e.g., (204) 555-0142"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Signature</Label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={mode === "draw" ? "default" : "outline"} size="sm" onClick={() => setMode("draw")}>
            <PenLine className="w-4 h-4 mr-1" />
            Draw
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <label htmlFor={uploadId} className="cursor-pointer">
              <Upload className="w-4 h-4 mr-1 inline" />
              Upload
            </label>
          </Button>
          <input id={uploadId} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          {value.seller_signature_url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                apply({ seller_signature_url: "", seller_signed_at: "" });
                setMode("draw");
              }}
            >
              Clear signature
            </Button>
          )}
        </div>

        {mode === "draw" && (
          <SignaturePad
            label=""
            existingSignature={null}
            onSave={handleDrawn}
          />
        )}

        {mode === "preview" && value.seller_signature_url && (
          <div className="rounded-md border bg-white p-3">
            <img
              src={value.seller_signature_url}
              alt="Salesman signature"
              className="h-20 w-full object-contain"
            />
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              {value.salesman || "Salesman"} {value.salesman_phone ? `· ${value.salesman_phone}` : ""}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={remember} onCheckedChange={(checked) => setRemember(Boolean(checked))} />
          Set as default for future bills of sale
        </label>
        <Button type="button" variant="outline" size="sm" onClick={handleSaveForReuse}>
          <BookmarkPlus className="w-4 h-4 mr-1" />
          Save for future use
        </Button>
      </div>

      {profiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Saved signatures</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex items-center gap-2 rounded-md border bg-white p-2">
                <img src={profile.signature} alt="" className="h-10 w-20 object-contain bg-slate-50 rounded" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{profile.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {profile.phone || "No phone"} {profile.isDefault ? "· Default" : ""}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => handleUseProfile(profile)}>
                  <Check className="w-3 h-3 mr-1" />
                  Use
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-500"
                  onClick={() => {
                    deleteSalesmanProfile(userId, profile.id);
                    refreshProfiles();
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
