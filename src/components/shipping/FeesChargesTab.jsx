import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Search, Eye, Download, Calculator, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

const formatCurrency = (amount) => `$${(amount || 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;

export default function FeesChargesTab({ shipments = [], exports = [], customers = [] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewShipment, setViewShipment] = useState(null);
  const [aiEstimate, setAiEstimate] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const filteredShipments = shipments.filter(s =>
    !searchTerm ||
    s.shipment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totals = {
    estimated: filteredShipments.reduce((sum, s) => sum + (s.total_cost || 0), 0),
    freight: filteredShipments.reduce((sum, s) => sum + (s.freight_cost || 0), 0),
    customs: filteredShipments.reduce((sum, s) => sum + (s.customs_fees || 0), 0),
    handling: filteredShipments.reduce((sum, s) => sum + (s.handling_fees || 0), 0),
    insurance: filteredShipments.reduce((sum, s) => sum + (s.insurance_cost || 0), 0)
  };

  const getAIFeeEstimate = async () => {
    if (!viewShipment) return;
    
    setLoadingAI(true);
    try {
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Estimate shipping fees for this shipment:

Route: ${viewShipment.origin_country} → ${viewShipment.destination_country}
Shipment Type: ${viewShipment.shipment_type}
Cargo Type: ${viewShipment.cargo_type}
Cargo Value: $${viewShipment.cargo_value || 0}
Weight: ${viewShipment.total_weight || 0} kg
Current Fees:
- Freight: $${viewShipment.freight_cost || 0}
- Handling: $${viewShipment.handling_fees || 0}
- Customs: $${viewShipment.customs_fees || 0}
- Insurance: $${viewShipment.insurance_cost || 0}

Provide estimated fee breakdown including:
1. Freight charges
2. Port handling
3. Customs clearance
4. Insurance recommendation
5. Storage fees (estimated)
6. Total estimate
7. Cost-saving tips`,
        response_json_schema: {
          type: "object",
          properties: {
            freight_estimate: { type: "number" },
            handling_estimate: { type: "number" },
            customs_estimate: { type: "number" },
            insurance_estimate: { type: "number" },
            storage_estimate: { type: "number" },
            total_estimate: { type: "number" },
            duty_rate_estimate: { type: "string" },
            notes: { type: "array", items: { type: "string" } },
            cost_saving_tips: { type: "array", items: { type: "string" } }
          }
        }
      });
      setAiEstimate(response);
    } catch (error) {
      toast.error("Failed to generate fee estimate");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="p-4">
            <p className="text-blue-100 text-sm">Total Fees</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.estimated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Freight</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totals.freight)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Customs</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totals.customs)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Handling</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totals.handling)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Insurance</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totals.insurance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by shipment #, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Fees Table */}
      <Card className="border-none shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipment ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Freight</TableHead>
              <TableHead className="text-right">Handling</TableHead>
              <TableHead className="text-right">Customs</TableHead>
              <TableHead className="text-right">Insurance</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredShipments.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell className="font-medium">{shipment.shipment_number || '-'}</TableCell>
                <TableCell>{shipment.customer_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(shipment.freight_cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(shipment.handling_fees)}</TableCell>
                <TableCell className="text-right">{formatCurrency(shipment.customs_fees)}</TableCell>
                <TableCell className="text-right">{formatCurrency(shipment.insurance_cost)}</TableCell>
                <TableCell className="text-right font-bold text-blue-600">{formatCurrency(shipment.total_cost)}</TableCell>
                <TableCell>
                  <Badge className={
                    shipment.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    shipment.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {shipment.payment_status || 'pending'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setViewShipment(shipment); setAiEstimate(null); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredShipments.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">No shipments found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Fee Details Dialog */}
      <Dialog open={!!viewShipment} onOpenChange={() => { setViewShipment(null); setAiEstimate(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Fee Breakdown - {viewShipment?.shipment_number}
            </DialogTitle>
          </DialogHeader>
          {viewShipment && (
            <div className="space-y-6 py-4">
              {/* Current Fees */}
              <div className="space-y-3">
                <h3 className="font-semibold">Current Fee Breakdown</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span>Freight Cost</span>
                    <span className="font-semibold">{formatCurrency(viewShipment.freight_cost)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span>Handling Fees</span>
                    <span className="font-semibold">{formatCurrency(viewShipment.handling_fees)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span>Customs Clearance</span>
                    <span className="font-semibold">{formatCurrency(viewShipment.customs_fees)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span>Insurance</span>
                    <span className="font-semibold">{formatCurrency(viewShipment.insurance_cost)}</span>
                  </div>
                </div>
                <div className="flex justify-between p-4 bg-blue-50 rounded-lg">
                  <span className="font-semibold">Total Due</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(viewShipment.total_cost)}</span>
                </div>
              </div>

              {/* AI Estimate */}
              <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2 text-purple-800">
                      <Sparkles className="w-4 h-4" />
                      AI Fee Estimator
                    </CardTitle>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={getAIFeeEstimate}
                      disabled={loadingAI}
                      className="border-purple-300"
                    >
                      {loadingAI ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                      Estimate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {aiEstimate ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span>Freight (Est.)</span>
                          <span>{formatCurrency(aiEstimate.freight_estimate)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span>Handling (Est.)</span>
                          <span>{formatCurrency(aiEstimate.handling_estimate)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span>Customs (Est.)</span>
                          <span>{formatCurrency(aiEstimate.customs_estimate)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span>Insurance (Est.)</span>
                          <span>{formatCurrency(aiEstimate.insurance_estimate)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span>Storage (Est.)</span>
                          <span>{formatCurrency(aiEstimate.storage_estimate)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-purple-100 rounded font-semibold">
                          <span>Total Est.</span>
                          <span>{formatCurrency(aiEstimate.total_estimate)}</span>
                        </div>
                      </div>

                      {aiEstimate.duty_rate_estimate && (
                        <p className="text-sm text-purple-700">
                          <strong>Duty Rate:</strong> {aiEstimate.duty_rate_estimate}
                        </p>
                      )}

                      {aiEstimate.cost_saving_tips?.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs font-semibold text-green-800 mb-1">💡 Cost Saving Tips</p>
                          <ul className="text-sm text-green-700 list-disc list-inside">
                            {aiEstimate.cost_saving_tips.map((tip, i) => <li key={i}>{tip}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Click "Estimate" to get AI-powered fee predictions.</p>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export as PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}