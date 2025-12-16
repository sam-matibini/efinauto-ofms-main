import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function PaymentHistory({ orderId }) {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['paymentTransactions', orderId],
    queryFn: () => base44.entities.PaymentTransaction.filter({ export_order_id: orderId }, '-payment_date'),
    enabled: !!orderId,
  });

  const statusIcons = {
    completed: CheckCircle,
    pending: Clock,
    processing: Clock,
    failed: XCircle,
    refunded: XCircle,
    cancelled: XCircle
  };

  const statusColors = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No payment transactions yet</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => {
              const StatusIcon = statusIcons[payment.status] || Clock;
              return (
                <div key={payment.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      payment.status === 'completed' ? 'bg-green-100' :
                      payment.status === 'failed' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      <StatusIcon className={`w-4 h-4 ${
                        payment.status === 'completed' ? 'text-green-600' :
                        payment.status === 'failed' ? 'text-red-600' :
                        'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{payment.transaction_id}</p>
                        <Badge className={statusColors[payment.status]}>
                          {payment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {payment.payment_method?.replace(/_/g, ' ')} • {payment.payment_gateway}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(payment.payment_date || payment.created_date), 'MMM d, yyyy h:mm a')}
                      </p>
                      {payment.transaction_fee > 0 && (
                        <p className="text-xs text-gray-500">
                          Fee: ${payment.transaction_fee.toFixed(2)} • Net: ${payment.net_amount?.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {payment.currency} ${payment.amount.toLocaleString()}
                    </p>
                    {payment.gateway_payment_id && (
                      <p className="text-xs text-gray-500 font-mono">
                        {payment.gateway_payment_id.substring(0, 20)}...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}