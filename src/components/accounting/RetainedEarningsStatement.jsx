import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Download } from "lucide-react";

export default function RetainedEarningsStatement({ dateRange }) {
  const { selectedCompanyId } = useCompany();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Calculate beginning balance (all transactions before the period)
  const beginningTransactions = transactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    return transDate < dateRange.from;
  });

  const beginningRevenue = beginningTransactions
    .filter(t => t.category === 'revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const beginningExpenses = beginningTransactions
    .filter(t => t.category === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const beginningRetainedEarnings = beginningRevenue - beginningExpenses;

  // Calculate current period
  const periodTransactions = transactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    return transDate >= dateRange.from && transDate <= dateRange.to;
  });

  const periodRevenue = periodTransactions
    .filter(t => t.category === 'revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const periodExpenses = periodTransactions
    .filter(t => t.category === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netIncome = periodRevenue - periodExpenses;

  // Dividends (for now, set to 0 - can be enhanced later)
  const dividends = 0;

  const endingRetainedEarnings = beginningRetainedEarnings + netIncome - dividends;

  const handleExport = () => {
    const csv = [
      ['Statement of Retained Earnings'],
      [`For the period ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`],
      [''],
      ['Beginning Retained Earnings', beginningRetainedEarnings.toFixed(2)],
      ['Add: Net Income', netIncome.toFixed(2)],
      ['Less: Dividends', dividends.toFixed(2)],
      ['Ending Retained Earnings', endingRetainedEarnings.toFixed(2)],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retained-earnings-${dateRange.from.toISOString().split('T')[0]}-to-${dateRange.to.toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Statement of Retained Earnings
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              For the period {dateRange.from.toLocaleDateString()} to {dateRange.to.toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-w-2xl">
          <div className="flex justify-between py-2">
            <span className="font-semibold">Beginning Retained Earnings</span>
            <span className="font-mono">${beginningRetainedEarnings.toLocaleString()}</span>
          </div>

          <div className="border-l-4 border-green-500 pl-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Add: Net Income for the Period</span>
              <span className="font-mono text-green-600">${netIncome.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-l-4 border-red-500 pl-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Less: Dividends Paid</span>
              <span className="font-mono text-red-600">${dividends.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-between py-3 border-t-2 border-gray-300 font-bold text-lg">
            <span>Ending Retained Earnings</span>
            <span className={`font-mono ${endingRetainedEarnings >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              ${endingRetainedEarnings.toLocaleString()}
            </span>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h4 className="font-semibold mb-2">Net Income Breakdown</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Revenue</span>
                <span className="text-green-600">${periodRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Expenses</span>
                <span className="text-red-600">${periodExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Net Income</span>
                <span className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${netIncome.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}