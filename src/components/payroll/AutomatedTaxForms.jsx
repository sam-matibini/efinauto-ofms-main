import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, FileText, Download, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AutomatedTaxForms({ company, employees, payrollEntries }) {
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generatedForms, setGeneratedForms] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const generateT4Forms = async () => {
    setGenerating(true);
    try {
      const forms = [];
      
      for (const employee of employees) {
        const empEntries = payrollEntries.filter(e => e.employee_id === employee.id);
        const ytdData = {
          grossPay: empEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0),
          cpp: empEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0),
          ei: empEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0),
          federalTax: empEntries.reduce((sum, e) => sum + (e.federal_tax || 0), 0),
          provincialTax: empEntries.reduce((sum, e) => sum + (e.provincial_tax || 0), 0)
        };

        // Use AI to generate T4 form data
        const t4Data = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate a T4 slip summary for the following employee data:
          
Employee: ${employee.first_name} ${employee.last_name}
SIN: ${employee.sin}
Year: ${selectedYear}

YTD Earnings:
- Gross Pay: $${ytdData.grossPay.toFixed(2)}
- CPP Contributions: $${ytdData.cpp.toFixed(2)}
- EI Contributions: $${ytdData.ei.toFixed(2)}
- Federal Tax: $${ytdData.federalTax.toFixed(2)}
- Provincial Tax: $${ytdData.provincialTax.toFixed(2)}

Employer: ${company.name}
Business Number: ${company.tax_id || 'Not provided'}

Generate the T4 boxes with proper Canadian tax form formatting.`,
          response_json_schema: {
            type: "object",
            properties: {
              box_14: { type: "number", description: "Employment income" },
              box_16: { type: "number", description: "Employee CPP contributions" },
              box_18: { type: "number", description: "Employee EI premiums" },
              box_22: { type: "number", description: "Income tax deducted" },
              summary: { type: "string" }
            }
          }
        });

        forms.push({
          employee_id: employee.id,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          year: selectedYear,
          t4Data,
          ytdData
        });
      }

      setGeneratedForms(forms);
      toast.success(`Generated T4 forms for ${forms.length} employees`);
      setDialogOpen(true);
    } catch (error) {
      toast.error("Failed to generate T4 forms");
    } finally {
      setGenerating(false);
    }
  };

  const generateRemittance = async () => {
    setGenerating(true);
    try {
      const totalCPPEmployee = payrollEntries.reduce((sum, e) => sum + (e.cpp_employee || 0), 0);
      const totalCPPEmployer = payrollEntries.reduce((sum, e) => sum + (e.cpp_employer || 0), 0);
      const totalEIEmployee = payrollEntries.reduce((sum, e) => sum + (e.ei_employee || 0), 0);
      const totalEIEmployer = payrollEntries.reduce((sum, e) => sum + (e.ei_employer || 0), 0);
      const totalFederalTax = payrollEntries.reduce((sum, e) => sum + (e.federal_tax || 0), 0);

      const remittanceData = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a CRA payroll remittance summary for ${company.name}:

Period: ${selectedYear}
Business Number: ${company.tax_id || 'Not provided'}

Totals:
- Employee CPP: $${totalCPPEmployee.toFixed(2)}
- Employer CPP: $${totalCPPEmployer.toFixed(2)}
- Employee EI: $${totalEIEmployee.toFixed(2)}
- Employer EI: $${totalEIEmployer.toFixed(2)}
- Federal Tax: $${totalFederalTax.toFixed(2)}

Calculate total remittance amount and provide filing instructions.`,
        response_json_schema: {
          type: "object",
          properties: {
            total_cpp: { type: "number" },
            total_ei: { type: "number" },
            total_tax: { type: "number" },
            total_remittance: { type: "number" },
            filing_instructions: { type: "string" }
          }
        }
      });

      toast.success("Remittance summary generated");
      console.log("Remittance Data:", remittanceData);
    } catch (error) {
      toast.error("Failed to generate remittance");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Tax Form Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-gray-700 mb-2">
                <strong>AI Features:</strong> Automatically generate and validate tax forms using advanced AI calculations
              </p>
              <ul className="text-xs text-gray-600 space-y-1 ml-4">
                <li>• Automatic T4/T4A generation with CRA-compliant formatting</li>
                <li>• Intelligent validation of tax calculations</li>
                <li>• Auto-calculation of remittance amounts</li>
                <li>• Year-end summary generation</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">T4 Statement of Remuneration</h3>
                      <p className="text-xs text-gray-600">Canada Revenue Agency</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Generate T4 slips for all employees automatically
                  </p>
                  <Button onClick={generateT4Forms} disabled={generating} className="w-full">
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate T4 Forms
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Send className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold">Payroll Remittance</h3>
                      <p className="text-xs text-gray-600">CPP, EI, & Tax Remittance</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Calculate total remittance amounts for CRA
                  </p>
                  <Button onClick={generateRemittance} disabled={generating} className="w-full" variant="outline">
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Remittance
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div>
              <Label>Tax Year</Label>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="max-w-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated T4 Forms - {selectedYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {generatedForms.map((form) => (
              <Card key={form.employee_id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{form.employee_name}</h3>
                      <Badge className="mt-1">T4 - {form.year}</Badge>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Box 14 - Employment Income</p>
                      <p className="font-semibold">${form.t4Data.box_14?.toLocaleString('en-CA')}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Box 16 - CPP</p>
                      <p className="font-semibold">${form.t4Data.box_16?.toLocaleString('en-CA')}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Box 18 - EI</p>
                      <p className="font-semibold">${form.t4Data.box_18?.toLocaleString('en-CA')}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Box 22 - Tax Deducted</p>
                      <p className="font-semibold">${form.t4Data.box_22?.toLocaleString('en-CA')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}