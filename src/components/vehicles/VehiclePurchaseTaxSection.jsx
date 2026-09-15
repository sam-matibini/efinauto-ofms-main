import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { vehiclePurchaseTaxes } from "@/lib/vehiclePurchaseTaxes";

const PROVINCES = [
  ["AB", "Alberta"],
  ["BC", "British Columbia"],
  ["MB", "Manitoba"],
  ["NB", "New Brunswick"],
  ["NL", "Newfoundland"],
  ["NT", "Northwest Territories"],
  ["NS", "Nova Scotia"],
  ["NU", "Nunavut"],
  ["ON", "Ontario"],
  ["PE", "Prince Edward Island"],
  ["QC", "Quebec"],
  ["SK", "Saskatchewan"],
  ["YT", "Yukon"],
];

function moneyValue(value) {
  if (value === "" || value == null || Number.isNaN(Number(value))) return "";
  return value;
}

export default function VehiclePurchaseTaxSection({
  formData,
  onChange,
  companyRates,
  showPosting = true,
}) {
  const applyComputed = (overrides = {}, recomputeFromRates = false) => {
    const next = { ...formData, ...overrides };
    const taxes = vehiclePurchaseTaxes({
      pretax: next.purchase_price,
      tax_gst: recomputeFromRates ? undefined : next.tax_gst,
      tax_pst: recomputeFromRates ? undefined : next.tax_pst,
      tax_hst: recomputeFromRates ? undefined : next.tax_hst,
      province: next.province,
      tax_status: next.tax_status,
      pst_exempt: next.pst_exempt,
      companyRates,
      useRates: recomputeFromRates,
    });
    onChange({ ...next, ...taxes });
  };

  const alreadyPosted = Boolean(formData.gl_posted || formData.purchase_id);

  return (
    <div className="col-span-2 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="font-semibold text-gray-900">Sales taxes (RST) paid</h3>
        <p className="text-xs text-gray-600 mt-1">
          Pretax is the invoice amount before tax. RST is GST + PST + HST paid on the purchase.
          Total vehicle expenditure is pretax plus RST. GST/HST is recoverable (ITC); PST stays in inventory cost.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Province</Label>
          <Select
            value={formData.province || undefined}
            onValueChange={(province) => applyComputed({ province }, true)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map(([code, name]) => (
                <SelectItem key={code} value={code}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tax status</Label>
          <Select
            value={formData.tax_status || "taxable"}
            onValueChange={(tax_status) => applyComputed({ tax_status }, true)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="taxable">Taxable</SelectItem>
              <SelectItem value="zero_rated">Zero-rated</SelectItem>
              <SelectItem value="exempt">Exempt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2 flex items-center gap-2 pt-1">
          <Checkbox
            id="pst_exempt_rst"
            checked={Boolean(formData.pst_exempt)}
            onCheckedChange={(checked) => applyComputed({ pst_exempt: Boolean(checked) }, true)}
          />
          <Label htmlFor="pst_exempt_rst" className="cursor-pointer">PST / RST exempt</Label>
        </div>

        <div className="space-y-2">
          <Label>Pretax amount ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={moneyValue(formData.purchase_price)}
            onChange={(event) => applyComputed({ purchase_price: parseFloat(event.target.value) || 0 }, true)}
          />
        </div>
        <div className="space-y-2">
          <Label>GST paid ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={moneyValue(formData.tax_gst)}
            onChange={(event) => applyComputed({ tax_gst: parseFloat(event.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>PST paid ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={moneyValue(formData.tax_pst)}
            onChange={(event) => applyComputed({ tax_pst: parseFloat(event.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>HST paid ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={moneyValue(formData.tax_hst)}
            onChange={(event) => applyComputed({ tax_hst: parseFloat(event.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>RST ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={moneyValue(formData.tax_rst ?? formData.tax_total)}
            readOnly
            className="bg-white font-medium"
          />
          <p className="text-[11px] text-gray-500">GST + PST + HST paid on this purchase</p>
        </div>
        <div className="space-y-2">
          <Label>Total vehicle expenditure ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={moneyValue(formData.total_vehicle_expenditure ?? formData.total_cost)}
            readOnly
            className="bg-white font-semibold"
          />
          <p className="text-[11px] text-gray-500">Pretax + RST</p>
        </div>
      </div>

      {showPosting && (
        <div className="flex items-start gap-2 rounded-md border border-indigo-100 bg-white p-3">
          <Checkbox
            id="post_to_gl"
            checked={formData.post_to_gl !== false}
            disabled={alreadyPosted}
            onCheckedChange={(checked) => onChange({ ...formData, post_to_gl: Boolean(checked) })}
          />
          <div>
            <Label htmlFor="post_to_gl" className="cursor-pointer font-medium text-sm">
              Post amounts to the general ledger
            </Label>
            <p className="text-xs text-gray-600 mt-0.5">
              Creates a received vehicle purchase for the net tax, posts GST/HST to ITC (1150),
              PST to inventory cost, and credits accounts payable. Inventory is valued at pretax + PST.
              {alreadyPosted ? " This vehicle is already posted." : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
