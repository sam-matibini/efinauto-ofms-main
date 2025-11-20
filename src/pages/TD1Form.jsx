import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TD1Form() {
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('employee_id');
  const [submitted, setSubmitted] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => base44.entities.Employee.filter({ id: employeeId }).then(emps => emps[0]),
    enabled: !!employeeId,
  });

  const [federalData, setFederalData] = useState({
    basic_personal_amount: 15000,
    additional_amount: 0,
    total_claim_amount: 15000
  });

  const [provincialData, setProvincialData] = useState({
    basic_personal_amount: 11809,
    additional_amount: 0,
    total_claim_amount: 11809
  });

  useEffect(() => {
    if (federalData.basic_personal_amount || federalData.additional_amount) {
      setFederalData(prev => ({
        ...prev,
        total_claim_amount: (parseFloat(prev.basic_personal_amount) || 0) + (parseFloat(prev.additional_amount) || 0)
      }));
    }
  }, [federalData.basic_personal_amount, federalData.additional_amount]);

  useEffect(() => {
    if (provincialData.basic_personal_amount || provincialData.additional_amount) {
      setProvincialData(prev => ({
        ...prev,
        total_claim_amount: (parseFloat(prev.basic_personal_amount) || 0) + (parseFloat(prev.additional_amount) || 0)
      }));
    }
  }, [provincialData.basic_personal_amount, provincialData.additional_amount]);

  const updateEmployeeMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.update(employeeId, data),
    onSuccess: () => {
      setSubmitted(true);
      toast.success("TD1 forms submitted successfully!");
    },
    onError: () => toast.error("Failed to submit forms")
  });

  const handleSubmit = () => {
    updateEmployeeMutation.mutate({
      td1_federal: {
        ...federalData,
        filing_date: new Date().toISOString()
      },
      td1_provincial: {
        ...provincialData,
        filing_date: new Date().toISOString()
      }
    });
  };

  if (!employeeId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-red-600">Invalid or missing employee ID</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">TD1 Forms Submitted!</h2>
            <p className="text-gray-600">
              Thank you for completing your TD1 forms. Your tax credit information has been saved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">TD1 Personal Tax Credits Return</h1>
          <p className="text-gray-600 mt-2">Welcome {employee?.first_name} {employee?.last_name}</p>
          <p className="text-sm text-gray-500 mt-1">
            Please complete both federal and provincial TD1 forms to ensure accurate tax deductions
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="federal">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="federal">Federal TD1</TabsTrigger>
                <TabsTrigger value="provincial">Provincial TD1</TabsTrigger>
              </TabsList>

              <TabsContent value="federal" className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Federal Personal Tax Credits (2024)</h3>
                  <p className="text-sm text-blue-800">
                    The basic personal amount for 2024 is $15,000. You may claim additional amounts if applicable.
                  </p>
                </div>

                <div>
                  <Label>Basic Personal Amount *</Label>
                  <Input
                    type="number"
                    value={federalData.basic_personal_amount}
                    onChange={(e) => setFederalData({...federalData, basic_personal_amount: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard federal basic personal amount: $15,000</p>
                </div>

                <div>
                  <Label>Additional Amount (if applicable)</Label>
                  <Input
                    type="number"
                    value={federalData.additional_amount}
                    onChange={(e) => setFederalData({...federalData, additional_amount: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Additional credits (spouse, dependants, disability, etc.)
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Claim Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${federalData.total_claim_amount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="provincial" className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Provincial Personal Tax Credits</h3>
                  <p className="text-sm text-purple-800">
                    Provincial amounts vary by province. The default shown is for Ontario.
                  </p>
                </div>

                <div>
                  <Label>Basic Personal Amount *</Label>
                  <Input
                    type="number"
                    value={provincialData.basic_personal_amount}
                    onChange={(e) => setProvincialData({...provincialData, basic_personal_amount: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Ontario basic personal amount: $11,809</p>
                </div>

                <div>
                  <Label>Additional Amount (if applicable)</Label>
                  <Input
                    type="number"
                    value={provincialData.additional_amount}
                    onChange={(e) => setProvincialData({...provincialData, additional_amount: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Additional provincial credits (spouse, dependants, etc.)
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Claim Amount:</span>
                    <span className="text-2xl font-bold text-purple-600">
                      ${provincialData.total_claim_amount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  📋 By submitting this form, you certify that the information provided is correct and complete.
                </p>
              </div>
              <Button 
                onClick={handleSubmit} 
                disabled={updateEmployeeMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {updateEmployeeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit TD1 Forms
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}