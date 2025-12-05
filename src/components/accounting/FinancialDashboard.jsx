import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  Package, CreditCard, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function FinancialDashboard({ dateRange, accountTypeFilter = "all" }) {
  const { selectedCompanyId } = useCompany();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', selectedCompanyId],
    queryFn: () => base44.entities.Purchase.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  // Generate monthly data for the last 12 months
  const monthlyData = React.useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Filter by date range if provided
      if (dateRange?.from && monthEnd < dateRange.from) continue;
      if (dateRange?.to && monthStart > dateRange.to) continue;

      const monthSales = sales.filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return saleDate >= monthStart && saleDate <= monthEnd;
      });

      const monthPurchases = purchases.filter(p => {
        const purchaseDate = new Date(p.order_date || p.created_date);
        return purchaseDate >= monthStart && purchaseDate <= monthEnd;
      });

      const revenue = monthSales.reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);
      
      const cogs = monthSales.reduce((sum, s) => {
        if (s.vehicle_id) {
          const vehicle = vehicles.find(v => v.id === s.vehicle_id);
          return sum + (vehicle?.total_cost || vehicle?.purchase_price || 0);
        }
        return sum;
      }, 0);

      const expenses = transactions
        .filter(t => {
          const transDate = new Date(t.transaction_date);
          if (transDate < monthStart || transDate > monthEnd) return false;
          const account = accounts.find(a => a.id === t.account_id);
          if (accountTypeFilter !== "all" && account?.account_type !== accountTypeFilter) return false;
          return account?.account_type === 'expense';
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - expenses;

      const cashIn = monthSales
        .filter(s => s.payment_status === 'paid')
        .reduce((sum, s) => sum + (s.total_paid || 0), 0);

      const cashOut = monthPurchases
        .filter(p => p.payment_status === 'paid')
        .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

      months.push({
        month: format(monthDate, 'MMM yy'),
        revenue,
        cogs,
        grossProfit,
        expenses,
        netProfit,
        cashIn,
        cashOut,
        netCash: cashIn - cashOut
      });
    }
    return months;
  }, [sales, purchases, transactions, vehicles, accounts, dateRange, accountTypeFilter]);

  // Current period totals
  const currentTotals = React.useMemo(() => {
    const filteredSales = sales.filter(s => {
      const saleDate = new Date(s.sale_date || s.created_date);
      if (dateRange?.from && saleDate < dateRange.from) return false;
      if (dateRange?.to && saleDate > dateRange.to) return false;
      return true;
    });

    const filteredPurchases = purchases.filter(p => {
      const purchaseDate = new Date(p.order_date || p.created_date);
      if (dateRange?.from && purchaseDate < dateRange.from) return false;
      if (dateRange?.to && purchaseDate > dateRange.to) return false;
      return true;
    });

    const revenue = filteredSales.reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);
    
    const cogs = filteredSales.reduce((sum, s) => {
      if (s.vehicle_id) {
        const vehicle = vehicles.find(v => v.id === s.vehicle_id);
        return sum + (vehicle?.total_cost || vehicle?.purchase_price || 0);
      }
      return sum;
    }, 0);

    const expenses = transactions
      .filter(t => {
        const transDate = new Date(t.transaction_date);
        if (dateRange?.from && transDate < dateRange.from) return false;
        if (dateRange?.to && transDate > dateRange.to) return false;
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_type === 'expense';
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue * 100) : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue * 100) : 0;

    const inventory = vehicles
      .filter(v => v.status === 'in_stock')
      .reduce((sum, v) => sum + (v.total_cost || v.purchase_price || 0), 0);

    const receivables = filteredSales
      .filter(s => s.payment_status !== 'paid')
      .reduce((sum, s) => sum + ((s.grand_total || s.sale_price || 0) - (s.total_paid || 0)), 0);

    const payables = filteredPurchases
      .filter(p => p.payment_status !== 'paid')
      .reduce((sum, p) => sum + ((p.total_amount || 0) - (p.amount_paid || 0)), 0);

    return { revenue, cogs, grossProfit, expenses, netProfit, grossMargin, netMargin, inventory, receivables, payables };
  }, [sales, purchases, transactions, vehicles, accounts, dateRange]);

  // Revenue breakdown by type
  const revenueBreakdown = React.useMemo(() => {
    const vehicleSales = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        if (dateRange?.from && saleDate < dateRange.from) return false;
        if (dateRange?.to && saleDate > dateRange.to) return false;
        return s.sale_type === 'domestic' || !s.sale_type;
      })
      .reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);

    const exportSales = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        if (dateRange?.from && saleDate < dateRange.from) return false;
        if (dateRange?.to && saleDate > dateRange.to) return false;
        return s.sale_type === 'export';
      })
      .reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);

    const serviceRevenue = transactions
      .filter(t => {
        const transDate = new Date(t.transaction_date);
        if (dateRange?.from && transDate < dateRange.from) return false;
        if (dateRange?.to && transDate > dateRange.to) return false;
        return t.transaction_type === 'service_revenue' || t.reference_type === 'RepairOrder';
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return [
      { name: 'Domestic Sales', value: vehicleSales, color: '#3b82f6' },
      { name: 'Export Sales', value: exportSales, color: '#10b981' },
      { name: 'Service Revenue', value: serviceRevenue, color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [sales, transactions, dateRange]);

  // Expense breakdown
  const expenseBreakdown = React.useMemo(() => {
    const expenseByType = {};
    
    transactions.forEach(t => {
      const transDate = new Date(t.transaction_date);
      if (dateRange?.from && transDate < dateRange.from) return;
      if (dateRange?.to && transDate > dateRange.to) return;
      
      const account = accounts.find(a => a.id === t.account_id);
      if (account?.account_type !== 'expense') return;
      
      const category = account?.account_name || 'Other Expenses';
      expenseByType[category] = (expenseByType[category] || 0) + (t.amount || 0);
    });

    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6'];
    return Object.entries(expenseByType)
      .map(([name, value], idx) => ({ name, value, color: colors[idx % colors.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions, accounts, dateRange]);

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