import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import PD7AForm from "./PD7AForm";

export default function TaxReports({ company, employees, payrollRuns, payrollEntries }) {
  const [reportType, setReportType] = useState("t4");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const generateT4 = async () => {
    toast.info("Generating T4 slips...");
    // Generate T4 for each employee
    const t4Data = employees.map(emp => {
      const empEntries = payrollEntries.filter(e => e.employee_id === emp.id);
      const totalGross = empEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0);
      const totalCPP = empEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0);
      const totalEI = empEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0);
      const totalFederalTax = empEntries.reduce((sum, e) => sum + (e.federal_tax || 0), 0);
      
      return {
        employee: `${emp.first_name} ${emp.last_name}`,
        sin: emp.sin,
        box14: totalGross,
        box16: totalCPP,
        box18: totalEI,
        box22: totalFederalTax
      };
    });

    console.log("T4 Data:", t4Data);
    toast.success("T4 slips generated");
  };

  const generateT4Summary = () => {
    toast.info("Generating T4 Summary...");
    const totalGross = payrollEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0);
    const totalCPP = payrollEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0);
    const totalEI = payrollEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0);
    
    console.log("T4 Summary:", {
      totalEmployees: employees.length,
      totalGross,
      totalCPP,
      totalEI
    });
    toast.success("T4 Summary generated");
  };

  const generatePD7A = () => {
    toast.info("Generating PD7A remittance...");
    // Calculate monthly remittance
    const lastMonth = payrollRuns.filter(r => {
      const date = new Date(r.pay_date);
      return date.getMonth() === new Date().getMonth() - 1;
    });
    
    const entries = payrollEntries.filter(e => 
      lastMonth.some(r => r.id === e.payroll_run_id)
    );
    
    const totalCPPEmployee = entries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0);
    const totalCPPEmployer = entries.reduce((sum, e) => sum + (e.cpp_employer || 0), 0);
    const totalEIEmployee = entries.reduce((sum, e) => sum + (e.ei_employee || 0), 0);
    const totalEIEmployer = entries.reduce((sum, e) => sum + (e.ei_employer || 0), 0);
    const totalTax = entries.reduce((sum, e) => sum + (e.federal_tax || 0) + (e.provincial_tax || 0), 0);
    
    const totalRemittance = totalCPPEmployee + totalCPPEmployer + totalEIEmployee + totalEIEmployer + totalTax;
    
    console.log("PD7A Data:", {
      cpp: totalCPPEmployee + totalCPPEmployer,
      ei: totalEIEmployee + totalEIEmployer,
      tax: totalTax,
      total: totalRemittance
    });
    toast.success("PD7A generated");
  };

  return (
    <div className="space-y-6">
      <PD7AForm 
        company={company}
        payrollRuns={payrollRuns}
        payrollEntries={payrollEntries}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={generateT4}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">T4 Slips</h3>
                <p className="text-sm text-gray-600">Statement of Remuneration Paid</p>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Generate T4s
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={generateT4Summary}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">T4 Summary</h3>
                <p className="text-sm text-gray-600">Summary of Remuneration Paid</p>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Generate Summary
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={generatePD7A}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">PD7A</h3>
                <p className="text-sm text-gray-600">Monthly Remittance</p>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Generate PD7A
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paystub History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {payrollRuns.slice(0, 5).map((run) => {
              const runEntries = payrollEntries.filter(e => e.payroll_run_id === run.id);
              return (
                <div key={run.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{run.payroll_number}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(run.pay_date).toLocaleDateString()} • {runEntries.length} paystubs
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Download All
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Year-End Tax Forms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Tax Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                📅 CRA Deadline: February 28, {parseInt(year) + 1}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                T4 slips must be distributed to employees and filed with CRA by this date.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}