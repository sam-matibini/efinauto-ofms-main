import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";

export default function TechnicianLogin({ onLogin }) {
  const { selectedCompanyId } = useCompany();
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', selectedCompanyId],
    queryFn: () => base44.entities.Technician.filter({ 
      company_id: selectedCompanyId,
      status: 'active'
    }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const handleLogin = () => {
    setLoading(true);
    
    const tech = technicians.find(t => 
      t.employee_id?.toLowerCase() === employeeId.toLowerCase()
    );

    setTimeout(() => {
      setLoading(false);
      
      if (tech) {
        localStorage.setItem('technicianSession', JSON.stringify(tech));
        onLogin(tech);
        toast.success(`Welcome back, ${tech.full_name}!`);
      } else {
        toast.error("Invalid employee ID. Please try again.");
      }
    }, 500);
  };

  if (!selectedCompanyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Please select a company first</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Technician Login</CardTitle>
          <p className="text-sm text-gray-500 mt-2">Enter your employee ID to continue</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Employee ID</Label>
            <Input
              type="text"
              placeholder="Enter employee ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="text-lg"
            />
          </div>

          <Button 
            onClick={handleLogin} 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!employeeId || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>

          <div className="text-xs text-gray-500 text-center mt-4">
            Contact your supervisor if you don't have access
          </div>
        </CardContent>
      </Card>
    </div>
  );
}