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

  const cleanAccountName = (name) => {
    if (!name) return '';
    // Replace black diamonds and other special characters with spaces
    return name.replace(/[�♦◆▶]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }, 'account_code'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

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

  // Calculate balances for each period
  const periodData = periods.map(period => {
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate >= period.from && transDate <= period.to;
    });

    // Create account balance map
    const accountBalanceMap = new Map();
    
    // Initialize all accounts
    accounts.forEach(account => {
      accountBalanceMap.set(account.id, {
        code: account.account_code,
        name: account.account_name,
        type: account.account_type,
        debit: 0,
        credit: 0
      });
    });

    // Find or create Cash account for offsetting entries
    let cashAccount = accounts.find(a => 
      a.account_code === '1000' || 
      a.account_name.toLowerCase().includes('cash') ||
      a.account_category === 'cash'
    );
    if (!cashAccount && accounts.length > 0) {
      cashAccount = accounts.find(a => a.account_type === 'asset');
    }

    // Process each transaction with proper double-entry logic
    periodTransactions.forEach(t => {
      const account = accounts.find(a => a.id === t.account_id);
      const transactionAccount = accountBalanceMap.get(t.account_id);
      
      if (transactionAccount && account) {
        // Use debit/credit amounts if provided (new double-entry format)
        if (t.debit_amount > 0 || t.credit_amount > 0) {
          transactionAccount.debit += t.debit_amount || 0;
          transactionAccount.credit += t.credit_amount || 0;
          
          // Process contra account if specified
          if (t.contra_account_id && accountBalanceMap.has(t.contra_account_id)) {
            const contraAccount = accountBalanceMap.get(t.contra_account_id);
            // Mirror the entry: if main is DR, contra is CR and vice versa
            contraAccount.debit += t.credit_amount || 0;
            contraAccount.credit += t.debit_amount || 0;
          }
        } else {
          // Fallback to old format for backwards compatibility
          const accountType = account.account_type;
          
          if (accountType === 'expense' || accountType === 'asset') {
            transactionAccount.debit += t.amount;
            
            if (cashAccount && accountBalanceMap.has(cashAccount.id) && cashAccount.id !== t.account_id) {
              accountBalanceMap.get(cashAccount.id).credit += t.amount;
            }
          } else if (accountType === 'revenue' || accountType === 'liability' || accountType === 'equity') {
            transactionAccount.credit += t.amount;
            
            if (cashAccount && accountBalanceMap.has(cashAccount.id) && cashAccount.id !== t.account_id) {
              accountBalanceMap.get(cashAccount.id).debit += t.amount;
            }
          }
        }
      }
    });

    // Convert map to array and add to groups
    const accountBalances = [];
    const seenCodes = new Set();
    
    accountBalanceMap.forEach((balance, accountId) => {
      const account = accounts.find(a => a.id === accountId);
      if (account && !seenCodes.has(account.account_code) && (balance.debit > 0 || balance.credit > 0)) {
        seenCodes.add(account.account_code);
        accountBalances.push({
          code: account.account_code,
          name: account.account_name,
          type: account.account_type,
          group: accountGroups[account.account_type]?.title || 'Other',
          debit: balance.debit,
          credit: balance.credit
        });
      }
    });

    // Calculate vehicle inventory value (in_stock vehicles)
    const vehicleInventoryValue = vehicles
      .filter(v => v.status === 'in_stock')
      .reduce((sum, v) => sum + (v.total_cost || v.purchase_price || 0), 0);

    // Add vehicle inventory as an asset entry if there's value
    if (vehicleInventoryValue > 0) {
      accountBalances.push({
        code: '1400',
        name: 'Vehicle Inventory',
        type: 'asset',
        group: 'Assets',
        debit: vehicleInventoryValue,
        credit: 0
      });
    }

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
                              <td className="text-right py-2 px-4">
                                {acc && acc.debit > 0 ? `$${acc.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="text-right py-2 px-4">
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
      </CardContent>
    </Card>
  );
}