import React from "react";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { balanceSheet, cashFlowStatement, profitAndLoss } from "@/lib/financialStatements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  Package, CreditCard, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function FinancialDashboard({ dateRange, reportBasis = "accrual" }) {
  const { ledger } = useFinancialBooks(reportBasis);

  const monthlyData = React.useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      if (dateRange?.from && monthEnd < dateRange.from) continue;
      if (dateRange?.to && monthStart > dateRange.to) continue;
      const earnings = profitAndLoss(ledger, monthStart, monthEnd);
      const flow = cashFlowStatement(ledger, monthStart, monthEnd);
      const cashIn = Math.max(flow.cashFromSales, 0) + Math.max(flow.netCashFromFinancing, 0);
      const cashOut = flow.cashPaidToSuppliers + flow.vehicleInventoryPurchases + flow.equipmentPurchases
        + Math.max(flow.operatingExpenses, 0) + Math.max(-flow.netCashFromFinancing, 0) + Math.max(-flow.cashFromSales, 0);
      months.push({
        month: format(monthDate, "MMM yy"),
        revenue: earnings.revenue,
        cogs: earnings.cogs,
        grossProfit: earnings.grossProfit,
        expenses: earnings.operatingExpenses + earnings.payrollExpenses,
        netProfit: earnings.netProfit,
        cashIn,
        cashOut,
        netCash: flow.netChangeInCash,
      });
    }
    return months;
  }, [ledger, dateRange]);

  const currentTotals = React.useMemo(() => {
    const earnings = profitAndLoss(ledger, dateRange?.from, dateRange?.to);
    const position = balanceSheet(ledger, dateRange?.to || new Date());
    const grossMargin = earnings.revenue > 0 ? (earnings.grossProfit / earnings.revenue) * 100 : 0;
    const netMargin = earnings.revenue > 0 ? (earnings.netProfit / earnings.revenue) * 100 : 0;
    return {
      revenue: earnings.revenue,
      cogs: earnings.cogs,
      grossProfit: earnings.grossProfit,
      expenses: earnings.operatingExpenses + earnings.payrollExpenses,
      netProfit: earnings.netProfit,
      grossMargin,
      netMargin,
      inventory: position.vehicleInventory + position.otherInventory,
      receivables: position.accountsReceivable,
      payables: position.accountsPayable,
    };
  }, [ledger, dateRange]);

  const revenueBreakdown = React.useMemo(() => {
    const earnings = profitAndLoss(ledger, dateRange?.from, dateRange?.to);
    return [
      { name: "Vehicle Sales", value: earnings.vehicleSalesRevenue, color: "#3b82f6" },
      { name: "Service Revenue", value: earnings.serviceRevenue, color: "#10b981" },
      { name: "Parts Revenue", value: earnings.partsRevenue, color: "#f59e0b" },
      { name: "Other Revenue", value: earnings.otherRevenue, color: "#8b5cf6" },
    ].filter((item) => item.value > 0);
  }, [ledger, dateRange]);

  const expenseBreakdown = React.useMemo(() => {
    const earnings = profitAndLoss(ledger, dateRange?.from, dateRange?.to);
    const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16"];
    return [
      { name: "Vehicle COGS", value: earnings.vehicleCogs },
      { name: "Parts COGS", value: earnings.otherCogs },
      { name: "Operating", value: earnings.operatingExpenses },
      { name: "Payroll", value: earnings.payrollExpenses },
    ].filter((item) => item.value > 0).map((item, index) => ({ ...item, color: colors[index % colors.length] }));
  }, [ledger, dateRange]);

  const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = "blue" }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const formatCurrency = (value) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(currentTotals.revenue)}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Gross Profit"
          value={formatCurrency(currentTotals.grossProfit)}
          subtitle={`${currentTotals.grossMargin.toFixed(1)}% margin`}
          icon={TrendingUp}
          color="blue"
        />
        <KPICard
          title="Net Profit"
          value={formatCurrency(currentTotals.netProfit)}
          subtitle={`${currentTotals.netMargin.toFixed(1)}% margin`}
          icon={currentTotals.netProfit >= 0 ? TrendingUp : TrendingDown}
          color={currentTotals.netProfit >= 0 ? "green" : "red"}
        />
        <KPICard
          title="Inventory Value"
          value={formatCurrency(currentTotals.inventory)}
          icon={Package}
          color="purple"
        />
      </div>

      {/* A/R and A/P */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Accounts Receivable</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(currentTotals.receivables)}</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Accounts Payable</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(currentTotals.payables)}</p>
              </div>
              <Wallet className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Profit Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue & Profit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Area type="monotone" dataKey="grossProfit" name="Gross Profit" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Breakdown Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No revenue data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={expenseBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="value" name="Amount">
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No expense data for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cash Flow Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="cashIn" name="Cash In" fill="#22c55e" />
              <Bar dataKey="cashOut" name="Cash Out" fill="#ef4444" />
              <Line type="monotone" dataKey="netCash" name="Net Cash" stroke="#3b82f6" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold">Month</th>
                  <th className="text-right p-3 font-semibold">Revenue</th>
                  <th className="text-right p-3 font-semibold">COGS</th>
                  <th className="text-right p-3 font-semibold">Gross Profit</th>
                  <th className="text-right p-3 font-semibold">Expenses</th>
                  <th className="text-right p-3 font-semibold">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.slice(-6).map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{row.month}</td>
                    <td className="p-3 text-right text-green-600">{formatCurrency(row.revenue)}</td>
                    <td className="p-3 text-right text-red-600">({formatCurrency(row.cogs)})</td>
                    <td className="p-3 text-right">{formatCurrency(row.grossProfit)}</td>
                    <td className="p-3 text-right text-red-600">({formatCurrency(row.expenses)})</td>
                    <td className={`p-3 text-right font-semibold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.netProfit)}
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