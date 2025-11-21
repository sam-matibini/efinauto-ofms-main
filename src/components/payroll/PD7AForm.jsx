import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function PD7AForm({ company, payrollRuns, payrollEntries }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [pd7aData, setPd7aData] = useState(null);

  const months = [
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" }
  ];

  const calculatePD7A = () => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);

    // Filter payroll runs for selected month
    const monthRuns = payrollRuns.filter(r => {
      const date = new Date(r.pay_date);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    if (monthRuns.length === 0) {
      toast.error("No payroll runs found for the selected period");
      return;
    }

    // Get payroll entries for these runs
    const entries = payrollEntries.filter(e => 
      monthRuns.some(r => r.id === e.payroll_run_id)
    );

    // Calculate totals
    const totalCPPEmployee = entries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0);
    const totalCPPEmployer = entries.reduce((sum, e) => sum + (e.cpp_employer || 0), 0);
    const totalEIEmployee = entries.reduce((sum, e) => sum + (e.ei_employee || 0), 0);
    const totalEIEmployer = entries.reduce((sum, e) => sum + (e.ei_employer || 0), 0);
    const totalFederalTax = entries.reduce((sum, e) => sum + (e.federal_tax || 0), 0);
    const totalProvincialTax = entries.reduce((sum, e) => sum + (e.provincial_tax || 0), 0);

    const totalCPP = totalCPPEmployee + totalCPPEmployer;
    const totalEI = totalEIEmployee + totalEIEmployer;
    const totalTax = totalFederalTax + totalProvincialTax;
    const totalRemittance = totalCPP + totalEI + totalTax;

    setPd7aData({
      month: months[month].label,
      year,
      employeeCount: entries.length,
      cppEmployee: totalCPPEmployee,
      cppEmployer: totalCPPEmployer,
      cppTotal: totalCPP,
      eiEmployee: totalEIEmployee,
      eiEmployer: totalEIEmployer,
      eiTotal: totalEI,
      federalTax: totalFederalTax,
      provincialTax: totalProvincialTax,
      totalTax,
      totalRemittance,
      payrollRuns: monthRuns.length
    });

    setDialogOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!pd7aData) return;

    const content = `
PD7A - Statement of Account for Current Source Deductions
Canada Revenue Agency

Employer Information:
Business Name: ${company?.name || 'N/A'}
Business Number: ${company?.gst_number || 'N/A'}
Remittance Period: ${pd7aData.month} ${pd7aData.year}

Source Deductions:

1. Canada Pension Plan (CPP)
   Employee CPP: $${pd7aData.cppEmployee.toFixed(2)}
   Employer CPP: $${pd7aData.cppEmployer.toFixed(2)}
   Total CPP: $${pd7aData.cppTotal.toFixed(2)}

2. Employment Insurance (EI)
   Employee EI: $${pd7aData.eiEmployee.toFixed(2)}
   Employer EI: $${pd7aData.eiEmployer.toFixed(2)}
   Total EI: $${pd7aData.eiTotal.toFixed(2)}

3. Income Tax
   Federal Tax: $${pd7aData.federalTax.toFixed(2)}
   Provincial Tax: $${pd7aData.provincialTax.toFixed(2)}
   Total Tax: $${pd7aData.totalTax.toFixed(2)}

TOTAL REMITTANCE DUE: $${pd7aData.totalRemittance.toFixed(2)}

Number of Employees: ${pd7aData.employeeCount}
Number of Payroll Runs: ${pd7aData.payrollRuns}

Payment Due Date: 15th of the following month
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PD7A_${pd7aData.month}_${pd7aData.year}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("PD7A form exported successfully");
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .pd7a-print-container,
          .pd7a-print-container * {
            visibility: visible !important;
          }
          .pd7a-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PD7A - Statement of Account for Current Source Deductions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-semibold">What is PD7A?</p>
              <p className="text-xs text-blue-700 mt-1">
                The PD7A form is used to report and remit payroll source deductions (CPP, EI, and income tax) to the Canada Revenue Agency. 
                Remittances are typically due by the 15th of the month following the pay period.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Remittance Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={calculatePD7A} className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Generate PD7A for {months[parseInt(selectedMonth)].label} {selectedYear}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PD7A Display Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>PD7A - Statement of Account</DialogTitle>
          </DialogHeader>
          
          {pd7aData && (
            <div className="pd7a-print-container space-y-6">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">Statement of Account for Current Source Deductions</h2>
                <p className="text-lg font-semibold mt-2">Form PD7A</p>
                <p className="text-sm text-gray-600 mt-1">Canada Revenue Agency</p>
              </div>

              {/* Employer Information */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg border-b pb-2">Employer Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Business Name:</p>
                    <p className="font-semibold">{company?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Business Number:</p>
                    <p className="font-semibold">{company?.gst_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Remittance Period:</p>
                    <p className="font-semibold">{pd7aData.month} {pd7aData.year}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Number of Employees:</p>
                    <p className="font-semibold">{pd7aData.employeeCount}</p>
                  </div>
                </div>
              </div>

              {/* Source Deductions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Source Deductions</h3>

                {/* CPP */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">1. Canada Pension Plan (CPP)</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Employee Contributions:</span>
                      <span className="font-semibold">${pd7aData.cppEmployee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Employer Contributions:</span>
                      <span className="font-semibold">${pd7aData.cppEmployer.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-blue-200">
                      <span>Total CPP:</span>
                      <span>${pd7aData.cppTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* EI */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">2. Employment Insurance (EI)</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Employee Premiums:</span>
                      <span className="font-semibold">${pd7aData.eiEmployee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Employer Premiums:</span>
                      <span className="font-semibold">${pd7aData.eiEmployer.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-green-200">
                      <span>Total EI:</span>
                      <span>${pd7aData.eiTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Income Tax */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">3. Income Tax Deducted</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Federal Tax:</span>
                      <span className="font-semibold">${pd7aData.federalTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Provincial Tax:</span>
                      <span className="font-semibold">${pd7aData.provincialTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-purple-200">
                      <span>Total Income Tax:</span>
                      <span>${pd7aData.totalTax.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Remittance */}
              <div className="bg-gray-900 text-white rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold">TOTAL REMITTANCE DUE:</span>
                  <span className="text-3xl font-bold">${pd7aData.totalRemittance.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2">Payment Information</h4>
                <div className="text-sm text-amber-800 space-y-1">
                  <p><strong>Payment Due Date:</strong> 15th of the following month</p>
                  <p><strong>Payroll Runs Included:</strong> {pd7aData.payrollRuns}</p>
                  <p className="mt-2">
                    <strong>Payment Options:</strong> Online banking, CRA My Business Account, or at your financial institution
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 no-print">
                <Button onClick={handlePrint} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Print PD7A
                </Button>
                <Button onClick={handleExport} variant="outline" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  Export as Text
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}