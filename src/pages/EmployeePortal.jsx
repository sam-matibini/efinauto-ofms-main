import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Calendar, DollarSign } from "lucide-react";
import MetricCard from "@/components/cards/MetricCard";
import MyProfile from "@/components/employee-portal/MyProfile";
import MyPaystubs from "@/components/employee-portal/MyPaystubs";
import MyTimeOff from "@/components/employee-portal/MyTimeOff";

export default function EmployeePortal() {
  const { selectedCompanyId } = useCompany();
  
  const { user: currentUser } = useAuth();

  const employeeEntityId = currentUser?.employee_entity_id;

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => supabase.entities.Company.filter({ id: selectedCompanyId }).then(c => c[0]),
    enabled: !!selectedCompanyId,
  });

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['myEmployee', employeeEntityId, currentUser?.email, selectedCompanyId],
    queryFn: async () => {
      // First try by employee_entity_id in the selected company
      if (employeeEntityId && selectedCompanyId) {
        const emps = await supabase.entities.Employee.filter({ 
          id: employeeEntityId,
          company_id: selectedCompanyId 
        });
        if (emps[0]) return emps[0];
      }
      
      // Then try by email in the selected company
      if (currentUser?.email && selectedCompanyId) {
        const emps = await supabase.entities.Employee.filter({ 
          email: currentUser.email,
          company_id: selectedCompanyId
        });
        if (emps[0]) return emps[0];
      }
      
      // Try to find any employee in the selected company
      if (selectedCompanyId) {
        const emps = await supabase.entities.Employee.filter({ 
          company_id: selectedCompanyId
        });
        if (emps[0]) return emps[0];
      }
      
      return null;
    },
    enabled: !!currentUser && !!selectedCompanyId,
  });

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-yellow-800">Please select a company to access the employee portal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employee && !employeeLoading) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-yellow-800">Your account is not linked to an employee record in this company. Please contact HR.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const payPeriod = employee?.pay_type === "hourly" ? "hr" : "yr";

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="px-6 py-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#0A1F44]">
          <User className="h-6 w-6" strokeWidth={1.75} />
          Employee Self-Service Portal
        </h1>
        <p className="mt-1 text-sm text-[#0A1F44]/70">
          Welcome, {employee?.first_name} {employee?.last_name}
        </p>
      </div>

      <div className="space-y-6 p-6 pt-0">
        <div className="grid grid-cols-1 gap-4 rounded-3xl bg-gradient-to-br from-[#0A1F44]/10 via-white to-[#A8FF60]/40 p-4 md:grid-cols-3">
          <MetricCard icon={Calendar} label="Vacation Balance" value={`${employee?.vacation_balance || 0} hrs`} />
          <MetricCard icon={DollarSign} label="Pay Rate" value={`$${employee?.pay_rate}/${payPeriod}`} />
          <MetricCard icon={FileText} label="Position" value={employee?.position || "—"} />
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="profile" className="gap-2 rounded-full bg-white px-4 py-2 text-[#0A1F44] data-[state=active]:bg-[#0A1F44] data-[state=active]:text-white data-[state=active]:shadow-none">
              <User className="h-4 w-4" strokeWidth={1.75} />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="paystubs" className="gap-2 rounded-full bg-white px-4 py-2 text-[#0A1F44] data-[state=active]:bg-[#0A1F44] data-[state=active]:text-white data-[state=active]:shadow-none">
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              Paystubs & Tax Forms
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="gap-2 rounded-full bg-white px-4 py-2 text-[#0A1F44] data-[state=active]:bg-[#0A1F44] data-[state=active]:text-white data-[state=active]:shadow-none">
              <Calendar className="h-4 w-4" strokeWidth={1.75} />
              Time Off
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <MyProfile employee={employee} />
          </TabsContent>

          <TabsContent value="paystubs" className="mt-6">
            <MyPaystubs employee={employee} company={company} />
          </TabsContent>

          <TabsContent value="timeoff" className="mt-6">
            <MyTimeOff employee={employee} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}