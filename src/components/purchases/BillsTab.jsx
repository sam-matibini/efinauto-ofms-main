import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Eye, Edit } from "lucide-react";
import DocumentViewer from "../shared/DocumentViewer";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import BillDialog from "./BillDialog";

export default function BillsTab({ bills, selectedCompanyId, company }) {
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [selectedBill, setSelectedBill] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingBill, setEditingBill] = React.useState(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Bill.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setDialogOpen(false);
      setEditingBill(null);
      toast.success("Bill created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setDialogOpen(false);
      setEditingBill(null);
      toast.success("Bill updated!");
    },
  });

  const handleViewBill = (bill) => {
    setSelectedBill(bill);
    setViewerOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Bill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success("Bill deleted!");
    },
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    partial: "bg-orange-100 text-orange-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Bills</h2>
        <Button onClick={() => { setEditingBill(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Bill
        </Button>
      </div>

      <div className="space-y-4">
        {bills.map((bill) => (
          <Card key={bill.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{bill.bill_number}</h3>
                    <Badge className={statusColors[bill.status]}>{bill.status}</Badge>
                  </div>
                  <p className="text-gray-600"><strong>Vendor:</strong> {bill.vendor_name}</p>
                  <p className="text-sm text-gray-500">Bill Date: {bill.bill_date}</p>
                  {bill.due_date && <p className="text-sm text-gray-500">Due Date: {bill.due_date}</p>}
                  {bill.balance_due > 0 && (
                    <p className="text-sm text-orange-600 font-semibold mt-2">Balance Due: ${bill.balance_due.toLocaleString()}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">${bill.total_amount?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Paid: ${bill.amount_paid?.toLocaleString()}</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingBill(bill); setDialogOpen(true); }}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewBill(bill)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(bill.id)}>
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

      <BillDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingBill(null); }}
        bill={editingBill}
        onSave={(data) => {
          if (editingBill) {
            updateMutation.mutate({ id: editingBill.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DocumentViewer
        open={viewerOpen}
        onClose={() => { setViewerOpen(false); setSelectedBill(null); }}
        documentType="invoice"
        documentData={selectedBill ? { ...selectedBill, invoice_number: selectedBill.bill_number, invoice_date: selectedBill.bill_date, customer_name: selectedBill.vendor_name } : null}
        company={company}
        title="BILL"
      />
    </>
  );
}