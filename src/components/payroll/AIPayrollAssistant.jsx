import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, AlertTriangle, CheckCircle, TrendingDown, Shield, Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIPayrollAssistant({ company, employees, payrollRuns, payrollEntries, payGroups, adjustments }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const analyzePayroll = async () => {
    setAnalyzing(true);
    try {
      // Prepare payroll data summary
      const totalPayroll = payrollEntries.reduce((sum, e) => sum + (e.gross_pay || 0), 0);
      const avgPay = totalPayroll / (employees.length || 1);
      const activeEmployees = employees.filter(e => e.employment_status === 'active');
      const pendingAdjustments = adjustments?.filter(a => !a.applied).length || 0;
      
      // Calculate vacation liability
      const totalVacationLiability = employees.reduce((sum, e) => sum + ((e.vacation_balance || 0) * (e.pay_rate || 0)), 0);
      
      // Group employees by pay frequency
      const frequencyDistribution = employees.reduce((acc, emp) => {
        const freq = emp.pay_frequency || 'bi_weekly';
        acc[freq] = (acc[freq] || 0) + 1;
        return acc;
      }, {});

      const prompt = `You are an expert Canadian payroll compliance advisor. Analyze this payroll data and provide actionable insights:

COMPANY: ${company.name}
Province: ${company.province}
Active Employees: ${activeEmployees.length}
Total Annual Payroll: $${totalPayroll.toLocaleString('en-CA')}
Average Pay: $${avgPay.toFixed(2)}
Pending Adjustments: ${pendingAdjustments}
Vacation Liability: $${totalVacationLiability.toFixed(2)}

PAY GROUPS: ${payGroups?.length || 0}
${payGroups?.map(g => `- ${g.name} (${g.pay_frequency}, ${g.auto_vacation_accrual ? 'Auto-accrual' : 'Manual'})`).join('\n')}

FREQUENCY DISTRIBUTION:
${Object.entries(frequencyDistribution).map(([freq, count]) => `- ${freq}: ${count} employees`).join('\n')}

Provide analysis in these categories:
1. Potential Errors: Identify any red flags or anomalies
2. Compliance Alerts: Canadian payroll regulations (CPP, EI, provincial rules)
3. Pay Group Optimization: Suggest better grouping strategies
4. Cost Savings: Identify opportunities to reduce costs
5. Efficiency Improvements: Process optimization recommendations

Be specific and actionable. Reference actual numbers from the data.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            potential_errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string", enum: ["critical", "warning", "info"] },
                  issue: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            compliance_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  regulation: { type: "string" },
                  status: { type: "string", enum: ["compliant", "warning", "action_required"] },
                  details: { type: "string" }
                }
              }
            },
            pay_group_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  suggestion: { type: "string" },
                  impact: { type: "string" },
                  implementation: { type: "string" }
                }
              }
            },
            cost_savings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  opportunity: { type: "string" },
                  estimated_savings: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            efficiency_improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  improvement: { type: "string" },
                  time_saved: { type: "string" }
                }
              }
            },
            overall_score: {
              type: "number",
              description: "0-100 score"
            },
            summary: { type: "string" }
          }
        }
      });

      setInsights(response);
      toast.success("AI analysis complete");
    } catch (error) {
      toast.error("Failed to analyze payroll data");
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getComplianceColor = (status) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'action_required': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                AI Payroll Assistant
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Proactive error detection, compliance monitoring, and optimization recommendations
              </p>
            </div>
            <Button onClick={analyzePayroll} disabled={analyzing} className="bg-purple-600 hover:bg-purple-700">
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {insights && (
        <>
          {/* Overall Score */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Payroll Health Score</h3>
                  <p className="text-sm text-gray-600">{insights.summary}</p>
                </div>
                <div className="text-center">
                  <div className={`text-5xl font-bold ${insights.overall_score >= 80 ? 'text-green-600' : insights.overall_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {insights.overall_score}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">out of 100</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Potential Errors */}
          {insights.potential_errors?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Potential Errors Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.potential_errors.map((error, idx) => (
                    <Alert key={idx} className={getSeverityColor(error.severity)}>
                      <AlertDescription>
                        <div className="flex items-start gap-3">
                          <Badge className="mt-0.5">{error.severity}</Badge>
                          <div className="flex-1">
                            <p className="font-semibold mb-1">{error.issue}</p>
                            <p className="text-sm">{error.recommendation}</p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance Alerts */}
          {insights.compliance_alerts?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Canadian Payroll Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.compliance_alerts.map((alert, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{alert.regulation}</span>
                          <Badge className={getComplianceColor(alert.status)}>
                            {alert.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{alert.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pay Group Optimization */}
          {insights.pay_group_suggestions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Pay Group Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.pay_group_suggestions.map((suggestion, idx) => (
                    <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                      <p className="font-semibold mb-1">{suggestion.suggestion}</p>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Impact:</strong> {suggestion.impact}
                      </p>
                      <p className="text-sm text-blue-600">
                        <strong>How to implement:</strong> {suggestion.implementation}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Savings */}
          {insights.cost_savings?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                  Cost Savings Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.cost_savings.map((saving, idx) => (
                    <div key={idx} className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{saving.opportunity}</h4>
                        <Badge className="bg-emerald-100 text-emerald-800">
                          {saving.estimated_savings}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">
                        <strong>Action:</strong> {saving.action}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Efficiency Improvements */}
          {insights.efficiency_improvements?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Efficiency Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.efficiency_improvements.map((improvement, idx) => (
                    <div key={idx} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-100 text-purple-800">{improvement.area}</Badge>
                        <span className="text-xs text-gray-600">{improvement.time_saved}</span>
                      </div>
                      <p className="text-sm text-gray-700">{improvement.improvement}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!insights && !analyzing && (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Analyze Your Payroll</h3>
            <p className="text-gray-600 mb-6">
              Click "Run Analysis" to get AI-powered insights into your payroll operations, 
              compliance status, and optimization opportunities.
            </p>
            <Button onClick={analyzePayroll} className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Get AI Insights
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}