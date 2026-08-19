import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2, CheckCircle, AlertTriangle, DollarSign, TrendingDown, ShieldAlert } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";

export default function AIPurchaseOrderGenerator({ listing, open, onClose, onSuccess }) {
  const { selectedCompanyId } = useCompany();
  const [generating, setGenerating] = useState(false);
  const [aiAdvisory, setAiAdvisory] = useState(null);
  const [poData, setPoData] = useState(null);

  useEffect(() => {
    if (open && listing) {
      generatePOWithAI();
    }
  }, [open, listing]);

  const generatePOWithAI = async () => {
    setGenerating(true);
    try {
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Generate a detailed Purchase Order for this vehicle listing with AI analysis:

Listing Details:
- Vehicle: ${listing.year} ${listing.make} ${listing.model}
- VIN: ${listing.vin}
- Mileage: ${listing.mileage_hours} km
- Asking Price: $${listing.asking_price}
- Condition: ${listing.condition}
- Location: ${listing.location}
- Seller: ${listing.seller_name} (Rating: ${listing.seller_rating}, Sales: ${listing.seller_total_sales})

AI Scores from Search:
- Overall Score: ${listing.ai_scores?.overall_score || 0}
- Price Score: ${listing.ai_scores?.price_score || 0}
- Condition Score: ${listing.ai_scores?.condition_score || 0}
- Seller Trust: ${listing.ai_scores?.seller_trust_score || 0}

Generate:
1. AI price advisory with predicted fair price
2. Recommended negotiation range (min-max)
3. Risk assessment and flags
4. Suggested purchase price (optimized)
5. Tax estimates (assume Canadian buyer)
6. Total cost estimate
7. Compliance checks
8. Recommendation (buy/negotiate/avoid)

Be realistic and data-driven.`,
        response_json_schema: {
          type: "object",
          properties: {
            predicted_fair_price: { type: "number" },
            confidence_score: { type: "number" },
            price_variance_pct: { type: "number" },
            negotiation_range: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" }
              }
            },
            suggested_offer: { type: "number" },
            risk_level: { type: "string" },
            risk_flags: { type: "array", items: { type: "string" } },
            estimated_tax: { type: "number" },
            estimated_total_cost: { type: "number" },
            recommendation: { type: "string" },
            advisory_notes: { type: "string" },
            compliance_flags: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiAdvisory(response);

      // Pre-populate PO
      setPoData({
        po_number: `PO-${Date.now()}`,
        vendor_name: listing.seller_name,
        vendor_location: listing.location,
        item_description: `${listing.year} ${listing.make} ${listing.model}`,
        vin: listing.vin,
        mileage: listing.mileage_hours,
        condition: listing.condition,
        asking_price: listing.asking_price,
        offered_price: response.suggested_offer,
        estimated_tax: response.estimated_tax,
        total_cost: response.estimated_total_cost,
        currency: listing.currency || "CAD",
        notes: `AI Advisory: ${response.recommendation}\n\n${response.advisory_notes || ""}`
      });

      toast.success("PO generated with AI insights");
    } catch (error) {
      toast.error("Failed to generate PO");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreatePO = async () => {
    try {
      await supabase.entities.Purchase.create({
        company_id: selectedCompanyId,
        purchase_number: poData.po_number,
        vendor_name: poData.vendor_name,
        purchase_date: new Date().toISOString().split('T')[0],
        total_amount: poData.total_cost,
        currency: poData.currency,
        status: "draft",
        items: [{
          description: poData.item_description,
          vin: poData.vin,
          quantity: 1,
          unit_price: poData.offered_price,
          total: poData.offered_price
        }],
        notes: poData.notes,
        ai_advisory: aiAdvisory
      });

      toast.success("Purchase Order created successfully");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error("Failed to create PO");
      console.error(error);
    }
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case "low": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Generated Purchase Order
          </DialogTitle>
        </DialogHeader>

        {generating ? (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-600 mb-4" />
            <p className="text-gray-600">Analyzing listing with AI...</p>
            <p className="text-sm text-gray-500 mt-2">
              Running price prediction, risk assessment, and compliance checks
            </p>
          </div>
        ) : aiAdvisory && poData ? (
          <div className="space-y-6">
            {/* AI Advisory Panel */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  AI Advisory & Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Predicted Fair Price</p>
                    <p className="text-xl font-bold text-purple-900">
                      ${aiAdvisory.predicted_fair_price.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Confidence: {Math.round((aiAdvisory.confidence_score || 0) * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Price Variance</p>
                    <div className="flex items-center gap-2">
                      {aiAdvisory.price_variance_pct < -5 ? (
                        <TrendingDown className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600 rotate-180" />
                      )}
                      <span className={`text-xl font-bold ${aiAdvisory.price_variance_pct < -5 ? "text-green-600" : "text-red-600"}`}>
                        {aiAdvisory.price_variance_pct > 0 ? "+" : ""}{aiAdvisory.price_variance_pct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {aiAdvisory.price_variance_pct < -10 ? "Excellent deal!" : aiAdvisory.price_variance_pct < 5 ? "Fair price" : "Overpriced"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Risk Level</p>
                    <Badge className={getRiskColor(aiAdvisory.risk_level)}>
                      {aiAdvisory.risk_level} Risk
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-2">Negotiation Range</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white p-3 rounded border">
                      <p className="text-xs text-gray-500">Min Offer</p>
                      <p className="font-bold text-green-600">
                        ${aiAdvisory.negotiation_range.min.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="flex-1 bg-white p-3 rounded border">
                      <p className="text-xs text-gray-500">Max Offer</p>
                      <p className="font-bold text-blue-600">
                        ${aiAdvisory.negotiation_range.max.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {aiAdvisory.risk_flags?.length > 0 && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <p className="text-xs font-semibold text-red-900 mb-2 flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4" />
                      Risk Flags
                    </p>
                    <ul className="text-xs text-red-800 space-y-1">
                      {aiAdvisory.risk_flags.map((flag, idx) => (
                        <li key={idx}>⚠️ {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAdvisory.compliance_flags?.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                    <p className="text-xs font-semibold text-orange-900 mb-2">Compliance Alerts</p>
                    <ul className="text-xs text-orange-800 space-y-1">
                      {aiAdvisory.compliance_flags.map((flag, idx) => (
                        <li key={idx}>• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <p className="text-xs font-semibold text-blue-900 mb-1">AI Recommendation</p>
                  <p className="text-sm text-blue-800">{aiAdvisory.recommendation}</p>
                  {aiAdvisory.advisory_notes && (
                    <p className="text-xs text-blue-700 mt-2">{aiAdvisory.advisory_notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* PO Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Purchase Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>PO Number</Label>
                    <Input value={poData.po_number} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <Label>Vendor Name</Label>
                    <Input
                      value={poData.vendor_name}
                      onChange={(e) => setPoData({ ...poData, vendor_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Vendor Location</Label>
                    <Input
                      value={poData.vendor_location}
                      onChange={(e) => setPoData({ ...poData, vendor_location: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>VIN</Label>
                    <Input value={poData.vin} readOnly className="bg-gray-50 font-mono text-sm" />
                  </div>
                  <div>
                    <Label>Item Description</Label>
                    <Input
                      value={poData.item_description}
                      onChange={(e) => setPoData({ ...poData, item_description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Condition</Label>
                    <Input value={poData.condition} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <Label>Mileage (km)</Label>
                    <Input value={poData.mileage} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input value={poData.currency} readOnly className="bg-gray-50" />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-xs text-gray-600">Asking Price</Label>
                    <p className="text-lg font-bold text-gray-900">
                      ${poData.asking_price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">AI Suggested Offer</Label>
                    <Input
                      type="number"
                      value={poData.offered_price}
                      onChange={(e) => {
                        const offer = parseFloat(e.target.value) || 0;
                        const tax = offer * 0.13; // Example tax rate
                        setPoData({
                          ...poData,
                          offered_price: offer,
                          estimated_tax: tax,
                          total_cost: offer + tax
                        });
                      }}
                      className="font-bold text-green-600"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Est. Tax</Label>
                    <p className="text-lg font-bold text-blue-600">
                      ${poData.estimated_tax.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 font-semibold">Total Estimated Cost</p>
                      <p className="text-xs text-blue-600">Offer + Tax</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">
                      ${poData.total_cost.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Notes & AI Advisory</Label>
                  <Textarea
                    value={poData.notes}
                    onChange={(e) => setPoData({ ...poData, notes: e.target.value })}
                    rows={4}
                    className="text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePO}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Purchase Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}