import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import VendorSelector from "@/components/shared/VendorSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createVendorFromVehicleForm,
  findMatchingVendor,
  vendorToVehicleFields,
} from "@/lib/vendorDirectory";
import { Plus, Search } from "lucide-react";

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function VehicleVendorSection({
  formData,
  onChange,
  showPurchaseDocumentFields = true,
}) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [savingVendor, setSavingVendor] = useState(false);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors", selectedCompanyId],
    queryFn: () => supabase.entities.Vendor.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const matched = useMemo(
    () => findMatchingVendor(vendors, formData),
    [vendors, formData]
  );

  const patch = (partial) => {
    onChange((prev) => ({ ...prev, ...partial }));
  };

  const retrieveVendor = (vendor, { overwrite = true } = {}) => {
    if (!vendor) {
      toast.message("No matching vendor on file. Use Quick add vendor.");
      return;
    }
    const mapped = vendorToVehicleFields(vendor);
    onChange((prev) => (overwrite ? { ...prev, ...mapped } : { ...prev, ...mapped, ...prev, vendor_id: vendor.id }));
    toast.success(`Retrieved vendor ${vendor.vendor_name}`);
  };

  const handleFind = () => {
    retrieveVendor(matched || findMatchingVendor(vendors, formData), { overwrite: true });
  };

  const handleQuickAdd = async () => {
    setSavingVendor(true);
    try {
      const vendor = await createVendorFromVehicleForm({
        form: formData,
        companyId: selectedCompanyId,
        queryClient,
      });
      onChange((prev) => ({ ...prev, ...vendorToVehicleFields(vendor) }));
      toast.success(`Added vendor ${vendor.vendor_name}`);
    } catch (error) {
      toast.error(error.message || "Could not add vendor");
    }
    setSavingVendor(false);
  };

  const status = formData.vendor_id
    ? `Using vendor on file${formData.vendor_name ? `: ${formData.vendor_name}` : ""}.`
    : matched
      ? `Match found: ${matched.vendor_name}. Retrieve it or it will be linked when you save.`
      : formData.vendor_name
        ? "New vendor. Quick add now, or it will be created when you save the vehicle."
        : "Select an existing vendor or enter details from the tax invoice / bill of sale.";

  return (
    <div className="col-span-2 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h3 className="font-semibold text-gray-900">Vendor / tax invoice details</h3>
        <p className="text-xs text-gray-500 mt-1">
          CRA needs the supplier name, address, GST/HST number, invoice date and number, and tax amounts.
          MPI salvage bills also require bidder #, storage yard, and stock #.
        </p>
      </div>

      <div className="rounded-md border bg-slate-50 p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Existing vendor">
            <VendorSelector
              value={formData.vendor_id}
              onSelect={(vendor) => retrieveVendor(vendor, { overwrite: true })}
              onCreateNew={handleQuickAdd}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" className="w-full" onClick={handleFind}>
              <Search className="w-4 h-4 mr-2" />
              Find vendor
            </Button>
            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleQuickAdd}
              disabled={savingVendor || !formData.vendor_name}
            >
              <Plus className="w-4 h-4 mr-2" />
              {savingVendor ? "Adding…" : "Quick add vendor"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-600" data-testid="vendor-match-status">{status}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Vendor name" className="col-span-2">
          <Input
            value={formData.vendor_name || ""}
            onChange={(e) => patch({ vendor_name: e.target.value, vendor_id: "" })}
            placeholder="Manitoba Public Insurance"
          />
        </Field>
        <Field label="Address" className="col-span-2">
          <Input
            value={formData.vendor_address || ""}
            onChange={(e) => patch({ vendor_address: e.target.value })}
            placeholder="Street address"
          />
        </Field>
        <Field label="City">
          <Input
            value={formData.vendor_city || ""}
            onChange={(e) => patch({ vendor_city: e.target.value })}
            placeholder="Winnipeg"
          />
        </Field>
        <Field label="Province / State">
          <Input
            value={formData.vendor_province || ""}
            onChange={(e) => patch({ vendor_province: e.target.value })}
            placeholder="MB"
          />
        </Field>
        <Field label="Country">
          <Input
            value={formData.vendor_country || ""}
            onChange={(e) => patch({ vendor_country: e.target.value })}
            placeholder="Canada"
          />
        </Field>
        <Field label="Postal / ZIP code">
          <Input
            value={formData.vendor_postal_code || ""}
            onChange={(e) => patch({ vendor_postal_code: e.target.value })}
            placeholder="R2C 5C7"
          />
        </Field>
        <Field label="GST #">
          <Input
            value={formData.vendor_gst_number || ""}
            onChange={(e) => patch({ vendor_gst_number: e.target.value, vendor_id: "" })}
            placeholder="R122001191"
          />
        </Field>
        <Field label="PST #">
          <Input
            value={formData.vendor_pst_number || ""}
            onChange={(e) => patch({ vendor_pst_number: e.target.value })}
            placeholder="556568-5"
          />
        </Field>
        <Field label="Email address">
          <Input
            type="email"
            value={formData.vendor_email || ""}
            onChange={(e) => patch({ vendor_email: e.target.value })}
            placeholder="accounts@vendor.ca"
          />
        </Field>
        <Field label="Phone #">
          <Input
            value={formData.vendor_phone || ""}
            onChange={(e) => patch({ vendor_phone: e.target.value })}
            placeholder="(204) 555-0100"
          />
        </Field>

        {showPurchaseDocumentFields && (
          <>
            <Field label="Invoice / bill of sale no.">
              <Input
                value={formData.invoice_number || ""}
                onChange={(e) => patch({ invoice_number: e.target.value })}
                placeholder="148734"
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={formData.transaction_date || ""}
                onChange={(e) => patch({ transaction_date: e.target.value })}
              />
            </Field>
            <Field label="Stock #">
              <Input
                value={formData.stock_number || ""}
                onChange={(e) => patch({ stock_number: e.target.value })}
                placeholder="20266247"
              />
            </Field>
          </>
        )}

        <Field label="Bidder #">
          <Input
            value={formData.bidder_number || ""}
            onChange={(e) => patch({ bidder_number: e.target.value })}
            placeholder="AA7724"
          />
        </Field>
        <Field label="Storage yard">
          <Input
            value={formData.storage_yard || ""}
            onChange={(e) => patch({ storage_yard: e.target.value })}
            placeholder="Winnipeg"
          />
        </Field>
        <Field label="Auction #">
          <Input
            value={formData.auction_number || ""}
            onChange={(e) => patch({ auction_number: e.target.value })}
            placeholder="6621"
          />
        </Field>
        <Field label="MPI DOC #">
          <Input
            value={formData.mpi_doc_number || ""}
            onChange={(e) => patch({ mpi_doc_number: e.target.value })}
            placeholder="51901903"
          />
        </Field>
        <Field label="Tax exemption reason" className="col-span-2">
          <Input
            value={formData.tax_exemption_reason || ""}
            onChange={(e) => patch({ tax_exemption_reason: e.target.value })}
            placeholder="Manitoba RST"
          />
        </Field>
      </div>
    </div>
  );
}
