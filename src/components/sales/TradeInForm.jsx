import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car } from "lucide-react";

export default function TradeInForm({ tradeIn = {}, onChange }) {
  const hasTradeIn = tradeIn.has_trade_in || false;

  const updateTradeIn = (updates) => {
    onChange({ ...tradeIn, ...updates });
  };

  const payoffAmount = parseFloat(tradeIn.payoff_amount) || 0;
  const tradeInValue = parseFloat(tradeIn.trade_in_value) || 0;
  const netTradeValue = tradeInValue - payoffAmount;

  React.useEffect(() => {
    if (hasTradeIn) {
      updateTradeIn({ net_trade_value: netTradeValue });
    }
  }, [tradeInValue, payoffAmount]);

  return (
    <Card className="border-none bg-gray-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Car className="w-5 h-5 text-blue-600" />
            Trade-In Vehicle
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="has-trade-in" className="text-sm">Has Trade-In?</Label>
            <Switch
              id="has-trade-in"
              checked={hasTradeIn}
              onCheckedChange={(checked) => updateTradeIn({ has_trade_in: checked })}
            />
          </div>
        </div>
      </CardHeader>
      
      {hasTradeIn && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Make</Label>
              <Input
                value={tradeIn.vehicle_make || ""}
                onChange={(e) => updateTradeIn({ vehicle_make: e.target.value })}
                placeholder="e.g., Honda"
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={tradeIn.vehicle_model || ""}
                onChange={(e) => updateTradeIn({ vehicle_model: e.target.value })}
                placeholder="e.g., Civic"
              />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={tradeIn.vehicle_year || ""}
                onChange={(e) => updateTradeIn({ vehicle_year: parseInt(e.target.value) })}
                placeholder="2020"
              />
            </div>
            <div className="space-y-2">
              <Label>VIN</Label>
              <Input
                value={tradeIn.vehicle_vin || ""}
                onChange={(e) => updateTradeIn({ vehicle_vin: e.target.value })}
                placeholder="17 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Mileage</Label>
              <Input
                type="number"
                value={tradeIn.mileage || ""}
                onChange={(e) => updateTradeIn({ mileage: parseInt(e.target.value) })}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={tradeIn.condition || "good"}
                onValueChange={(v) => updateTradeIn({ condition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trade-In Value ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={tradeIn.trade_in_value || ""}
                onChange={(e) => updateTradeIn({ trade_in_value: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Payoff Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={tradeIn.payoff_amount || ""}
                onChange={(e) => updateTradeIn({ payoff_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Net Trade-In Value:</span>
              <span className={`text-2xl font-bold ${netTradeValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${netTradeValue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={tradeIn.notes || ""}
              onChange={(e) => updateTradeIn({ notes: e.target.value })}
              rows={2}
              placeholder="Additional notes about the trade-in vehicle..."
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}