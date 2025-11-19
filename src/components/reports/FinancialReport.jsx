import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

export default function FinancialReport({ sales, repairs, exports, comparativePeriods = [] }) {
  const currentPeriod = comparativePeriods[0] || { from: new Date(), to: new Date() };
  
  const filterByDate = (items, period) => {
    return items.filter(item => {
      const itemDate = new Date(item.created_date || item.sale_date);
      return itemDate >= period.from && itemDate <= period.to;
    });
  };

  const filteredSales = filterByDate(sales, currentPeriod);
  const filteredRepairs = filterByDate(repairs, currentPeriod);
  const filteredExports = filterByDate(exports, currentPeriod);

  const salesRevenue = filteredSales.reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);
  const repairsRevenue = filteredRepairs.reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const exportsRevenue = filteredExports.reduce((sum, e) => sum + (e.total_value || 0), 0);
  const totalRevenue = salesRevenue + repairsRevenue + exportsRevenue;

  const salesPaid = filteredSales.reduce((sum, s) => sum + (s.total_paid || 0), 0);
  const repairsPaid = filteredRepairs.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalPaid = salesPaid + repairsPaid;

  const outstanding = totalRevenue - totalPaid;

  // Revenue by source
  const revenueBySource = [
    { source: 'Vehicle Sales', amount: salesRevenue },
    { source: 'Repairs', amount: repairsRevenue },
    { source: 'Exports', amount: exportsRevenue }
  ];

  // Monthly revenue trend
  const monthlyRevenue = {};
  
  [...filteredSales, ...filteredRepairs, ...filteredExports].forEach(item => {
    const date = new Date(item.sale_date || item.created_date);
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    if (!monthlyRevenue[month]) {
      monthlyRevenue[month] = { month, sales: 0, repairs: 0, exports: 0, total: 0 };
    }
    
    if (item.sale_price !== undefined || item.grand_total !== undefined) {
      monthlyRevenue[month].sales += item.grand_total || item.sale_price || 0;
    } else if (item.total_cost !== undefined) {
      monthlyRevenue[month].repairs += item.total_cost || 0;
    } else if (item.total_value !== undefined) {
      monthlyRevenue[month].exports += item.total_value || 0;
    }
    
    monthlyRevenue[month].total = monthlyRevenue[month].sales + monthlyRevenue[month].repairs + monthlyRevenue[month].exports;
  });

  const monthlyData = Object.values(monthlyRevenue).sort((a, b) => new Date(a.month) - new Date(b.month));

  // Payment status breakdown
  const paymentBreakdown = [
    { status: 'Paid', amount: totalPaid },
    { status: 'Outstanding', amount: outstanding }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <h3 className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <h3 className="text-2xl font-bold text-red-600">${outstanding.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collection Rate</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0}%
                </h3>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total Revenue" strokeWidth={2} />
                <Line type="monotone" dataKey="sales" stroke="#10b981" name="Sales" />
                <Line type="monotone" dataKey="repairs" stroke="#f59e0b" name="Repairs" />
                <Line type="monotone" dataKey="exports" stroke="#8b5cf6" name="Exports" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueBySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#3b82f6" name="Amount ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#10b981" name="Amount ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                <Bar dataKey="repairs" fill="#f59e0b" name="Repairs" />
                <Bar dataKey="exports" fill="#8b5cf6" name="Exports" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}