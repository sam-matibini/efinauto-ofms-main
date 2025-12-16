import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function RevenueAndCosts({ companyId }) {
  const { data: exportOrders = [] } = useQuery({
    queryKey: ['exportOrders', companyId],
    queryFn: () => base44.entities.ExportOrder.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  // Calculate totals
  const totalRevenue = exportOrders.reduce((sum, o) => sum + (o.total_value || 0), 0);
  const totalCosts = exportOrders.reduce((sum, o) => 
    sum + (o.freight_cost || 0) + (o.insurance_cost || 0) + 
    (o.customs_fees || 0) + (o.handling_fees || 0), 0
  );
  const totalProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  // By destination country
  const byCountry = exportOrders.reduce((acc, order) => {
    const country = order.destination_country;
    if (!acc[country]) {
      acc[country] = { revenue: 0, costs: 0, count: 0 };
    }
    acc[country].revenue += order.total_value || 0;
    acc[country].costs += (order.freight_cost || 0) + (order.insurance_cost || 0) + 
                          (order.customs_fees || 0) + (order.handling_fees || 0);
    acc[country].count += 1;
    return acc;
  }, {});

  const countryData = Object.entries(byCountry)
    .map(([country, data]) => ({
      country,
      revenue: data.revenue,
      costs: data.costs,
      profit: data.revenue - data.costs,
      count: data.count
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Per order profitability
  const orderProfitability = exportOrders
    .map(order => ({
      orderNumber: order.export_order_number,
      revenue: order.total_value || 0,
      costs: (order.freight_cost || 0) + (order.insurance_cost || 0) + 
             (order.customs_fees || 0) + (order.handling_fees || 0),
      profit: (order.total_value || 0) - 
              ((order.freight_cost || 0) + (order.insurance_cost || 0) + 
               (order.customs_fees || 0) + (order.handling_fees || 0))
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Revenue & Profitability
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">
              ${(totalRevenue / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Total Costs</div>
            <div className="text-2xl font-bold text-red-600">
              ${(totalCosts / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Net Profit</div>
            <div className="text-2xl font-bold text-blue-600">
              ${(totalProfit / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-purple-600" />
              <div className="text-xs text-gray-600">Margin</div>
            </div>
            <div className="text-2xl font-bold text-purple-600">{profitMargin}%</div>
          </div>
        </div>

        <Tabs defaultValue="country">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="country">By Country</TabsTrigger>
            <TabsTrigger value="order">By Order</TabsTrigger>
          </TabsList>

          <TabsContent value="country" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip formatter={(value) => `$${(value / 1000).toFixed(1)}K`} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="costs" fill="#ef4444" name="Costs" />
                <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="order" className="mt-4">
            <div className="space-y-2">
              {orderProfitability.map((order, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-gray-600">
                      Revenue: ${(order.revenue / 1000).toFixed(1)}K | 
                      Costs: ${(order.costs / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${order.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${(order.profit / 1000).toFixed(1)}K
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}