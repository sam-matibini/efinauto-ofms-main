import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DeductionsManagement({ company, employees }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    deduction_type: "other",
    description: "",
    amount_per_pay: 0,
    percentage_of_gross: 0,
    total_amount_owed: 0,
    start_date: new Date().toISOString().split('T')[0],
    priority: 1
  });

  const { data: deductions = [] } = useQuery({
    queryKey: ['deductions', company?.id],
    queryFn: () => base44.entities.Deduction.filter({ company_id: company.id }),
    enabled: !!company,
  });

  const createDeductionMutation = useMutation({
    mutationFn: (data) => {
      const employee = employees.find(e => e.id === data.employee_id);
      return base44.entities.Deduction.create({
        ...data,
        company_id: company.id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
      toast.success("Deduction created");
      setDialogOpen(false);
      setFormData({
        employee_id: "",
        deduction_type: "other",
        description: "",
        amount_per_pay: 0,
        percentage_of_gross: 0,
        total_amount_owed: 0,
        start_date: new Date().toISOString().split('T')[0],
        priority: 1
      });
    }
  });

  const getDeductionTypeColor = (type) => {
    const colors = {
      loan_repayment: 'bg-blue-100 text-blue-800',
      garnishment: 'bg-red-100 text-red-800',
      union_dues: 'bg-purple-100 text-purple-800',
      charity: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      suspended: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || colors.active;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Custom Deductions
            </CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deduction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deductions.map((deduction) => {
              const progress = deduction.total_amount_owed > 0 
                ? (deduction.amount_deducted_to_date / deduction.total_amount_owed) * 100 
                : 0;
              
              return (
                <Card key={deduction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{deduction.employee_name}</h3>
                          <Badge className={getDeductionTypeColor(deduction.deduction_type)}>
                            {deduction.deduction_type.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className={getStatusColor(deduction.status)}>
                            {deduction.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{deduction.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Amount per Pay:</span>
                        <span className="ml-2 font-semibold">
                          {deduction.amount_per_pay > 0 
                            ? `$${deduction.amount_per_pay}` 
                            : `${deduction.percentage_of_gross}% of gross`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Start Date:</span>
                        <span className="ml-2 font-semibold">
                          {new Date(deduction.start_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {deduction.total_amount_owed > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold">
                            ${deduction.amount_deducted_to_date} / ${deduction.total_amount_owed}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Deduction</DialogTitle>
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
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Deduction Type *</Label>
              <Select value={formData.deduction_type} onValueChange={(value) => setFormData({...formData, deduction_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loan_repayment">Loan Repayment</SelectItem>
                  <SelectItem value="garnishment">Garnishment</SelectItem>
                  <SelectItem value="union_dues">Union Dues</SelectItem>
                  <SelectItem value="charity">Charity Donation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="e.g., Company loan repayment"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fixed Amount per Pay ($)</Label>
                <Input
                  type="number"
                  value={formData.amount_per_pay}
                  onChange={(e) => setFormData({...formData, amount_per_pay: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>OR Percentage of Gross (%)</Label>
                <Input
                  type="number"
                  value={formData.percentage_of_gross}
                  onChange={(e) => setFormData({...formData, percentage_of_gross: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div>
              <Label>Total Amount Owed (Optional)</Label>
              <Input
                type="number"
                value={formData.total_amount_owed}
                onChange={(e) => setFormData({...formData, total_amount_owed: parseFloat(e.target.value) || 0})}
                placeholder="For loans/garnishments"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 1})}
                  placeholder="1 = highest"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createDeductionMutation.mutate(formData)}>Add Deduction</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}