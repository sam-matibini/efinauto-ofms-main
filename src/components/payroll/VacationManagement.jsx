import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function VacationManagement({ company, employees }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    transaction_type: "adjustment",
    hours: 0,
    notes: ""
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['vacationTransactions', company?.id],
    queryFn: () => supabase.entities.VacationTransaction.filter({ company_id: company.id }, '-transaction_date'),
    enabled: !!company,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      const employee = employees.find(e => e.id === data.employee_id);
      const currentBalance = employee.vacation_balance || 0;
      const newBalance = currentBalance + data.hours;

      await supabase.entities.VacationTransaction.create({
        company_id: company.id,
        employee_id: data.employee_id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        transaction_type: data.transaction_type,
        transaction_date: new Date().toISOString().split('T')[0],
        hours: data.hours,
        balance_after: newBalance,
        notes: data.notes
      });

      await supabase.entities.Employee.update(data.employee_id, {
        vacation_balance: newBalance
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacationTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Vacation adjustment processed");
      setDialogOpen(false);
      setFormData({ employee_id: "", transaction_type: "adjustment", hours: 0, notes: "" });
    },
    onError: () => toast.error("Failed to process adjustment")
  });

  const getTransactionIcon = (type) => {
    if (type === 'accrual' || type === 'adjustment') return <TrendingUp className="w-4 h-4 text-green-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Vacation Accrual Management</CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Manual Adjustment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {employees.map((emp) => (
                <Card key={emp.id}>
                  <CardContent className="p-4">
                    <p className="font-semibold">{emp.first_name} {emp.last_name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600">Balance</span>
                      <span className="text-lg font-bold">{emp.vacation_balance || 0} hrs</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-600">Accrual Rate</span>
                      <span className="text-sm font-semibold">{emp.vacation_accrual_rate || 4}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h3 className="font-semibold text-lg">Recent Transactions</h3>
            <div className="space-y-2">
              {transactions.slice(0, 10).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(txn.transaction_type)}
                    <div>
                      <p className="font-medium">{txn.employee_name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(txn.transaction_date).toLocaleDateString()} - {txn.transaction_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${txn.hours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.hours >= 0 ? '+' : ''}{txn.hours} hrs
                    </p>
                    <p className="text-sm text-gray-600">Balance: {txn.balance_after} hrs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Vacation Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={formData.employee_id} onValueChange={(value) => setFormData({...formData, employee_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} (Balance: {emp.vacation_balance || 0} hrs)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Adjustment Type *</Label>
              <Select value={formData.transaction_type} onValueChange={(value) => setFormData({...formData, transaction_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Hours (+ to add, - to deduct) *</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.hours}
                onChange={(e) => setFormData({...formData, hours: parseFloat(e.target.value) || 0})}
                placeholder="8 or -8"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => createTransactionMutation.mutate(formData)} disabled={createTransactionMutation.isPending}>
                Process Adjustment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}