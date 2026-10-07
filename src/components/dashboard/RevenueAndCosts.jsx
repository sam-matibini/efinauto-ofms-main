import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { buildDashboardInsights } from "@/lib/dashboardInsights";
import { formatAccounting, formatStatementDate } from "@/lib/financialStatements";

export default function RevenueAndCosts({ companyId }) {
  const { ledger, isReady } = useFinancialBooks("accrual");
  const insights = useMemo(() => buildDashboardInsights(ledger), [ledger]);
  const { data: exportOrders = [] } = useQuery({
    queryKey: ["exportOrders", companyId],
    queryFn: () => supabase.entities.ExportOrder.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const byCountry = exportOrders.reduce((acc, order) => {
    const country = order.destination_country || "Unknown";
    if (!acc[country]) acc[country] = { revenue: 0, costs: 0 };
    acc[country].revenue += order.total_value || 0;
    acc[country].costs += (order.freight_cost || 0) + (order.insurance_cost || 0)
      + (order.customs_fees || 0) + (order.handling_fees || 0);
    return acc;
  }, {});
  const countryData = Object.entries(byCountry)
    .map(([country, data]) => ({
      country,
      revenue: data.revenue,
      costs: data.costs,
      profit: data.revenue - data.costs,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  if (!companyId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Select a company to see revenue and profit.
        </CardContent>
      </Card>
    );
  }

  if (!isReady) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  const { ytd } = insights;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Revenue & Profitability
        </CardTitle>
        <p className="text-sm text-slate-500">Year to date through {formatStatementDate(insights.asOf)}.</p>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-green-50 p-3">
            <div className="mb-1 text-xs text-slate-600">Total Revenue</div>
            <div className="text-xl font-bold text-green-600">{formatAccounting(ytd.revenue)}</div>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <div className="mb-1 text-xs text-slate-600">Total Costs</div>
            <div className="text-xl font-bold text-red-600">{formatAccounting(ytd.costs)}</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="mb-1 text-xs text-slate-600">Net Profit</div>
            <div className="text-xl font-bold text-blue-600">{formatAccounting(ytd.profit)}</div>
          </div>
          <div className="rounded-lg bg-purple-50 p-3">
            <div className="mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-purple-600" />
              <div className="text-xs text-slate-600">Margin</div>
            </div>
            <div className="text-xl font-bold text-purple-600">{ytd.margin.toFixed(1)}%</div>
          </div>
        </div>

        <Tabs defaultValue="line">
          <TabsList className={`grid w-full ${countryData.length ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="line">By Line</TabsTrigger>
            <TabsTrigger value="cost">By Cost</TabsTrigger>
            {countryData.length > 0 && <TabsTrigger value="country">By Country</TabsTrigger>}
          </TabsList>

          <TabsContent value="line" className="mt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={insights.revenueMix}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatAccounting(value)} />
                <Bar dataKey="value" fill="#10b981" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="cost" className="mt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={insights.costBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatAccounting(value)} />
                <Bar dataKey="value" fill="#ef4444" name="Cost" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {countryData.length > 0 && (
            <TabsContent value="country" className="mt-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={countryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatAccounting(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                  <Bar dataKey="costs" fill="#ef4444" name="Costs" />
                  <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
