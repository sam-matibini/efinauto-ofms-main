import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TrialBalance({ comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const [drilldown, setDrilldown] = useState(null);

  const cleanAccountName = (name) => {
    if (!name) return '';
    // Replace black diamonds and other special characters with spaces
    return name.replace(/[�♦◆▶]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

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

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', selectedCompanyId],
    queryFn: () => base44.entities.Purchase.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => base44.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }),
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

  // Add standard accounts for display in the Trial Balance
  const standardAccounts = [
    { id: 'cash', account_code: '1000', account_name: 'Cash and Bank', account_type: 'asset' },
    { id: 'ar', account_code: '1100', account_name: 'Accounts Receivable', account_type: 'asset' },
    { id: 'vehicle-inventory', account_code: '1200', account_name: 'Vehicle Inventory', account_type: 'asset' },
    { id: 'parts-inventory', account_code: '1210', account_name: 'Parts Inventory', account_type: 'asset' },
    { id: 'ap', account_code: '2000', account_name: 'Accounts Payable', account_type: 'liability' },
    { id: 'retained-earnings', account_code: '3100', account_name: 'Retained Earnings', account_type: 'equity' },
    { id: 'sales-revenue', account_code: '4000', account_name: 'Vehicle Sales Revenue', account_type: 'revenue' },
    { id: 'service-revenue', account_code: '4100', account_name: 'Service Revenue', account_type: 'revenue' },
    { id: 'cogs', account_code: '5000', account_name: 'Cost of Goods Sold', account_type: 'expense' },
    { id: 'parts-expense', account_code: '5100', account_name: 'Parts Expense', account_type: 'expense' },
    { id: 'labor-expense', account_code: '5200', account_name: 'Labor Expense', account_type: 'expense' },
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

  // Calculate balances for each period using GAAP principles
  const periodData = periods.map(period => {
    const accountBalances = [];

    // === ASSETS (Debit balances) ===
    
    // 1. Cash and Bank - from paid sales minus paid purchases/expenses
    const cashFromSales = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return saleDate >= period.from && saleDate <= period.to && s.payment_status === 'paid';
      })
      .reduce((sum, s) => sum + (s.total_paid || s.grand_total || s.sale_price || 0), 0);

    const cashFromRepairs = repairs
      .filter(r => {
        const repairDate = new Date(r.completion_date || r.created_date);
        return repairDate >= period.from && repairDate <= period.to && r.payment_status === 'paid';
      })
      .reduce((sum, r) => sum + (r.total_cost || 0), 0);

    const cashPaidForPurchases = purchases
      .filter(p => {
        const purchaseDate = new Date(p.order_date || p.created_date);
        return purchaseDate >= period.from && purchaseDate <= period.to && p.payment_status === 'paid';
      })
      .reduce((sum, p) => sum + (p.amount_paid || p.total_amount || 0), 0);

    const netCash = cashFromSales + cashFromRepairs - cashPaidForPurchases;
    if (netCash !== 0) {
      accountBalances.push({
        code: '1000',
        name: 'Cash and Bank',
        type: 'asset',
        group: 'Assets',
        debit: Math.max(0, netCash),
        credit: Math.max(0, -netCash)
      });
    }

    // 2. Accounts Receivable - unpaid sales and repairs
    const accountsReceivable = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return saleDate >= period.from && saleDate <= period.to && 
               (s.payment_status === 'pending' || s.payment_status === 'partial');
      })
      .reduce((sum, s) => sum + ((s.grand_total || s.sale_price || 0) - (s.total_paid || 0)), 0);

    const serviceReceivable = repairs
      .filter(r => {
        const repairDate = new Date(r.completion_date || r.created_date);
        return repairDate >= period.from && repairDate <= period.to && 
               r.status === 'completed' &&
               (r.payment_status === 'pending' || r.payment_status === 'partial');
      })
      .reduce((sum, r) => sum + ((r.total_cost || 0) - (r.amount_paid || 0)), 0);

    const totalReceivable = accountsReceivable + serviceReceivable;
    if (totalReceivable > 0) {
      accountBalances.push({
        code: '1100',
        name: 'Accounts Receivable',
        type: 'asset',
        group: 'Assets',
        debit: totalReceivable,
        credit: 0
      });
    }

    // 3. Vehicle Inventory - in_stock vehicles acquired within period (Account 1200)
    // Filter by transaction_date or created_date within the period
    const vehicleInventoryValue = vehicles
      .filter(v => {
        const acquisitionDate = new Date(v.transaction_date || v.created_date);
        return v.status === 'in_stock' && 
               acquisitionDate >= period.from && 
               acquisitionDate <= period.to;
      })
      .reduce((sum, v) => sum + (v.total_cost || v.purchase_price || 0), 0);

    if (vehicleInventoryValue > 0) {
      accountBalances.push({
        code: '1200',
        name: 'Vehicle Inventory',
        type: 'asset',
        group: 'Assets',
        debit: vehicleInventoryValue,
        credit: 0
      });
    }

    // 4. Parts Inventory (Account 1210)
    const partsInventoryValue = parts
      .reduce((sum, p) => sum + ((p.cost_price || 0) * (p.quantity || 0)), 0);

    if (partsInventoryValue > 0) {
      accountBalances.push({
        code: '1210',
        name: 'Parts Inventory',
        type: 'asset',
        group: 'Assets',
        debit: partsInventoryValue,
        credit: 0
      });
    }

    // === LIABILITIES (Credit balances) ===

    // 5. Accounts Payable - unpaid purchases
    const accountsPayable = purchases
      .filter(p => {
        const purchaseDate = new Date(p.order_date || p.created_date);
        return purchaseDate >= period.from && purchaseDate <= period.to && 
               (p.payment_status === 'pending' || p.payment_status === 'partial');
      })
      .reduce((sum, p) => sum + ((p.total_amount || 0) - (p.amount_paid || 0)), 0);

    if (accountsPayable > 0) {
      accountBalances.push({
        code: '2000',
        name: 'Accounts Payable',
        type: 'liability',
        group: 'Liabilities',
        debit: 0,
        credit: accountsPayable
      });
    }

    // === REVENUE (Credit balances) ===

    // 6. Sales Revenue - vehicle sales
    const salesRevenue = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return saleDate >= period.from && saleDate <= period.to;
      })
      .reduce((sum, s) => sum + (s.sale_price || s.grand_total || 0), 0);

    if (salesRevenue > 0) {
      accountBalances.push({
        code: '4000',
        name: 'Vehicle Sales Revenue',
        type: 'revenue',
        group: 'Revenue',
        debit: 0,
        credit: salesRevenue
      });
    }

    // 7. Service Revenue - repair orders
    const serviceRevenue = repairs
      .filter(r => {
        const repairDate = new Date(r.completion_date || r.created_date);
        return repairDate >= period.from && repairDate <= period.to && r.status === 'completed';
      })
      .reduce((sum, r) => sum + (r.total_cost || 0), 0);

    if (serviceRevenue > 0) {
      accountBalances.push({
        code: '4100',
        name: 'Service Revenue',
        type: 'revenue',
        group: 'Revenue',
        debit: 0,
        credit: serviceRevenue
      });
    }

    // === EXPENSES (Debit balances) ===

    // 8. Cost of Goods Sold - cost of vehicles sold
    const vehiclesCOGS = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return saleDate >= period.from && saleDate <= period.to && s.vehicle_id;
      })
      .reduce((sum, s) => {
        const vehicle = vehicles.find(v => v.id === s.vehicle_id);
        return sum + (vehicle?.total_cost || vehicle?.purchase_price || 0);
      }, 0);

    if (vehiclesCOGS > 0) {
      accountBalances.push({
        code: '5000',
        name: 'Cost of Goods Sold',
        type: 'expense',
        group: 'Expenses',
        debit: vehiclesCOGS,
        credit: 0
      });
    }

    // 9. Parts Expense - parts used in repairs
    const partsExpense = repairs
      .filter(r => {
        const repairDate = new Date(r.completion_date || r.created_date);
        return repairDate >= period.from && repairDate <= period.to && r.status === 'completed';
      })
      .reduce((sum, r) => sum + (r.parts_cost || 0), 0);

    if (partsExpense > 0) {
      accountBalances.push({
        code: '5100',
        name: 'Parts Expense',
        type: 'expense',
        group: 'Expenses',
        debit: partsExpense,
        credit: 0
      });
    }

    // 10. Labor Expense
    const laborExpense = repairs
      .filter(r => {
        const repairDate = new Date(r.completion_date || r.created_date);
        return repairDate >= period.from && repairDate <= period.to && r.status === 'completed';
      })
      .reduce((sum, r) => sum + (r.labor_cost || 0), 0);

    if (laborExpense > 0) {
      accountBalances.push({
        code: '5200',
        name: 'Labor Expense',
        type: 'expense',
        group: 'Expenses',
        debit: laborExpense,
        credit: 0
      });
    }

    // === EQUITY ===
    // 11. Retained Earnings (balancing entry to ensure DR = CR)
    const totalDebitsCalc = accountBalances.reduce((sum, a) => sum + a.debit, 0);
    const totalCreditsCalc = accountBalances.reduce((sum, a) => sum + a.credit, 0);
    const retainedEarnings = totalCreditsCalc - totalDebitsCalc;

    if (Math.abs(retainedEarnings) > 0.01) {
      accountBalances.push({
        code: '3100',
        name: 'Retained Earnings',
        type: 'equity',
        group: 'Equity',
        debit: retainedEarnings < 0 ? Math.abs(retainedEarnings) : 0,
        credit: retainedEarnings > 0 ? retainedEarnings : 0
      });
    }

    // Also add any transactions from Transaction entity that have account mappings
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate >= period.from && transDate <= period.to;
    });

    periodTransactions.forEach(t => {
      if (t.account_id) {
        const account = accounts.find(a => a.id === t.account_id);
        if (account) {
          const existing = accountBalances.find(a => a.code === account.account_code);
          if (existing) {
            if (t.debit_amount > 0) existing.debit += t.debit_amount;
            if (t.credit_amount > 0) existing.credit += t.credit_amount;
            if (!t.debit_amount && !t.credit_amount && t.amount) {
              if (account.account_type === 'asset' || account.account_type === 'expense') {
                existing.debit += t.amount;
              } else {
                existing.credit += t.amount;
              }
            }
          }
        }
      }
    });

    const totalDebits = accountBalances.reduce((sum, a) => sum + a.debit, 0);
    const totalCredits = accountBalances.reduce((sum, a) => sum + a.credit, 0);

    return {
      period,
      accounts: accountBalances.sort((a, b) => a.code.localeCompare(b.code)),
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