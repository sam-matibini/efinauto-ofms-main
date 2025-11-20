import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, UserPlus, FileText, Sparkles, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EmployeeManagement({ company, employees, queryClient }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [td1DialogOpen, setTd1DialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [td1Editing, setTd1Editing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [td1FormData, setTd1FormData] = useState({
    province: "",
    federal: { basic_personal_amount: 15000, additional_amount: 0 },
    provincial: { basic_personal_amount: 11809, additional_amount: 0 }
  });
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    sin: "",
    date_of_birth: "",
    email: "",
    phone: "",
    address: "",
    address_date: "",
    position: "",
    department: "sales",
    pay_type: "hourly",
    pay_rate: "",
    pay_frequency: "bi_weekly",
    hire_date: new Date().toISOString().split('T')[0]
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data) => {
      const employee = await base44.entities.Employee.create(data);
      
      // Link user account to employee if email exists
      if (employee.email) {
        try {
          const users = await base44.entities.User.filter({ email: employee.email });
          if (users.length > 0) {
            const user = users[0];
            await base44.entities.User.update(user.id, {
              employee_entity_id: employee.id,
              company_id: company.id
            });
          }
        } catch (linkError) {
          console.error("Failed to link user to employee:", linkError);
        }

        // Send TD1 form email
        const td1FormUrl = `${window.location.origin}/TD1Form?employee_id=${employee.id}`;
        
        try {
          await base44.integrations.Core.SendEmail({
            from_name: company?.name || "eFinAuto OFMS",
            to: employee.email,
            subject: "Complete Your TD1 Tax Forms - Action Required",
            body: `Dear ${employee.first_name} ${employee.last_name},

Welcome to ${company?.name || "eFinAuto OFMS"}!

As part of your onboarding process, please complete your TD1 Personal Tax Credits Return forms (federal and provincial). This is required to ensure accurate payroll tax deductions.

Click the link below to access your personalized TD1 form:
${td1FormUrl}

The form takes approximately 5 minutes to complete. You'll need to provide:
• Federal basic personal amount and any additional credits
• Provincial basic personal amount and any additional credits

Please complete this form at your earliest convenience.

If you have any questions, please contact our HR department.

Best regards,
${company?.name || "eFinAuto OFMS"} HR Team`
          });
        } catch (emailError) {
          console.error("Failed to send TD1 email:", emailError);
          toast.error("Employee created but email failed to send");
        }
      }
      
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Employee added successfully and TD1 form email sent");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to add employee")
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Employee updated successfully");
      setDialogOpen(false);
      setTd1DialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to update employee")
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      sin: "",
      date_of_birth: "",
      email: "",
      phone: "",
      address: "",
      address_date: "",
      position: "",
      department: "sales",
      pay_type: "hourly",
      pay_rate: "",
      pay_frequency: "bi_weekly",
      hire_date: new Date().toISOString().split('T')[0]
    });
    setSelectedEmployee(null);
    setTd1DialogOpen(false);
  };

  const handleSave = () => {
    if (!formData.first_name || !formData.last_name || !formData.sin || !formData.position || !formData.pay_rate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data = {
      ...formData,
      company_id: company.id,
      employee_number: `EMP-${Date.now()}`,
      employment_status: "active",
      pay_rate: parseFloat(formData.pay_rate)
    };

    if (selectedEmployee) {
      updateEmployeeMutation.mutate({ id: selectedEmployee.id, data });
    } else {
      createEmployeeMutation.mutate(data);
    }
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      first_name: employee.first_name || "",
      last_name: employee.last_name || "",
      sin: employee.sin || "",
      date_of_birth: employee.date_of_birth || "",
      email: employee.email || "",
      phone: employee.phone || "",
      address: employee.address || "",
      address_date: employee.address_date || "",
      position: employee.position || "",
      department: employee.department || "sales",
      pay_type: employee.pay_type || "hourly",
      pay_rate: employee.pay_rate?.toString() || "",
      pay_frequency: employee.pay_frequency || "bi_weekly",
      hire_date: employee.hire_date || new Date().toISOString().split('T')[0]
    });
    setDialogOpen(true);
  };

  const handleTD1Form = (employee) => {
    setSelectedEmployee(employee);
    setTd1FormData({
      province: employee.province || company?.province || "ON",
      federal: employee.td1_federal || { basic_personal_amount: 15000, additional_amount: 0 },
      provincial: employee.td1_provincial || { basic_personal_amount: 11809, additional_amount: 0 }
    });
    setTd1Editing(false);
    setTd1DialogOpen(true);
  };

  const handleSaveTD1 = () => {
    const federalTotal = (td1FormData.federal.basic_personal_amount || 0) + (td1FormData.federal.additional_amount || 0);
    const provincialTotal = (td1FormData.provincial.basic_personal_amount || 0) + (td1FormData.provincial.additional_amount || 0);

    updateEmployeeMutation.mutate({
      id: selectedEmployee.id,
      data: {
        province: td1FormData.province,
        td1_federal: {
          ...td1FormData.federal,
          total_claim_amount: federalTotal,
          filing_date: new Date().toISOString()
        },
        td1_provincial: {
          ...td1FormData.provincial,
          total_claim_amount: provincialTotal,
          filing_date: new Date().toISOString()
        }
      }
    });
    setTd1Editing(false);
  };

  const fetchTaxCreditsWithAI = async () => {
    setAiLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the Canada Revenue Agency (CRA) official website for the EXACT tax credit amounts for tax year 2025:

Province: ${td1FormData.province}

Find the official CRA amounts for:
1. Federal basic personal amount for 2025 tax year (from CRA TD1 federal form)
2. Provincial/territorial basic personal amount for ${td1FormData.province} for 2025 tax year (from provincial TD1 form)

IMPORTANT: 
- Get the exact dollar amounts from official CRA sources only (canada.ca website)
- Use the 2025 tax year amounts
- Return precise numbers from official TD1 forms, not estimates
- The federal BPA for 2025 should be around $15,705
- Provincial amounts vary by province/territory

Provide the exact amounts in Canadian dollars.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            federal_basic_amount: { type: "number" },
            provincial_basic_amount: { type: "number" },
            federal_explanation: { type: "string" },
            provincial_explanation: { type: "string" }
          }
        }
      });

      setTd1FormData(prev => ({
        ...prev,
        federal: {
          ...prev.federal,
          basic_personal_amount: response.federal_basic_amount
        },
        provincial: {
          ...prev.provincial,
          basic_personal_amount: response.provincial_basic_amount
        }
      }));

      toast.success(`Tax credits updated for ${td1FormData.province} with current CRA guidelines`);
    } catch (error) {
      console.error("AI fetch error:", error);
      toast.error("Failed to fetch tax credits. Please enter manually.");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Employee Directory</CardTitle>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{employee.first_name} {employee.last_name}</h3>
                          <Badge className={getStatusColor(employee.employment_status)}>
                            {employee.employment_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{employee.position} • {employee.department}</p>
                        <p className="text-xs text-gray-500">
                          {employee.pay_type === 'hourly' 
                            ? `$${employee.pay_rate}/hr` 
                            : `$${employee.pay_rate?.toLocaleString()}/year`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleTD1Form(employee)}>
                        <FileText className="w-4 h-4 mr-1" />
                        TD1
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SIN *</Label>
                <Input
                  value={formData.sin}
                  onChange={(e) => setFormData({...formData, sin: e.target.value})}
                  placeholder="123-456-789"
                />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mailing Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Street address"
                />
              </div>
              <div>
                <Label>Date of Mailing Address</Label>
                <Input
                  type="date"
                  value={formData.address_date}
                  onChange={(e) => setFormData({...formData, address_date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Position *</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="parts">Parts</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="administration">Administration</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Pay Type *</Label>
                <Select value={formData.pay_type} onValueChange={(value) => setFormData({...formData, pay_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="commission">Commission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pay Rate * {formData.pay_type === 'hourly' ? '($/hr)' : '($/year)'}</Label>
                <Input
                  type="number"
                  value={formData.pay_rate}
                  onChange={(e) => setFormData({...formData, pay_rate: e.target.value})}
                />
              </div>
              <div>
                <Label>Pay Frequency</Label>
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
            </div>

            <div>
              <Label>Hire Date</Label>
              <Input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
                {selectedEmployee ? 'Update' : 'Add'} Employee
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TD1 Form Dialog */}
      <Dialog open={td1DialogOpen} onOpenChange={(open) => { setTd1DialogOpen(open); if (!open) setTd1Editing(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>TD1 Tax Credit Forms - {selectedEmployee?.first_name} {selectedEmployee?.last_name}</DialogTitle>
              {!td1Editing ? (
                <Button variant="outline" size="sm" onClick={() => setTd1Editing(true)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setTd1FormData({
                      province: selectedEmployee.province || company?.province || "ON",
                      federal: selectedEmployee.td1_federal || { basic_personal_amount: 15000, additional_amount: 0 },
                      provincial: selectedEmployee.td1_provincial || { basic_personal_amount: 11809, additional_amount: 0 }
                    });
                    setTd1Editing(false);
                  }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveTD1} disabled={updateEmployeeMutation.isPending}>
                    Save
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Province/Territory</Label>
                <Select 
                  value={td1FormData.province} 
                  onValueChange={(value) => setTd1FormData({...td1FormData, province: value})}
                  disabled={!td1Editing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AB">Alberta</SelectItem>
                    <SelectItem value="BC">British Columbia</SelectItem>
                    <SelectItem value="MB">Manitoba</SelectItem>
                    <SelectItem value="NB">New Brunswick</SelectItem>
                    <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                    <SelectItem value="NT">Northwest Territories</SelectItem>
                    <SelectItem value="NS">Nova Scotia</SelectItem>
                    <SelectItem value="NU">Nunavut</SelectItem>
                    <SelectItem value="ON">Ontario</SelectItem>
                    <SelectItem value="PE">Prince Edward Island</SelectItem>
                    <SelectItem value="QC">Quebec</SelectItem>
                    <SelectItem value="SK">Saskatchewan</SelectItem>
                    <SelectItem value="YT">Yukon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={fetchTaxCreditsWithAI} 
                  disabled={aiLoading || !td1Editing}
                  variant="outline"
                  className="w-full border-blue-400 hover:bg-blue-50"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fetching CRA Guidelines...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI: Get Current Tax Credits
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                💡 Use AI to automatically fetch the latest {new Date().getFullYear()} CRA tax credit amounts for the selected province
              </p>
            </div>
          
            <Tabs defaultValue="federal" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="federal">Federal TD1</TabsTrigger>
                <TabsTrigger value="provincial">Provincial TD1</TabsTrigger>
              </TabsList>
              <TabsContent value="federal" className="space-y-4 pt-4">
                <div>
                  <Label>Basic Personal Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={td1FormData.federal.basic_personal_amount}
                    onChange={(e) => setTd1FormData({
                      ...td1FormData,
                      federal: { ...td1FormData.federal, basic_personal_amount: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!td1Editing}
                  />
                  <p className="text-xs text-gray-500 mt-1">2024 Federal: $15,000</p>
                </div>
                <div>
                  <Label>Additional Tax Credit Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={td1FormData.federal.additional_amount}
                    onChange={(e) => setTd1FormData({
                      ...td1FormData,
                      federal: { ...td1FormData.federal, additional_amount: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!td1Editing}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Additional credits (spouse, dependants, disability, etc.)
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Federal Claim:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${((td1FormData.federal.basic_personal_amount || 0) + (td1FormData.federal.additional_amount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="provincial" className="space-y-4 pt-4">
                <div>
                  <Label>Basic Personal Amount ({td1FormData.province})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={td1FormData.provincial.basic_personal_amount}
                    onChange={(e) => setTd1FormData({
                      ...td1FormData,
                      provincial: { ...td1FormData.provincial, basic_personal_amount: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!td1Editing}
                  />
                  <p className="text-xs text-gray-500 mt-1">Varies by province</p>
                </div>
                <div>
                  <Label>Additional Tax Credit Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={td1FormData.provincial.additional_amount}
                    onChange={(e) => setTd1FormData({
                      ...td1FormData,
                      provincial: { ...td1FormData.provincial, additional_amount: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!td1Editing}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Additional provincial credits (spouse, dependants, etc.)
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Provincial Claim:</span>
                    <span className="text-lg font-bold text-purple-600">
                      ${((td1FormData.provincial.basic_personal_amount || 0) + (td1FormData.provincial.additional_amount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}