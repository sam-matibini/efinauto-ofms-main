import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { accountActivity, formatStatementDate, trialBalance } from "@/lib/financialStatements";

export default function TrialBalance({ comparativePeriods = [], reportBasis = "accrual" }) {
  const { ledger, accounts } = useFinancialBooks(reportBasis);
  const [drilldown, setDrilldown] = useState(null);

  const cleanAccountName = (name) => {
    if (!name) return '';
    // Replace black diamonds and other special characters with spaces
    return name.replace(/[�♦◆▶]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const handleDrilldown = (accountCode, periodIdx) => {
    const period = periods[periodIdx];
    const chart = accounts.find((account) => account.account_code === accountCode);
    const ledgerAccount = ledger.accountList.find((account) => account.code === accountCode);
    const name = chart?.account_name || ledgerAccount?.name || accountCode;
    setDrilldown({
      title: `${accountCode} - ${cleanAccountName(name)}`,
      items: accountActivity(ledger, [accountCode], { to: period.to }),
      period,
    });
  };

  // Group accounts by type
  const accountGroups = {
    asset: { title: "Assets", accounts: [] },
    liability: { title: "Liabilities", accounts: [] },
    equity: { title: "Equity", accounts: [] },
    revenue: { title: "Revenue", accounts: [] },
    expense: { title: "Expenses", accounts: [] }
  };

  accounts.forEach(account => {
    if (accountGroups[account.account_type]) {
      accountGroups[account.account_type].accounts.push(account);
    }
  });

  // Add standard accounts for display in the Trial Balance
  const standardAccounts = [
    // Assets (1000-1999)
    { id: 'cash', account_code: '1000', account_name: 'Cash and Bank', account_type: 'asset' },
    { id: 'undeposited', account_code: '1050', account_name: 'Undeposited Funds', account_type: 'asset' },
    { id: 'ar', account_code: '1100', account_name: 'Accounts Receivable', account_type: 'asset' },
    { id: 'gst-receivable', account_code: '1150', account_name: 'GST/HST Receivable (ITC)', account_type: 'asset' },
    { id: 'vehicle-inventory', account_code: '1200', account_name: 'Vehicle Inventory', account_type: 'asset' },
    { id: 'parts-inventory', account_code: '1210', account_name: 'Parts Inventory', account_type: 'asset' },
    { id: 'product-inventory', account_code: '1220', account_name: 'Product Inventory', account_type: 'asset' },
    { id: 'fixed-assets', account_code: '1500', account_name: 'Fixed Assets', account_type: 'asset' },
    { id: 'accum-dep', account_code: '1590', account_name: 'Accumulated Depreciation', account_type: 'asset' },
    // Liabilities (2000-2999)
    { id: 'ap', account_code: '2000', account_name: 'Accounts Payable', account_type: 'liability' },
    { id: 'gst-payable', account_code: '2100', account_name: 'GST Payable', account_type: 'liability' },
    { id: 'pst-payable', account_code: '2110', account_name: 'PST/QST Payable', account_type: 'liability' },
    { id: 'hst-payable', account_code: '2120', account_name: 'HST Payable', account_type: 'liability' },
    { id: 'wages-payable', account_code: '2300', account_name: 'Wages Payable', account_type: 'liability' },
    { id: 'payroll-liabilities', account_code: '2400', account_name: 'Payroll Liabilities', account_type: 'liability' },
    { id: 'short-debt', account_code: '2200', account_name: 'Short-term Debt', account_type: 'liability' },
    { id: 'long-debt', account_code: '2500', account_name: 'Long-term Debt', account_type: 'liability' },
    // Equity (3000-3999)
    { id: 'retained-earnings', account_code: '3100', account_name: 'Retained Earnings', account_type: 'equity' },
    { id: 'owner-equity', account_code: '3000', account_name: "Owner's Equity", account_type: 'equity' },
    { id: 'owner-draws', account_code: '3200', account_name: 'Owner Draws', account_type: 'equity' },
    // Revenue (4000-4999)
    { id: 'sales-revenue', account_code: '4000', account_name: 'Vehicle Sales Revenue', account_type: 'revenue' },
    { id: 'service-revenue', account_code: '4100', account_name: 'Service Revenue', account_type: 'revenue' },
    { id: 'parts-revenue', account_code: '4300', account_name: 'Parts Revenue', account_type: 'revenue' },
    { id: 'other-revenue', account_code: '4900', account_name: 'Other Revenue', account_type: 'revenue' },
    { id: 'freight-revenue', account_code: '4200', account_name: 'Freight Service Revenue', account_type: 'revenue' },
    { id: 'salvage-revenue', account_code: '4400', account_name: 'Salvage Revenue', account_type: 'revenue' },
    { id: 'interest-income', account_code: '4500', account_name: 'Interest Income', account_type: 'revenue' },
    { id: 'fx-gain', account_code: '4600', account_name: 'Foreign Exchange Gain', account_type: 'revenue' },
    { id: 'inv-adj-gain', account_code: '4700', account_name: 'Inventory Adjustment Gain', account_type: 'revenue' },
    // Expenses (5000-6999)
    { id: 'cogs', account_code: '5000', account_name: 'Cost of Vehicles Sold', account_type: 'expense' },
    { id: 'parts-expense', account_code: '5100', account_name: 'Cost of Parts Sold', account_type: 'expense' },
    { id: 'labor-expense', account_code: '5200', account_name: 'Labor Expense', account_type: 'expense' },
    { id: 'operating-expense', account_code: '6000', account_name: 'Operating Expenses', account_type: 'expense' },
    { id: 'freight-expense', account_code: '5400', account_name: 'Shipping & Freight Expense', account_type: 'expense' },
    { id: 'inv-shrinkage', account_code: '5500', account_name: 'Inventory Shrinkage', account_type: 'expense' },
    { id: 'inv-writeoff', account_code: '5510', account_name: 'Inventory Write-Off', account_type: 'expense' },
    { id: 'wages-expense', account_code: '6100', account_name: 'Wages & Salaries Expense', account_type: 'expense' },
    { id: 'bank-charges', account_code: '6200', account_name: 'Bank Charges & Fees', account_type: 'expense' },
    { id: 'fx-loss', account_code: '6300', account_name: 'Foreign Exchange Loss', account_type: 'expense' },
  ];

  standardAccounts.forEach(stdAccount => {
    const exists = accountGroups[stdAccount.account_type].accounts.some(
      a => a.account_code === stdAccount.account_code
    );
    if (!exists) {
      accountGroups[stdAccount.account_type].accounts.push(stdAccount);
    }
  });

  // Sort accounts by code within each group
  Object.values(accountGroups).forEach(group => {
    group.accounts.sort((a, b) => (a.account_code || '').localeCompare(b.account_code || ''));
  });

  const periodData = periods.map((period) => ({ period, ...trialBalance(ledger, period.to) }));

  periodData.forEach((periodRow) => {
    periodRow.accounts.forEach((row) => {
      const group = accountGroups[row.type] || accountGroups.expense;
      if (!group.accounts.some((account) => account.account_code === row.code)) {
        group.accounts.push({ account_code: row.code, account_name: row.name, account_type: row.type });
      }
    });
  });
  Object.values(accountGroups).forEach((group) => {
    group.accounts.sort((a, b) => (a.account_code || "").localeCompare(b.account_code || ""));
  });

  const exportToCSV = () => {
    const headers = ['Code', 'Account', ...periods.map(p => `${p.label} - Debit`), ...periods.map(p => `${p.label} - Credit`)];
    const rows = [];
    
    Object.values(accountGroups).forEach(group => {
      if (group.accounts.length > 0) {
        rows.push([group.title]);
        group.accounts.forEach(account => {
          const row = [account.account_code, account.account_name];
          periodData.forEach(pd => {
            const acc = pd.accounts.find(a => a.code === account.account_code);
            row.push(acc ? acc.debit.toFixed(2) : '0.00');
          });
          periodData.forEach(pd => {
            const acc = pd.accounts.find(a => a.code === account.account_code);
            row.push(acc ? acc.credit.toFixed(2) : '0.00');
          });
          rows.push(row);
        });
        rows.push([]);
      }
    });

    const csvContent = [
      ['Trial Balance'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ...rows
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Trial Balance</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Unclosed balances. Debits equal credits, and net income is included in retained earnings on the balance sheet.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => window.print()} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 font-semibold w-24">Code</th>
                <th className="text-left py-3 px-4 font-semibold">Account</th>
                {periods.map((period, idx) => (
                  <React.Fragment key={idx}>
                    <th className="text-right py-3 px-4 font-semibold">{period.label}<br/>Debit</th>
                    <th className="text-right py-3 px-4 font-semibold">{period.label}<br/>Credit</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(accountGroups).map(([key, group]) => (
                group.accounts.length > 0 && (
                  <React.Fragment key={key}>
                    <tr className="bg-gray-100">
                      <td colSpan={2 + periods.length * 2} className="py-2 px-4 font-bold text-gray-900">
                        {group.title}
                      </td>
                    </tr>
                    {group.accounts.map((account, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4 pl-8 font-mono text-sm">{account.account_code}</td>
                        <td className="py-2 px-4">{cleanAccountName(account.account_name)}</td>
                        {periodData.map((pd, pdIdx) => {
                          const acc = pd.accounts.find(a => a.code === account.account_code);
                          return (
                            <React.Fragment key={pdIdx}>
                              <td 
                                className={`text-right py-2 px-4 ${acc && acc.debit > 0 ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                                onDoubleClick={() => acc && acc.debit > 0 && handleDrilldown(account.account_code, pdIdx, 'debit')}
                                title={acc && acc.debit > 0 ? 'Double-click to view details' : ''}
                              >
                                {acc && acc.debit > 0 ? `$${acc.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td 
                                className={`text-right py-2 px-4 ${acc && acc.credit > 0 ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                                onDoubleClick={() => acc && acc.credit > 0 && handleDrilldown(account.account_code, pdIdx, 'credit')}
                                title={acc && acc.credit > 0 ? 'Double-click to view details' : ''}
                              >
                                {acc && acc.credit > 0 ? `$${acc.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                )
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-blue-50 font-bold">
                <td className="py-3 px-4" colSpan={2}>TOTAL</td>
                {periodData.map((pd, idx) => (
                  <React.Fragment key={idx}>
                    <td className="text-right py-3 px-4">
                      ${pd.totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-3 px-4">
                      ${pd.totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
              <tr className="bg-gray-100">
                <td className="py-3 px-4 font-semibold" colSpan={2}>Difference</td>
                {periodData.map((pd, idx) => (
                  <td 
                    key={idx} 
                    colSpan={2} 
                    className={`text-right py-3 px-4 font-bold ${Math.abs(pd.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {Math.abs(pd.difference) < 0.01 ? 'Balanced ✓' : `$${pd.difference.toFixed(2)} (Out of Balance)`}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        {accounts.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ No chart of accounts found. Please create accounts first to see the trial balance.
            </p>
          </div>
        )}

        {periodData.some(pd => Math.abs(pd.difference) >= 0.01) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              ⚠️ <strong>Warning:</strong> The trial balance is out of balance. Total debits should equal total credits. 
              Please review your transactions for potential errors.
            </p>
          </div>
        )}

        {/* Drilldown Dialog */}
        <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{drilldown?.title} - {drilldown?.period?.label}</DialogTitle>
            </DialogHeader>
            {drilldown && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-blue-600">
                    ${drilldown.items.reduce((sum, i) => sum + i.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 bg-gray-100">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-left py-2 px-3">Reference</th>
                      <th className="text-right py-2 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldown.items.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4 text-gray-500">No items found</td></tr>
                    ) : (
                      drilldown.items.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">{formatStatementDate(item.date)}</td>
                          <td className="py-2 px-3">{item.description}</td>
                          <td className="py-2 px-3 text-gray-600">{item.reference || '-'}</td>
                          <td className="py-2 px-3 text-right font-medium">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}