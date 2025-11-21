import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, Calendar, DollarSign } from "lucide-react";
import MyProfile from "@/components/employee-portal/MyProfile";
import MyPaystubs from "@/components/employee-portal/MyPaystubs";
import MyTimeOff from "@/components/employee-portal/MyTimeOff";

export default function EmployeePortal() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const employeeEntityId = currentUser?.employee_entity_id || currentUser?.data?.employee_entity_id;

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['myEmployee', employeeEntityId, currentUser?.email, currentUser?.data?.company_id],
    queryFn: async () => {
      // First try by employee_entity_id
      if (employeeEntityId) {
        const emps = await base44.entities.Employee.filter({ id: employeeEntityId });
        if (emps[0]) return emps[0];
      }
      
      // Then try by email
      if (currentUser?.email) {
        const emps = await base44.entities.Employee.filter({ email: currentUser.email });
        if (emps[0]) return emps[0];
      }
      
      // Finally, try to find any employee in the user's company (not just active)
      if (currentUser?.data?.company_id) {
        const emps = await base44.entities.Employee.filter({ 
          company_id: currentUser.data.company_id
        });
        // Return the first employee
        if (emps[0]) return emps[0];
      }
      
      // If no company_id set, try to get any employee
      const allEmps = await base44.entities.Employee.list();
      if (allEmps[0]) return allEmps[0];
      
      return null;
    },
    enabled: !!currentUser,
  });

  if (!employee && !employeeLoading) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-yellow-800">Your account is not linked to an employee record. Please contact HR.</p>
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
            <MyPaystubs employee={employee} />
          </TabsContent>

          <TabsContent value="timeoff" className="mt-6">
            <MyTimeOff employee={employee} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}