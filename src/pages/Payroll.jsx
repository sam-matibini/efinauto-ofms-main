import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  FileText, 
  Plus, 
  Search,
  TrendingUp,
  Clock,
  Download,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import EmployeeManagement from "@/components/payroll/EmployeeManagement";
import PayrollProcessing from "@/components/payroll/PayrollProcessing";
import TaxReports from "@/components/payroll/TaxReports";
import PayrollAnalytics from "@/components/payroll/PayrollAnalytics";

export default function Payroll() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => base44.entities.Company.filter({ id: selectedCompanyId }).then(companies => companies[0]),
    enabled: !!selectedCompanyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', selectedCompanyId],
    queryFn: () => base44.entities.Employee.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: payrollRuns = [] } = useQuery({
    queryKey: ['payrollRuns', selectedCompanyId],
    queryFn: () => base44.entities.PayrollRun.filter({ company_id: selectedCompanyId }, '-created_date', 50),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: payrollEntries = [] } = useQuery({
    queryKey: ['payrollEntries', selectedCompanyId],
    queryFn: () => base44.entities.PayrollEntry.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries', selectedCompanyId],
    queryFn: () => base44.entities.TimeEntry.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Statistics
  const activeEmployees = employees.filter(e => e.employment_status === 'active').length;
  const totalPayrollYTD = payrollEntries.reduce((sum, entry) => sum + (entry.gross_pay || 0), 0);
  const lastPayrollRun = payrollRuns[0];
  const pendingTimeEntries = timeEntries.filter(e => !e.approved).length;

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-yellow-800">Please select a company to access payroll.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Payroll & Human Capital Management
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              CRA-compliant payroll processing with AI-powered insights
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Employees</p>
                  <p className="text-2xl font-bold">{activeEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Payroll YTD</p>
                  <p className="text-2xl font-bold">
                    ${totalPayrollYTD.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Payroll Run</p>
                  <p className="text-xl font-bold">
                    {lastPayrollRun ? new Date(lastPayrollRun.pay_date).toLocaleDateString('en-CA') : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Time Entries</p>
                  <p className="text-2xl font-bold">{pendingTimeEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="employees">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Payroll Processing
            </TabsTrigger>
            <TabsTrigger value="tax-reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Tax Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-6">
            <EmployeeManagement 
              company={company}
              employees={employees}
              queryClient={queryClient}
            />
          </TabsContent>

          <TabsContent value="payroll" className="mt-6">
            <PayrollProcessing 
              company={company}
              employees={employees}
              payrollRuns={payrollRuns}
              payrollEntries={payrollEntries}
              timeEntries={timeEntries}
              queryClient={queryClient}
            />
          </TabsContent>

          <TabsContent value="tax-reports" className="mt-6">
            <TaxReports 
              company={company}
              employees={employees}
              payrollRuns={payrollRuns}
              payrollEntries={payrollEntries}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <PayrollAnalytics 
              company={company}
              employees={employees}
              payrollRuns={payrollRuns}
              payrollEntries={payrollEntries}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}