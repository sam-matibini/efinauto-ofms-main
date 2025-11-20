import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileText } from "lucide-react";
import { format } from "date-fns";

export default function ProfitLossStatement({ transactions, comparativePeriods = [] }) {
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  // Calculate metrics for each period
  const periodData = periods.map(period => {
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate >= period.from && transDate <= period.to;
    });

    const revenue = periodTransactions
      .filter(t => t.category === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const cogs = periodTransactions
      .filter(t => t.transaction_type === 'vehicle_purchase' || t.transaction_type === 'parts_purchase')
      .reduce((sum, t) => sum + t.amount, 0);

    const grossProfit = revenue - cogs;

    const operatingExpenses = periodTransactions
      .filter(t => t.category === 'expense' && t.transaction_type !== 'vehicle_purchase' && t.transaction_type !== 'parts_purchase')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = grossProfit - operatingExpenses;

    return { period, revenue, cogs, grossProfit, operatingExpenses, netProfit };
  });

  const renderLine = (label, values, isSubtotal = false, isTotal = false, indent = 0) => (
    <div className={`grid gap-4 py-2 px-4 ${isSubtotal || isTotal ? 'border-t border-gray-300 font-semibold' : ''} ${isTotal ? 'bg-blue-50 text-blue-900' : ''}`}
         style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
      <span style={{ paddingLeft: `${indent * 20}px` }}>{label}</span>
      {values.map((value, idx) => (
        <span key={idx} className={`text-right ${value < 0 ? 'text-red-600' : ''}`}>
          ${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ))}
    </div>
  );

  const exportToCSV = () => {
    const headers = ['Account', ...periods.map(p => p.label)];
    const rows = [
      ['Revenue', ...periodData.map(d => d.revenue.toFixed(2))],
      ['Cost of Goods Sold', ...periodData.map(d => d.cogs.toFixed(2))],
      ['Gross Profit', ...periodData.map(d => d.grossProfit.toFixed(2))],
      ['Operating Expenses', ...periodData.map(d => d.operatingExpenses.toFixed(2))],
      ['Net Profit', ...periodData.map(d => d.netProfit.toFixed(2))],
    ];
    
    const csvContent = [
      ['Profit & Loss Statement'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ...rows
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const printContent = document.getElementById('pl-print-content');
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Profit & Loss Statement</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Comparative Period Analysis</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
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

        {/* Revenue Section */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Operating Income</h3>
          {renderLine('Revenue', periodData.map(d => d.revenue), true)}
        </div>

        {/* Cost of Goods Sold */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Cost of Goods Sold</h3>
          {renderLine('Total COGS', periodData.map(d => d.cogs), true)}
        </div>

        {/* Gross Profit */}
        <div>
          {renderLine('Gross Profit', periodData.map(d => d.grossProfit), true)}
        </div>

        {/* Operating Expenses */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Operating Expenses</h3>
          {renderLine('Total Operating Expenses', periodData.map(d => d.operatingExpenses), true)}
        </div>

        {/* Net Profit */}
        <div className="mt-6">
          {renderLine('NET PROFIT', periodData.map(d => d.netProfit), false, true)}
        </div>
      </CardContent>

      {/* Hidden Print Content */}
      <div id="pl-print-content" className="hidden print:block">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #pl-print-content, #pl-print-content * { visibility: visible; }
            #pl-print-content { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Profit & Loss Statement</h1>
          <p className="text-sm text-gray-600 mb-6">Generated on {format(new Date(), 'MMMM d, yyyy')}</p>
          
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Account</th>
                {periods.map((period, idx) => (
                  <th key={idx} className="border border-gray-300 p-2 text-right">{period.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">Revenue</td>
                {periodData.map((d, idx) => (
                  <td key={idx} className="border border-gray-300 p-2 text-right">${d.revenue.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">COGS</td>
                {periodData.map((d, idx) => (
                  <td key={idx} className="border border-gray-300 p-2 text-right">${d.cogs.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">Gross Profit</td>
                {periodData.map((d, idx) => (
                  <td key={idx} className="border border-gray-300 p-2 text-right font-bold">${d.grossProfit.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">Operating Expenses</td>
                {periodData.map((d, idx) => (
                  <td key={idx} className="border border-gray-300 p-2 text-right">${d.operatingExpenses.toLocaleString()}</td>
                ))}
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-300 p-2 font-bold">NET PROFIT</td>
                {periodData.map((d, idx) => (
                  <td key={idx} className="border border-gray-300 p-2 text-right font-bold">${d.netProfit.toLocaleString()}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}