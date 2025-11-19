import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PaymentsMadeTab({ paymentsMade, selectedCompanyId }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PaymentMade.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentsMade'] });
      toast.success("Payment deleted!");
    },
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Payments Made</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>

      <div className="space-y-4">
        {paymentsMade.map((payment) => (
          <Card key={payment.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{payment.payment_number || 'Payment'}</h3>
                    <Badge className={statusColors[payment.status]}>{payment.status}</Badge>
                  </div>
                  <p className="text-gray-600"><strong>Vendor:</strong> {payment.vendor_name}</p>
                  <p className="text-sm text-gray-500">Payment Date: {payment.payment_date}</p>
                  <p className="text-sm text-gray-500">Method: {payment.payment_method}</p>
                  {payment.reference_number && (
                    <p className="text-sm text-gray-500">Reference: {payment.reference_number}</p>
                  )}
                  {payment.bill_number && (
                    <p className="text-sm text-blue-600">Applied to Bill: {payment.bill_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">${payment.amount?.toLocaleString()}</p>
                  <Button variant="outline" size="sm" className="mt-2 text-red-600" onClick={() => deleteMutation.mutate(payment.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}