import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FinancingForm({ financing = {}, onChange, salePrice = 0 }) {
  const enabled = financing.enabled || false;

  const updateFinancing = (updates) => {
    onChange({ ...financing, ...updates });
  };

  const loanAmount = parseFloat(financing.loan_amount) || 0;
  const interestRate = parseFloat(financing.interest_rate) || 0;
  const termMonths = parseInt(financing.term_months) || 0;

  // Calculate monthly payment
  React.useEffect(() => {
    if (enabled && loanAmount > 0 && termMonths > 0) {
      const monthlyRate = interestRate / 100 / 12;
      let monthlyPayment;
      
      if (interestRate === 0) {
        monthlyPayment = loanAmount / termMonths;
      } else {
        monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                        (Math.pow(1 + monthlyRate, termMonths) - 1);
      }
      
      updateFinancing({ monthly_payment: monthlyPayment });
    }
  }, [loanAmount, interestRate, termMonths, enabled]);

  return (
    <Card className="border-none bg-gray-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Financing
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="financing-enabled" className="text-sm">Enable Financing?</Label>
            <Switch
              id="financing-enabled"
              checked={enabled}
              onCheckedChange={(checked) => updateFinancing({ enabled: checked })}
            />
          </div>
        </div>
      </CardHeader>
      
      {enabled && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Financial Institution</Label>
              <Input
                value={financing.institution || ""}
                onChange={(e) => updateFinancing({ institution: e.target.value })}
                placeholder="e.g., Bank of America"
              />
            </div>
            <div className="space-y-2">
              <Label>Approval Status</Label>
              <Select
                value={financing.approval_status || "pending"}
                onValueChange={(v) => updateFinancing({ approval_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pre_approved">Pre-Approved</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Down Payment ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={financing.down_payment || ""}
                onChange={(e) => updateFinancing({ down_payment: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Loan Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={financing.loan_amount || ""}
                onChange={(e) => updateFinancing({ loan_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={financing.interest_rate || ""}
                onChange={(e) => updateFinancing({ interest_rate: parseFloat(e.target.value) || 0 })}
                placeholder="5.99"
              />
            </div>
            <div className="space-y-2">
              <Label>Term (Months)</Label>
              <Select
                value={financing.term_months?.toString() || "60"}
                onValueChange={(v) => updateFinancing({ term_months: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                  <SelectItem value="36">36 months</SelectItem>
                  <SelectItem value="48">48 months</SelectItem>
                  <SelectItem value="60">60 months</SelectItem>
                  <SelectItem value="72">72 months</SelectItem>
                  <SelectItem value="84">84 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {financing.monthly_payment > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">Estimated Monthly Payment:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${financing.monthly_payment.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Total Interest:</span>
                  <span className="font-semibold">
                    ${((financing.monthly_payment * termMonths) - loanAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-semibold">
                    ${(financing.monthly_payment * termMonths).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={financing.notes || ""}
              onChange={(e) => updateFinancing({ notes: e.target.value })}
              rows={2}
              placeholder="Additional financing notes..."
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}