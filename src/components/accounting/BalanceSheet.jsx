import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";

export default function BalanceSheet({ comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Calculate for each period
  const periodData = periods.map(period => {
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate <= period.to;
    });

    // ASSETS
    const cashAndBank = periodTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => {
        return t.category === 'revenue' ? sum + t.amount : sum - t.amount;
      }, 0);

    const accountsReceivable = periodTransactions
      .filter(t => t.category === 'revenue' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    const inventory = 50000;

    const totalCurrentAssets = cashAndBank + accountsReceivable + inventory;

    const fixedAssets = periodTransactions
      .filter(t => t.transaction_type === 'vehicle_purchase' || t.transaction_type === 'equipment_purchase')
      .reduce((sum, t) => sum + t.amount, 0);

    const accumulatedDepreciation = fixedAssets * 0.2;
    const netFixedAssets = fixedAssets - accumulatedDepreciation;

    const totalAssets = totalCurrentAssets + netFixedAssets;

    // LIABILITIES
    const accountsPayable = periodTransactions
      .filter(t => t.category === 'expense' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    const shortTermDebt = 20000;
    const totalCurrentLiabilities = accountsPayable + shortTermDebt;

    const longTermDebt = 50000;
    const totalLiabilities = totalCurrentLiabilities + longTermDebt;

    // EQUITY
    const retainedEarnings = periodTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => {
        return t.category === 'revenue' ? sum + t.amount : sum - t.amount;
      }, 0);

    const ownerEquity = 100000;
    const totalEquity = ownerEquity + retainedEarnings;

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      period,
      cashAndBank,
      accountsReceivable,
      inventory,
      totalCurrentAssets,
      fixedAssets,
      accumulatedDepreciation,
      netFixedAssets,
      totalAssets,
      accountsPayable,
      shortTermDebt,
      totalCurrentLiabilities,
      longTermDebt,
      totalLiabilities,
      retainedEarnings,
      ownerEquity,
      totalEquity,
      totalLiabilitiesAndEquity
    };
  });

  const renderLine = (label, values, isSubtotal = false, isTotal = false, indent = 0) => (
    <div className={`grid gap-4 py-2 px-4 ${isSubtotal || isTotal ? 'border-t border-gray-300 font-semibold' : ''} ${isTotal ? 'bg-blue-50 text-blue-900' : ''}`}
         style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
      <span style={{ paddingLeft: `${indent * 20}px` }}>{label}</span>
      {values.map((value, idx) => (
        <span key={idx} className="text-right">
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ))}
    </div>
  );

  const exportToCSV = () => {
    const headers = ['Account', ...periods.map(p => p.label)];
    const csvContent = [
      ['Balance Sheet'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ['Cash and Bank', ...periodData.map(d => d.cashAndBank.toFixed(2))],
      ['Accounts Receivable', ...periodData.map(d => d.accountsReceivable.toFixed(2))],
      ['Inventory', ...periodData.map(d => d.inventory.toFixed(2))],
      ['Total Current Assets', ...periodData.map(d => d.totalCurrentAssets.toFixed(2))],
      ['Total Assets', ...periodData.map(d => d.totalAssets.toFixed(2))],
      ['Total Liabilities', ...periodData.map(d => d.totalLiabilities.toFixed(2))],
      ['Total Equity', ...periodData.map(d => d.totalEquity.toFixed(2))],
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Balance Sheet</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Comparative Period Analysis</p>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Column Headers */}
        <div className="grid gap-4 py-3 px-4 bg-gray-100 font-semibold border-b-2 border-gray-300"
             style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
          <span className="text-sm uppercase">Account</span>
          {periods.map((period, idx) => (
            <span key={idx} className="text-right text-sm">
              {period.label}
            </span>
          ))}
        </div>

        {/* ASSETS */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">ASSETS</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Current Assets</h4>
            {renderLine('Cash and Bank', periodData.map(d => d.cashAndBank), false, false, 1)}
            {renderLine('Accounts Receivable', periodData.map(d => d.accountsReceivable), false, false, 1)}
            {renderLine('Inventory', periodData.map(d => d.inventory), false, false, 1)}
            {renderLine('Total Current Assets', periodData.map(d => d.totalCurrentAssets), true, false, 1)}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Fixed Assets</h4>
            {renderLine('Fixed Assets', periodData.map(d => d.fixedAssets), false, false, 1)}
            {renderLine('Less: Accumulated Depreciation', periodData.map(d => -d.accumulatedDepreciation), false, false, 1)}
            {renderLine('Net Fixed Assets', periodData.map(d => d.netFixedAssets), true, false, 1)}
          </div>

          {renderLine('TOTAL ASSETS', periodData.map(d => d.totalAssets), false, true)}
        </div>

        {/* LIABILITIES */}
        <div className="mt-8">
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">LIABILITIES</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Current Liabilities</h4>
            {renderLine('Accounts Payable', periodData.map(d => d.accountsPayable), false, false, 1)}
            {renderLine('Short-term Debt', periodData.map(d => d.shortTermDebt), false, false, 1)}
            {renderLine('Total Current Liabilities', periodData.map(d => d.totalCurrentLiabilities), true, false, 1)}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Long-term Liabilities</h4>
            {renderLine('Long-term Debt', periodData.map(d => d.longTermDebt), false, false, 1)}
          </div>

          {renderLine('TOTAL LIABILITIES', periodData.map(d => d.totalLiabilities), false, true)}
        </div>

        {/* EQUITY */}
        <div className="mt-8">
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">EQUITY</h3>
          {renderLine('Owner Equity', periodData.map(d => d.ownerEquity), false, false, 1)}
          {renderLine('Retained Earnings', periodData.map(d => d.retainedEarnings), false, false, 1)}
          {renderLine('TOTAL EQUITY', periodData.map(d => d.totalEquity), false, true)}
        </div>

        {/* TOTAL LIABILITIES & EQUITY */}
        <div className="mt-6">
          {renderLine('TOTAL LIABILITIES & EQUITY', periodData.map(d => d.totalLiabilitiesAndEquity), false, true)}
        </div>
      </CardContent>
    </Card>
  );
}