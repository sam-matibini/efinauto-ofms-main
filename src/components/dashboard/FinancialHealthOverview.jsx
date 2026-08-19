import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";

export default function FinancialHealthOverview({ companyId }) {
  const { data: exportOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['exportOrders', companyId],
    queryFn: () => supabase.entities.ExportOrder.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['paymentTransactions', companyId],
    queryFn: () => supabase.entities.PaymentTransaction.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  if (ordersLoading || paymentsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Generate last 6 months data
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = startOfMonth(subMonths(new Date(), 5 - i));
    return {
      month: format(date, 'MMM yyyy'),
      date: date
    };
  });

  const financialData = months.map(({ month, date }) => {
    const monthOrders = exportOrders.filter(order => {
      const orderDate = new Date(order.created_date);
      return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
    });

    const revenue = monthOrders.reduce((sum, order) => sum + (order.total_value || 0), 0);
    const costs = monthOrders.reduce((sum, order) => sum + (order.total_logistics_cost || 0), 0);
    const profit = revenue - costs;

    return {
      month,
      revenue: Math.round(revenue),
      costs: Math.round(costs),
      profit: Math.round(profit)
    };
  });

  // Calculate current vs previous month
  const currentMonth = financialData[financialData.length - 1];
  const previousMonth = financialData[financialData.length - 2];
  const revenueTrend = currentMonth && previousMonth ? 
    ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100) : 0;
  const profitMargin = currentMonth && currentMonth.revenue > 0 ? 
    (currentMonth.profit / currentMonth.revenue * 100) : 0;

  // Cost breakdown
  const costBreakdown = [
    { name: "Freight", value: exportOrders.reduce((sum, o) => sum + (o.freight_cost || 0), 0) },
    { name: "Insurance", value: exportOrders.reduce((sum, o) => sum + (o.insurance_cost || 0), 0) },
    { name: "Handling", value: exportOrders.reduce((sum, o) => sum + (o.handling_fees || 0), 0) },
    { name: "Customs", value: exportOrders.reduce((sum, o) => sum + (o.customs_fees || 0), 0) }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Financial Health Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Monthly Revenue</p>
            <p className="text-2xl font-bold text-blue-600">
              ${currentMonth?.revenue.toLocaleString() || 0}
            </p>
            <div className={`flex items-center gap-1 text-xs mt-1 ${revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(revenueTrend).toFixed(1)}% vs last month
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Monthly Costs</p>
            <p className="text-2xl font-bold text-red-600">
              ${currentMonth?.costs.toLocaleString() || 0}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Profit Margin</p>
            <p className="text-2xl font-bold text-green-600">
              {profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Revenue Trend */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Revenue & Cost Trends (6 Months)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="costs" stroke="#ef4444" strokeWidth={2} name="Costs" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Breakdown */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Cost Breakdown (Total)</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={costBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar dataKey="value" fill="#f59e0b" name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}