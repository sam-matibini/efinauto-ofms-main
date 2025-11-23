import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, CheckCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ProactiveInsights({ financialData, companyId, insightType = "performance" }) {
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateInsights = async () => {
    setIsLoading(true);

    try {
      const totalRevenue = financialData.sales.reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);
      const totalExpenses = financialData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingTransactions = financialData.bankTransactions.filter(t => t.status === 'pending');
      const unreconciledTransactions = financialData.bankTransactions.filter(t => !t.reconciled);
      const overdueInvoices = financialData.sales.filter(s => 
        s.payment_status !== 'paid' && s.balance_due > 0
      );

      const context = `
Analyze this company's financial data and provide insights:

Revenue: $${totalRevenue.toLocaleString()}
Expenses: $${totalExpenses.toLocaleString()}
Net Profit: $${(totalRevenue - totalExpenses).toLocaleString()}
Profit Margin: ${totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(2) : 0}%

Sales: ${financialData.sales.length} transactions
Repair Orders: ${financialData.repairs.length} orders
Bank Transactions: ${financialData.bankTransactions.length} total
- Pending: ${pendingTransactions.length}
- Unreconciled: ${unreconciledTransactions.length}

Overdue Invoices: ${overdueInvoices.length} (Total: $${overdueInvoices.reduce((sum, i) => sum + (i.balance_due || 0), 0).toLocaleString()})

Recent Sales Trend: ${JSON.stringify(financialData.sales.slice(-5).map(s => ({
  date: s.sale_date,
  amount: s.grand_total || s.sale_price
})))}

Top Expenses: ${JSON.stringify(financialData.expenses
  .sort((a, b) => (b.amount || 0) - (a.amount || 0))
  .slice(0, 5)
  .map(e => ({ category: e.category, amount: e.amount }))
)}
`;

      const prompt = insightType === "issues" 
        ? `Identify potential accounting and financial issues in this data. Look for:
          - Unreconciled or pending transactions
          - Overdue invoices and receivables
          - Cash flow concerns
          - Unusual expense patterns
          - Missing or incomplete data
          - Compliance risks
          
          ${context}
          
          Provide 3-5 specific issues with severity (high/medium/low) and recommended actions.`
        : `Analyze this company's financial performance and provide actionable insights:
          - Revenue trends and opportunities
          - Expense optimization areas
          - Profit margin analysis
          - Growth recommendations
          - Cash flow insights
          
          ${context}
          
          Provide 4-6 insights with specific recommendations.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["high", "medium", "low", "info"] },
                  category: { type: "string" },
                  recommendation: { type: "string" },
                  metrics: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            }
          }
        }
      });

      setInsights(response.insights || []);
    } catch (error) {
      console.error("Insights generation error:", error);
      toast.error("Failed to generate insights");
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (financialData && Object.keys(financialData).length > 0) {
      generateInsights();
    }
  }, [insightType]);

  const severityConfig = {
    high: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    medium: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
    low: { icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    info: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            {insightType === "issues" ? "Detected Issues" : "AI-Powered Insights"}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateInsights}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && insights.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Analyzing your financial data...</p>
            </div>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No insights available yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={generateInsights}
              className="mt-3"
            >
              Generate Insights
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => {
              const config = severityConfig[insight.severity] || severityConfig.info;
              const Icon = config.icon;

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${config.color} mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                        <Badge variant="outline" className={config.color}>
                          {insight.severity}
                        </Badge>
                        {insight.category && (
                          <Badge variant="outline">{insight.category}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                      
                      {insight.metrics && insight.metrics.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Key Metrics:</p>
                          <div className="flex flex-wrap gap-2">
                            {insight.metrics.map((metric, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-white bg-opacity-50 rounded p-3 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Recommendation:</p>
                        <p className="text-sm text-gray-800">{insight.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}