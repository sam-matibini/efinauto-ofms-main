import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, Loader2, CheckCircle, AlertCircle, Banknote } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PaymentGateway({ order, onPaymentComplete }) {
  const [amount, setAmount] = useState(order.balance_due || order.total_value || 0);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      // Simulate Stripe payment processing with AI
      const { supabase } = await import("@/api/supabaseClient");
      
      const prompt = `Simulate a payment gateway response for:
Amount: ${paymentData.amount} ${paymentData.currency}
Payment Method: ${paymentData.method}
Order: ${order.export_order_number}

Generate realistic payment gateway response with charge ID, receipt URL, and status.`;

      const gatewayResponse = await supabase.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            charge_id: { type: "string" },
            status: { type: "string", enum: ["succeeded", "failed"] },
            receipt_url: { type: "string" },
            transaction_fee: { type: "number" },
            net_amount: { type: "number" }
          }
        }
      });

      if (gatewayResponse.status !== "succeeded") {
        throw new Error("Payment failed");
      }

      // Create payment transaction record
      const txnId = `PAY-${Date.now()}`;
      const payment = await supabase.entities.PaymentTransaction.create({
        company_id: order.company_id,
        export_order_id: order.id,
        transaction_id: txnId,
        payment_gateway: "stripe",
        gateway_payment_id: gatewayResponse.charge_id,
        payment_method: paymentData.method,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: "completed",
        payment_date: new Date().toISOString(),
        payer_name: order.consignee_name,
        payer_email: order.consignee_email,
        description: `Payment for ${order.export_order_number}`,
        transaction_fee: gatewayResponse.transaction_fee || paymentData.amount * 0.029,
        net_amount: gatewayResponse.net_amount || paymentData.amount * 0.971,
        metadata: { receipt_url: gatewayResponse.receipt_url }
      });

      // Update export order payment status
      const newAmountPaid = (order.amount_paid || 0) + paymentData.amount;
      const newBalance = (order.total_value || 0) - newAmountPaid;
      const newPaymentStatus = newBalance <= 0 ? "paid" : 
                               newAmountPaid > 0 ? "partially_paid" : "unpaid";

      await supabase.entities.ExportOrder.update(order.id, {
        amount_paid: newAmountPaid,
        balance_due: newBalance,
        payment_status: newPaymentStatus
      });

      // Create GL transaction
      const user = await supabase.auth.me();
      await supabase.entities.Transaction.create({
        company_id: order.company_id,
        transaction_type: "payment_received",
        date: new Date().toISOString(),
        description: `Payment received for export ${order.export_order_number}`,
        debit_account: "1000", // Cash/Bank
        credit_account: "1100", // Accounts Receivable
        amount: paymentData.amount,
        currency: paymentData.currency,
        reference_number: txnId,
        reference_type: "PaymentTransaction",
        reference_id: payment.id,
        created_by: user.email
      });

      // Record transaction fee as expense
      const fee = gatewayResponse.transaction_fee || paymentData.amount * 0.029;
      await supabase.entities.Transaction.create({
        company_id: order.company_id,
        transaction_type: "bank_expense",
        date: new Date().toISOString(),
        description: `Payment processing fee - ${order.export_order_number}`,
        debit_account: "6200", // Bank Charges Expense
        credit_account: "1000", // Cash/Bank
        amount: fee,
        currency: paymentData.currency,
        reference_number: txnId,
        reference_type: "PaymentTransaction",
        reference_id: payment.id,
        created_by: user.email
      });

      return { payment, gatewayResponse };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportOrders'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("Payment processed successfully");
      onPaymentComplete?.();
    },
    onError: (error) => {
      toast.error("Payment failed: " + error.message);
    }
  });

  const handlePayment = async () => {
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setProcessing(true);
    try {
      await processPaymentMutation.mutateAsync({
        amount,
        currency: order.currency,
        method: paymentMethod
      });
    } finally {
      setProcessing(false);
    }
  };

  const statusColors = {
    unpaid: "bg-red-100 text-red-800",
    partially_paid: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    refunded: "bg-gray-100 text-gray-800"
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Gateway
          </CardTitle>
          <Badge className={statusColors[order.payment_status || "unpaid"]}>
            {(order.payment_status || "unpaid").replace(/_/g, " ").toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">Total Amount</p>
            <p className="font-bold">{order.currency} ${order.total_value?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Paid</p>
            <p className="font-bold text-green-600">{order.currency} ${(order.amount_paid || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Balance Due</p>
            <p className="font-bold text-red-600">{order.currency} ${(order.balance_due || order.total_value || 0).toLocaleString()}</p>
          </div>
        </div>

        {order.payment_status !== "paid" && (
          <>
            <div>
              <Label>Payment Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                placeholder="Enter amount"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Processing fee: ~2.9% + ${0.30} (${(amount * 0.029 + 0.30).toFixed(2)})
              </p>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Credit/Debit Card
                    </span>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <span className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Bank Transfer
                    </span>
                  </SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handlePayment}
              disabled={processing || amount <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Process Payment
                </>
              )}
            </Button>
          </>
        )}

        {order.payment_status === "paid" && (
          <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Payment Complete</p>
              <p className="text-sm text-green-600">This export order has been fully paid</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}