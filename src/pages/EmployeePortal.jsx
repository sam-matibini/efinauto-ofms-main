import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Calendar, DollarSign } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="w-6 h-6" />
              Employee Self-Service Portal
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              Welcome, {employee?.first_name} {employee?.last_name}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vacation Balance</p>
                  <p className="text-2xl font-bold">{employee?.vacation_balance || 0} hrs</p>
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
                  <p className="text-sm text-gray-600">Pay Rate</p>
                  <p className="text-2xl font-bold">
                    ${employee?.pay_rate}/{employee?.pay_type === 'hourly' ? 'hr' : 'yr'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Position</p>
                  <p className="text-lg font-bold">{employee?.position}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="paystubs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Paystubs & Tax Forms
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
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