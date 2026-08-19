import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function RepairTrends({ repairOrders, parts, dateRange }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const cutoffDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - dateRange);
    return date.toISOString().split('T')[0];
  }, [dateRange]);

  const trendData = useMemo(() => {
    const filteredOrders = repairOrders.filter(order => order.start_date >= cutoffDate);

    // Common issues by vehicle make
    const issuesByMake = {};
    filteredOrders.forEach(order => {
      const make = order.vehicle_make || 'Unknown';
      if (!issuesByMake[make]) {
        issuesByMake[make] = { count: 0, issues: {}, totalCost: 0 };
      }
      issuesByMake[make].count++;
      issuesByMake[make].totalCost += order.total_cost || 0;
      
      const serviceType = order.service_type || 'other';
      issuesByMake[make].issues[serviceType] = (issuesByMake[make].issues[serviceType] || 0) + 1;
    });

    // Service type distribution
    const serviceTypes = {};
    filteredOrders.forEach(order => {
      const type = order.service_type || 'other';
      serviceTypes[type] = (serviceTypes[type] || 0) + 1;
    });

    // Parts usage frequency
    const partsUsage = {};
    filteredOrders.forEach(order => {
      if (order.parts_used && Array.isArray(order.parts_used)) {
        order.parts_used.forEach(part => {
          const key = part.part_name || 'Unknown';
          if (!partsUsage[key]) {
            partsUsage[key] = { count: 0, totalCost: 0, quantity: 0 };
          }
          partsUsage[key].count++;
          partsUsage[key].totalCost += part.total_cost || 0;
          partsUsage[key].quantity += part.quantity || 0;
        });
      }
    });

    // Time series data
    const timeSeriesData = {};
    filteredOrders.forEach(order => {
      if (order.start_date) {
        const date = order.start_date.substring(0, 7); // YYYY-MM
        if (!timeSeriesData[date]) {
          timeSeriesData[date] = { repairs: 0, revenue: 0 };
        }
        timeSeriesData[date].repairs++;
        timeSeriesData[date].revenue += order.total_cost || 0;
      }
    });

    return {
      issuesByMake,
      serviceTypes,
      partsUsage,
      timeSeriesData,
      totalRepairs: filteredOrders.length,
      totalRevenue: filteredOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0),
    };
  }, [repairOrders, cutoffDate]);

  const makeChartData = Object.entries(trendData.issuesByMake)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([make, data]) => ({
      make,
      count: data.count,
      avgCost: data.totalCost / data.count,
    }));

  const serviceTypeChartData = Object.entries(trendData.serviceTypes)
    .map(([type, count]) => ({
      name: type.replace(/_/g, ' '),
      value: count,
    }));

  const topPartsData = Object.entries(trendData.partsUsage)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => ({
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      usage: data.count,
      cost: data.totalCost,
    }));

  const timeSeriesChartData = Object.entries(trendData.timeSeriesData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      month: new Date(date + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      repairs: data.repairs,
      revenue: data.revenue,
    }));

  const generateAIInsights = useMutation({
    mutationFn: async () => {
      setLoading(true);
      
      const topIssues = Object.entries(trendData.issuesByMake)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([make, data]) => {
          const topIssue = Object.entries(data.issues).sort((a, b) => b[1] - a[1])[0];
          return `${make}: ${data.count} repairs, top issue: ${topIssue?.[0]} (${topIssue?.[1]} occurrences)`;
        });

      const prompt = `Analyze these auto repair trends and provide insights:

Total Repairs: ${trendData.totalRepairs}
Total Revenue: $${trendData.totalRevenue.toFixed(0)}

Top Issues by Vehicle Make:
${topIssues.join('\n')}

Service Distribution:
${Object.entries(trendData.serviceTypes).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

Most Used Parts:
${Object.entries(trendData.partsUsage).sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([name, data]) => `- ${name}: used ${data.count} times`).join('\n')}

Provide 3-4 actionable insights about:
1. Common problems and preventive measures
2. Parts inventory optimization recommendations
3. Service package opportunities
4. Seasonal trends or patterns

Be specific and actionable.`;

      const response = await supabase.integrations.Core.InvokeLLM({ prompt });
      setLoading(false);
      return response;
    },
    onSuccess: (data) => {
      setInsights(data);
      toast.success("AI insights generated!");
    },
    onError: () => {
      setLoading(false);
      toast.error("Failed to generate insights");
    }
  });

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Trend Analysis & Insights
            </CardTitle>
            <Button 
              onClick={() => generateAIInsights.mutate()}
              disabled={loading}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? "Analyzing..." : "Generate Insights"}
            </Button>
          </div>
        </CardHeader>
        {insights && (
          <CardContent>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {insights}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Time Series Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Repair Volume & Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="repairs" stroke="#3b82f6" strokeWidth={2} name="Repairs" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue ($)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Repairs by Vehicle Make</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={makeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="make" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Repair Count" />
                <Bar dataKey="avgCost" fill="#10b981" name="Avg Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceTypeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceTypeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Parts Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Most Frequently Used Parts</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPartsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="usage" fill="#8b5cf6" name="Times Used" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Common Issues by Vehicle Make</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(trendData.issuesByMake)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 5)
              .map(([make, data]) => {
                const topIssues = Object.entries(data.issues)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);
                
                return (
                  <div key={make} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-lg">{make}</h4>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-600">
                          <strong>{data.count}</strong> repairs
                        </span>
                        <span className="text-green-600">
                          <strong>${(data.totalCost / data.count).toFixed(0)}</strong> avg
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topIssues.map(([issue, count]) => (
                        <div key={issue} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {issue.replace(/_/g, ' ')}: {count}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}