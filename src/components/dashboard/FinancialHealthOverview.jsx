import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { buildDashboardInsights } from "@/lib/dashboardInsights";
import { formatAccounting, formatStatementDate } from "@/lib/financialStatements";

export default function FinancialHealthOverview() {
  const { ledger, isReady, companyId } = useFinancialBooks("accrual");
  const insights = useMemo(() => buildDashboardInsights(ledger), [ledger]);
  const change = insights.revenueChange;

  if (!companyId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Select a company to see financial health.
        </CardContent>
      </Card>
    );
  }

  if (!isReady) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  const trendClass = change.direction === "up"
    ? "text-green-600"
    : change.direction === "down"
      ? "text-red-600"
      : "text-slate-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Health Overview
        </CardTitle>
        <p className="text-sm text-slate-500">
          {insights.current.month} through {formatStatementDate(insights.asOf)}, from the same accrual books as the statements.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="mb-1 text-xs text-slate-600">Monthly Revenue</p>
            <p className="text-2xl font-bold text-blue-600">{formatAccounting(insights.current.revenue)}</p>
            <div className={`mt-1 flex items-center gap-1 text-xs ${trendClass}`}>
              {change.direction === "up" && <TrendingUp className="h-3 w-3" />}
              {change.direction === "down" && <TrendingDown className="h-3 w-3" />}
              {change.label}
            </div>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="mb-1 text-xs text-slate-600">Monthly Costs</p>
            <p className="text-2xl font-bold text-red-600">{formatAccounting(insights.current.costs)}</p>
            <p className="mt-1 text-xs text-slate-500">Cost of sales, operating, and payroll</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="mb-1 text-xs text-slate-600">Profit Margin</p>
            <p className="text-2xl font-bold text-green-600">{insights.current.margin.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-slate-500">Net profit {formatAccounting(insights.current.profit)}</p>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Revenue & Cost Trends (6 Months)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={insights.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatAccounting(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="costs" stroke="#ef4444" strokeWidth={2} name="Costs" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Cost Breakdown (Last 6 Months)</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={insights.costBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatAccounting(value)} />
              <Bar dataKey="value" fill="#f59e0b" name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
