import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Download, Printer, FileText } from "lucide-react";

export default function ProfitLossStatement({ transactions, dateRange }) {
  const filteredTransactions = transactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    return transDate >= dateRange.from && transDate <= dateRange.to;
  });

  // Revenue
  const saleRevenue = filteredTransactions
    .filter(t => t.transaction_type === 'sale_revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const serviceRevenue = filteredTransactions
    .filter(t => t.transaction_type === 'service_revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const partsRevenue = filteredTransactions
    .filter(t => t.transaction_type === 'parts_revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const otherIncome = filteredTransactions
    .filter(t => t.transaction_type === 'other_income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRevenue = saleRevenue + serviceRevenue + partsRevenue + otherIncome;

  // Cost of Goods Sold
  const vehiclePurchases = filteredTransactions
    .filter(t => t.transaction_type === 'vehicle_purchase' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const partsPurchases = filteredTransactions
    .filter(t => t.transaction_type === 'parts_purchase' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const cogs = vehiclePurchases + partsPurchases;
  const grossProfit = totalRevenue - cogs;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : 0;

  // Operating Expenses
  const laborExpense = filteredTransactions
    .filter(t => t.transaction_type === 'labor_expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const overheadExpense = filteredTransactions
    .filter(t => t.transaction_type === 'overhead_expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const otherExpenses = filteredTransactions
    .filter(t => t.transaction_type === 'other_expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOperatingExpenses = laborExpense + overheadExpense + otherExpenses;

  // Net Profit
  const netProfit = grossProfit - totalOperatingExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : 0;

  const renderLine = (label, amount, bold = false, indent = false, color = null) => (
    <div className={`flex justify-between py-2 ${bold ? 'font-bold border-t-2 border-gray-300' : 'border-t border-gray-100'} ${indent ? 'pl-6' : ''}`}>
      <span className={bold ? 'text-base' : ''}>{label}</span>
      <span className={`${bold ? 'text-lg' : ''} ${color || (amount >= 0 ? 'text-gray-900' : 'text-red-600')}`}>
        ${Math.abs(amount).toLocaleString()}
      </span>
    </div>
  );

  const exportToCSV = () => {
    const data = [
      ['Profit & Loss Statement', `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`],
      [],
      ['Revenue'],
      ['Vehicle Sales Revenue', saleRevenue],
      ['Service Revenue', serviceRevenue],
      ['Parts Revenue', partsRevenue],
      ['Other Income', otherIncome],
      ['Total Revenue', totalRevenue],
      [],
      ['Cost of Goods Sold'],
      ['Vehicle Purchases', vehiclePurchases],
      ['Parts Purchases', partsPurchases],
      ['Total COGS', cogs],
      [],
      ['Gross Profit', grossProfit],
      ['Gross Margin %', grossMargin],
      [],
      ['Operating Expenses'],
      ['Labor Expenses', laborExpense],
      ['Overhead Expenses', overheadExpense],
      ['Other Expenses', otherExpenses],
      ['Total Operating Expenses', totalOperatingExpenses],
      [],
      ['Net Profit', netProfit],
      ['Net Margin %', netMargin]
    ];
    
    const csvContent = data.map(row => row.join(',')).join('\n');
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
    const printContent = document.getElementById('pl-print-content');
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center justify-between">
              <span>Profit & Loss Statement</span>
              <span className="text-sm font-normal text-gray-600">
                {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
              </span>
            </CardTitle>
          </div>
          <div className="flex gap-2 ml-4">
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
      <CardContent>
        <div className="space-y-1">
          {/* Revenue Section */}
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 text-gray-700">Revenue</h3>
            {renderLine('Vehicle Sales Revenue', saleRevenue, false, true)}
            {renderLine('Service Revenue', serviceRevenue, false, true)}
            {renderLine('Parts Revenue', partsRevenue, false, true)}
            {renderLine('Other Income', otherIncome, false, true)}
            {renderLine('Total Revenue', totalRevenue, true, false, 'text-green-600')}
          </div>

          {/* Cost of Goods Sold */}
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 text-gray-700">Cost of Goods Sold</h3>
            {renderLine('Vehicle Purchases', vehiclePurchases, false, true)}
            {renderLine('Parts Purchases', partsPurchases, false, true)}
            {renderLine('Total COGS', cogs, true)}
          </div>

          {renderLine('Gross Profit', grossProfit, true, false, grossProfit >= 0 ? 'text-blue-600' : 'text-red-600')}
          <div className="text-right text-sm text-gray-600 mb-4">
            Gross Margin: {grossMargin}%
          </div>

          {/* Operating Expenses */}
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 text-gray-700">Operating Expenses</h3>
            {renderLine('Labor Expenses', laborExpense, false, true)}
            {renderLine('Overhead Expenses', overheadExpense, false, true)}
            {renderLine('Other Expenses', otherExpenses, false, true)}
            {renderLine('Total Operating Expenses', totalOperatingExpenses, true)}
          </div>

          {/* Net Profit */}
          <div className="pt-4 border-t-4 border-gray-400">
            {renderLine('Net Profit', netProfit, true, false, netProfit >= 0 ? 'text-green-600' : 'text-red-600')}
            <div className="text-right text-sm text-gray-600 mt-1">
              Net Margin: {netMargin}%
            </div>
          </div>

          {/* Hidden print content */}
          <div id="pl-print-content" className="hidden print:block">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #pl-print-content, #pl-print-content * { visibility: visible; }
                #pl-print-content { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-2">Profit & Loss Statement</h1>
              <p className="text-sm text-gray-600 mb-6">{format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}</p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg mb-2">Revenue</h3>
                  <table className="w-full mb-2">
                    <tbody>
                      <tr><td className="pl-4">Vehicle Sales Revenue</td><td className="text-right">${saleRevenue.toLocaleString()}</td></tr>
                      <tr><td className="pl-4">Service Revenue</td><td className="text-right">${serviceRevenue.toLocaleString()}</td></tr>
                      <tr><td className="pl-4">Parts Revenue</td><td className="text-right">${partsRevenue.toLocaleString()}</td></tr>
                      <tr><td className="pl-4">Other Income</td><td className="text-right">${otherIncome.toLocaleString()}</td></tr>
                      <tr className="font-bold border-t-2"><td>Total Revenue</td><td className="text-right">${totalRevenue.toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">Cost of Goods Sold</h3>
                  <table className="w-full mb-2">
                    <tbody>
                      <tr><td className="pl-4">Vehicle Purchases</td><td className="text-right">${vehiclePurchases.toLocaleString()}</td></tr>
                      <tr><td className="pl-4">Parts Purchases</td><td className="text-right">${partsPurchases.toLocaleString()}</td></tr>
                      <tr className="font-bold border-t-2"><td>Total COGS</td><td className="text-right">${cogs.toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="font-bold border-t-2 pt-2">
                  <table className="w-full">
                    <tbody>
                      <tr><td>Gross Profit</td><td className="text-right">${grossProfit.toLocaleString()}</td></tr>
                      <tr className="text-sm"><td></td><td className="text-right">Gross Margin: {grossMargin}%</td></tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">Operating Expenses</h3>
                  <table className="w-full mb-2">
                    <tbody>
                      <tr><td className="pl-4">Labor Expenses</td><td className="text-right">${laborExpense.toLocaleString()}</td></tr>
                      <tr><td className="pl-4">Overhead Expenses</td><td className="text-right">${overheadExpense.toLocaleString()}</td></tr>
                      <tr><td className="pl-4">Other Expenses</td><td className="text-right">${otherExpenses.toLocaleString()}</td></tr>
                      <tr className="font-bold border-t-2"><td>Total Operating Expenses</td><td className="text-right">${totalOperatingExpenses.toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="font-bold border-t-4 pt-2">
                  <table className="w-full">
                    <tbody>
                      <tr><td>Net Profit</td><td className="text-right">${netProfit.toLocaleString()}</td></tr>
                      <tr className="text-sm"><td></td><td className="text-right">Net Margin: {netMargin}%</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}