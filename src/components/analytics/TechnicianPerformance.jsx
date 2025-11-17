import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Award, Clock, CheckCircle, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TechnicianPerformance({ technicians, repairOrders, timesheets, dateRange }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const cutoffDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - dateRange);
    return date.toISOString().split('T')[0];
  }, [dateRange]);

  const performanceData = useMemo(() => {
    return technicians.map(tech => {
      const techOrders = repairOrders.filter(order => 
        order.assigned_technician === tech.full_name &&
        order.start_date >= cutoffDate
      );

      const completedOrders = techOrders.filter(o => o.status === 'completed');
      const techTimesheets = timesheets.filter(ts => 
        ts.technician_id === tech.id &&
        ts.date >= cutoffDate
      );

      const totalHours = techTimesheets.reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
      const billableHours = techTimesheets.filter(ts => ts.billable).reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
      const revenue = completedOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
      
      const avgCompletionTime = completedOrders.length > 0
        ? completedOrders.reduce((sum, o) => {
            if (o.start_date && o.completion_date) {
              const days = Math.floor((new Date(o.completion_date) - new Date(o.start_date)) / (1000 * 60 * 60 * 24));
              return sum + days;
            }
            return sum;
          }, 0) / completedOrders.length
        : 0;

      return {
        id: tech.id,
        name: tech.full_name,
        jobsCompleted: completedOrders.length,
        totalJobs: techOrders.length,
        totalHours: totalHours,
        billableHours: billableHours,
        efficiency: totalHours > 0 ? (billableHours / totalHours * 100) : 0,
        revenue: revenue,
        avgCompletionTime: avgCompletionTime,
        revenuePerHour: totalHours > 0 ? revenue / totalHours : 0,
      };
    });
  }, [technicians, repairOrders, timesheets, cutoffDate]);

  const sortedByRevenue = [...performanceData].sort((a, b) => b.revenue - a.revenue);
  const topPerformer = sortedByRevenue[0];

  const chartData = performanceData.map(tech => ({
    name: tech.name.split(' ')[0],
    completed: tech.jobsCompleted,
    hours: tech.totalHours,
    revenue: tech.revenue,
  }));

  const efficiencyData = performanceData.map(tech => ({
    name: tech.name.split(' ')[0],
    efficiency: tech.efficiency.toFixed(1),
  }));

  const generateAIInsights = useMutation({
    mutationFn: async () => {
      setLoading(true);
      
      const prompt = `Analyze this technician performance data and provide actionable insights:

${performanceData.map(tech => `
- ${tech.name}: ${tech.jobsCompleted} jobs completed, ${tech.totalHours.toFixed(1)} hours, ${tech.efficiency.toFixed(1)}% efficiency, $${tech.revenue.toFixed(0)} revenue
`).join('')}

Provide 3-4 specific, actionable insights about:
1. Top performers and what they're doing well
2. Areas for improvement for underperformers
3. Efficiency optimization opportunities
4. Resource allocation recommendations

Keep it concise and practical.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
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
      {/* AI Insights Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              AI-Powered Insights
            </CardTitle>
            <Button 
              onClick={() => generateAIInsights.mutate()}
              disabled={loading}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Generating..." : "Generate Insights"}
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

      {/* Top Performer Highlight */}
      {topPerformer && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Top Performer: {topPerformer.name}</h3>
                <div className="grid grid-cols-4 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-600">Jobs Completed</p>
                    <p className="text-lg font-bold">{topPerformer.jobsCompleted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Hours</p>
                    <p className="text-lg font-bold">{topPerformer.totalHours.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Efficiency</p>
                    <p className="text-lg font-bold">{topPerformer.efficiency.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Revenue</p>
                    <p className="text-lg font-bold text-green-600">${topPerformer.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Jobs Completed vs Hours Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#3b82f6" name="Jobs Completed" />
                <Bar dataKey="hours" fill="#10b981" name="Hours Logged" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Efficiency Rate by Technician</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="efficiency" stroke="#f59e0b" strokeWidth={2} name="Efficiency %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold">Technician</th>
                  <th className="p-3 text-right text-sm font-semibold">Jobs</th>
                  <th className="p-3 text-right text-sm font-semibold">Total Hours</th>
                  <th className="p-3 text-right text-sm font-semibold">Billable Hours</th>
                  <th className="p-3 text-right text-sm font-semibold">Efficiency</th>
                  <th className="p-3 text-right text-sm font-semibold">Revenue</th>
                  <th className="p-3 text-right text-sm font-semibold">$/Hour</th>
                  <th className="p-3 text-right text-sm font-semibold">Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {sortedByRevenue.map((tech, index) => (
                  <tr key={tech.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                        <span className="font-medium">{tech.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">{tech.jobsCompleted}</td>
                    <td className="p-3 text-right">{tech.totalHours.toFixed(1)}</td>
                    <td className="p-3 text-right">{tech.billableHours.toFixed(1)}</td>
                    <td className="p-3 text-right">
                      <Badge className={
                        tech.efficiency >= 80 ? "bg-green-100 text-green-700" :
                        tech.efficiency >= 60 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }>
                        {tech.efficiency.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-semibold text-green-600">
                      ${tech.revenue.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">${tech.revenuePerHour.toFixed(0)}</td>
                    <td className="p-3 text-right">{tech.avgCompletionTime.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}