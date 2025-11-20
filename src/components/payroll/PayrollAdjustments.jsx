import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, DollarSign, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PayrollAdjustments({ company, employees }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    adjustment_type: "correction",
    description: "",
    amount: 0,
    affects_gross: true,
    taxable: true,
    adjustment_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ['payrollAdjustments', company?.id],
    queryFn: () => base44.entities.PayrollAdjustment.filter({ company_id: company.id }, '-adjustment_date'),
    enabled: !!company,
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: (data) => {
      const employee = employees.find(e => e.id === data.employee_id);
      return base44.entities.PayrollAdjustment.create({
        ...data,
        company_id: company.id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        applied: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollAdjustments'] });
      toast.success("Adjustment created");
      setDialogOpen(false);
      setFormData({
        employee_id: "",
        adjustment_type: "correction",
        description: "",
        amount: 0,
        affects_gross: true,
        taxable: true,
        adjustment_date: new Date().toISOString().split('T')[0],
        notes: ""
      });
    },
    onError: () => toast.error("Failed to create adjustment")
  });

  const getAdjustmentColor = (type) => {
    const colors = {
      correction: 'bg-blue-100 text-blue-800',
      bonus: 'bg-green-100 text-green-800',
      retroactive_pay: 'bg-purple-100 text-purple-800',
      deduction: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  const pendingTotal = adjustments
    .filter(a => !a.applied)
    .reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Adjustments</p>
                <p className="text-2xl font-bold">{adjustments.filter(a => !a.applied).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Total</p>
                <p className="text-2xl font-bold">${pendingTotal.toLocaleString('en-CA')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Applied This Year</p>
                <p className="text-2xl font-bold">{adjustments.filter(a => a.applied).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payroll Adjustments & Corrections</CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Adjustment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {adjustments.map((adj) => (
              <div key={adj.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{adj.employee_name}</span>
                    <Badge className={getAdjustmentColor(adj.adjustment_type)}>
                      {adj.adjustment_type.replace('_', ' ')}
                    </Badge>
                    <Badge className={adj.applied ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {adj.applied ? 'Applied' : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{adj.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(adj.adjustment_date).toLocaleDateString()} 
                    {adj.taxable && ' • Taxable'}
                    {adj.affects_gross && ' • Affects Gross'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${adj.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {adj.amount >= 0 ? '+' : ''}${adj.amount.toLocaleString('en-CA')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payroll Adjustment</DialogTitle>
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
              <Label>Adjustment Type *</Label>
              <Select value={formData.adjustment_type} onValueChange={(value) => setFormData({...formData, adjustment_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="correction">Correction</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="retroactive_pay">Retroactive Pay</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="e.g., Payroll correction for missed overtime"
              />
            </div>

            <div>
              <Label>Amount * (+ to add, - to deduct)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div>
              <Label>Adjustment Date *</Label>
              <Input
                type="date"
                value={formData.adjustment_date}
                onChange={(e) => setFormData({...formData, adjustment_date: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Affects Gross Pay</Label>
                <Switch
                  checked={formData.affects_gross}
                  onCheckedChange={(checked) => setFormData({...formData, affects_gross: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Taxable</Label>
                <Switch
                  checked={formData.taxable}
                  onCheckedChange={(checked) => setFormData({...formData, taxable: checked})}
                />
              </div>
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createAdjustmentMutation.mutate(formData)}>Create Adjustment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}