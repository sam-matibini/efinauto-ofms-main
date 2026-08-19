import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function BenefitsManagement({ company, employees }) {
  const queryClient = useQueryClient();
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [benefitForm, setBenefitForm] = useState({
    name: "",
    benefit_type: "health",
    description: "",
    employee_cost: 0,
    employer_cost: 0,
    frequency: "per_pay"
  });
  const [enrollmentForm, setEnrollmentForm] = useState({
    employee_id: "",
    benefit_id: "",
    start_date: new Date().toISOString().split('T')[0],
    coverage_level: "employee_only",
    employee_contribution: 0,
    employer_contribution: 0
  });

  const { data: benefits = [] } = useQuery({
    queryKey: ['benefits', company?.id],
    queryFn: () => supabase.entities.Benefit.filter({ company_id: company.id }),
    enabled: !!company,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['employeeBenefits', company?.id],
    queryFn: () => supabase.entities.EmployeeBenefit.filter({ company_id: company.id }),
    enabled: !!company,
  });

  const createBenefitMutation = useMutation({
    mutationFn: (data) => supabase.entities.Benefit.create({ ...data, company_id: company.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      toast.success("Benefit created");
      setBenefitDialogOpen(false);
      setBenefitForm({ name: "", benefit_type: "health", description: "", employee_cost: 0, employer_cost: 0, frequency: "per_pay" });
    }
  });

  const createEnrollmentMutation = useMutation({
    mutationFn: (data) => {
      const employee = employees.find(e => e.id === data.employee_id);
      const benefit = benefits.find(b => b.id === data.benefit_id);
      return supabase.entities.EmployeeBenefit.create({
        ...data,
        company_id: company.id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        benefit_name: benefit.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeBenefits'] });
      toast.success("Employee enrolled in benefit");
      setEnrollmentDialogOpen(false);
      setEnrollmentForm({ employee_id: "", benefit_id: "", start_date: new Date().toISOString().split('T')[0], coverage_level: "employee_only", employee_contribution: 0, employer_contribution: 0 });
    }
  });

  const getBenefitTypeColor = (type) => {
    const colors = {
      health: 'bg-blue-100 text-blue-800',
      dental: 'bg-green-100 text-green-800',
      vision: 'bg-purple-100 text-purple-800',
      life_insurance: 'bg-red-100 text-red-800',
      disability: 'bg-yellow-100 text-yellow-800',
      retirement: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="benefits">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="benefits">Benefit Plans</TabsTrigger>
          <TabsTrigger value="enrollments">Employee Enrollments</TabsTrigger>
        </TabsList>

        <TabsContent value="benefits" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Benefit Plans
                </CardTitle>
                <Button onClick={() => setBenefitDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Benefit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benefits.map((benefit) => (
                  <Card key={benefit.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{benefit.name}</h3>
                        <Badge className={getBenefitTypeColor(benefit.benefit_type)}>
                          {benefit.benefit_type}
                        </Badge>
                      </div>
                      {benefit.description && (
                        <p className="text-sm text-gray-600 mb-3">{benefit.description}</p>
                      )}
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Employee Cost:</span>
                          <span className="font-semibold">${benefit.employee_cost}/{benefit.frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Employer Cost:</span>
                          <span className="font-semibold">${benefit.employer_cost}/{benefit.frequency}</span>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t">
                          <span className="text-gray-600">Enrolled:</span>
                          <span className="font-semibold">
                            {enrollments.filter(e => e.benefit_id === benefit.id && e.status === 'active').length} employees
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Employee Enrollments
                </CardTitle>
                <Button onClick={() => setEnrollmentDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Enroll Employee
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold">{enrollment.employee_name}</p>
                      <p className="text-sm text-gray-600">{enrollment.benefit_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Started: {new Date(enrollment.start_date).toLocaleDateString()} • {enrollment.coverage_level}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={enrollment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {enrollment.status}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        Employee: ${enrollment.employee_contribution || 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Benefit Dialog */}
      <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Benefit Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Benefit Name *</Label>
              <Input
                value={benefitForm.name}
                onChange={(e) => setBenefitForm({...benefitForm, name: e.target.value})}
                placeholder="Health Insurance"
              />
            </div>

            <div>
              <Label>Benefit Type *</Label>
              <Select value={benefitForm.benefit_type} onValueChange={(value) => setBenefitForm({...benefitForm, benefit_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Health Insurance</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="vision">Vision</SelectItem>
                  <SelectItem value="life_insurance">Life Insurance</SelectItem>
                  <SelectItem value="disability">Disability</SelectItem>
                  <SelectItem value="retirement">Retirement/RRSP</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={benefitForm.description}
                onChange={(e) => setBenefitForm({...benefitForm, description: e.target.value})}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employee Cost ($)</Label>
                <Input
                  type="number"
                  value={benefitForm.employee_cost}
                  onChange={(e) => setBenefitForm({...benefitForm, employee_cost: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Employer Cost ($)</Label>
                <Input
                  type="number"
                  value={benefitForm.employer_cost}
                  onChange={(e) => setBenefitForm({...benefitForm, employer_cost: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div>
              <Label>Frequency</Label>
              <Select value={benefitForm.frequency} onValueChange={(value) => setBenefitForm({...benefitForm, frequency: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_pay">Per Pay Period</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBenefitDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createBenefitMutation.mutate(benefitForm)}>Create Benefit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Employee Dialog */}
      <Dialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Employee in Benefit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={enrollmentForm.employee_id} onValueChange={(value) => setEnrollmentForm({...enrollmentForm, employee_id: value})}>
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
              <Label>Benefit Plan *</Label>
              <Select value={enrollmentForm.benefit_id} onValueChange={(value) => {
                const benefit = benefits.find(b => b.id === value);
                setEnrollmentForm({
                  ...enrollmentForm,
                  benefit_id: value,
                  employee_contribution: benefit?.employee_cost || 0,
                  employer_contribution: benefit?.employer_cost || 0
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select benefit..." />
                </SelectTrigger>
                <SelectContent>
                  {benefits.map(ben => (
                    <SelectItem key={ben.id} value={ben.id}>
                      {ben.name} (Employee: ${ben.employee_cost})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Coverage Level *</Label>
              <Select value={enrollmentForm.coverage_level} onValueChange={(value) => setEnrollmentForm({...enrollmentForm, coverage_level: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee_only">Employee Only</SelectItem>
                  <SelectItem value="employee_spouse">Employee + Spouse</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={enrollmentForm.start_date}
                onChange={(e) => setEnrollmentForm({...enrollmentForm, start_date: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employee Contribution ($)</Label>
                <Input
                  type="number"
                  value={enrollmentForm.employee_contribution}
                  onChange={(e) => setEnrollmentForm({...enrollmentForm, employee_contribution: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Employer Contribution ($)</Label>
                <Input
                  type="number"
                  value={enrollmentForm.employer_contribution}
                  onChange={(e) => setEnrollmentForm({...enrollmentForm, employer_contribution: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEnrollmentDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createEnrollmentMutation.mutate(enrollmentForm)}>Enroll Employee</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}