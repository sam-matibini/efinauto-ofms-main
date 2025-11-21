import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Printer, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";

export default function GeneralLedger({ transactions, comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const [selectedAccount, setSelectedAccount] = useState("all");

  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const { data: chartAccounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }, 'account_code'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Build account options from chart of accounts
  const accounts = [
    { value: "all", label: "All Accounts" },
    ...chartAccounts.map(acc => ({
      value: acc.id,
      label: `${acc.account_code} - ${acc.account_name}`
    }))
  ];

  const currentPeriod = periods[0];
  
  // Filter transactions by period and account
  const filteredTransactions = transactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    const inPeriod = transDate >= currentPeriod.from && transDate <= currentPeriod.to;
    
    if (!inPeriod) return false;
    if (selectedAccount === "all") return true;

    // Filter by selected account ID
    return t.account_id === selectedAccount;
  });

  // Calculate running balance
  let runningBalance = 0;
  const ledgerEntries = filteredTransactions.map(t => {
    const isDebit = t.category === 'expense' || t.category === 'asset';
    const isCredit = t.category === 'revenue' || t.category === 'liability';
    
    const debit = isDebit ? t.amount : 0;
    const credit = isCredit ? t.amount : 0;
    
    runningBalance += (isDebit ? debit : -credit);
    
    return {
      ...t,
      debit,
      credit,
      balance: runningBalance
    };
  });

  const exportToCSV = () => {
    const accountLabel = accounts.find(a => a.value === selectedAccount)?.label || 'All Accounts';
    const headers = ['Date', 'Transaction #', 'Account', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'];
    const rows = ledgerEntries.map(t => [
      format(new Date(t.transaction_date), 'yyyy-MM-dd'),
      t.transaction_number || t.id.slice(0, 8),
      t.account_code ? `${t.account_code} - ${t.account_name}` : 'N/A',
      t.description || '',
      t.reference_number || '',
      t.debit.toFixed(2),
      t.credit.toFixed(2),
      t.balance.toFixed(2)
    ]);
    
    const csvContent = [
      ['General Ledger'],
      ['Account:', accountLabel],
      ['Period:', `${format(currentPeriod.from, 'MMM d, yyyy')} - ${format(currentPeriod.to, 'MMM d, yyyy')}`],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ...rows
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${selectedAccount}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              General Ledger
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {format(currentPeriod.from, 'MMM d, yyyy')} - {format(currentPeriod.to, 'MMM d, yyyy')}
            </p>
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
        {/* Account Filter */}
        <div className="flex items-center gap-4">
          <Label className="text-sm font-semibold">Account:</Label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(account => (
                <SelectItem key={account.value} value={account.value}>
                  {account.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-600">
            {ledgerEntries.length} transaction{ledgerEntries.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-100">
                <th className="text-left py-3 px-4 font-semibold">Date</th>
                <th className="text-left py-3 px-4 font-semibold">Transaction #</th>
                <th className="text-left py-3 px-4 font-semibold">Account</th>
                <th className="text-left py-3 px-4 font-semibold">Description</th>
                <th className="text-left py-3 px-4 font-semibold">Reference</th>
                <th className="text-right py-3 px-4 font-semibold">Debit</th>
                <th className="text-right py-3 px-4 font-semibold">Credit</th>
                <th className="text-right py-3 px-4 font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No transactions found for the selected account
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">
                      {format(new Date(entry.transaction_date), 'MMM d, yyyy')}
                    </td>
                    <td className="py-2 px-4 font-mono text-xs">
                      {entry.transaction_number || entry.id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-4 font-mono text-xs">
                      {entry.account_code ? `${entry.account_code} - ${entry.account_name}` : '-'}
                    </td>
                    <td className="py-2 px-4">
                      {entry.description || 'Untitled Transaction'}
                    </td>
                    <td className="py-2 px-4 text-xs text-gray-600">
                      {entry.reference_number || '-'}
                    </td>
                    <td className="text-right py-2 px-4">
                      {entry.debit > 0 ? `$${entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="text-right py-2 px-4">
                      {entry.credit > 0 ? `$${entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className={`text-right py-2 px-4 font-semibold ${entry.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${Math.abs(entry.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ledgerEntries.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-blue-50 font-bold">
                  <td colSpan={5} className="py-3 px-4">TOTALS</td>
                  <td className="text-right py-3 px-4">
                    ${ledgerEntries.reduce((sum, e) => sum + e.debit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right py-3 px-4">
                    ${ledgerEntries.reduce((sum, e) => sum + e.credit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`text-right py-3 px-4 ${runningBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${Math.abs(runningBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {ledgerEntries.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Debits</p>
                <p className="text-lg font-bold text-blue-600">
                  ${ledgerEntries.reduce((sum, e) => sum + e.debit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total Credits</p>
                <p className="text-lg font-bold text-green-600">
                  ${ledgerEntries.reduce((sum, e) => sum + e.credit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Ending Balance</p>
                <p className={`text-lg font-bold ${runningBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${Math.abs(runningBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}