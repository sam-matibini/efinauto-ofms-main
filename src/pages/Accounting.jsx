import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  BarChart3,
  Play,
  Filter
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, subYears } from "date-fns";
import RevenueOverview from "@/components/accounting/RevenueOverview";
import TransactionsList from "@/components/accounting/TransactionsList";
import ProfitLossStatement from "@/components/accounting/ProfitLossStatement";
import AIChartOfAccounts from "@/components/accounting/AIChartOfAccounts";
import BalanceSheet from "@/components/accounting/BalanceSheet";
import RetainedEarningsStatement from "@/components/accounting/RetainedEarningsStatement";
import CashFlowStatement from "@/components/accounting/CashFlowStatement";
import FixedAssetsRegister from "@/components/accounting/FixedAssetsRegister";
import TrialBalance from "@/components/accounting/TrialBalance";
import GeneralLedger from "@/components/accounting/GeneralLedger";
import PeriodComparison from "@/components/shared/PeriodComparison";

export default function Accounting() {
  const { selectedCompanyId } = useCompany();
  const [comparativePeriods, setComparativePeriods] = useState([]);
  const [activePeriods, setActivePeriods] = useState([]);
  const [dateRange, setDateRange] = useState("previous_year");
  const [reportBasis, setReportBasis] = useState("accrual");

  const getDateRangeFromPreset = (preset) => {
    const today = new Date();
    let from, to;

    switch (preset) {
      case "this_week":
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "this_month":
        from = startOfMonth(today);
        to = today;
        break;
      case "this_quarter":
        from = startOfQuarter(today);
        to = endOfQuarter(today);
        break;
      case "this_year":
        from = startOfYear(today);
        to = endOfYear(today);
        break;
      case "year_to_date":
        from = startOfYear(today);
        to = today;
        break;
      case "yesterday":
        from = subDays(today, 1);
        to = subDays(today, 1);
        break;
      case "previous_week":
        from = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        to = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        break;
      case "previous_month":
        from = startOfMonth(subMonths(today, 1));
        to = endOfMonth(subMonths(today, 1));
        break;
      case "previous_quarter":
        from = startOfQuarter(subQuarters(today, 1));
        to = endOfQuarter(subQuarters(today, 1));
        break;
      case "previous_year":
        from = startOfYear(subYears(today, 1));
        to = endOfYear(subYears(today, 1));
        break;
      default:
        from = startOfYear(subYears(today, 1));
        to = endOfYear(subYears(today, 1));
    }

    return { from, to };
  };

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

  const { data: exports = [] } = useQuery({
    queryKey: ['exports', selectedCompanyId],
    queryFn: () => base44.entities.Export.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments', selectedCompanyId],
    queryFn: () => base44.entities.FreightShipment.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Combine all transactions from various sources for comprehensive financial reporting
  const allTransactions = React.useMemo(() => {
    const combined = [...transactions];
    const existingRefs = new Set(transactions.map(t => `${t.reference_type}-${t.reference_id}`));

    // Add sales not yet in transactions
    sales.forEach(sale => {
      if (!existingRefs.has(`Sale-${sale.id}`)) {
        combined.push({
          id: `sale-${sale.id}`,
          company_id: selectedCompanyId,
          transaction_type: 'sale_revenue',
          category: 'revenue',
          amount: sale.grand_total || sale.sale_price || 0,
          transaction_date: sale.sale_date || sale.created_date,
          customer_name: sale.customer_name,
          description: `Vehicle Sale: ${sale.vehicle_details || sale.vehicle_make_model || 'Vehicle'}`,
          reference_type: 'Sale',
          reference_id: sale.id,
          reference_number: sale.sale_number,
          status: sale.payment_status === 'paid' ? 'completed' : 'pending',
          tax_amount: sale.tax_total || 0,
          tax_gst: sale.tax_gst || 0,
          tax_pst: sale.tax_pst || 0,
          tax_hst: sale.tax_hst || 0
        });
      }
    });

    // Add purchases not yet in transactions
    purchases.forEach(purchase => {
      if (!existingRefs.has(`Purchase-${purchase.id}`)) {
        combined.push({
          id: `purchase-${purchase.id}`,
          company_id: selectedCompanyId,
          transaction_type: purchase.purchase_type === 'vehicle' ? 'vehicle_purchase' : 'parts_purchase',
          category: 'expense',
          amount: purchase.total_amount || 0,
          transaction_date: purchase.order_date || purchase.created_date,
          customer_name: purchase.supplier_name,
          description: `Purchase: ${purchase.purchase_type} from ${purchase.supplier_name}`,
          reference_type: 'Purchase',
          reference_id: purchase.id,
          reference_number: purchase.purchase_number,
          status: purchase.payment_status === 'paid' ? 'completed' : 'pending',
          tax_amount: purchase.tax_amount || 0
        });
      }
    });

    // Add repair order revenue not yet in transactions
    repairs.forEach(repair => {
      if (!existingRefs.has(`RepairOrder-${repair.id}`) && repair.status === 'completed') {
        combined.push({
          id: `repair-${repair.id}`,
          company_id: selectedCompanyId,
          transaction_type: 'service_revenue',
          category: 'revenue',
          amount: repair.total_cost || 0,
          transaction_date: repair.completion_date || repair.created_date,
          customer_name: repair.customer_name,
          description: `Service: ${repair.service_type?.replace(/_/g, ' ')} - ${repair.order_number}`,
          reference_type: 'RepairOrder',
          reference_id: repair.id,
          reference_number: repair.order_number,
          status: repair.payment_status === 'paid' ? 'completed' : 'pending',
          tax_amount: repair.tax_amount || 0
        });
      }
    });

    // Add export revenue not yet in transactions
    exports.forEach(exp => {
      if (!existingRefs.has(`Export-${exp.id}`)) {
        combined.push({
          id: `export-${exp.id}`,
          company_id: selectedCompanyId,
          transaction_type: 'sale_revenue',
          category: 'revenue',
          amount: exp.total_value || 0,
          transaction_date: exp.shipment_date || exp.created_date,
          customer_name: exp.customer_name,
          description: `Export: ${exp.export_number} to ${exp.destination_country}`,
          reference_type: 'Export',
          reference_id: exp.id,
          reference_number: exp.export_number,
          status: exp.payment_status === 'paid' ? 'completed' : 'pending',
          tax_amount: 0 // Exports are typically zero-rated
        });

        // Add freight cost as expense
        if (exp.freight_cost > 0) {
          combined.push({
            id: `export-freight-${exp.id}`,
            company_id: selectedCompanyId,
            transaction_type: 'overhead_expense',
            category: 'expense',
            amount: exp.freight_cost,
            transaction_date: exp.shipment_date || exp.created_date,
            description: `Freight Cost: ${exp.export_number}`,
            reference_type: 'Export',
            reference_id: exp.id,
            status: 'completed'
          });
        }
      }
    });

    // Add shipment costs not yet in transactions
    shipments.forEach(ship => {
      if (!existingRefs.has(`FreightShipment-${ship.id}`)) {
        if (ship.freight_cost > 0) {
          combined.push({
            id: `shipment-${ship.id}`,
            company_id: selectedCompanyId,
            transaction_type: 'overhead_expense',
            category: 'expense',
            amount: ship.freight_cost + (ship.handling_fees || 0) + (ship.customs_fees || 0),
            transaction_date: ship.pickup_date || ship.created_date,
            customer_name: ship.customer_name,
            description: `Shipment Cost: ${ship.shipment_number}`,
            reference_type: 'FreightShipment',
            reference_id: ship.id,
            reference_number: ship.shipment_number,
            status: ship.payment_status === 'paid' ? 'completed' : 'pending'
          });
        }
      }
    });

    return combined.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  }, [transactions, sales, purchases, repairs, exports, shipments, selectedCompanyId]);

  // Use comparative periods if active, otherwise use date range filter
  const selectedDateRange = getDateRangeFromPreset(dateRange);
  const effectivePeriods = activePeriods.length > 0 
    ? activePeriods 
    : [{ from: selectedDateRange.from, to: selectedDateRange.to, label: 'Current Period' }];
  
  const filteredTransactions = allTransactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    // Filter by the union of all active periods or by selected date range
    if (activePeriods.length > 0) {
      return activePeriods.some(period => 
        transDate >= period.from && transDate <= period.to
      );
    }
    return transDate >= selectedDateRange.from && transDate <= selectedDateRange.to;
  });

  // Calculate metrics for all comparative periods
  const periodMetrics = effectivePeriods.map((period) => {
    const periodTransactions = allTransactions.filter(t => {
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
        {/* Date Range and Report Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Date Range:</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="this_quarter">This Quarter</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="year_to_date">Year To Date</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="previous_week">Previous Week</SelectItem>
                      <SelectItem value="previous_month">Previous Month</SelectItem>
                      <SelectItem value="previous_quarter">Previous Quarter</SelectItem>
                      <SelectItem value="previous_year">Previous Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Report Basis:</Label>
                  <Select value={reportBasis} onValueChange={setReportBasis}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accrual">Accrual</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">From:</span> {format(selectedDateRange.from, 'yyyy/MM/dd')}
                <br />
                <span className="font-medium">To:</span> {format(selectedDateRange.to, 'yyyy/MM/dd')}
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Comparative Periods Summary */}
        {activePeriods.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Comparative Period Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Period</th>
                      <th className="text-right py-2 px-2">Revenue</th>
                      <th className="text-right py-2 px-2">Expenses</th>
                      <th className="text-right py-2 px-2">Net Profit</th>
                      <th className="text-right py-2 px-2">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodMetrics.map((period, idx) => {
                      const margin = period.revenue > 0 ? ((period.profit / period.revenue) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 font-medium">{period.label}</td>
                          <td className="text-right py-2 px-2 text-green-600">${period.revenue.toLocaleString()}</td>
                          <td className="text-right py-2 px-2 text-red-600">${period.expenses.toLocaleString()}</td>
                          <td className={`text-right py-2 px-2 font-semibold ${period.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            ${period.profit.toLocaleString()}
                          </td>
                          <td className="text-right py-2 px-2">{margin}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
          <TabsList className="grid w-full grid-cols-10 h-auto">
            <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
            <TabsTrigger value="retained-earnings">Retained Earnings</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
            <TabsTrigger value="fixed-assets">Fixed Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <RevenueOverview 
              transactions={filteredTransactions}
              sales={sales}
              repairs={repairs}
              purchases={purchases}
              comparativePeriods={effectivePeriods}
            />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsList 
              transactions={filteredTransactions} 
              dateRange={currentDateRange} 
              comparativePeriods={effectivePeriods}
            />
          </TabsContent>

          <TabsContent value="chart-of-accounts">
            <AIChartOfAccounts />
          </TabsContent>

          <TabsContent value="profit-loss">
            <ProfitLossStatement 
              transactions={allTransactions}
              comparativePeriods={effectivePeriods}
            />
          </TabsContent>

          <TabsContent value="balance-sheet">
            <BalanceSheet comparativePeriods={effectivePeriods} />
          </TabsContent>

          <TabsContent value="trial-balance">
            <TrialBalance 
              transactions={allTransactions}
              comparativePeriods={effectivePeriods}
            />
          </TabsContent>

          <TabsContent value="general-ledger">
            <GeneralLedger 
              transactions={allTransactions}
              comparativePeriods={effectivePeriods}
            />
          </TabsContent>

          <TabsContent value="retained-earnings">
            <RetainedEarningsStatement comparativePeriods={effectivePeriods} />
          </TabsContent>

          <TabsContent value="cash-flow">
            <CashFlowStatement comparativePeriods={effectivePeriods} />
          </TabsContent>

          <TabsContent value="fixed-assets">
            <FixedAssetsRegister comparativePeriods={effectivePeriods} />
          </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}