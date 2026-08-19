import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserMinus, CheckCircle, AlertCircle, Download, Send, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function OffboardingWorkflow({ company, queryClient }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOffboarding, setSelectedOffboarding] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: "",
    termination_date: new Date().toISOString().split('T')[0],
    last_working_day: new Date().toISOString().split('T')[0],
    termination_reason: "resignation",
    vacation_payout: 0,
    severance_pay: 0,
    notes: ""
  });
  const [assets, setAssets] = useState([]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', company?.id],
    queryFn: () => supabase.entities.Employee.filter({ company_id: company.id, employment_status: 'active' }),
    enabled: !!company,
  });

  const { data: offboardings = [] } = useQuery({
    queryKey: ['offboardings', company?.id],
    queryFn: () => supabase.entities.EmployeeOffboarding.filter({ company_id: company.id }, '-created_date'),
    enabled: !!company,
  });

  const createOffboardingMutation = useMutation({
    mutationFn: async (data) => {
      const employee = employees.find(e => e.id === data.employee_id);
      
      // Create offboarding record
      const offboarding = await supabase.entities.EmployeeOffboarding.create({
        ...data,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        status: 'initiated',
        assets_to_return: assets,
        checklist: {
          exit_interview_completed: false,
          final_payroll_processed: false,
          roe_generated: false,
          benefits_terminated: false,
          company_property_returned: false,
          system_access_revoked: false,
          email_archived: false,
          knowledge_transfer_completed: false
        },
        notifications_sent: {
          hr_notified: false,
          it_notified: false,
          finance_notified: false,
          manager_notified: false
        }
      });

      // Update employee status
      await supabase.entities.Employee.update(data.employee_id, {
        employment_status: 'terminated',
        termination_date: data.termination_date
      });

      // Send notifications
      await sendNotifications(employee, offboarding, company);

      return offboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Offboarding initiated and notifications sent");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to initiate offboarding")
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, checklist }) => supabase.entities.EmployeeOffboarding.update(id, { checklist }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
      toast.success("Checklist updated");
    }
  });

  const sendNotifications = async (employee, offboarding, company) => {
    const companyName = company?.name || "eFinAuto Center";
    
    // HR Notification
    if (company.contact_person_email) {
      await supabase.integrations.Core.SendEmail({
        from_name: companyName,
        to: company.contact_person_email,
        subject: `Employee Offboarding Initiated - ${employee.first_name} ${employee.last_name}`,
        body: `An employee offboarding has been initiated.

Employee: ${employee.first_name} ${employee.last_name}
Position: ${employee.position}
Termination Date: ${offboarding.termination_date}
Last Working Day: ${offboarding.last_working_day}
Reason: ${offboarding.termination_reason}

HR Action Items:
• Schedule exit interview
• Process final payroll
• Generate ROE form
• Terminate benefits
• Archive employee records

View offboarding details in the Payroll & HR module.`
      });
    }

    // IT Department Notification
    await supabase.integrations.Core.SendEmail({
      from_name: companyName,
      to: company.email,
      subject: `IT Action Required - Employee Departure: ${employee.first_name} ${employee.last_name}`,
      body: `IT action required for departing employee.

Employee: ${employee.first_name} ${employee.last_name}
Email: ${employee.email}
Last Working Day: ${offboarding.last_working_day}

IT Action Items:
• Revoke system access on last working day
• Archive email account
• Collect company property (laptop, phone, etc.)
• Disable VPN/remote access
• Remove from distribution lists

Assets to collect: ${assets.length > 0 ? assets.map(a => a.asset_name).join(', ') : 'None listed'}`
    });

    // Finance Department Notification
    await supabase.integrations.Core.SendEmail({
      from_name: companyName,
      to: company.email,
      subject: `Finance Action Required - Final Pay: ${employee.first_name} ${employee.last_name}`,
      body: `Finance action required for departing employee.

Employee: ${employee.first_name} ${employee.last_name}
Last Working Day: ${offboarding.last_working_day}

Finance Action Items:
• Process final payroll
• Calculate vacation payout: $${offboarding.vacation_payout}
• Process severance (if applicable): $${offboarding.severance_pay}
• Issue final pay statement
• Process final expense reimbursements

Please coordinate with HR for final amounts.`
    });
  };

  const generateROE = async (offboarding) => {
    try {
      const employee = employees.find(e => e.id === offboarding.employee_id);
      const serialNumber = `ROE-${Date.now()}`;
      
      await supabase.entities.EmployeeOffboarding.update(offboarding.id, {
        roe_serial_number: serialNumber,
        roe_generated_date: new Date().toISOString().split('T')[0],
        checklist: {
          ...offboarding.checklist,
          roe_generated: true
        }
      });

      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
      toast.success(`ROE generated: ${serialNumber}`);
    } catch (error) {
      toast.error("Failed to generate ROE");
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: "",
      termination_date: new Date().toISOString().split('T')[0],
      last_working_day: new Date().toISOString().split('T')[0],
      termination_reason: "resignation",
      vacation_payout: 0,
      severance_pay: 0,
      notes: ""
    });
    setAssets([]);
  };

  const addAsset = () => {
    setAssets([...assets, { asset_name: "", asset_type: "", serial_number: "", returned: false }]);
  };

  const updateAsset = (index, field, value) => {
    const newAssets = [...assets];
    newAssets[index][field] = value;
    setAssets(newAssets);
  };

  const removeAsset = (index) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'initiated': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompletionPercentage = (checklist) => {
    const items = Object.values(checklist || {});
    const completed = items.filter(Boolean).length;
    return Math.round((completed / items.length) * 100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Employee Offboarding</CardTitle>
            <Button onClick={() => setDialogOpen(true)} className="bg-red-600">
              <UserMinus className="w-4 h-4 mr-2" />
              Initiate Offboarding
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {offboardings.map((offboarding) => (
              <Card key={offboarding.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{offboarding.employee_name}</h3>
                        <Badge className={getStatusColor(offboarding.status)}>
                          {offboarding.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Last Day: {new Date(offboarding.last_working_day).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Reason: {offboarding.termination_reason}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600">Completion</span>
                          <span className="text-xs font-semibold">{getCompletionPercentage(offboarding.checklist)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${getCompletionPercentage(offboarding.checklist)}%` }}
                          />
                        </div>
                      </div>

                      {/* Checklist */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {Object.entries(offboarding.checklist || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Checkbox
                              checked={value}
                              onCheckedChange={(checked) => {
                                updateChecklistMutation.mutate({
                                  id: offboarding.id,
                                  checklist: { ...offboarding.checklist, [key]: checked }
                                });
                              }}
                            />
                            <span className="text-xs">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateROE(offboarding)}
                        disabled={offboarding.checklist?.roe_generated}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {offboarding.checklist?.roe_generated ? 'ROE Generated' : 'Generate ROE'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Initiate Offboarding Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Initiate Employee Offboarding</DialogTitle>
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
                      {emp.first_name} {emp.last_name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Termination Date *</Label>
                <Input
                  type="date"
                  value={formData.termination_date}
                  onChange={(e) => setFormData({...formData, termination_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Last Working Day *</Label>
                <Input
                  type="date"
                  value={formData.last_working_day}
                  onChange={(e) => setFormData({...formData, last_working_day: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Termination Reason *</Label>
              <Select value={formData.termination_reason} onValueChange={(value) => setFormData({...formData, termination_reason: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resignation">Resignation</SelectItem>
                  <SelectItem value="layoff">Layoff</SelectItem>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="dismissal">Dismissal</SelectItem>
                  <SelectItem value="end_of_contract">End of Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vacation Payout ($)</Label>
                <Input
                  type="number"
                  value={formData.vacation_payout}
                  onChange={(e) => setFormData({...formData, vacation_payout: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Severance Pay ($)</Label>
                <Input
                  type="number"
                  value={formData.severance_pay}
                  onChange={(e) => setFormData({...formData, severance_pay: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Company Assets to Return</Label>
                <Button variant="outline" size="sm" onClick={addAsset}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Asset
                </Button>
              </div>
              <div className="space-y-2">
                {assets.map((asset, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Asset name"
                      value={asset.asset_name}
                      onChange={(e) => updateAsset(index, 'asset_name', e.target.value)}
                    />
                    <Input
                      placeholder="Type"
                      value={asset.asset_type}
                      onChange={(e) => updateAsset(index, 'asset_type', e.target.value)}
                    />
                    <Input
                      placeholder="Serial #"
                      value={asset.serial_number}
                      onChange={(e) => updateAsset(index, 'serial_number', e.target.value)}
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeAsset(index)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                📧 Automated notifications will be sent to HR, IT, and Finance departments
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createOffboardingMutation.mutate(formData)}
                disabled={createOffboardingMutation.isPending}
                className="bg-red-600"
              >
                Initiate Offboarding
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}