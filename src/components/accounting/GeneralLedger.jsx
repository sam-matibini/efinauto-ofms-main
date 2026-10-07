import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Printer, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { generalLedgerRows, inRange } from "@/lib/financialStatements";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GeneralLedger({ comparativePeriods = [], reportBasis = "accrual" }) {
  const { ledger } = useFinancialBooks(reportBasis);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" or "detailed"
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [drilldownAccount, setDrilldownAccount] = useState(null);

  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const accounts = [
    { value: "all", label: "All Accounts" },
    ...ledger.accountList.map((account) => ({
      value: account.code,
      label: `${account.code} - ${account.name}`,
    })),
  ];

  const currentPeriod = periods[0];
  const allLedgerEntries = generalLedgerRows(ledger);

  // Filter transactions by period and account
  const filteredTransactions = allLedgerEntries.filter((entry) => {
    if (!inRange(entry.transaction_date, currentPeriod.from, currentPeriod.to)) return false;
    if (selectedAccount === "all") return true;
    return entry.account_code === selectedAccount;
  });

  // Calculate running balance
  let runningBalance = 0;
  const ledgerEntries = filteredTransactions.map(t => {
    // Check if entry has explicit debit/credit amounts set
    let debit = t.debit_amount || 0;
    let credit = t.credit_amount || 0;
    
    // If no explicit amounts, determine from category
    if (debit === 0 && credit === 0) {
      const isDebit = (t.category === 'expense' || t.category === 'asset') && !t.is_credit;
      const isCredit = (t.category === 'revenue' || t.category === 'liability') || t.is_credit;
      
      debit = isDebit ? t.amount : 0;
      credit = isCredit ? t.amount : 0;
    }
    
    runningBalance += debit - credit;
    
    return {
      ...t,
      debit,
      credit,
      balance: runningBalance
    };
  });

  // Group transactions by account
  const groupedByAccount = {};
  filteredTransactions.forEach(t => {
    // Auto-assign account code if missing
    const accountCode = t.account_code;
    const accountName = t.account_name;
    const accountType = t.account_type || t.category;
    
    const accountKey = t.account_id || accountCode || 'unassigned';
    const accountLabel = accountCode ? `${accountCode} - ${accountName}` : (accountName || 'Unassigned');
    
    if (!groupedByAccount[accountKey]) {
      groupedByAccount[accountKey] = {
        accountKey,
        accountCode: accountCode || '0000',
        accountName: accountName || 'Unassigned',
        accountLabel,
        accountType: accountType,
        transactions: [],
        totalDebit: 0,
        totalCredit: 0
      };
    }
    
    // Check if entry has explicit debit/credit amounts
    let debit = t.debit_amount || 0;
    let credit = t.credit_amount || 0;
    
    if (debit === 0 && credit === 0) {
      const isDebit = (t.category === 'expense' || t.category === 'asset') && !t.is_credit;
      const isCredit = (t.category === 'revenue' || t.category === 'liability') || t.is_credit;
      debit = isDebit ? t.amount : 0;
      credit = isCredit ? t.amount : 0;
    }
    
    groupedByAccount[accountKey].transactions.push({ ...t, debit, credit, account_code: accountCode, account_name: accountName });
    groupedByAccount[accountKey].totalDebit += debit;
    groupedByAccount[accountKey].totalCredit += credit;
  });

  const accountGroups = Object.values(groupedByAccount).sort((a, b) => 
    (a.accountCode || '').localeCompare(b.accountCode || '')
  );

  const toggleAccountExpand = (accountKey) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountKey)) {
      newExpanded.delete(accountKey);
    } else {
      newExpanded.add(accountKey);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleAccountDoubleClick = (group) => {
    setDrilldownAccount(group);
  };

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
        {/* Account Filter and View Mode */}
        <div className="flex items-center gap-4 flex-wrap">
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
          
          <Label className="text-sm font-semibold ml-4">View:</Label>
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grouped">Grouped by Account</SelectItem>
              <SelectItem value="detailed">Detailed List</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-sm text-gray-600 ml-auto">
            {ledgerEntries.length} transaction{ledgerEntries.length !== 1 ? 's' : ''} in {accountGroups.length} account{accountGroups.length !== 1 ? 's' : ''}
          </div>
        </div>

        {viewMode === "grouped" ? (
          /* Grouped by Account View */
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-100">
                  <th className="text-left py-3 px-4 font-semibold w-8"></th>
                  <th className="text-left py-3 px-4 font-semibold">Account</th>
                  <th className="text-right py-3 px-4 font-semibold"># Trans</th>
                  <th className="text-right py-3 px-4 font-semibold">Total Debit</th>
                  <th className="text-right py-3 px-4 font-semibold">Total Credit</th>
                  <th className="text-right py-3 px-4 font-semibold">Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {accountGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  accountGroups.map((group) => (
                    <React.Fragment key={group.accountKey}>
                      <tr 
                        className="border-b hover:bg-blue-50 cursor-pointer"
                        onClick={() => toggleAccountExpand(group.accountKey)}
                        onDoubleClick={() => handleAccountDoubleClick(group)}
                        title="Double-click to view transactions"
                      >
                        <td className="py-3 px-4">
                          {expandedAccounts.has(group.accountKey) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          <span className="font-mono text-xs text-gray-500 mr-2">{group.accountCode}</span>
                          {group.accountName}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-600">
                          {group.transactions.length}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${group.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${group.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`text-right py-3 px-4 font-semibold ${(group.totalDebit - group.totalCredit) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ${Math.abs(group.totalDebit - group.totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      {expandedAccounts.has(group.accountKey) && (
                        group.transactions.map((t, idx) => (
                          <tr key={`${group.accountKey}-${idx}`} className="bg-gray-50 border-b text-xs">
                            <td className="py-2 px-4"></td>
                            <td className="py-2 px-4 pl-12 text-gray-600">
                              {format(new Date(t.transaction_date), 'MMM d')} - {t.description || t.transaction_number || 'Transaction'}
                            </td>
                            <td className="text-right py-2 px-4 text-gray-500">
                              {t.reference_number || '-'}
                            </td>
                            <td className="text-right py-2 px-4">
                              {t.debit > 0 ? `$${t.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="text-right py-2 px-4">
                              {t.credit > 0 ? `$${t.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="py-2 px-4"></td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
              {accountGroups.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-blue-50 font-bold">
                    <td colSpan={3} className="py-3 px-4">TOTALS</td>
                    <td className="text-right py-3 px-4">
                      ${accountGroups.reduce((sum, g) => sum + g.totalDebit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-3 px-4">
                      ${accountGroups.reduce((sum, g) => sum + g.totalCredit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`text-right py-3 px-4 ${runningBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${Math.abs(runningBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
            <p className="text-xs text-gray-500 mt-2 italic">
              💡 Tip: Double-click any account row to view detailed transactions
            </p>
          </div>
        ) : (
          /* Detailed List View */
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
        )}

        {ledgerEntries.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  {viewMode === "grouped" ? (
                    <>
                      <td className="w-8"></td>
                      <td className="py-2 px-4"></td>
                      <td className="text-right py-2 px-4"></td>
                      <td className="text-right py-2 px-4">
                        <p className="text-gray-600 text-xs">Total Debits</p>
                        <p className="text-lg font-bold text-blue-600">
                          ${ledgerEntries.reduce((sum, e) => sum + e.debit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="text-right py-2 px-4">
                        <p className="text-gray-600 text-xs">Total Credits</p>
                        <p className="text-lg font-bold text-green-600">
                          ${ledgerEntries.reduce((sum, e) => sum + e.credit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="text-right py-2 px-4">
                        <p className="text-gray-600 text-xs">Ending Balance</p>
                        <p className={`text-lg font-bold ${runningBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ${Math.abs(runningBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-4"></td>
                      <td className="py-2 px-4"></td>
                      <td className="py-2 px-4"></td>
                      <td className="py-2 px-4"></td>
                      <td className="py-2 px-4"></td>
                      <td className="text-right py-2 px-4">
                        <p className="text-gray-600 text-xs">Total Debits</p>
                        <p className="text-lg font-bold text-blue-600">
                          ${ledgerEntries.reduce((sum, e) => sum + e.debit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="text-right py-2 px-4">
                        <p className="text-gray-600 text-xs">Total Credits</p>
                        <p className="text-lg font-bold text-green-600">
                          ${ledgerEntries.reduce((sum, e) => sum + e.credit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="text-right py-2 px-4">
                        <p className="text-gray-600 text-xs">Ending Balance</p>
                        <p className={`text-lg font-bold ${runningBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ${Math.abs(runningBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Drilldown Dialog */}
        <Dialog open={!!drilldownAccount} onOpenChange={() => setDrilldownAccount(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {drilldownAccount?.accountLabel || 'Account Transactions'}
              </DialogTitle>
            </DialogHeader>
            
            {drilldownAccount && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Total Debit</p>
                    <p className="text-lg font-bold text-blue-600">
                      ${drilldownAccount.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Credit</p>
                    <p className="text-lg font-bold text-green-600">
                      ${drilldownAccount.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Net Balance</p>
                    <p className={`text-lg font-bold ${(drilldownAccount.totalDebit - drilldownAccount.totalCredit) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${Math.abs(drilldownAccount.totalDebit - drilldownAccount.totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-100">
                      <th className="text-left py-2 px-3 font-semibold">Date</th>
                      <th className="text-left py-2 px-3 font-semibold">Transaction #</th>
                      <th className="text-left py-2 px-3 font-semibold">Description</th>
                      <th className="text-left py-2 px-3 font-semibold">Reference</th>
                      <th className="text-right py-2 px-3 font-semibold">Debit</th>
                      <th className="text-right py-2 px-3 font-semibold">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownAccount.transactions.map((t, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3">
                          {format(new Date(t.transaction_date), 'MMM d, yyyy')}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {t.transaction_number || t.id?.slice(0, 8) || '-'}
                        </td>
                        <td className="py-2 px-3">
                          {t.description || 'Untitled Transaction'}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-600">
                          {t.reference_number || '-'}
                        </td>
                        <td className="text-right py-2 px-3">
                          {t.debit > 0 ? `$${t.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="text-right py-2 px-3">
                          {t.credit > 0 ? `$${t.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                      </tr>
                    ))}
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