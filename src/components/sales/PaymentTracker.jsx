import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PaymentTracker({ payments = [], onChange, salePrice = 0 }) {
  const [newPayment, setNewPayment] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: "cash",
    reference: "",
    notes: ""
  });

  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const balanceDue = salePrice - totalPaid;

  const handleAddPayment = () => {
    if (newPayment.amount > 0) {
      onChange([...payments, { ...newPayment }]);
      setNewPayment({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        method: "cash",
        reference: "",
        notes: ""
      });
    }
  };

  const handleRemovePayment = (index) => {
    onChange(payments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none bg-blue-50">
          <CardContent className="p-4">
            <div className="text-sm text-blue-600 font-medium">Sale Price</div>
            <div className="text-2xl font-bold text-blue-900">${salePrice.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none bg-green-50">
          <CardContent className="p-4">
            <div className="text-sm text-green-600 font-medium">Total Paid</div>
            <div className="text-2xl font-bold text-green-900">${totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none bg-orange-50">
          <CardContent className="p-4">
            <div className="text-sm text-orange-600 font-medium">Balance Due</div>
            <div className="text-2xl font-bold text-orange-900">${balanceDue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {payments.length > 0 && (
        <div className="space-y-2">
          <Label>Payment History</Label>
          {payments.map((payment, index) => (
            <Card key={index} className="border-none bg-gray-50">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">${parseFloat(payment.amount).toLocaleString()}</span>
                      <Badge variant="outline">{payment.method}</Badge>
                      <span className="text-sm text-gray-500">{payment.date}</span>
                    </div>
                    {payment.reference && (
                      <div className="text-xs text-gray-500 mt-1">Ref: {payment.reference}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePayment(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <Label className="text-base font-semibold">Add Payment</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Payment Method</Label>
              <Select
                value={newPayment.method}
                onValueChange={(v) => setNewPayment({...newPayment, method: v})}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="trade_in">Trade-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={newPayment.date}
                onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Reference/Check #</Label>
              <Input
                value={newPayment.reference}
                onChange={(e) => setNewPayment({...newPayment, reference: e.target.value})}
                placeholder="Optional"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleAddPayment}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={newPayment.amount <= 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}