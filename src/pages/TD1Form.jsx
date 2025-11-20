import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function TD1Form() {
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('employee_id');
  const [submitted, setSubmitted] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("ON");
  const [aiLoading, setAiLoading] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => base44.entities.Employee.filter({ id: employeeId }).then(emps => emps[0]),
    enabled: !!employeeId,
  });

  const { data: company } = useQuery({
    queryKey: ['company', employee?.company_id],
    queryFn: () => base44.entities.Company.filter({ id: employee.company_id }).then(companies => companies[0]),
    enabled: !!employee?.company_id,
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
    if (company?.province) {
      setSelectedProvince(company.province);
    }
  }, [company]);

  useEffect(() => {
    const total = (parseFloat(federalData.basic_personal_amount) || 0) + (parseFloat(federalData.additional_amount) || 0);
    if (federalData.total_claim_amount !== total) {
      setFederalData(prev => ({
        ...prev,
        total_claim_amount: total
      }));
    }
  }, [federalData.basic_personal_amount, federalData.additional_amount]);

  useEffect(() => {
    const total = (parseFloat(provincialData.basic_personal_amount) || 0) + (parseFloat(provincialData.additional_amount) || 0);
    if (provincialData.total_claim_amount !== total) {
      setProvincialData(prev => ({
        ...prev,
        total_claim_amount: total
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

  const fetchTaxCreditsWithAI = async () => {
    setAiLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on current 2024-2025 Canada Revenue Agency (CRA) guidelines, provide the exact tax credit amounts for:
        
Province: ${selectedProvince}
Employee Province: ${employee?.province || selectedProvince}
Company Province: ${company?.province || selectedProvince}

Please provide:
1. Federal basic personal amount (standard 2024 amount)
2. Provincial basic personal amount for ${selectedProvince}
3. Brief explanation of any recent changes

Respond with accurate, up-to-date CRA figures.`,
        response_json_schema: {
          type: "object",
          properties: {
            federal_basic_amount: { type: "number" },
            provincial_basic_amount: { type: "number" },
            federal_explanation: { type: "string" },
            provincial_explanation: { type: "string" }
          }
        }
      });

      setFederalData(prev => ({
        ...prev,
        basic_personal_amount: response.federal_basic_amount
      }));

      setProvincialData(prev => ({
        ...prev,
        basic_personal_amount: response.provincial_basic_amount
      }));

      toast.success("Tax credits updated with current CRA guidelines");
    } catch (error) {
      toast.error("Failed to fetch tax credits");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = () => {
    updateEmployeeMutation.mutate({
      td1_federal: {
        ...federalData,
        filing_date: new Date().toISOString()
      },
      td1_provincial: {
        ...provincialData,
        filing_date: new Date().toISOString()
      },
      province: selectedProvince
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

        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label>Select Province/Territory</Label>
                <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AB">Alberta</SelectItem>
                    <SelectItem value="BC">British Columbia</SelectItem>
                    <SelectItem value="MB">Manitoba</SelectItem>
                    <SelectItem value="NB">New Brunswick</SelectItem>
                    <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                    <SelectItem value="NT">Northwest Territories</SelectItem>
                    <SelectItem value="NS">Nova Scotia</SelectItem>
                    <SelectItem value="NU">Nunavut</SelectItem>
                    <SelectItem value="ON">Ontario</SelectItem>
                    <SelectItem value="PE">Prince Edward Island</SelectItem>
                    <SelectItem value="QC">Quebec</SelectItem>
                    <SelectItem value="SK">Saskatchewan</SelectItem>
                    <SelectItem value="YT">Yukon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button 
                  onClick={fetchTaxCreditsWithAI} 
                  disabled={aiLoading}
                  variant="outline"
                  className="w-full border-blue-400 hover:bg-blue-50"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fetching CRA Guidelines...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI: Get Current CRA Tax Credits
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              💡 Use AI to automatically fetch the latest CRA tax credit amounts for your province
            </p>
          </CardContent>
        </Card>

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
                  <h3 className="font-semibold text-purple-900 mb-2">Provincial Personal Tax Credits - {selectedProvince}</h3>
                  <p className="text-sm text-purple-800">
                    Provincial amounts vary by province. Currently showing for {selectedProvince}.
                  </p>
                </div>

                <div>
                  <Label>Basic Personal Amount *</Label>
                  <Input
                    type="number"
                    value={provincialData.basic_personal_amount}
                    onChange={(e) => setProvincialData({...provincialData, basic_personal_amount: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-gray-500 mt-1">{selectedProvince} basic personal amount (varies by province)</p>
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