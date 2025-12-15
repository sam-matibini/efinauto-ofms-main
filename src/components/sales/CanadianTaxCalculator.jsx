import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, ShieldCheck } from "lucide-react";

// Canadian Sales Tax Rates (CRA Guidelines)
const CANADIAN_TAX_RATES = {
  AB: { name: "Alberta", gst: 5, pst: 0, hst: 0, total: 5, type: "GST" },
  BC: { name: "British Columbia", gst: 5, pst: 7, hst: 0, total: 12, type: "GST+PST" },
  MB: { name: "Manitoba", gst: 5, pst: 7, hst: 0, total: 12, type: "GST+PST" },
  NB: { name: "New Brunswick", gst: 0, pst: 0, hst: 15, total: 15, type: "HST" },
  NL: { name: "Newfoundland and Labrador", gst: 0, pst: 0, hst: 15, total: 15, type: "HST" },
  NT: { name: "Northwest Territories", gst: 5, pst: 0, hst: 0, total: 5, type: "GST" },
  NS: { name: "Nova Scotia", gst: 0, pst: 0, hst: 15, total: 15, type: "HST" },
  NU: { name: "Nunavut", gst: 5, pst: 0, hst: 0, total: 5, type: "GST" },
  ON: { name: "Ontario", gst: 0, pst: 0, hst: 13, total: 13, type: "HST" },
  PE: { name: "Prince Edward Island", gst: 0, pst: 0, hst: 15, total: 15, type: "HST" },
  QC: { name: "Quebec", gst: 5, pst: 9.975, hst: 0, total: 14.975, type: "GST+QST" },
  SK: { name: "Saskatchewan", gst: 5, pst: 6, hst: 0, total: 11, type: "GST+PST" },
  YT: { name: "Yukon", gst: 5, pst: 0, hst: 0, total: 5, type: "GST" },
};

export function calculateCanadianTax(subtotal, province, taxStatus = "taxable", pstExempt = false) {
  if (!province || !CANADIAN_TAX_RATES[province]) {
    return { gst: 0, pst: 0, hst: 0, total: 0, breakdown: "", pstRate: 0 };
  }

  // Zero-rated and exempt sales have no tax
  if (taxStatus === "zero_rated" || taxStatus === "exempt") {
    return { 
      gst: 0, 
      pst: 0, 
      hst: 0, 
      total: 0, 
      pstRate: CANADIAN_TAX_RATES[province].pst,
      breakdown: taxStatus === "zero_rated" ? "Zero-Rated (0%)" : "Tax Exempt" 
    };
  }

  const rates = CANADIAN_TAX_RATES[province];
  const gst = rates.gst > 0 ? (subtotal * rates.gst) / 100 : 0;
  const pst = (rates.pst > 0 && !pstExempt) ? (subtotal * rates.pst) / 100 : 0;
  const hst = rates.hst > 0 ? (subtotal * rates.hst) / 100 : 0;
  const total = gst + pst + hst;

  let breakdown = "";
  if (rates.hst > 0) {
    breakdown = `HST ${rates.hst}%`;
  } else {
    if (rates.gst > 0) breakdown += `GST ${rates.gst}%`;
    if (rates.pst > 0) {
      if (breakdown) breakdown += " + ";
      const pstLabel = province === "QC" ? "QST" : "PST";
      breakdown += pstExempt ? `${pstLabel} (Exempt)` : `${pstLabel} ${rates.pst}%`;
    }
  }

  return { gst, pst, hst, total, breakdown, pstRate: rates.pst };
}

export default function CanadianTaxCalculator({ 
  value, 
  onChange, 
  subtotal, 
  taxStatus, 
  onTaxStatusChange,
  pstExempt,
  onPstExemptChange,
  pstExemptReason,
  onPstExemptReasonChange,
  pstExemptReference,
  onPstExemptReferenceChange,
  userRole
}) {
  const selectedProvince = value || "ON";
  const selectedTaxStatus = taxStatus || "taxable";
  const isPstExempt = pstExempt || false;
  const taxDetails = calculateCanadianTax(subtotal || 0, selectedProvince, selectedTaxStatus, isPstExempt);
  
  const canApplyPstExempt = userRole === 'admin' || userRole === 'manager' || userRole === 'finance';
  const provinceData = CANADIAN_TAX_RATES[selectedProvince];
  const provinceHasPst = provinceData && provinceData.pst > 0 && provinceData.hst === 0;

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardContent className="p-4 space-y-4">
        <div>
          <Label className="text-sm font-semibold mb-2 block">Tax Status</Label>
          <Select value={selectedTaxStatus} onValueChange={onTaxStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="taxable">Taxable (Standard Rates)</SelectItem>
              <SelectItem value="zero_rated">Zero-Rated (0% - ITC Eligible)</SelectItem>
              <SelectItem value="exempt">Tax Exempt (No Tax, No ITC)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Province/Territory</Label>
          <Select value={selectedProvince} onValueChange={onChange} disabled={selectedTaxStatus !== "taxable"}>
            <SelectTrigger>
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CANADIAN_TAX_RATES).map(([code, info]) => (
                <SelectItem key={code} value={code}>
                  {info.name} ({info.total}% {info.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTaxStatus === "taxable" && provinceHasPst && canApplyPstExempt && (
          <div className="space-y-3 p-3 border rounded-lg bg-amber-50 border-amber-200">
            <div className="flex items-start gap-2">
              <Checkbox 
                id="pst_exempt" 
                checked={isPstExempt}
                onCheckedChange={(checked) => {
                  if (checked && !confirm("Are you applying a PST exemption? Please confirm compliance eligibility.")) {
                    return;
                  }
                  onPstExemptChange?.(checked);
                }}
              />
              <div className="flex-1">
                <Label htmlFor="pst_exempt" className="cursor-pointer font-semibold text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  PST Exempt
                </Label>
                <p className="text-xs text-amber-700 mt-1">
                  Check if this sale qualifies for PST exemption (requires justification)
                </p>
              </div>
            </div>

            {isPstExempt && (
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs font-semibold">Exemption Reason *</Label>
                  <Select value={pstExemptReason || ""} onValueChange={onPstExemptReasonChange}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status_indian">Status Indian Exemption</SelectItem>
                      <SelectItem value="government">Government Purchase</SelectItem>
                      <SelectItem value="resale">Resale / Dealer Exemption</SelectItem>
                      <SelectItem value="export_province">Export Out of Province</SelectItem>
                      <SelectItem value="other">Other (see notes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Certificate / Reference #</Label>
                  <Input 
                    placeholder="e.g., Certificate number, ID..." 
                    value={pstExemptReference || ""}
                    onChange={(e) => onPstExemptReferenceChange?.(e.target.value)}
                    className="bg-white text-sm"
                  />
                </div>

                <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-100 p-2 rounded">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>PST exemption will be logged for audit purposes. Ensure proper documentation is retained.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!canApplyPstExempt && isPstExempt && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            PST Exempt (Applied by authorized user)
          </div>
        )}

        {subtotal > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm font-medium">${subtotal.toFixed(2)}</span>
            </div>

            {selectedTaxStatus !== "taxable" ? (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Tax Status:</span>
                <Badge variant="outline" className="bg-gray-100">
                  {taxDetails.breakdown}
                </Badge>
              </div>
            ) : (
              <>
                {taxDetails.hst > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">HST ({CANADIAN_TAX_RATES[selectedProvince].hst}%):</span>
                    <span className="text-sm font-medium">${taxDetails.hst.toFixed(2)}</span>
                  </div>
                )}

                {taxDetails.gst > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">GST ({CANADIAN_TAX_RATES[selectedProvince].gst}%):</span>
                    <span className="text-sm font-medium">${taxDetails.gst.toFixed(2)}</span>
                  </div>
                )}

                {provinceData && provinceData.pst > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {selectedProvince === "QC" ? "QST" : "PST"} ({provinceData.pst}%):
                    </span>
                    {isPstExempt ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">Exempt</Badge>
                    ) : (
                      <span className="text-sm font-medium">${taxDetails.pst.toFixed(2)}</span>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-semibold">Total Tax:</span>
              <Badge className={selectedTaxStatus === "taxable" ? "bg-blue-600 text-white" : "bg-gray-400 text-white"}>
                ${taxDetails.total.toFixed(2)}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-base font-bold">Grand Total:</span>
              <span className="text-lg font-bold text-blue-600">
                ${(subtotal + taxDetails.total).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { CANADIAN_TAX_RATES };