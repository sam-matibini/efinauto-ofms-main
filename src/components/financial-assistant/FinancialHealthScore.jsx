import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";

export default function FinancialHealthScore({ financialData }) {
  const [healthScore, setHealthScore] = useState(0);
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    calculateHealthScore();
  }, [financialData]);

  const calculateHealthScore = () => {
    let score = 0;
    const checks = [];

    // Revenue Analysis
    const totalRevenue = financialData.sales.reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);
    const totalExpenses = financialData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Check 1: Profitability (30 points)
    if (profitMargin > 20) {
      score += 30;
      checks.push({ name: "Profitability", status: "excellent", value: `${profitMargin.toFixed(1)}%` });
    } else if (profitMargin > 10) {
      score += 20;
      checks.push({ name: "Profitability", status: "good", value: `${profitMargin.toFixed(1)}%` });
    } else if (profitMargin > 0) {
      score += 10;
      checks.push({ name: "Profitability", status: "fair", value: `${profitMargin.toFixed(1)}%` });
    } else {
      checks.push({ name: "Profitability", status: "poor", value: `${profitMargin.toFixed(1)}%` });
    }

    // Check 2: Receivables (25 points)
    const overdueInvoices = financialData.sales.filter(s => s.payment_status !== 'paid' && s.balance_due > 0);
    const overduePercentage = financialData.sales.length > 0 ? (overdueInvoices.length / financialData.sales.length) * 100 : 0;
    if (overduePercentage < 10) {
      score += 25;
      checks.push({ name: "Receivables", status: "excellent", value: `${overduePercentage.toFixed(1)}% overdue` });
    } else if (overduePercentage < 25) {
      score += 15;
      checks.push({ name: "Receivables", status: "good", value: `${overduePercentage.toFixed(1)}% overdue` });
    } else {
      score += 5;
      checks.push({ name: "Receivables", status: "needs attention", value: `${overduePercentage.toFixed(1)}% overdue` });
    }

    // Check 3: Bank Reconciliation (25 points)
    const unreconciledCount = financialData.bankTransactions.filter(t => !t.reconciled).length;
    const unreconciledPercentage = financialData.bankTransactions.length > 0 
      ? (unreconciledCount / financialData.bankTransactions.length) * 100 : 0;
    if (unreconciledPercentage < 5) {
      score += 25;
      checks.push({ name: "Reconciliation", status: "excellent", value: `${unreconciledPercentage.toFixed(1)}% pending` });
    } else if (unreconciledPercentage < 15) {
      score += 15;
      checks.push({ name: "Reconciliation", status: "good", value: `${unreconciledPercentage.toFixed(1)}% pending` });
    } else {
      score += 5;
      checks.push({ name: "Reconciliation", status: "needs attention", value: `${unreconciledPercentage.toFixed(1)}% pending` });
    }

    // Check 4: Transaction Accuracy (20 points)
    const categorizedTransactions = financialData.bankTransactions.filter(t => t.status === 'posted' || t.gl_account_id);
    const accuracyPercentage = financialData.bankTransactions.length > 0
      ? (categorizedTransactions.length / financialData.bankTransactions.length) * 100 : 0;
    if (accuracyPercentage > 90) {
      score += 20;
      checks.push({ name: "Data Accuracy", status: "excellent", value: `${accuracyPercentage.toFixed(1)}% categorized` });
    } else if (accuracyPercentage > 70) {
      score += 12;
      checks.push({ name: "Data Accuracy", status: "good", value: `${accuracyPercentage.toFixed(1)}% categorized` });
    } else {
      score += 5;
      checks.push({ name: "Data Accuracy", status: "needs improvement", value: `${accuracyPercentage.toFixed(1)}% categorized` });
    }

    setHealthScore(score);
    setMetrics({ checks, profitMargin, totalRevenue, netProfit });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Attention";
  };

  const statusColors = {
    excellent: "bg-green-100 text-green-800",
    good: "bg-blue-100 text-blue-800",
    fair: "bg-yellow-100 text-yellow-800",
    "needs attention": "bg-orange-100 text-orange-800",
    "needs improvement": "bg-orange-100 text-orange-800",
    poor: "bg-red-100 text-red-800"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Financial Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score Circle */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <p className={`text-4xl font-bold ${getScoreColor(healthScore)}`}>
                    {healthScore}
                  </p>
                  <p className="text-xs text-gray-600">out of 100</p>
                </div>
              </div>
            </div>
            <Badge className={`mt-3 ${getScoreColor(healthScore)}`}>
              {getScoreLabel(healthScore)}
            </Badge>
          </div>

          {/* Metrics */}
          <div className="md:col-span-2 space-y-4">
            {metrics.checks?.map((check, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{check.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[check.status]}>{check.status}</Badge>
                    <span className="text-xs text-gray-600">{check.value}</span>
                  </div>
                </div>
                <Progress
                  value={
                    check.status === "excellent" ? 100 :
                    check.status === "good" ? 75 :
                    check.status === "fair" ? 50 : 25
                  }
                  className="h-2"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600 mb-1">Net Profit</p>
                <p className="text-lg font-bold text-green-600">
                  ${(metrics.netProfit || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600 mb-1">Profit Margin</p>
                <p className="text-lg font-bold text-blue-600">
                  {(metrics.profitMargin || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}