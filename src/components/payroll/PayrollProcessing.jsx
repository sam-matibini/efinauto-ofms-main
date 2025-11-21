import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Download, Eye, Check, Loader2, X, StopCircle, Trash2, Edit } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PayrollProcessing({ company, employees, payrollRuns, payrollEntries, timeEntries, queryClient }) {
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [payDate, setPayDate] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const stopPayrollRunMutation = useMutation({
    mutationFn: async (runId) => {
      return await base44.entities.PayrollRun.update(runId, { status: 'draft' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      toast.success("Payroll run stopped - you can now restart it");
    },
    onError: () => {
      toast.error("Failed to stop payroll run");
    }
  });

  const deletePayrollRunMutation = useMutation({
    mutationFn: async (runId) => {
      // Delete all payroll entries for this run first
      const entries = payrollEntries.filter(e => e.payroll_run_id === runId);
      for (const entry of entries) {
        await base44.entities.PayrollEntry.delete(entry.id);
      }
      // Then delete the payroll run
      return await base44.entities.PayrollRun.delete(runId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['payrollEntries'] });
      toast.success("Payroll run deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete payroll run");
    }
  });

  const updatePayrollRunMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PayrollRun.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      toast.success("Payroll run updated successfully");
      setEditDialogOpen(false);
      setSelectedRun(null);
    },
    onError: () => {
      toast.error("Failed to update payroll run");
    }
  });

  const createPayrollRunMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate all entries first to get totals
      const entries = [];
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let totalEmployerCPP = 0;
      let totalEmployerEI = 0;

      for (const employee of data.employees) {
        const entryData = await calculatePayroll(employee, data.periodStart, data.periodEnd, null);
        entries.push(entryData);
        totalGross += entryData.gross_pay || 0;
        totalDeductions += entryData.total_deductions || 0;
        totalNet += entryData.net_pay || 0;
        totalEmployerCPP += entryData.cpp_employer || 0;
        totalEmployerEI += entryData.ei_employer || 0;
      }

      // Create payroll run with totals
      const payrollRun = await base44.entities.PayrollRun.create({
        ...data.runData,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        total_employer_cpp: totalEmployerCPP,
        total_employer_ei: totalEmployerEI,
        status: 'approved'
      });

      // Create payroll entries with the run ID
      for (const entryData of entries) {
        await base44.entities.PayrollEntry.create({
          ...entryData,
          payroll_run_id: payrollRun.id
        });
      }

      return payrollRun;
    },
    onSuccess: (payrollRun) => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['payrollEntries'] });
      toast.success(`Payroll run ${payrollRun.payroll_number} completed successfully! Total: $${payrollRun.total_gross?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`);
      setRunDialogOpen(false);
      setProcessing(false);
    },
    onError: () => {
      toast.error("Failed to process payroll");
      setProcessing(false);
    }
  });

  const calculatePayroll = async (employee, periodStart, periodEnd, payrollRunId) => {
    // Get YTD totals for this employee
    const currentYear = new Date(periodEnd).getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const previousEntries = payrollEntries.filter(e => 
      e.employee_id === employee.id && 
      e.company_id === company.id &&
      new Date(payrollRuns.find(r => r.id === e.payroll_run_id)?.pay_period_end || '').getFullYear() === currentYear
    );

    const ytdGross = previousEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0);
    const ytdCPP = previousEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0);
    const ytdEI = previousEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0);
    const ytdFederalTax = previousEntries.reduce((sum, e) => sum + (e.federal_tax || 0), 0);
    const ytdProvincialTax = previousEntries.reduce((sum, e) => sum + (e.provincial_tax || 0), 0);
    let regularHours = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let overtimePay = 0;
    let grossPay = 0;

    if (employee.pay_type === 'salary') {
      // For salaried employees, calculate based on pay frequency
      const payPeriodsPerYear = {
        'weekly': 52,
        'bi_weekly': 26,
        'semi_monthly': 24,
        'monthly': 12
      };
      const periods = payPeriodsPerYear[employee.pay_frequency] || 26;
      grossPay = employee.pay_rate / periods;
      regularPay = grossPay;
      
      // Calculate hours based on standard work week (40 hours)
      const weeksInPeriod = employee.pay_frequency === 'weekly' ? 1 : 
                           employee.pay_frequency === 'bi_weekly' ? 2 : 
                           employee.pay_frequency === 'semi_monthly' ? 2.17 : 
                           4.33;
      regularHours = 40 * weeksInPeriod;
    } else {
      // For hourly employees, get time entries for the period
      const empTimeEntries = timeEntries.filter(t => {
        const entryDate = new Date(t.date).toISOString().split('T')[0];
        return t.employee_id === employee.id &&
          entryDate >= periodStart &&
          entryDate <= periodEnd &&
          t.approved;
      });

      regularHours = empTimeEntries.reduce((sum, t) => sum + (t.regular_hours || 0), 0);
      overtimeHours = empTimeEntries.reduce((sum, t) => sum + (t.overtime_hours || 0), 0);

      // Calculate pay
      regularPay = regularHours * employee.pay_rate;
      overtimePay = overtimeHours * employee.pay_rate * 1.5;
      grossPay = regularPay + overtimePay;
    }

    // Calculate CPP (simplified)
    const cppRate = 0.0595;
    const cppExemption = 3500;
    const cppEmployee = Math.max(0, (grossPay * cppRate));
    const cppEmployer = cppEmployee;

    // Calculate EI (simplified)
    const eiRate = 0.0163;
    const eiEmployee = grossPay * eiRate;
    const eiEmployer = eiEmployee * 1.4;

    // Calculate federal tax using progressive brackets (2024)
    const annualizedGross = grossPay * (employee.pay_frequency === 'weekly' ? 52 : 
                                        employee.pay_frequency === 'bi_weekly' ? 26 : 
                                        employee.pay_frequency === 'semi_monthly' ? 24 : 12);

    let federalTax = 0;
    const federalBrackets = [
      { limit: 55867, rate: 0.15 },
      { limit: 111733, rate: 0.205 },
      { limit: 173205, rate: 0.26 },
      { limit: 246752, rate: 0.29 },
      { limit: Infinity, rate: 0.33 }
    ];

    let previousLimit = 0;
    for (const bracket of federalBrackets) {
      if (annualizedGross > previousLimit) {
        const taxableInBracket = Math.min(annualizedGross, bracket.limit) - previousLimit;
        federalTax += taxableInBracket * bracket.rate;
        previousLimit = bracket.limit;
      }
    }

    // Apply federal tax credit
    const federalCredit = (employee.td1_federal?.total_claim_amount || 15705) * 0.15;
    federalTax = Math.max(0, (federalTax - federalCredit)) / (employee.pay_frequency === 'weekly' ? 52 : 
                                                               employee.pay_frequency === 'bi_weekly' ? 26 : 
                                                               employee.pay_frequency === 'semi_monthly' ? 24 : 12);

    // Provincial tax using progressive brackets (Ontario 2024 as default)
    const province = employee.province || company?.province || 'ON';
    let provincialTax = 0;

    const provincialBrackets = {
      'ON': [
        { limit: 51446, rate: 0.0505 },
        { limit: 102894, rate: 0.0915 },
        { limit: 150000, rate: 0.1116 },
        { limit: 220000, rate: 0.1216 },
        { limit: Infinity, rate: 0.1316 }
      ],
      'BC': [
        { limit: 47937, rate: 0.0506 },
        { limit: 95875, rate: 0.077 },
        { limit: 110076, rate: 0.105 },
        { limit: 133664, rate: 0.1229 },
        { limit: 181232, rate: 0.147 },
        { limit: Infinity, rate: 0.168 }
      ],
      'AB': [
        { limit: 148269, rate: 0.10 },
        { limit: 177922, rate: 0.12 },
        { limit: 237230, rate: 0.13 },
        { limit: 355845, rate: 0.14 },
        { limit: Infinity, rate: 0.15 }
      ]
    };

    const brackets = provincialBrackets[province] || provincialBrackets['ON'];
    previousLimit = 0;
    for (const bracket of brackets) {
      if (annualizedGross > previousLimit) {
        const taxableInBracket = Math.min(annualizedGross, bracket.limit) - previousLimit;
        provincialTax += taxableInBracket * bracket.rate;
        previousLimit = bracket.limit;
      }
    }

    // Apply provincial tax credit
    const provincialCredit = (employee.td1_provincial?.total_claim_amount || 12399) * (province === 'ON' ? 0.0505 : 0.0506);
    provincialTax = Math.max(0, (provincialTax - provincialCredit)) / (employee.pay_frequency === 'weekly' ? 52 : 
                                                                        employee.pay_frequency === 'bi_weekly' ? 26 : 
                                                                        employee.pay_frequency === 'semi_monthly' ? 24 : 12);

    const totalDeductions = cppEmployee + eiEmployee + federalTax + provincialTax;
    const netPay = grossPay - totalDeductions;

    // Calculate vacation accrual
    const vacationAccrued = grossPay * (employee.vacation_accrual_rate / 100);

    return {
      company_id: company.id,
      payroll_run_id: payrollRunId,
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      employee_number: employee.employee_number,
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      regular_pay: regularPay,
      overtime_pay: overtimePay,
      gross_pay: grossPay,
      cpp_employee: cppEmployee,
      ei_employee: eiEmployee,
      federal_tax: federalTax,
      provincial_tax: provincialTax,
      total_deductions: totalDeductions,
      net_pay: netPay,
      cpp_employer: cppEmployer,
      ei_employer: eiEmployer,
      vacation_accrued: vacationAccrued,
      ytd_gross: ytdGross + grossPay,
      ytd_cpp: ytdCPP + cppEmployee,
      ytd_ei: ytdEI + eiEmployee,
      ytd_federal_tax: ytdFederalTax + federalTax,
      ytd_provincial_tax: ytdProvincialTax + provincialTax
    };
    };

  const handleRunPayroll = async () => {
    if (!periodStart || !periodEnd || !payDate) {
      toast.error("Please fill in all dates");
      return;
    }

    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    setProcessing(true);

    const employeesToProcess = employees.filter(e => selectedEmployees.includes(e.id));
    
    const runData = {
      company_id: company.id,
      payroll_number: `PAY-${Date.now()}`,
      pay_period_start: periodStart,
      pay_period_end: periodEnd,
      pay_date: payDate,
      status: 'processing',
      employee_count: employeesToProcess.length
    };

    createPayrollRunMutation.mutate({
      runData,
      employees: employeesToProcess,
      periodStart,
      periodEnd
    });
  };

  const toggleEmployee = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleAllEmployees = () => {
    const activeEmployees = employees.filter(e => e.employment_status === 'active');
    if (selectedEmployees.length === activeEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(activeEmployees.map(e => e.id));
    }
  };

  React.useEffect(() => {
    if (runDialogOpen) {
      const activeEmployees = employees.filter(e => e.employment_status === 'active');
      setSelectedEmployees(activeEmployees.map(e => e.id));
    }
  }, [runDialogOpen, employees]);

  const handleViewRun = (run) => {
    setSelectedRun(run);
    setViewDialogOpen(true);
  };

  const handleExportRun = (run) => {
    const entries = getRunEntries(run.id);

    // Create CSV content
    const headers = [
      'Employee Number', 'Employee Name', 'Regular Hours', 'Overtime Hours', 
      'Regular Pay', 'Overtime Pay', 'Gross Pay', 'CPP Employee', 'EI Employee',
      'Federal Tax', 'Provincial Tax', 'Total Deductions', 'Net Pay',
      'CPP Employer', 'EI Employer', 'Vacation Accrued'
    ];

    const rows = entries.map(entry => [
      entry.employee_number,
      entry.employee_name,
      entry.regular_hours,
      entry.overtime_hours,
      entry.regular_pay?.toFixed(2),
      entry.overtime_pay?.toFixed(2),
      entry.gross_pay?.toFixed(2),
      entry.cpp_employee?.toFixed(2),
      entry.ei_employee?.toFixed(2),
      entry.federal_tax?.toFixed(2),
      entry.provincial_tax?.toFixed(2),
      entry.total_deductions?.toFixed(2),
      entry.net_pay?.toFixed(2),
      entry.cpp_employer?.toFixed(2),
      entry.ei_employer?.toFixed(2),
      entry.vacation_accrued?.toFixed(2)
    ]);

    const csvContent = [
      `Payroll Run: ${run.payroll_number}`,
      `Period: ${formatDate(run.pay_period_start)} - ${formatDate(run.pay_period_end)}`,
      `Pay Date: ${formatDate(run.pay_date)}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${run.payroll_number}_${run.pay_date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Payroll exported successfully");
  };

  const handleEditRun = (run) => {
    setSelectedRun(run);
    setPeriodStart(run.pay_period_start);
    setPeriodEnd(run.pay_period_end);
    setPayDate(run.pay_date);
    setEditDialogOpen(true);
  };

  const handleUpdateRun = () => {
    if (!periodStart || !periodEnd || !payDate) {
      toast.error("Please fill in all dates");
      return;
    }

    updatePayrollRunMutation.mutate({
      id: selectedRun.id,
      data: {
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
        pay_date: payDate
      }
    });
  };

  const getRunEntries = (runId) => {
    return payrollEntries.filter(e => e.payroll_run_id === runId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payroll Runs</CardTitle>
            <Button onClick={() => setRunDialogOpen(true)} className="bg-green-600">
              <Play className="w-4 h-4 mr-2" />
              Run Payroll
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payrollRuns.map((run) => (
              <Card key={run.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{run.payroll_number}</h3>
                        <Badge className={getStatusColor(run.status)}>
                          {run.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Period: {formatDate(run.pay_period_start)} - {formatDate(run.pay_period_end)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Pay Date: {formatDate(run.pay_date)} • {run.employee_count} employees
                      </p>
                      <p className="text-lg font-bold mt-2">
                        Total: ${run.total_gross?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(run.status === 'processing' || run.status === 'draft') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => stopPayrollRunMutation.mutate(run.id)}
                          className="text-orange-600 hover:text-orange-700 hover:border-orange-300"
                        >
                          <StopCircle className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleViewRun(run)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {run.status === 'draft' && (
                        <Button variant="outline" size="sm" onClick={() => handleEditRun(run)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleExportRun(run)}>
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this payroll run? This cannot be undone.')) {
                            deletePayrollRunMutation.mutate(run.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Run Payroll Dialog */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pay Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <Label>Pay Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div>
              <Label>Pay Date</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Select Employees</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleAllEmployees}
                  type="button"
                >
                  {selectedEmployees.length === employees.filter(e => e.employment_status === 'active').length 
                    ? 'Deselect All' 
                    : 'Select All'}
                </Button>
              </div>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {employees.filter(e => e.employment_status === 'active').map((employee) => (
                  <div 
                    key={employee.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => toggleEmployee(employee.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                      <p className="text-xs text-gray-500">{employee.position} • {employee.department}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {employee.pay_type === 'hourly' 
                        ? `$${employee.pay_rate}/hr` 
                        : `$${employee.pay_rate?.toLocaleString()}/yr`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                This will process payroll for <strong>{selectedEmployees.length}</strong> selected employee{selectedEmployees.length !== 1 ? 's' : ''}.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRunPayroll} disabled={processing} className="bg-green-600">
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Payroll
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Payroll Run Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payroll Run Details - {selectedRun?.payroll_number}</DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Period Start</Label>
                  <p className="font-semibold">{formatDate(selectedRun.pay_period_start)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Period End</Label>
                  <p className="font-semibold">{formatDate(selectedRun.pay_period_end)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Pay Date</Label>
                  <p className="font-semibold">{formatDate(selectedRun.pay_date)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Badge className={getStatusColor(selectedRun.status)}>{selectedRun.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <Label className="text-xs text-gray-500">Total Gross</Label>
                  <p className="text-lg font-bold text-green-600">
                    ${selectedRun.total_gross?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Total Deductions</Label>
                  <p className="text-lg font-bold text-red-600">
                    ${selectedRun.total_deductions?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Total Net</Label>
                  <p className="text-lg font-bold text-blue-600">
                    ${selectedRun.total_net?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Employees</Label>
                  <p className="text-lg font-bold">{selectedRun.employee_count}</p>
                </div>
              </div>

              <Tabs defaultValue="entries">
                <TabsList>
                  <TabsTrigger value="entries">Payroll Entries</TabsTrigger>
                  <TabsTrigger value="paystubs">Paystubs</TabsTrigger>
                </TabsList>

                <TabsContent value="entries" className="space-y-3 mt-4">
                  {getRunEntries(selectedRun.id).map((entry) => (
                    <Card key={entry.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{entry.employee_name}</h3>
                            <p className="text-sm text-gray-600">{entry.employee_number}</p>
                            <div className="mt-2 text-sm">
                              <p>Regular: {entry.regular_hours}h @ ${entry.regular_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                              {entry.overtime_hours > 0 && (
                                <p>Overtime: {entry.overtime_hours}h @ ${entry.overtime_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Gross Pay</p>
                            <p className="text-lg font-bold text-green-600">
                              ${entry.gross_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Deductions</p>
                            <p className="text-sm text-red-600">
                              -${entry.total_deductions?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Net Pay</p>
                            <p className="text-lg font-bold text-blue-600">
                              ${entry.net_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="paystubs" className="space-y-3 mt-4">
                  <style>{`
                    @media print {
                      @page {
                        size: A4;
                        margin: 10mm;
                      }
                      body * {
                        visibility: hidden;
                      }
                      .paystub-print-container {
                        visibility: visible !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        font-size: 11px;
                      }
                      .paystub-print-container * {
                        visibility: visible !important;
                      }
                      .paystub-print-container h2,
                      .paystub-print-container p,
                      .paystub-print-container span,
                      .paystub-print-container div {
                        visibility: visible !important;
                        color: black !important;
                      }
                      .paystub-print-container h2 {
                        font-size: 18px;
                        margin-bottom: 4px;
                      }
                      .paystub-print-container h3 {
                        font-size: 13px;
                        margin-bottom: 6px;
                        padding-bottom: 3px;
                      }
                      .paystub-print-container p {
                        margin: 2px 0;
                        font-size: 11px;
                      }
                      .paystub-print-container .space-y-4 > * + * {
                        margin-top: 10px !important;
                      }
                      .paystub-print-container .space-y-1 > * + * {
                        margin-top: 2px !important;
                      }
                      .paystub-print-container .p-6 {
                        padding: 12px !important;
                      }
                      .paystub-print-container .p-3 {
                        padding: 8px !important;
                      }
                      .paystub-print-container .gap-4 {
                        gap: 8px !important;
                      }
                      .paystub-print-container .pb-4 {
                        padding-bottom: 8px !important;
                      }
                      .paystub-print-container .pt-4 {
                        padding-top: 8px !important;
                      }
                      .paystub-print-container {
                        page-break-inside: avoid;
                      }
                      .print-button {
                        display: none !important;
                      }
                    }
                  `}</style>
                  {getRunEntries(selectedRun.id).map((entry) => {
                    // Calculate YTD for display if not set
                    const currentYear = new Date(selectedRun.pay_period_end).getFullYear();
                    const previousYTDEntries = payrollEntries.filter(e => {
                      if (e.id === entry.id || e.employee_id !== entry.employee_id) return false;
                      const entryRun = payrollRuns.find(r => r.id === e.payroll_run_id);
                      if (!entryRun) return false;
                      const entryYear = new Date(entryRun.pay_period_end).getFullYear();
                      const entryDate = new Date(entryRun.pay_period_end);
                      const currentDate = new Date(selectedRun.pay_period_end);
                      return entryYear === currentYear && entryDate < currentDate;
                    });

                    const displayYTDGross = (entry.ytd_gross && entry.ytd_gross > 0) ? entry.ytd_gross : 
                      (previousYTDEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0) + (entry.gross_pay || 0));
                    const displayYTDCPP = (entry.ytd_cpp && entry.ytd_cpp > 0) ? entry.ytd_cpp :
                      (previousYTDEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0) + (entry.cpp_employee || 0));
                    const displayYTDEI = (entry.ytd_ei && entry.ytd_ei > 0) ? entry.ytd_ei :
                      (previousYTDEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0) + (entry.ei_employee || 0));
                    const displayYTDFederal = (entry.ytd_federal_tax && entry.ytd_federal_tax > 0) ? entry.ytd_federal_tax :
                      (previousYTDEntries.reduce((sum, e) => sum + (e.federal_tax || 0), 0) + (entry.federal_tax || 0));
                    const displayYTDProvincial = (entry.ytd_provincial_tax && entry.ytd_provincial_tax > 0) ? entry.ytd_provincial_tax :
                      (previousYTDEntries.reduce((sum, e) => sum + (e.provincial_tax || 0), 0) + (entry.provincial_tax || 0));

                    return (
                    <div key={entry.id} className="paystub-print-container">
                    <Card>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="text-center border-b pb-4">
                            <h2 className="text-2xl font-bold">{company?.name || 'Company Name'}</h2>
                            <p className="text-sm text-gray-600">Pay Statement</p>
                          </div>

                          {/* Employee & Period Info */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-semibold">{entry.employee_name || 'Employee Name'}</p>
                              <p className="text-gray-600">{entry.employee_number || 'EMP-000'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-600">Pay Period: {formatDate(selectedRun.pay_period_start)} - {formatDate(selectedRun.pay_period_end)}</p>
                              <p className="text-gray-600">Pay Date: {formatDate(selectedRun.pay_date)}</p>
                            </div>
                          </div>

                          {/* Earnings */}
                          <div>
                            <h3 className="font-semibold mb-2 pb-1 border-b">Earnings</h3>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Regular ({entry.regular_hours}h)</span>
                                <span>${entry.regular_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                              </div>
                              {entry.overtime_hours > 0 && (
                                <div className="flex justify-between">
                                  <span>Overtime ({entry.overtime_hours}h)</span>
                                  <span>${entry.overtime_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              {entry.vacation_hours > 0 && (
                                <div className="flex justify-between">
                                  <span>Vacation ({entry.vacation_hours}h)</span>
                                  <span>${entry.vacation_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold pt-1 border-t">
                                <span>Gross Pay</span>
                                <span>${entry.gross_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          {/* Deductions */}
                          <div>
                            <h3 className="font-semibold mb-2 pb-1 border-b">Deductions</h3>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>CPP (Employee)</span>
                                <span>-${entry.cpp_employee?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>EI (Employee)</span>
                                <span>-${entry.ei_employee?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Federal Tax</span>
                                <span>-${entry.federal_tax?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Provincial Tax</span>
                                <span>-${entry.provincial_tax?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                              </div>
                              {entry.other_deductions > 0 && (
                                <div className="flex justify-between">
                                  <span>Other Deductions</span>
                                  <span>-${entry.other_deductions?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold pt-1 border-t">
                                <span>Total Deductions</span>
                                <span>-${entry.total_deductions?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          {/* Net Pay */}
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold">Net Pay</span>
                              <span className="text-2xl font-bold text-blue-600">
                                ${entry.net_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* YTD Summary */}
                          <div>
                            <h3 className="font-semibold mb-2 pb-1 border-b">Year-to-Date</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span>Gross:</span>
                                <span>${displayYTDGross.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>CPP:</span>
                                <span>${displayYTDCPP.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>EI:</span>
                                <span>${displayYTDEI.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Federal Tax:</span>
                                <span>${displayYTDFederal.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Provincial Tax:</span>
                                <span>${displayYTDProvincial.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          {/* Print Button */}
                          <div className="text-center pt-4 border-t print-button">
                            <Button variant="outline" onClick={() => window.print()}>
                              <Download className="w-4 h-4 mr-2" />
                              Print/Download Paystub
                            </Button>
                          </div>
                          </div>
                          </CardContent>
                          </Card>
                          </div>
                          );
                          })}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payroll Run Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payroll Run - {selectedRun?.payroll_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pay Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <Label>Pay Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div>
              <Label>Pay Date</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRun} disabled={updatePayrollRunMutation.isPending}>
                {updatePayrollRunMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Payroll Run'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      );
      }