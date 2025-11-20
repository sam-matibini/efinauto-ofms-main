import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, TrendingDown, DollarSign, Users, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PayrollAnalytics({ company, employees, payrollRuns, payrollEntries }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateAIInsights = async () => {
    setLoading(true);
    try {
      const totalPayroll = payrollEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0);
      const avgPayPerEmployee = totalPayroll / employees.length;
      
      const departmentCosts = {};
      employees.forEach(emp => {
        const empEntries = payrollEntries.filter(e => e.employee_id === emp.id);
        const empTotal = empEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0);
        departmentCosts[emp.department] = (departmentCosts[emp.department] || 0) + empTotal;
      });

      const prompt = `Analyze this payroll data for ${company.name} and provide strategic HR insights:

Total Payroll: $${totalPayroll.toLocaleString()}
Employees: ${employees.length}
Average Pay: $${avgPayPerEmployee.toLocaleString()}

Department Costs: ${JSON.stringify(departmentCosts)}

Provide:
1. Cost analysis and trends
2. Competitive compensation insights
3. Labor cost optimization suggestions
4. Workforce planning recommendations
5. Risk factors and compliance reminders`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            cost_analysis: { type: "string" },
            market_competitiveness: { type: "string" },
            optimization_tips: { type: "array", items: { type: "string" } },
            workforce_recommendations: { type: "array", items: { type: "string" } },
            compliance_reminders: { type: "array", items: { type: "string" } }
          }
        }
      });

      setInsights(response);
      toast.success("AI insights generated");
    } catch (error) {
      toast.error("Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalPayroll = payrollEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0);
  const totalTaxes = payrollEntries.reduce((sum, e) => 
    sum + (e.cpp_employee || 0) + (e.ei_employee || 0) + (e.federal_tax || 0) + (e.provincial_tax || 0), 0
  );
  const totalEmployerCosts = payrollEntries.reduce((sum, e) => 
    sum + (e.cpp_employer || 0) + (e.ei_employer || 0), 0
  );

  const departmentBreakdown = {};
  employees.forEach(emp => {
    const empEntries = payrollEntries.filter(e => e.employee_id === emp.id);
    const empTotal = empEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0);
    departmentBreakdown[emp.department] = (departmentBreakdown[emp.department] || 0) + empTotal;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>AI-Powered Payroll Analytics</CardTitle>
            <Button onClick={generateAIInsights} disabled={loading} className="bg-gradient-to-r from-purple-600 to-blue-600">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Insights
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Payroll</p>
                    <p className="text-2xl font-bold">${totalPayroll.toLocaleString('en-CA')}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Employee Deductions</p>
                    <p className="text-2xl font-bold">${totalTaxes.toLocaleString('en-CA')}</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Employer Costs</p>
                    <p className="text-2xl font-bold">${totalEmployerCosts.toLocaleString('en-CA')}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {insights && (
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Cost Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{insights.cost_analysis}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Market Competitiveness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{insights.market_competitiveness}</p>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Optimization Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.optimization_tips?.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span className="text-sm text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Workforce Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.workforce_recommendations?.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          <span className="text-sm text-gray-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-base text-amber-800">Compliance Reminders</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.compliance_reminders?.map((reminder, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600">⚠️</span>
                        <span className="text-sm text-amber-800">{reminder}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Department Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(departmentBreakdown).map(([dept, cost]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="capitalize">{dept}</span>
                    </div>
                    <span className="font-semibold">${cost.toLocaleString('en-CA')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}