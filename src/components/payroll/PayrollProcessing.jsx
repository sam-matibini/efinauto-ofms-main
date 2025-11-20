import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Download, Eye, Check, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PayrollProcessing({ company, employees, payrollRuns, payrollEntries, timeEntries, queryClient }) {
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [payDate, setPayDate] = useState("");

  const createPayrollRunMutation = useMutation({
    mutationFn: async (data) => {
      // Create payroll run
      const payrollRun = await base44.entities.PayrollRun.create(data.runData);
      
      // Process each employee
      for (const employee of data.employees) {
        const entryData = await calculatePayroll(employee, data.periodStart, data.periodEnd, payrollRun.id);
        await base44.entities.PayrollEntry.create(entryData);
      }
      
      return payrollRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['payrollEntries'] });
      toast.success("Payroll processed successfully");
      setRunDialogOpen(false);
      setProcessing(false);
    },
    onError: () => {
      toast.error("Failed to process payroll");
      setProcessing(false);
    }
  });

  const calculatePayroll = async (employee, periodStart, periodEnd, payrollRunId) => {
    // Get time entries for the period
    const empTimeEntries = timeEntries.filter(t => 
      t.employee_id === employee.id &&
      t.date >= periodStart &&
      t.date <= periodEnd &&
      t.approved
    );

    const regularHours = empTimeEntries.reduce((sum, t) => sum + (t.regular_hours || 0), 0);
    const overtimeHours = empTimeEntries.reduce((sum, t) => sum + (t.overtime_hours || 0), 0);

    // Calculate pay
    const regularPay = regularHours * employee.pay_rate;
    const overtimePay = overtimeHours * employee.pay_rate * 1.5;
    const grossPay = regularPay + overtimePay;

    // Calculate CPP (simplified)
    const cppRate = 0.0595;
    const cppExemption = 3500;
    const cppEmployee = Math.max(0, (grossPay * cppRate));
    const cppEmployer = cppEmployee;

    // Calculate EI (simplified)
    const eiRate = 0.0163;
    const eiEmployee = grossPay * eiRate;
    const eiEmployer = eiEmployee * 1.4;

    // Calculate federal tax (simplified progressive)
    let federalTax = 0;
    const federalCredit = (employee.td1_federal?.total_claim_amount || 15000) * 0.15;
    if (grossPay > 53359) {
      federalTax = grossPay * 0.205 - federalCredit;
    } else {
      federalTax = grossPay * 0.15 - federalCredit;
    }
    federalTax = Math.max(0, federalTax);

    // Provincial tax (simplified for Ontario)
    let provincialTax = 0;
    const provincialCredit = (employee.td1_provincial?.total_claim_amount || 11809) * 0.0505;
    if (grossPay > 49231) {
      provincialTax = grossPay * 0.0915 - provincialCredit;
    } else {
      provincialTax = grossPay * 0.0505 - provincialCredit;
    }
    provincialTax = Math.max(0, provincialTax);

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
      vacation_accrued: vacationAccrued
    };
  };

  const handleRunPayroll = async () => {
    if (!periodStart || !periodEnd || !payDate) {
      toast.error("Please fill in all dates");
      return;
    }

    setProcessing(true);

    const activeEmployees = employees.filter(e => e.employment_status === 'active');
    
    const runData = {
      company_id: company.id,
      payroll_number: `PAY-${Date.now()}`,
      pay_period_start: periodStart,
      pay_period_end: periodEnd,
      pay_date: payDate,
      status: 'processing',
      employee_count: activeEmployees.length
    };

    createPayrollRunMutation.mutate({
      runData,
      employees: activeEmployees,
      periodStart,
      periodEnd
    });
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
                        Period: {new Date(run.pay_period_start).toLocaleDateString()} - {new Date(run.pay_period_end).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Pay Date: {new Date(run.pay_date).toLocaleDateString()} • {run.employee_count} employees
                      </p>
                      <p className="text-lg font-bold mt-2">
                        Total: ${run.total_gross?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Export
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                This will process payroll for {employees.filter(e => e.employment_status === 'active').length} active employees.
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
    </div>
  );
}