import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  BarChart3,
  Play
} from "lucide-react";
import { format } from "date-fns";
import RevenueOverview from "@/components/accounting/RevenueOverview";
import TransactionsList from "@/components/accounting/TransactionsList";
import ProfitLossStatement from "@/components/accounting/ProfitLossStatement";
import ChartOfAccounts from "@/components/accounting/ChartOfAccounts";
import BalanceSheet from "@/components/accounting/BalanceSheet";
import RetainedEarningsStatement from "@/components/accounting/RetainedEarningsStatement";
import CashFlowStatement from "@/components/accounting/CashFlowStatement";
import FixedAssetsRegister from "@/components/accounting/FixedAssetsRegister";
import PeriodComparison from "@/components/shared/PeriodComparison";

export default function Accounting() {
  const { selectedCompanyId } = useCompany();
  const [comparativePeriods, setComparativePeriods] = useState([]);
  const [activePeriods, setActivePeriods] = useState([]);

  const handlePeriodsChange = (periods) => {
    setComparativePeriods(periods);
  };

  const handleRunReport = () => {
    setActivePeriods(comparativePeriods);
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

  // Calculate metrics for all comparative periods
  const periodMetrics = activePeriods.map((period) => {
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate >= period.from && transDate <= period.to;
    });

    const revenue = periodTransactions
      .filter(t => t.category === 'revenue' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const expenses = periodTransactions
      .filter(t => t.category === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      label: period.label,
      revenue,
      expenses,
      profit: revenue - expenses,
      dateRange: period
    };
  });

  // Use first period for main display
  const currentPeriod = periodMetrics[0] || { revenue: 0, expenses: 0, profit: 0 };
  const totalRevenue = currentPeriod.revenue;
  const totalExpenses = currentPeriod.expenses;
  const netProfit = currentPeriod.profit;

  // Calculate growth compared to previous period
  const previousPeriod = periodMetrics[1];
  const revenueGrowth = previousPeriod && previousPeriod.revenue > 0
    ? ((totalRevenue - previousPeriod.revenue) / previousPeriod.revenue * 100).toFixed(1)
    : 0;
  
  const currentDateRange = activePeriods[0] || { from: new Date(), to: new Date() };

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
            <h1 className="text-2xl font-bold text-white">Financials</h1>
            <p className="text-sm text-gray-300 mt-1">Financial management and reporting</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Period Comparison Selector */}
        <PeriodComparison onPeriodsChange={handlePeriodsChange} maxPeriods={12} />

        <div className="flex justify-end">
          <Button 
            onClick={handleRunReport} 
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={comparativePeriods.length === 0}
          >
            <Play className="w-4 h-4 mr-2" />
            Run Report
          </Button>
        </div>

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
          <TabsList className="grid w-full grid-cols-8 h-auto">
            <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="retained-earnings">Retained Earnings</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
            <TabsTrigger value="fixed-assets">Fixed Assets</TabsTrigger>
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
            <TransactionsList transactions={transactions} dateRange={currentDateRange} />
          </TabsContent>

          <TabsContent value="profit-loss">
            <ProfitLossStatement 
              transactions={transactions}
              comparativePeriods={activePeriods}
            />
          </TabsContent>

          <TabsContent value="balance-sheet">
            <BalanceSheet comparativePeriods={activePeriods} />
          </TabsContent>

          <TabsContent value="retained-earnings">
            <RetainedEarningsStatement comparativePeriods={activePeriods} />
          </TabsContent>

          <TabsContent value="cash-flow">
            <CashFlowStatement comparativePeriods={activePeriods} />
          </TabsContent>

          <TabsContent value="fixed-assets">
            <FixedAssetsRegister />
          </TabsContent>

          <TabsContent value="accounts">
            <ChartOfAccounts />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}