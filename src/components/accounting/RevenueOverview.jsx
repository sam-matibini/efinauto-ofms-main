import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, Download, Printer } from "lucide-react";
import { format } from "date-fns";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function RevenueOverview({ transactions, sales, repairs, purchases, comparativePeriods = [] }) {
  const currentPeriod = comparativePeriods[0];
  
  // Filter transactions by current period if available
  const filteredTransactions = currentPeriod 
    ? transactions.filter(t => {
        const transDate = new Date(t.transaction_date);
        return transDate >= currentPeriod.from && transDate <= currentPeriod.to;
      })
    : transactions;

  // Revenue by type
  const revenueByType = [
    {
      name: 'Vehicle Sales',
      value: filteredTransactions.filter(t => t.transaction_type === 'sale_revenue').reduce((sum, t) => sum + t.amount, 0)
    },
    {
      name: 'Service Revenue',
      value: filteredTransactions.filter(t => t.transaction_type === 'service_revenue').reduce((sum, t) => sum + t.amount, 0)
    },
    {
      name: 'Parts Revenue',
      value: filteredTransactions.filter(t => t.transaction_type === 'parts_revenue').reduce((sum, t) => sum + t.amount, 0)
    },
    {
      name: 'Other Income',
      value: filteredTransactions.filter(t => t.transaction_type === 'other_income').reduce((sum, t) => sum + t.amount, 0)
    }
  ].filter(item => item.value > 0);

  // Comparative periods trend
  const periodRevenue = comparativePeriods.length > 0 
    ? comparativePeriods.map(period => {
        const periodTransactions = transactions.filter(t => {
          const tDate = new Date(t.transaction_date);
          return tDate >= period.from && tDate <= period.to;
        });
        
        const revenue = periodTransactions.filter(t => t.category === 'revenue').reduce((sum, t) => sum + t.amount, 0);
        const expenses = periodTransactions.filter(t => t.category === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        return {
          month: period.label,
          revenue: revenue,
          expenses: expenses,
          profit: revenue - expenses
        };
      })
    : (() => {
        // Fallback to last 6 months if no comparative periods
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const revenue = transactions.filter(t => {
            if (t.category !== 'revenue') return false;
            const tDate = new Date(t.transaction_date);
            return tDate >= monthStart && tDate <= monthEnd;
          }).reduce((sum, t) => sum + t.amount, 0);
          
          const expenses = transactions.filter(t => {
            if (t.category !== 'expense') return false;
            const tDate = new Date(t.transaction_date);
            return tDate >= monthStart && tDate <= monthEnd;
          }).reduce((sum, t) => sum + t.amount, 0);

          monthlyData.push({
            month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            revenue: revenue,
            expenses: expenses,
            profit: revenue - expenses
          });
        }
        return monthlyData;
      })();

  const monthlyRevenue = periodRevenue;

  const exportToCSV = () => {
    const headers = ['Revenue Type', 'Amount'];
    const revenueRows = revenueByType.map(item => [item.name, item.value]);
    
    const trendHeaders = ['Month', 'Revenue', 'Expenses', 'Profit'];
    const trendRows = monthlyRevenue.map(item => [item.month, item.revenue, item.expenses, item.profit]);
    
    const csvContent = [
      ['Revenue Overview Report'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      ['Revenue by Type'],
      headers,
      ...revenueRows,
      [],
      ['Monthly Trend'],
      trendHeaders,
      ...trendRows
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-overview-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByType.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparative Periods Trend */}
      <Card>
        <CardHeader>
          <CardTitle>{comparativePeriods.length > 0 ? 'Revenue & Profit by Period' : 'Revenue & Profit Trend (6 Months)'}</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                <Bar dataKey="profit" fill="#3b82f6" name="Net Profit" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}