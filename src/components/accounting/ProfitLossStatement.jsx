import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileText } from "lucide-react";
import { format } from "date-fns";

export default function ProfitLossStatement({ transactions, comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Get sales to calculate COGS from vehicle inventory
  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Calculate metrics for each period
  const periodData = periods.map(period => {
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate >= period.from && transDate <= period.to;
    });

    // Revenue - from revenue category or revenue accounts
    const revenue = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return t.category === 'revenue' || account?.account_type === 'revenue';
      })
      .reduce((sum, t) => {
        if (t.debit_amount > 0 || t.credit_amount > 0) {
          return sum + (t.credit_amount || 0) - (t.debit_amount || 0);
        }
        return sum + (t.amount || 0);
      }, 0);

    // Sales Revenue breakdown
    const vehicleSalesRevenue = periodTransactions
      .filter(t => t.transaction_type === 'sale_revenue' || t.reference_type === 'Sale' || t.reference_type === 'Export')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const serviceRevenue = periodTransactions
      .filter(t => t.transaction_type === 'service_revenue' || t.reference_type === 'RepairOrder')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const partsRevenue = periodTransactions
      .filter(t => t.transaction_type === 'parts_revenue')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // COGS - Cost of Goods Sold from Vehicle Inventory
    // For each sale in the period, get the vehicle's cost (purchase_price or total_cost)
    const periodSales = sales.filter(s => {
      const saleDate = new Date(s.sale_date || s.created_date);
      return saleDate >= period.from && saleDate <= period.to;
    });

    // Vehicle COGS - cost of vehicles sold (from inventory)
    const vehicleCogs = periodSales.reduce((sum, sale) => {
      if (sale.vehicle_id) {
        const vehicle = vehicles.find(v => v.id === sale.vehicle_id);
        if (vehicle) {
          return sum + (vehicle.total_cost || vehicle.purchase_price || 0);
        }
      }
      return sum;
    }, 0);

    // Other COGS from transactions (parts, etc.)
    const otherCogs = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return t.transaction_type === 'parts_purchase' ||
               (account?.account_type === 'expense' && 
                (account?.account_code?.startsWith('50') || account?.account_code?.startsWith('51')));
      })
      .reduce((sum, t) => {
        if (t.debit_amount > 0 || t.credit_amount > 0) {
          return sum + (t.debit_amount || 0) - (t.credit_amount || 0);
        }
        return sum + (t.amount || 0);
      }, 0);

    const cogs = vehicleCogs + otherCogs;

    const grossProfit = revenue - cogs;

    // Operating expenses (freight, overhead, etc.)
    const operatingExpenses = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return t.transaction_type === 'overhead_expense' ||
               t.transaction_type === 'labor_expense' ||
               (t.category === 'expense' && 
                t.transaction_type !== 'vehicle_purchase' && 
                t.transaction_type !== 'parts_purchase' &&
                t.transaction_type !== 'payroll_expense') ||
               (account?.account_type === 'expense' && 
                account?.account_code && 
                parseInt(account.account_code) >= 5400);
      })
      .reduce((sum, t) => {
        if (t.debit_amount > 0 || t.credit_amount > 0) {
          return sum + (t.debit_amount || 0) - (t.credit_amount || 0);
        }
        return sum + (t.amount || 0);
      }, 0);
    
    // Payroll expenses
    const payrollExpenses = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return t.transaction_type === 'payroll_expense' ||
               account?.account_code?.startsWith('52') || 
               account?.account_code?.startsWith('53');
      })
      .reduce((sum, t) => {
        if (t.debit_amount > 0 || t.credit_amount > 0) {
          return sum + (t.debit_amount || 0) - (t.credit_amount || 0);
        }
        return sum + (t.amount || 0);
      }, 0);

    const netProfit = grossProfit - operatingExpenses - payrollExpenses;

    return { 
      period, 
      revenue, 
      vehicleSalesRevenue,
      serviceRevenue,
      partsRevenue,
      cogs,
      vehicleCogs,
      otherCogs,
      grossProfit, 
      operatingExpenses, 
      payrollExpenses, 
      netProfit 
    };
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
          {renderLine('Vehicle Sales', periodData.map(d => d.vehicleSalesRevenue), false, false, 1)}
          {renderLine('Service Revenue', periodData.map(d => d.serviceRevenue), false, false, 1)}
          {renderLine('Parts Revenue', periodData.map(d => d.partsRevenue), false, false, 1)}
          {renderLine('Total Revenue', periodData.map(d => d.revenue), true)}
        </div>

        {/* Cost of Goods Sold */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Cost of Goods Sold</h3>
          {renderLine('Vehicle Inventory Cost', periodData.map(d => d.vehicleCogs), false, false, 1)}
          {renderLine('Parts & Other COGS', periodData.map(d => d.otherCogs), false, false, 1)}
          {renderLine('Total COGS', periodData.map(d => d.cogs), true)}
        </div>

        {/* Gross Profit */}
        <div>
          {renderLine('Gross Profit', periodData.map(d => d.grossProfit), true)}
        </div>

        {/* Operating Expenses */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Operating Expenses</h3>
          {renderLine('General Operating Expenses', periodData.map(d => d.operatingExpenses), false, false, 1)}
          {renderLine('Payroll Expenses', periodData.map(d => d.payrollExpenses), false, false, 1)}
          {renderLine('Total Operating Expenses', periodData.map(d => d.operatingExpenses + d.payrollExpenses), true)}
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