import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import PaymentMadeDialog from "./PaymentMadeDialog";

export default function PaymentsMadeTab({ paymentsMade, selectedCompanyId }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payment = await base44.entities.PaymentMade.create({ ...data, company_id: selectedCompanyId });
      
      // Create GL transaction for payment made
      await base44.entities.Transaction.create({
        company_id: selectedCompanyId,
        transaction_number: payment.payment_number || `PMT-${payment.id.slice(0, 8)}`,
        transaction_type: 'payment_made',
        category: 'asset',
        amount: payment.amount || 0,
        account_code: '1000',
        account_name: 'Cash',
        account_type: 'asset',
        contra_account_code: '2000',
        contra_account_name: 'Accounts Payable',
        reference_type: 'PaymentMade',
        reference_id: payment.id,
        reference_number: payment.payment_number,
        customer_name: payment.vendor_name,
        description: `Payment to ${payment.vendor_name}${payment.bill_number ? ` for Bill ${payment.bill_number}` : ''}`,
        transaction_date: payment.payment_date,
        payment_method: payment.payment_method,
        status: payment.status || 'completed'
      });
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentsMade'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingPayment(null);
      toast.success("Payment recorded!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PaymentMade.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentsMade'] });
      setDialogOpen(false);
      setEditingPayment(null);
      toast.success("Payment updated!");
    },
  });

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
        <Button onClick={() => { setEditingPayment(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
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
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingPayment(payment); setDialogOpen(true); }}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(payment.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaymentMadeDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingPayment(null); }}
        payment={editingPayment}
        onSave={(data) => {
          if (editingPayment) {
            updateMutation.mutate({ id: editingPayment.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}