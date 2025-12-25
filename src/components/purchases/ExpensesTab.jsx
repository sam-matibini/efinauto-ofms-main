import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import ExpenseDialog from "./ExpenseDialog";

export default function ExpensesTab({ expenses, selectedCompanyId }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const expense = await base44.entities.Expense.create({ ...data, company_id: selectedCompanyId });
      
      // Create GL transaction for expense
      await base44.entities.Transaction.create({
        company_id: selectedCompanyId,
        transaction_number: expense.expense_number || `EXP-${expense.id.slice(0, 8)}`,
        transaction_type: 'overhead_expense',
        category: 'expense',
        amount: expense.total_amount || expense.amount || 0,
        account_code: '6000',
        account_name: 'Operating Expense',
        account_type: 'expense',
        reference_type: 'Expense',
        reference_id: expense.id,
        reference_number: expense.expense_number,
        customer_name: expense.vendor_name,
        description: `Expense: ${expense.category?.replace(/_/g, ' ')} - ${expense.description || 'N/A'}`,
        transaction_date: expense.expense_date,
        payment_method: expense.payment_method,
        status: expense.status === 'paid' ? 'completed' : 'pending',
        tax_amount: expense.tax_amount || 0
      });
      
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingExpense(null);
      toast.success("Expense created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setDialogOpen(false);
      setEditingExpense(null);
      toast.success("Expense updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success("Expense deleted!");
    },
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  const categoryColors = {
    office_supplies: "bg-blue-100 text-blue-800",
    utilities: "bg-purple-100 text-purple-800",
    rent: "bg-indigo-100 text-indigo-800",
    insurance: "bg-cyan-100 text-cyan-800",
    advertising: "bg-pink-100 text-pink-800",
    travel: "bg-green-100 text-green-800",
    meals: "bg-orange-100 text-orange-800",
    fuel: "bg-red-100 text-red-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Expenses</h2>
        <Button onClick={() => { setEditingExpense(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Expense
        </Button>
      </div>

      <div className="space-y-4">
        {expenses.map((expense) => (
          <Card key={expense.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{expense.expense_number || 'Expense'}</h3>
                    <Badge className={statusColors[expense.status]}>{expense.status}</Badge>
                    <Badge className={categoryColors[expense.category]}>{expense.category?.replace(/_/g, ' ')}</Badge>
                  </div>
                  {expense.vendor_name && <p className="text-gray-600"><strong>Vendor:</strong> {expense.vendor_name}</p>}
                  {expense.description && <p className="text-sm text-gray-500">{expense.description}</p>}
                  <p className="text-sm text-gray-500">Date: {expense.expense_date}</p>
                  <p className="text-sm text-gray-500">Method: {expense.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">${expense.total_amount?.toLocaleString()}</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingExpense(expense); setDialogOpen(true); }}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(expense.id)}>
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

      <ExpenseDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingExpense(null); }}
        expense={editingExpense}
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