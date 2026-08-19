import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PaystubViewer from "@/components/payroll/PaystubViewer";

export default function MyPaystubs({ employee, company }) {
  const [paystubViewerOpen, setPaystubViewerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);

  const { data: payrollEntries = [] } = useQuery({
    queryKey: ['myPayrollEntries', employee?.id],
    queryFn: () => supabase.entities.PayrollEntry.filter({ employee_id: employee.id }, '-created_date'),
    enabled: !!employee,
  });

  const { data: payrollRuns = [] } = useQuery({
    queryKey: ['myPayrollRuns', employee?.company_id],
    queryFn: () => supabase.entities.PayrollRun.filter({ company_id: employee.company_id }),
    enabled: !!employee,
  });

  const getPayrollRun = (entryRunId) => {
    return payrollRuns.find(run => run.id === entryRunId);
  };

  const handleViewPaystub = (entry, run) => {
    setSelectedEntry(entry);
    setSelectedRun(run);
    setPaystubViewerOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Paystubs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payrollEntries.map((entry) => {
              const run = getPayrollRun(entry.payroll_run_id);
              return (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold">
                            Pay Period: {run ? `${new Date(run.pay_period_start).toLocaleDateString()} - ${new Date(run.pay_period_end).toLocaleDateString()}` : 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Pay Date: {run ? new Date(run.pay_date).toLocaleDateString() : 'N/A'}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Gross Pay</p>
                            <p className="font-semibold">${entry.gross_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Deductions</p>
                            <p className="font-semibold text-red-600">-${entry.total_deductions?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Net Pay</p>
                            <p className="font-semibold text-green-600">${entry.net_pay?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewPaystub(entry, run)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewPaystub(entry, run)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Print/Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Forms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">T4 Slip - 2024</p>
                    <p className="text-sm text-gray-600">Statement of Remuneration Paid</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Year-to-Date Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">YTD Gross</p>
              <p className="text-xl font-bold">
                ${payrollEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">YTD CPP</p>
              <p className="text-xl font-bold">
                ${payrollEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">YTD EI</p>
              <p className="text-xl font-bold">
                ${payrollEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">YTD Net</p>
              <p className="text-xl font-bold">
                ${payrollEntries.reduce((sum, e) => sum + (e.net_pay || 0), 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paystub Viewer Dialog */}
      <PaystubViewer
        open={paystubViewerOpen}
        onClose={() => {
          setPaystubViewerOpen(false);
          setSelectedEntry(null);
          setSelectedRun(null);
        }}
        entry={selectedEntry}
        payrollRun={selectedRun}
        company={company}
        employee={employee}
        allPayrollEntries={payrollEntries}
        allPayrollRuns={payrollRuns}
      />
    </div>
  );
}