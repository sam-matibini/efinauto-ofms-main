import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PayrollReports({ company, employees, payrollRuns, payrollEntries, timeEntries }) {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedPayrollRun, setSelectedPayrollRun] = useState("");

  const { data: benefits = [] } = useQuery({
    queryKey: ['employeeBenefits', company?.id],
    queryFn: () => base44.entities.EmployeeBenefit.filter({ company_id: company.id }),
    enabled: !!company,
  });

  const { data: deductions = [] } = useQuery({
    queryKey: ['deductions', company?.id],
    queryFn: () => base44.entities.Deduction.filter({ company_id: company.id }),
    enabled: !!company,
  });

  const { data: vacationTransactions = [] } = useQuery({
    queryKey: ['vacationTransactions', company?.id],
    queryFn: () => base44.entities.VacationTransaction.filter({ company_id: company.id }),
    enabled: !!company,
  });

  // Filter entries by date range
  const filteredEntries = payrollEntries.filter(entry => {
    const run = payrollRuns.find(r => r.id === entry.payroll_run_id);
    if (!run) return false;
    return run.pay_date >= dateRange.start && run.pay_date <= dateRange.end;
  });

  const selectedRun = payrollRuns.find(r => r.id === selectedPayrollRun);
  const runEntries = selectedRun ? payrollEntries.filter(e => e.payroll_run_id === selectedPayrollRun) : [];

  // Calculate totals
  const totals = {
    grossPay: filteredEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0),
    netPay: filteredEntries.reduce((sum, e) => sum + (e.net_pay || 0), 0),
    totalDeductions: filteredEntries.reduce((sum, e) => sum + (e.total_deductions || 0), 0),
    employerCPP: filteredEntries.reduce((sum, e) => sum + (e.cpp_employer || 0), 0),
    employerEI: filteredEntries.reduce((sum, e) => sum + (e.ei_employer || 0), 0),
    employeeCPP: filteredEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0),
    employeeEI: filteredEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0),
    federalTax: filteredEntries.reduce((sum, e) => sum + (e.federal_tax || 0), 0),
    provincialTax: filteredEntries.reduce((sum, e) => sum + (e.provincial_tax || 0), 0)
  };

  const totalPayrollCost = totals.grossPay + totals.employerCPP + totals.employerEI;

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            <div>
              <Label>Specific Pay Run</Label>
              <Select value={selectedPayrollRun} onValueChange={setSelectedPayrollRun}>
                <SelectTrigger>
                  <SelectValue placeholder="All pay runs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Pay Runs</SelectItem>
                  {payrollRuns.map(run => (
                    <SelectItem key={run.id} value={run.id}>
                      {run.payroll_number} - {new Date(run.pay_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
          <TabsTrigger value="vacation">Vacation</TabsTrigger>
          <TabsTrigger value="ytd">YTD</TabsTrigger>
        </TabsList>

        {/* 1. Payroll Summary Report */}
        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Payroll Summary Report</CardTitle>
                <Button variant="outline" onClick={() => window.print()}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Gross Pay</p>
                    <p className="text-2xl font-bold">${totals.grossPay.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Deductions</p>
                    <p className="text-2xl font-bold">${totals.totalDeductions.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Net Pay</p>
                    <p className="text-2xl font-bold">${totals.netPay.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Employer CPP</p>
                    <p className="text-2xl font-bold">${totals.employerCPP.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Employer EI</p>
                    <p className="text-2xl font-bold">${totals.employerEI.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Payroll Cost</p>
                    <p className="text-2xl font-bold">${totalPayrollCost.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Pay Runs in Period</h3>
                  <div className="space-y-2">
                    {payrollRuns
                      .filter(run => run.pay_date >= dateRange.start && run.pay_date <= dateRange.end)
                      .map(run => (
                        <div key={run.id} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{run.payroll_number}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(run.pay_period_start).toLocaleDateString()} - {new Date(run.pay_period_end).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${run.total_gross?.toLocaleString('en-CA')}</p>
                            <Badge>{run.status}</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Payroll Register */}
        <TabsContent value="register" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Payroll Register</CardTitle>
                <Button variant="outline" onClick={() => {
                  const csv = [
                    ['Employee', 'Pay Rate', 'Regular Hrs', 'OT Hrs', 'Gross Pay', 'CPP', 'EI', 'Fed Tax', 'Prov Tax', 'Net Pay'],
                    ...(selectedPayrollRun ? runEntries : filteredEntries).map(entry => [
                      entry.employee_name,
                      entry.gross_pay / (entry.regular_hours || 1),
                      entry.regular_hours,
                      entry.overtime_hours,
                      entry.gross_pay,
                      entry.cpp_employee,
                      entry.ei_employee,
                      entry.federal_tax,
                      entry.provincial_tax,
                      entry.net_pay
                    ])
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `payroll_register_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Employee</th>
                      <th className="text-right p-2">Pay Rate</th>
                      <th className="text-right p-2">Regular Hrs</th>
                      <th className="text-right p-2">OT Hrs</th>
                      <th className="text-right p-2">Gross Pay</th>
                      <th className="text-right p-2">CPP</th>
                      <th className="text-right p-2">EI</th>
                      <th className="text-right p-2">Fed Tax</th>
                      <th className="text-right p-2">Prov Tax</th>
                      <th className="text-right p-2">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPayrollRun ? runEntries : filteredEntries).map(entry => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{entry.employee_name}</td>
                        <td className="text-right p-2">${entry.gross_pay / (entry.regular_hours || 1)}</td>
                        <td className="text-right p-2">{entry.regular_hours}</td>
                        <td className="text-right p-2">{entry.overtime_hours}</td>
                        <td className="text-right p-2">${entry.gross_pay?.toLocaleString('en-CA')}</td>
                        <td className="text-right p-2">${entry.cpp_employee?.toLocaleString('en-CA')}</td>
                        <td className="text-right p-2">${entry.ei_employee?.toLocaleString('en-CA')}</td>
                        <td className="text-right p-2">${entry.federal_tax?.toLocaleString('en-CA')}</td>
                        <td className="text-right p-2">${entry.provincial_tax?.toLocaleString('en-CA')}</td>
                        <td className="text-right p-2 font-semibold">${entry.net_pay?.toLocaleString('en-CA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Deductions Report */}
        <TabsContent value="deductions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Deductions Report</CardTitle>
                <Button variant="outline" onClick={() => window.print()}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Federal Tax</p>
                    <p className="text-xl font-bold">${totals.federalTax.toLocaleString('en-CA')}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Provincial Tax</p>
                    <p className="text-xl font-bold">${totals.provincialTax.toLocaleString('en-CA')}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">CPP Employee</p>
                    <p className="text-xl font-bold">${totals.employeeCPP.toLocaleString('en-CA')}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">EI Employee</p>
                    <p className="text-xl font-bold">${totals.employeeEI.toLocaleString('en-CA')}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Custom Deductions</h3>
                  <div className="space-y-2">
                    {deductions.filter(d => d.status === 'active').map(ded => (
                      <div key={ded.id} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{ded.employee_name}</p>
                          <p className="text-sm text-gray-600">{ded.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${ded.amount_deducted_to_date?.toLocaleString('en-CA')}</p>
                          <Badge>{ded.deduction_type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Employer Contributions Report */}
        <TabsContent value="contributions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Employer Contributions Report</CardTitle>
                <Button variant="outline" onClick={() => window.print()}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">CPP Employer</p>
                    <p className="text-2xl font-bold">${totals.employerCPP.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">EI Employer</p>
                    <p className="text-2xl font-bold">${totals.employerEI.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Contributions</p>
                    <p className="text-2xl font-bold">${(totals.employerCPP + totals.employerEI).toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Employee-by-Employee Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Employee</th>
                          <th className="text-right p-2">Employer CPP</th>
                          <th className="text-right p-2">Employer EI</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map(entry => (
                          <tr key={entry.id} className="border-b">
                            <td className="p-2">{entry.employee_name}</td>
                            <td className="text-right p-2">${entry.cpp_employer?.toLocaleString('en-CA')}</td>
                            <td className="text-right p-2">${entry.ei_employer?.toLocaleString('en-CA')}</td>
                            <td className="text-right p-2 font-semibold">
                              ${((entry.cpp_employer || 0) + (entry.ei_employer || 0)).toLocaleString('en-CA')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Earnings Report */}
        <TabsContent value="earnings" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Employee Earnings Report</CardTitle>
                <Button variant="outline" onClick={() => window.print()}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employees.map(emp => {
                  const empEntries = filteredEntries.filter(e => e.employee_id === emp.id);
                  if (empEntries.length === 0) return null;
                  
                  const earnings = {
                    regularHours: empEntries.reduce((sum, e) => sum + (e.regular_hours || 0), 0),
                    overtimeHours: empEntries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0),
                    regularPay: empEntries.reduce((sum, e) => sum + (e.regular_pay || 0), 0),
                    overtimePay: empEntries.reduce((sum, e) => sum + (e.overtime_pay || 0), 0),
                    vacationPay: empEntries.reduce((sum, e) => sum + (e.vacation_pay || 0), 0),
                    commission: empEntries.reduce((sum, e) => sum + (e.commission || 0), 0),
                    bonus: empEntries.reduce((sum, e) => sum + (e.bonus || 0), 0),
                    grossPay: empEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0),
                    netPay: empEntries.reduce((sum, e) => sum + (e.net_pay || 0), 0)
                  };

                  return (
                    <Card key={emp.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{emp.first_name} {emp.last_name}</h3>
                            <p className="text-sm text-gray-600">{emp.position} • {emp.employee_number}</p>
                          </div>
                          <Badge>{emp.pay_type}</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600">Regular Hours</p>
                            <p className="text-lg font-bold">{earnings.regularHours.toFixed(2)}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              ${earnings.regularPay.toLocaleString('en-CA')}
                            </p>
                          </div>

                          <div className="bg-orange-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600">Overtime Hours</p>
                            <p className="text-lg font-bold">{earnings.overtimeHours.toFixed(2)}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              ${earnings.overtimePay.toLocaleString('en-CA')}
                            </p>
                          </div>

                          <div className="bg-purple-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600">Bonuses/Commission</p>
                            <p className="text-lg font-bold">
                              ${(earnings.bonus + earnings.commission).toLocaleString('en-CA')}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {earnings.bonus > 0 && `Bonus: $${earnings.bonus.toLocaleString('en-CA')}`}
                              {earnings.commission > 0 && ` Comm: $${earnings.commission.toLocaleString('en-CA')}`}
                            </p>
                          </div>

                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600">Vacation Pay</p>
                            <p className="text-lg font-bold">
                              ${earnings.vacationPay.toLocaleString('en-CA')}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <p className="text-sm text-gray-600">Total Gross Pay</p>
                            <p className="text-2xl font-bold">
                              ${earnings.grossPay.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="bg-green-100 rounded-lg p-3">
                            <p className="text-sm text-gray-600">Total Net Pay</p>
                            <p className="text-2xl font-bold text-green-700">
                              ${earnings.netPay.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Timesheet Report */}
        <TabsContent value="timesheet" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Timesheet & Attendance Report</CardTitle>
                <Button variant="outline" onClick={() => {
                  const csv = [
                    ['Employee', 'Date', 'Clock In', 'Clock Out', 'Regular Hrs', 'OT Hrs', 'Break Hrs', 'Type', 'Status'],
                    ...timeEntries.filter(te => te.date >= dateRange.start && te.date <= dateRange.end).map(entry => [
                      entry.employee_name,
                      new Date(entry.date).toLocaleDateString(),
                      entry.clock_in || '-',
                      entry.clock_out || '-',
                      entry.regular_hours,
                      entry.overtime_hours,
                      entry.break_hours,
                      entry.entry_type,
                      entry.approved ? 'Approved' : 'Pending'
                    ])
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `timesheet_report_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Employee</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-center p-2">Clock In</th>
                      <th className="text-center p-2">Clock Out</th>
                      <th className="text-right p-2">Regular Hrs</th>
                      <th className="text-right p-2">OT Hrs</th>
                      <th className="text-right p-2">Break Hrs</th>
                      <th className="text-center p-2">Type</th>
                      <th className="text-center p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeEntries
                      .filter(te => te.date >= dateRange.start && te.date <= dateRange.end)
                      .map(entry => (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{entry.employee_name}</td>
                          <td className="p-2">{new Date(entry.date).toLocaleDateString()}</td>
                          <td className="text-center p-2">{entry.clock_in || '-'}</td>
                          <td className="text-center p-2">{entry.clock_out || '-'}</td>
                          <td className="text-right p-2">{entry.regular_hours}</td>
                          <td className="text-right p-2">{entry.overtime_hours}</td>
                          <td className="text-right p-2">{entry.break_hours}</td>
                          <td className="text-center p-2">
                            <Badge variant="outline">{entry.entry_type}</Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge className={entry.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {entry.approved ? 'Approved' : 'Pending'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. Vacation & Leave Accrual Report */}
        <TabsContent value="vacation" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Vacation & Leave Accrual Report</CardTitle>
                <Button variant="outline" onClick={() => window.print()}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Employee</th>
                      <th className="text-right p-2">Accrual Rate</th>
                      <th className="text-right p-2">Earned (Period)</th>
                      <th className="text-right p-2">Used (Period)</th>
                      <th className="text-right p-2">Current Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const empTransactions = vacationTransactions.filter(
                        vt => vt.employee_id === emp.id && 
                        vt.transaction_date >= dateRange.start && 
                        vt.transaction_date <= dateRange.end
                      );
                      const earned = empTransactions
                        .filter(vt => vt.transaction_type === 'accrual')
                        .reduce((sum, vt) => sum + vt.hours, 0);
                      const used = Math.abs(empTransactions
                        .filter(vt => vt.transaction_type === 'usage')
                        .reduce((sum, vt) => sum + vt.hours, 0));
                      
                      return (
                        <tr key={emp.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{emp.first_name} {emp.last_name}</td>
                          <td className="text-right p-2">{emp.vacation_accrual_rate || 4}%</td>
                          <td className="text-right p-2 text-green-600">+{earned.toFixed(1)} hrs</td>
                          <td className="text-right p-2 text-red-600">-{used.toFixed(1)} hrs</td>
                          <td className="text-right p-2 font-semibold">{emp.vacation_balance || 0} hrs</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 11. Year-to-Date Report */}
        <TabsContent value="ytd" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Year-to-Date Payroll Report</CardTitle>
                <Button variant="outline" onClick={() => {
                  const csv = [
                    ['Employee', 'YTD Gross', 'YTD CPP', 'YTD EI', 'YTD Fed Tax', 'YTD Prov Tax', 'YTD Net'],
                    ...employees.map(emp => {
                      const empEntries = filteredEntries.filter(e => e.employee_id === emp.id);
                      const ytd = {
                        gross: empEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0),
                        cpp: empEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0),
                        ei: empEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0),
                        fedTax: empEntries.reduce((sum, e) => sum + (e.federal_tax || 0), 0),
                        provTax: empEntries.reduce((sum, e) => sum + (e.provincial_tax || 0), 0),
                        net: empEntries.reduce((sum, e) => sum + (e.net_pay || 0), 0)
                      };
                      return [
                        `${emp.first_name} ${emp.last_name}`,
                        ytd.gross,
                        ytd.cpp,
                        ytd.ei,
                        ytd.fedTax,
                        ytd.provTax,
                        ytd.net
                      ];
                    })
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ytd_payroll_report_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Employee</th>
                      <th className="text-right p-2">YTD Gross</th>
                      <th className="text-right p-2">YTD CPP</th>
                      <th className="text-right p-2">YTD EI</th>
                      <th className="text-right p-2">YTD Fed Tax</th>
                      <th className="text-right p-2">YTD Prov Tax</th>
                      <th className="text-right p-2">YTD Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const empEntries = filteredEntries.filter(e => e.employee_id === emp.id);
                      const ytd = {
                        gross: empEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0),
                        cpp: empEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0),
                        ei: empEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0),
                        fedTax: empEntries.reduce((sum, e) => sum + (e.federal_tax || 0), 0),
                        provTax: empEntries.reduce((sum, e) => sum + (e.provincial_tax || 0), 0),
                        net: empEntries.reduce((sum, e) => sum + (e.net_pay || 0), 0)
                      };
                      
                      return (
                        <tr key={emp.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{emp.first_name} {emp.last_name}</td>
                          <td className="text-right p-2">${ytd.gross.toLocaleString('en-CA')}</td>
                          <td className="text-right p-2">${ytd.cpp.toLocaleString('en-CA')}</td>
                          <td className="text-right p-2">${ytd.ei.toLocaleString('en-CA')}</td>
                          <td className="text-right p-2">${ytd.fedTax.toLocaleString('en-CA')}</td>
                          <td className="text-right p-2">${ytd.provTax.toLocaleString('en-CA')}</td>
                          <td className="text-right p-2 font-semibold">${ytd.net.toLocaleString('en-CA')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}