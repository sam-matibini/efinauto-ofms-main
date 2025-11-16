import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export function calculateCanadianTax(subtotal, province) {
  if (!province || !CANADIAN_TAX_RATES[province]) {
    return { gst: 0, pst: 0, hst: 0, total: 0, breakdown: "" };
  }

  const rates = CANADIAN_TAX_RATES[province];
  const gst = rates.gst > 0 ? (subtotal * rates.gst) / 100 : 0;
  const pst = rates.pst > 0 ? (subtotal * rates.pst) / 100 : 0;
  const hst = rates.hst > 0 ? (subtotal * rates.hst) / 100 : 0;
  const total = gst + pst + hst;

  let breakdown = "";
  if (rates.hst > 0) {
    breakdown = `HST ${rates.hst}%`;
  } else {
    if (rates.gst > 0) breakdown += `GST ${rates.gst}%`;
    if (rates.pst > 0) {
      if (breakdown) breakdown += " + ";
      breakdown += province === "QC" ? `QST ${rates.pst}%` : `PST ${rates.pst}%`;
    }
  }

  return { gst, pst, hst, total, breakdown };
}

export default function CanadianTaxCalculator({ value, onChange, subtotal }) {
  const selectedProvince = value || "ON";
  const taxDetails = calculateCanadianTax(subtotal || 0, selectedProvince);

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardContent className="p-4 space-y-4">
        <div>
          <Label className="text-sm font-semibold mb-2 block">Province/Territory</Label>
          <Select value={selectedProvince} onValueChange={onChange}>
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

        {subtotal > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm font-medium">${subtotal.toFixed(2)}</span>
            </div>

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

            {taxDetails.pst > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {selectedProvince === "QC" ? "QST" : "PST"} ({CANADIAN_TAX_RATES[selectedProvince].pst}%):
                </span>
                <span className="text-sm font-medium">${taxDetails.pst.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-semibold">Total Tax:</span>
              <Badge className="bg-blue-600 text-white">
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