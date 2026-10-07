import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileText } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { accountActivity, formatAccounting, formatStatementDate, profitAndLoss } from "@/lib/financialStatements";

const DRILLDOWNS = {
  vehicleSalesRevenue: { title: "Vehicle Sales Revenue", codes: ["4000"], normal: "credit" },
  serviceRevenue: { title: "Service Revenue", codes: ["4100"], normal: "credit" },
  partsRevenue: { title: "Parts Revenue", codes: ["4300"], normal: "credit" },
  otherRevenue: { title: "Other Revenue", codes: ["4200", "4400", "4500", "4600", "4700", "4900"], normal: "credit" },
  vehicleCogs: { title: "Vehicle Inventory Cost", codes: ["5000"], normal: "debit" },
  otherCogs: { title: "Parts and Other COGS", codes: ["5100"], normal: "debit" },
  operatingExpenses: { title: "Operating Expenses", codes: ["6000", "5400", "5500", "5510", "6200", "6300"], normal: "debit" },
  payrollExpenses: { title: "Payroll Expenses", codes: ["5200", "6100"], normal: "debit" },
};

export default function ProfitLossStatement({ comparativePeriods = [], reportBasis = "accrual" }) {
  const { ledger } = useFinancialBooks(reportBasis);
  const [drilldown, setDrilldown] = useState(null);
  const basisLabel = reportBasis === "cash" ? "Cash basis" : "Accrual basis";
  
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const periodData = periods.map((period) => ({ period, ...profitAndLoss(ledger, period.from, period.to) }));

  const getDrilldownData = (category, periodIdx) => {
    const period = periods[periodIdx];
    const spec = DRILLDOWNS[category] || { title: category, codes: [], normal: "debit" };
    return {
      title: spec.title,
      period,
      items: accountActivity(ledger, spec.codes, { from: period.from, to: period.to, normal: spec.normal }),
    };
  };

  const handleDrilldown = (category, periodIdx) => {
    const data = getDrilldownData(category, periodIdx);
    setDrilldown(data);
  };

  const renderLine = (label, values, isSubtotal = false, isTotal = false, indent = 0, drilldownKey = null) => (
    <div className={`grid gap-4 py-2 px-4 ${isSubtotal || isTotal ? 'border-t border-gray-300 font-semibold' : ''} ${isTotal ? 'bg-blue-50 text-blue-900' : ''}`}
         style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
      <span style={{ paddingLeft: `${indent * 20}px` }}>{label}</span>
      {values.map((value, idx) => (
        <span 
          key={idx} 
          className={`text-right ${value < 0 ? 'text-red-600' : ''} ${drilldownKey ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
          onDoubleClick={() => drilldownKey && handleDrilldown(drilldownKey, idx)}
          title={drilldownKey ? 'Double-click to view details' : ''}
        >
          {formatAccounting(value)}
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
            <p className="text-sm text-gray-500 mt-1">{basisLabel} · same books as the balance sheet</p>
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
          {renderLine('Vehicle Sales', periodData.map(d => d.vehicleSalesRevenue), false, false, 1, 'vehicleSalesRevenue')}
          {renderLine('Service Revenue', periodData.map(d => d.serviceRevenue), false, false, 1, 'serviceRevenue')}
          {renderLine('Parts Revenue', periodData.map(d => d.partsRevenue), false, false, 1, 'partsRevenue')}
          {renderLine('Other Revenue', periodData.map(d => d.otherRevenue), false, false, 1, 'otherRevenue')}
          {renderLine('Total Revenue', periodData.map(d => d.revenue), true)}
        </div>

        {/* Cost of Goods Sold */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Cost of Goods Sold</h3>
          {renderLine('Vehicle Inventory Cost', periodData.map(d => d.vehicleCogs), false, false, 1, 'vehicleCogs')}
          {renderLine('Parts & Other COGS', periodData.map(d => d.otherCogs), false, false, 1, 'otherCogs')}
          {renderLine('Total COGS', periodData.map(d => d.cogs), true)}
        </div>

        {/* Gross Profit */}
        <div>
          {renderLine('Gross Profit', periodData.map(d => d.grossProfit), true)}
        </div>

        {/* Operating Expenses */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Operating Expenses</h3>
          {renderLine('General Operating Expenses', periodData.map(d => d.operatingExpenses), false, false, 1, 'operatingExpenses')}
          {renderLine('Payroll Expenses', periodData.map(d => d.payrollExpenses), false, false, 1, 'payrollExpenses')}
          {renderLine('Total Operating Expenses', periodData.map(d => d.operatingExpenses + d.payrollExpenses), true)}
        </div>

        {/* Net Profit */}
        <div className="mt-6">
          {renderLine('NET PROFIT', periodData.map(d => d.netProfit), false, true)}
        </div>

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
                    {formatAccounting(drilldown.items.reduce((sum, i) => sum + i.amount, 0))}
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
                          <td className="py-2 px-3 text-right font-medium">{formatAccounting(item.amount)}</td>
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
                  <td key={idx} className="border border-gray-300 p-2 text-right">${d.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">COGS</td>
                {periodData.map((d, idx) => (
                  <td key={idx} className="border border-gray-300 p-2 text-right">${d.cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">Gross Profit</td>
                {periodData.map((d, idx) => (
                  <td key={idx} className="border border-gray-300 p-2 text-right font-bold">${d.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">Operating Expenses</td>
                {periodData.map((d, idx) => (
                  <td key={idx} className="border border-gray-300 p-2 text-right">${d.operatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                ))}
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-300 p-2 font-bold">NET PROFIT</td>
                {periodData.map((d, idx) => (
                  <td key={idx} className="border border-gray-300 p-2 text-right font-bold">${d.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}