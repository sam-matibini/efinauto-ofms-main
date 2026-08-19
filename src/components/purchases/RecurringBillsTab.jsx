import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import RecurringBillDialog from "./RecurringBillDialog";

export default function RecurringBillsTab({ recurringBills, selectedCompanyId }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => supabase.entities.RecurringBill.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] });
      setDialogOpen(false);
      setEditingBill(null);
      toast.success("Recurring bill created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.RecurringBill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] });
      setDialogOpen(false);
      setEditingBill(null);
      toast.success("Recurring bill updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.RecurringBill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] });
      toast.success("Recurring bill deleted!");
    },
  });

  const statusColors = {
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Recurring Bills</h2>
        <Button onClick={() => { setEditingBill(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Recurring Bill
        </Button>
      </div>

      <div className="space-y-4">
        {recurringBills.map((recurring) => (
          <Card key={recurring.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{recurring.template_name}</h3>
                    <Badge className={statusColors[recurring.status]}>{recurring.status}</Badge>
                    <Badge variant="outline">{recurring.frequency}</Badge>
                  </div>
                  <p className="text-gray-600"><strong>Vendor:</strong> {recurring.vendor_name}</p>
                  <p className="text-sm text-gray-500">Start Date: {recurring.start_date}</p>
                  {recurring.next_bill_date && (
                    <p className="text-sm text-blue-600">Next Bill: {recurring.next_bill_date}</p>
                  )}
                  {recurring.end_date && (
                    <p className="text-sm text-gray-500">End Date: {recurring.end_date}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">${recurring.amount?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">per {recurring.frequency}</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingBill(recurring); setDialogOpen(true); }}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(recurring.id)}>
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

      <RecurringBillDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingBill(null); }}
        recurringBill={editingBill}
        onSave={(data) => {
          if (editingBill) {
            updateMutation.mutate({ id: editingBill.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}