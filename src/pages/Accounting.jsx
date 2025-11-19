import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  BarChart3,
  Calendar
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters, subYears } from "date-fns";
import RevenueOverview from "@/components/accounting/RevenueOverview";
import TransactionsList from "@/components/accounting/TransactionsList";
import ProfitLossStatement from "@/components/accounting/ProfitLossStatement";
import ChartOfAccounts from "@/components/accounting/ChartOfAccounts";

export default function Accounting() {
  const { selectedCompanyId } = useCompany();
  const [period, setPeriod] = useState("this_month");
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [customDateFrom, setCustomDateFrom] = useState(null);
  const [customDateTo, setCustomDateTo] = useState(null);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    const today = new Date();
    
    switch (newPeriod) {
      case "this_month":
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case "last_month":
        const lastMonth = subMonths(today, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case "this_quarter":
        setDateRange({ from: startOfQuarter(today), to: endOfQuarter(today) });
        break;
      case "last_quarter":
        const lastQuarter = subQuarters(today, 1);
        setDateRange({ from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) });
        break;
      case "this_year":
        setDateRange({ from: startOfYear(today), to: endOfYear(today) });
        break;
      case "last_year":
        const lastYear = subYears(today, 1);
        setDateRange({ from: startOfYear(lastYear), to: endOfYear(lastYear) });
        break;
      case "custom":
        if (customDateFrom && customDateTo) {
          setDateRange({ from: customDateFrom, to: customDateTo });
        }
        break;
    }
  };

  const handleCustomDateApply = () => {
    if (customDateFrom && customDateTo) {
      setDateRange({ from: customDateFrom, to: customDateTo });
      setPeriod("custom");
    }
  };

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }, '-transaction_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => base44.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', selectedCompanyId],
    queryFn: () => base44.entities.Purchase.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Calculate key metrics for selected period
  const periodTransactions = transactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    return transDate >= dateRange.from && transDate <= dateRange.to;
  });

  const totalRevenue = periodTransactions
    .filter(t => t.category === 'revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = periodTransactions
    .filter(t => t.category === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netProfit = totalRevenue - totalExpenses;

  // Calculate previous period for comparison
  const periodLength = dateRange.to - dateRange.from;
  const previousPeriodFrom = new Date(dateRange.from.getTime() - periodLength);
  const previousPeriodTo = new Date(dateRange.from.getTime());

  const previousPeriodTransactions = transactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    return transDate >= previousPeriodFrom && transDate < previousPeriodTo;
  });

  const previousRevenue = previousPeriodTransactions
    .filter(t => t.category === 'revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const revenueGrowth = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
    : 0;

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-yellow-800">Please select a company to view accounting data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Accounting & Revenue</h1>
            <p className="text-sm text-gray-300 mt-1">Financial management and reporting</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Period Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Select Period</Label>
                <Select value={period} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_quarter">This Quarter</SelectItem>
                    <SelectItem value="last_quarter">Last Quarter</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === "custom" && (
                <div className="flex gap-2 items-end">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-40">
                          <Calendar className="w-4 h-4 mr-2" />
                          {customDateFrom ? format(customDateFrom, 'MMM d, yyyy') : 'Select'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={customDateFrom}
                          onSelect={setCustomDateFrom}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-40">
                          <Calendar className="w-4 h-4 mr-2" />
                          {customDateTo ? format(customDateTo, 'MMM d, yyyy') : 'Select'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={customDateTo}
                          onSelect={setCustomDateTo}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button onClick={handleCustomDateApply} disabled={!customDateFrom || !customDateTo}>
                    Apply
                  </Button>
                </div>
              )}

              <div className="flex-1 text-right">
                <Label className="text-sm font-medium mb-2 block">Viewing Period</Label>
                <p className="text-sm text-gray-600">
                  {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <h3 className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</h3>
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
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <h3 className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</h3>
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
                  <p className="text-sm text-gray-600">Net Profit</p>
                  <h3 className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${netProfit.toLocaleString()}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Monthly Growth</p>
                  <h3 className={`text-2xl font-bold ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueGrowth}%
                  </h3>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
            <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <RevenueOverview 
              transactions={transactions}
              sales={sales}
              repairs={repairs}
              purchases={purchases}
            />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsList transactions={transactions} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="profit-loss">
            <ProfitLossStatement 
              transactions={transactions}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </TabsContent>

          <TabsContent value="accounts">
            <ChartOfAccounts />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}