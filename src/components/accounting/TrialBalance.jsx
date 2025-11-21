import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";

export default function TrialBalance({ transactions, comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  // Define account structure
  const accountGroups = {
    assets: {
      title: "Assets",
      accounts: [
        { name: "Cash and Bank", type: "asset" },
        { name: "Accounts Receivable", type: "asset" },
        { name: "Inventory", type: "asset" },
        { name: "Fixed Assets", type: "asset" },
      ]
    },
    liabilities: {
      title: "Liabilities",
      accounts: [
        { name: "Accounts Payable", type: "liability" },
        { name: "Payroll Liabilities", type: "liability" },
        { name: "Short-term Debt", type: "liability" },
        { name: "Long-term Debt", type: "liability" },
      ]
    },
    equity: {
      title: "Equity",
      accounts: [
        { name: "Owner's Equity", type: "equity" },
        { name: "Retained Earnings", type: "equity" },
      ]
    },
    revenue: {
      title: "Revenue",
      accounts: [
        { name: "Sales Revenue", type: "revenue" },
        { name: "Service Revenue", type: "revenue" },
        { name: "Parts Revenue", type: "revenue" },
      ]
    },
    expenses: {
      title: "Expenses",
      accounts: [
        { name: "Cost of Goods Sold", type: "expense" },
        { name: "Payroll Expenses", type: "expense" },
        { name: "Operating Expenses", type: "expense" },
        { name: "Overhead Expenses", type: "expense" },
      ]
    }
  };

  // Calculate balances for each period
  const periodData = periods.map(period => {
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate >= period.from && transDate <= period.to;
    });

    // Calculate account balances
    const calculateBalance = (accountName) => {
      let debit = 0;
      let credit = 0;

      periodTransactions.forEach(t => {
        if (accountName === "Cash and Bank") {
          if (t.category === 'revenue') credit += t.amount;
          if (t.category === 'expense') debit += t.amount;
        } else if (accountName === "Accounts Receivable") {
          if (t.category === 'revenue' && t.status === 'pending') debit += t.amount;
        } else if (accountName === "Inventory") {
          debit = 50000; // Static for now
        } else if (accountName === "Fixed Assets") {
          if (t.transaction_type === 'vehicle_purchase') debit += t.amount;
        } else if (accountName === "Accounts Payable") {
          if (t.category === 'expense' && t.status === 'pending' && t.transaction_type !== 'payroll_liability') {
            credit += t.amount;
          }
        } else if (accountName === "Payroll Liabilities") {
          if (t.transaction_type === 'payroll_liability' && t.status === 'pending') {
            credit += t.amount;
          }
        } else if (accountName === "Short-term Debt") {
          credit = 20000; // Static
        } else if (accountName === "Long-term Debt") {
          credit = 50000; // Static
        } else if (accountName === "Owner's Equity") {
          credit = 100000; // Static
        } else if (accountName === "Retained Earnings") {
          const profit = periodTransactions
            .filter(tx => tx.category === 'revenue')
            .reduce((sum, tx) => sum + tx.amount, 0) -
            periodTransactions
            .filter(tx => tx.category === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
          if (profit > 0) credit += profit;
          else debit += Math.abs(profit);
        } else if (accountName === "Sales Revenue") {
          if (t.transaction_type === 'sale_revenue') credit += t.amount;
        } else if (accountName === "Service Revenue") {
          if (t.transaction_type === 'service_revenue') credit += t.amount;
        } else if (accountName === "Parts Revenue") {
          if (t.transaction_type === 'parts_revenue') credit += t.amount;
        } else if (accountName === "Cost of Goods Sold") {
          if (t.transaction_type === 'vehicle_purchase' || t.transaction_type === 'parts_purchase') {
            debit += t.amount;
          }
        } else if (accountName === "Payroll Expenses") {
          if (t.transaction_type === 'payroll_expense') debit += t.amount;
        } else if (accountName === "Operating Expenses") {
          if (t.category === 'expense' && 
              t.transaction_type !== 'vehicle_purchase' && 
              t.transaction_type !== 'parts_purchase' &&
              t.transaction_type !== 'payroll_expense') {
            debit += t.amount;
          }
        } else if (accountName === "Overhead Expenses") {
          if (t.transaction_type === 'overhead_expense') debit += t.amount;
        }
      });

      return { debit, credit };
    };

    // Collect all accounts with balances
    const accountBalances = [];
    Object.values(accountGroups).forEach(group => {
      group.accounts.forEach(account => {
        const balance = calculateBalance(account.name);
        accountBalances.push({
          name: account.name,
          type: account.type,
          group: group.title,
          debit: balance.debit,
          credit: balance.credit
        });
      });
    });

    const totalDebits = accountBalances.reduce((sum, a) => sum + a.debit, 0);
    const totalCredits = accountBalances.reduce((sum, a) => sum + a.credit, 0);

    return {
      period,
      accounts: accountBalances,
      totalDebits,
      totalCredits,
      difference: totalDebits - totalCredits
    };
  });

  const exportToCSV = () => {
    const headers = ['Account', ...periods.map(p => `${p.label} - Debit`), ...periods.map(p => `${p.label} - Credit`)];
    const rows = [];
    
    Object.values(accountGroups).forEach(group => {
      rows.push([group.title]);
      group.accounts.forEach(account => {
        const row = [account.name];
        periodData.forEach(pd => {
          const acc = pd.accounts.find(a => a.name === account.name);
          row.push(acc.debit.toFixed(2));
        });
        periodData.forEach(pd => {
          const acc = pd.accounts.find(a => a.name === account.name);
          row.push(acc.credit.toFixed(2));
        });
        rows.push(row);
      });
      rows.push([]);
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
            <p className="text-sm text-gray-500 mt-1">Verification of debits and credits</p>
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
                <React.Fragment key={key}>
                  <tr className="bg-gray-100">
                    <td colSpan={1 + periods.length * 2} className="py-2 px-4 font-bold text-gray-900">
                      {group.title}
                    </td>
                  </tr>
                  {group.accounts.map((account, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 pl-8">{account.name}</td>
                      {periodData.map((pd, pdIdx) => {
                        const acc = pd.accounts.find(a => a.name === account.name);
                        return (
                          <React.Fragment key={pdIdx}>
                            <td className="text-right py-2 px-4">
                              {acc.debit > 0 ? `$${acc.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="text-right py-2 px-4">
                              {acc.credit > 0 ? `$${acc.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-blue-50 font-bold">
                <td className="py-3 px-4">TOTAL</td>
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
                <td className="py-3 px-4 font-semibold">Difference</td>
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

        {periodData.some(pd => Math.abs(pd.difference) >= 0.01) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              ⚠️ <strong>Warning:</strong> The trial balance is out of balance. Total debits should equal total credits. 
              Please review your transactions for potential errors.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}