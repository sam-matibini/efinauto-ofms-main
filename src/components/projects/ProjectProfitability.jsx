import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ProjectProfitability({ projects, tasks }) {
  // Calculate profitability metrics
  const metrics = projects.map(project => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const totalEstimatedCost = projectTasks.reduce((sum, t) => sum + (t.estimated_cost || 0), 0);
    const totalActualCost = projectTasks.reduce((sum, t) => sum + (t.actual_cost || 0), 0);
    const revenue = project.revenue || project.budget || 0;
    const profit = revenue - (project.actual_cost || totalActualCost);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const budgetVariance = project.budget > 0 
      ? ((project.actual_cost || totalActualCost) - project.budget) / project.budget * 100 
      : 0;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      customer: project.customer_name,
      budget: project.budget || 0,
      actualCost: project.actual_cost || totalActualCost,
      revenue,
      profit,
      margin,
      budgetVariance,
      completedTasks: projectTasks.filter(t => t.status === 'completed').length,
      totalTasks: projectTasks.length,
      estimatedHours: projectTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
      actualHours: projectTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0)
    };
  });

  // Summary stats
  const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
  const totalCost = metrics.reduce((sum, m) => sum + m.actualCost, 0);
  const totalProfit = metrics.reduce((sum, m) => sum + m.profit, 0);
  const avgMargin = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.margin, 0) / metrics.length 
    : 0;

  const profitByType = projects.reduce((acc, p) => {
    const metric = metrics.find(m => m.id === p.id);
    const type = p.project_type || 'other';
    if (!acc[type]) acc[type] = { revenue: 0, cost: 0, profit: 0 };
    acc[type].revenue += metric?.revenue || 0;
    acc[type].cost += metric?.actualCost || 0;
    acc[type].profit += metric?.profit || 0;
    return acc;
  }, {});

  const chartData = Object.entries(profitByType).map(([type, data]) => ({
    name: type.replace(/_/g, ' '),
    revenue: data.revenue,
    cost: data.cost,
    profit: data.profit
  }));

  const pieData = chartData.map(d => ({ name: d.name, value: Math.max(0, d.profit) }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Target className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Costs</p>
                <p className="text-xl font-bold">${totalCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {totalProfit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Profit</p>
                <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${totalProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${avgMargin >= 20 ? 'bg-green-100' : avgMargin >= 10 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <TrendingUp className={`w-5 h-5 ${avgMargin >= 20 ? 'text-green-600' : avgMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg. Margin</p>
                <p className="text-xl font-bold">{avgMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profitability by Project Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                <Bar dataKey="profit" fill="#10b981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profit Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Project Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Profitability Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">Project</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-right p-3">Budget</th>
                  <th className="text-right p-3">Actual Cost</th>
                  <th className="text-right p-3">Revenue</th>
                  <th className="text-right p-3">Profit</th>
                  <th className="text-right p-3">Margin</th>
                  <th className="text-center p-3">Progress</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{m.name}</div>
                      <Badge variant="outline" className="text-xs mt-1">{m.status}</Badge>
                    </td>
                    <td className="p-3 text-gray-600">{m.customer || '-'}</td>
                    <td className="p-3 text-right">${m.budget.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <span className={m.actualCost > m.budget ? 'text-red-600' : ''}>
                        ${m.actualCost.toLocaleString()}
                      </span>
                      {m.budgetVariance > 10 && (
                        <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />
                      )}
                    </td>
                    <td className="p-3 text-right">${m.revenue.toLocaleString()}</td>
                    <td className={`p-3 text-right font-medium ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${m.profit.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <Badge className={m.margin >= 20 ? 'bg-green-100 text-green-700' : m.margin >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                        {m.margin.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress value={m.totalTasks > 0 ? (m.completedTasks / m.totalTasks) * 100 : 0} className="w-16" />
                        <span className="text-xs text-gray-500">{m.completedTasks}/{m.totalTasks}</span>
                      </div>
                    </td>
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