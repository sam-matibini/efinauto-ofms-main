import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

export default function BalanceSheet({ comparativePeriods = [] }) {
  const dateRange = comparativePeriods[0] || { from: new Date(), to: new Date() };
  const { selectedCompanyId } = useCompany();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Filter transactions up to the end date
  const relevantTransactions = transactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    return transDate <= dateRange.to;
  });

  // Calculate account balances
  const calculateBalance = (accountType, category = null) => {
    return accounts
      .filter(acc => acc.account_type === accountType && (category ? acc.account_category === category : true))
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);
  };

  // Assets
  const currentAssets = {
    cash: calculateBalance('asset', 'cash'),
    accountsReceivable: calculateBalance('asset', 'accounts_receivable'),
    inventory: calculateBalance('asset', 'inventory'),
  };
  const totalCurrentAssets = currentAssets.cash + currentAssets.accountsReceivable + currentAssets.inventory;

  const fixedAssets = calculateBalance('asset', 'fixed_assets');
  const totalAssets = totalCurrentAssets + fixedAssets;

  // Liabilities
  const currentLiabilities = calculateBalance('liability', 'accounts_payable');
  const totalLiabilities = currentLiabilities;

  // Equity
  const equity = calculateBalance('equity');
  
  // Calculate retained earnings from profit/loss
  const revenue = relevantTransactions
    .filter(t => t.category === 'revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const expenses = relevantTransactions
    .filter(t => t.category === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const retainedEarnings = revenue - expenses;
  const totalEquity = equity + retainedEarnings;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const handleExport = () => {
    // Create CSV content
    const csv = [
      ['Balance Sheet (Statement of Financial Position)'],
      [`As of ${dateRange.to.toLocaleDateString()}`],
      [''],
      ['ASSETS'],
      ['Current Assets'],
      ['Cash', currentAssets.cash.toFixed(2)],
      ['Accounts Receivable', currentAssets.accountsReceivable.toFixed(2)],
      ['Inventory', currentAssets.inventory.toFixed(2)],
      ['Total Current Assets', totalCurrentAssets.toFixed(2)],
      [''],
      ['Fixed Assets', fixedAssets.toFixed(2)],
      [''],
      ['TOTAL ASSETS', totalAssets.toFixed(2)],
      [''],
      ['LIABILITIES AND EQUITY'],
      ['Current Liabilities'],
      ['Accounts Payable', currentLiabilities.toFixed(2)],
      ['Total Liabilities', totalLiabilities.toFixed(2)],
      [''],
      ['Equity'],
      ['Capital', equity.toFixed(2)],
      ['Retained Earnings', retainedEarnings.toFixed(2)],
      ['Total Equity', totalEquity.toFixed(2)],
      [''],
      ['TOTAL LIABILITIES AND EQUITY', totalLiabilitiesAndEquity.toFixed(2)],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${dateRange.to.toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Balance Sheet
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Statement of Financial Position as of {dateRange.to.toLocaleDateString()}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Assets */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-blue-700">ASSETS</h3>
            
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Current Assets</h4>
              <div className="space-y-1 pl-4">
                <div className="flex justify-between text-sm">
                  <span>Cash</span>
                  <span>${currentAssets.cash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Accounts Receivable</span>
                  <span>${currentAssets.accountsReceivable.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Inventory</span>
                  <span>${currentAssets.inventory.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-2">
                  <span>Total Current Assets</span>
                  <span>${totalCurrentAssets.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Fixed Assets</span>
                <span>${fixedAssets.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-lg border-t-2 border-blue-700 pt-2">
              <span>TOTAL ASSETS</span>
              <span className="text-blue-700">${totalAssets.toLocaleString()}</span>
            </div>
          </div>

          {/* Liabilities and Equity */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-red-700">LIABILITIES AND EQUITY</h3>
            
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Current Liabilities</h4>
              <div className="space-y-1 pl-4">
                <div className="flex justify-between text-sm">
                  <span>Accounts Payable</span>
                  <span>${currentLiabilities.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-2">
                  <span>Total Liabilities</span>
                  <span>${totalLiabilities.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Equity</h4>
              <div className="space-y-1 pl-4">
                <div className="flex justify-between text-sm">
                  <span>Capital</span>
                  <span>${equity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Retained Earnings</span>
                  <span>${retainedEarnings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-2">
                  <span>Total Equity</span>
                  <span>${totalEquity.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between font-bold text-lg border-t-2 border-red-700 pt-2">
              <span>TOTAL LIABILITIES AND EQUITY</span>
              <span className="text-red-700">${totalLiabilitiesAndEquity.toLocaleString()}</span>
            </div>
          </div>

          {/* Balance Check */}
          {Math.abs(totalAssets - totalLiabilitiesAndEquity) > 0.01 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Assets and Liabilities + Equity do not balance. 
                Difference: ${Math.abs(totalAssets - totalLiabilitiesAndEquity).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}