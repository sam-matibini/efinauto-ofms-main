import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import RecurringExpenseDialog from "./RecurringExpenseDialog";

export default function RecurringExpensesTab({ recurringExpenses, selectedCompanyId }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => supabase.entities.RecurringExpense.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] });
      setDialogOpen(false);
      setEditingExpense(null);
      toast.success("Recurring expense created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.RecurringExpense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] });
      setDialogOpen(false);
      setEditingExpense(null);
      toast.success("Recurring expense updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.RecurringExpense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] });
      toast.success("Recurring expense deleted!");
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
        <h2 className="text-xl font-bold">Recurring Expenses</h2>
        <Button onClick={() => { setEditingExpense(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Recurring Expense
        </Button>
      </div>

      <div className="space-y-4">
        {recurringExpenses.map((recurring) => (
          <Card key={recurring.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{recurring.template_name}</h3>
                    <Badge className={statusColors[recurring.status]}>{recurring.status}</Badge>
                    <Badge variant="outline">{recurring.frequency}</Badge>
                  </div>
                  {recurring.vendor_name && <p className="text-gray-600"><strong>Vendor:</strong> {recurring.vendor_name}</p>}
                  <p className="text-sm text-gray-500">Category: {recurring.category?.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-500">Start Date: {recurring.start_date}</p>
                  {recurring.next_expense_date && (
                    <p className="text-sm text-blue-600">Next Expense: {recurring.next_expense_date}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">${recurring.amount?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">per {recurring.frequency}</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingExpense(recurring); setDialogOpen(true); }}>
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

      <RecurringExpenseDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingExpense(null); }}
        recurringExpense={editingExpense}
        onSave={(data) => {
          if (editingExpense) {
            updateMutation.mutate({ id: editingExpense.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}