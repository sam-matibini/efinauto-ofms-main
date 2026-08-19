import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function PayGroupManagement({ company }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    pay_frequency: "bi_weekly",
    default_overtime_multiplier: 1.5,
    auto_vacation_accrual: true,
    vacation_payout_threshold: 0
  });

  const { data: payGroups = [] } = useQuery({
    queryKey: ['payGroups', company?.id],
    queryFn: () => supabase.entities.PayGroup.filter({ company_id: company.id }),
    enabled: !!company,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', company?.id],
    queryFn: () => supabase.entities.Employee.filter({ company_id: company.id }),
    enabled: !!company,
  });

  const createPayGroupMutation = useMutation({
    mutationFn: (data) => supabase.entities.PayGroup.create({ ...data, company_id: company.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payGroups'] });
      toast.success("Pay group created");
      setDialogOpen(false);
      setFormData({
        name: "",
        pay_frequency: "bi_weekly",
        default_overtime_multiplier: 1.5,
        auto_vacation_accrual: true,
        vacation_payout_threshold: 0
      });
    },
    onError: () => toast.error("Failed to create pay group")
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Pay Groups
            </CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Pay Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {payGroups.map((group) => {
              const groupEmployees = employees.filter(e => e.pay_group_id === group.id);
              return (
                <Card key={group.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{group.name}</h3>
                        <p className="text-sm text-gray-600">
                          {groupEmployees.length} employees
                        </p>
                      </div>
                      <Badge className={group.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {group.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pay Frequency:</span>
                        <span className="font-medium capitalize">{group.pay_frequency.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">OT Multiplier:</span>
                        <span className="font-medium">{group.default_overtime_multiplier}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Auto Vacation Accrual:</span>
                        <Badge variant="outline">{group.auto_vacation_accrual ? 'Yes' : 'No'}</Badge>
                      </div>
                      {group.vacation_payout_threshold > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vacation Payout At:</span>
                          <span className="font-medium">{group.vacation_payout_threshold} hrs</span>
                        </div>
                      )}
                    </div>
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
            <DialogTitle>Create Pay Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pay Group Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Salaried Employees"
              />
            </div>

            <div>
              <Label>Pay Frequency *</Label>
              <Select value={formData.pay_frequency} onValueChange={(value) => setFormData({...formData, pay_frequency: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="semi_monthly">Semi-Monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Overtime Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.default_overtime_multiplier}
                onChange={(e) => setFormData({...formData, default_overtime_multiplier: parseFloat(e.target.value) || 1.5})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto Vacation Accrual</Label>
              <Switch
                checked={formData.auto_vacation_accrual}
                onCheckedChange={(checked) => setFormData({...formData, auto_vacation_accrual: checked})}
              />
            </div>

            <div>
              <Label>Auto Vacation Payout Threshold (hours)</Label>
              <Input
                type="number"
                value={formData.vacation_payout_threshold}
                onChange={(e) => setFormData({...formData, vacation_payout_threshold: parseFloat(e.target.value) || 0})}
                placeholder="0 = no auto payout"
              />
              <p className="text-xs text-gray-500 mt-1">Automatically pay out vacation when balance exceeds this amount</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createPayGroupMutation.mutate(formData)}>Create Pay Group</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}