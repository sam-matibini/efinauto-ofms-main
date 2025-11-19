import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function InvoicesTab({ invoices, selectedCompanyId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalesInvoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Invoice deleted!");
    },
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Sales Invoices</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <div className="space-y-4">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{invoice.invoice_number}</h3>
                    <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
                  </div>
                  <p className="text-gray-600"><strong>Customer:</strong> {invoice.customer_name}</p>
                  <p className="text-sm text-gray-500">Invoice Date: {invoice.invoice_date}</p>
                  {invoice.due_date && <p className="text-sm text-gray-500">Due Date: {invoice.due_date}</p>}
                  {invoice.balance_due > 0 && (
                    <p className="text-sm text-orange-600 font-semibold mt-2">Balance Due: ${invoice.balance_due.toLocaleString()}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">${invoice.total_amount?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Paid: ${invoice.amount_paid?.toLocaleString()}</p>
                  <Button variant="outline" size="sm" className="mt-2 text-red-600" onClick={() => deleteMutation.mutate(invoice.id)}>
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