import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Download } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CashFlowStatement({ comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const [drilldown, setDrilldown] = useState(null);
  
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

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Calculate for each period
  const periodData = periods.map(period => {
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate >= period.from && transDate <= period.to && t.status === 'completed';
    });

    const cashFromSales = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date);
        return saleDate >= period.from && saleDate <= period.to && s.payment_status === 'paid';
      })
      .reduce((sum, s) => sum + (s.total_paid || 0), 0);

    const cashPaidToSuppliers = purchases
      .filter(p => {
        const purchaseDate = new Date(p.order_date);
        return purchaseDate >= period.from && purchaseDate <= period.to && p.payment_status === 'paid';
      })
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    const operatingExpenses = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_type === 'expense' && t.status === 'completed';
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    

    // Vehicle inventory purchases are part of OPERATING activities (not investing)
    // because inventory is purchased for resale in the normal course of business
    const vehicleInventoryPurchases = purchases
      .filter(p => {
        const purchaseDate = new Date(p.order_date);
        return purchaseDate >= period.from && purchaseDate <= period.to && 
               (p.purchase_type === 'vehicle' || p.purchase_type === 'parts') && 
               p.payment_status === 'paid';
      })
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    // Equipment/Fixed Asset purchases are INVESTING activities
    const equipmentPurchases = purchases
      .filter(p => {
        const purchaseDate = new Date(p.order_date);
        return purchaseDate >= period.from && purchaseDate <= period.to && 
               p.purchase_type === 'equipment' && p.payment_status === 'paid';
      })
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    // Recalculate operating cash flow including inventory purchases
    const netCashFromOperating = cashFromSales - cashPaidToSuppliers - vehicleInventoryPurchases - operatingExpenses;
    const netCashFromInvesting = -equipmentPurchases;
    const netCashFromFinancing = 0;
    const netChangeInCash = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;
    const beginningCash = 0;
    const endingCash = beginningCash + netChangeInCash;

    return {
      period,
      cashFromSales,
      cashPaidToSuppliers,
      vehicleInventoryPurchases,
      operatingExpenses,
      netCashFromOperating,
      equipmentPurchases,
      netCashFromInvesting,
      netCashFromFinancing,
      netChangeInCash,
      beginningCash,
      endingCash
    };
  });

  // Get drilldown data for cash flow items
  const getDrilldownData = (category, periodIdx) => {
    const period = periods[periodIdx];
    let items = [];
    let title = category;

    switch (category) {
      case 'cashFromSales':
        title = 'Cash from Customers';
        items = sales.filter(s => {
          const saleDate = new Date(s.sale_date);
          return saleDate >= period.from && saleDate <= period.to && s.payment_status === 'paid';
        }).map(s => ({ date: s.sale_date, description: `Sale: ${s.customer_name}`, reference: s.sale_number, amount: s.total_paid || 0 }));
        break;
      case 'cashPaidToSuppliers':
        title = 'Cash to Suppliers';
        items = purchases.filter(p => {
          const purchaseDate = new Date(p.order_date);
          return purchaseDate >= period.from && purchaseDate <= period.to && p.payment_status === 'paid';
        }).map(p => ({ date: p.order_date, description: `Purchase: ${p.supplier_name}`, reference: p.purchase_number, amount: p.amount_paid || 0 }));
        break;
      case 'vehiclePurchases':
        title = 'Vehicle Purchases';
        items = transactions.filter(t => {
          const transDate = new Date(t.transaction_date);
          return transDate >= period.from && transDate <= period.to && t.transaction_type === 'vehicle_purchase';
        }).map(t => ({ date: t.transaction_date, description: t.description || 'Vehicle Purchase', reference: t.reference_number, amount: t.amount || 0 }));
        break;
      case 'equipmentPurchases':
        title = 'Equipment Purchases';
        items = purchases.filter(p => {
          const purchaseDate = new Date(p.order_date);
          return purchaseDate >= period.from && purchaseDate <= period.to && p.purchase_type === 'equipment' && p.payment_status === 'paid';
        }).map(p => ({ date: p.order_date, description: `Equipment: ${p.supplier_name}`, reference: p.purchase_number, amount: p.amount_paid || 0 }));
        break;
      default:
        items = [];
    }

    return { title, items, period };
  };

  const handleDrilldown = (category, periodIdx) => {
    const data = getDrilldownData(category, periodIdx);
    setDrilldown(data);
  };

  const renderLine = (label, values, indent = 0, className = '', drilldownKey = null) => (
    <div className={`grid gap-4 py-2 px-4 ${className}`}
         style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
      <span style={{ paddingLeft: `${indent * 20}px` }}>{label}</span>
      {values.map((value, idx) => (
        <span 
          key={idx} 
          className={`text-right ${drilldownKey ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
          onDoubleClick={() => drilldownKey && handleDrilldown(drilldownKey, idx)}
          title={drilldownKey ? 'Double-click to view details' : ''}
        >
          ${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ))}
    </div>
  );

  const handleExport = () => {
    const headers = ['Account', ...periods.map(p => p.label)];
    const csvContent = [
      ['Statement of Cash Flows'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ['Cash from Sales', ...periodData.map(d => d.cashFromSales.toFixed(2))],
      ['Cash to Suppliers', ...periodData.map(d => `-${d.cashPaidToSuppliers.toFixed(2)}`)],
      ['Operating Expenses', ...periodData.map(d => `-${d.operatingExpenses.toFixed(2)}`)],
      ['Net Cash from Operating', ...periodData.map(d => d.netCashFromOperating.toFixed(2))],
      ['Net Cash from Investing', ...periodData.map(d => d.netCashFromInvesting.toFixed(2))],
      ['Net Change in Cash', ...periodData.map(d => d.netChangeInCash.toFixed(2))],
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Statement of Cash Flows
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Comparative Period Analysis</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Column Headers */}
        <div className="grid gap-4 py-3 px-4 bg-gray-100 font-semibold border-b-2 border-gray-300 mb-4"
             style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
          <span className="text-sm uppercase">Account</span>
          {periods.map((period, idx) => (
            <span key={idx} className="text-right text-sm">
              {period.label}
            </span>
          ))}
        </div>

        <div className="space-y-6">
          {/* Operating Activities */}
          <div>
            <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Cash Flows from Operating Activities</h3>
            {renderLine('Cash from customers', periodData.map(d => d.cashFromSales), 1, 'text-green-600', 'cashFromSales')}
            {renderLine('Cash to suppliers (general)', periodData.map(d => -d.cashPaidToSuppliers), 1, 'text-red-600', 'cashPaidToSuppliers')}
            {renderLine('Vehicle/Parts inventory purchases', periodData.map(d => -d.vehicleInventoryPurchases), 1, 'text-red-600')}
            {renderLine('Operating expenses', periodData.map(d => -d.operatingExpenses), 1, 'text-red-600')}
            {renderLine('Net cash from operating', periodData.map(d => d.netCashFromOperating), 1, 'border-t font-semibold')}
          </div>

          {/* Investing Activities */}
          <div>
            <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Cash Flows from Investing Activities</h3>
            {renderLine('Equipment/Fixed asset purchases', periodData.map(d => -d.equipmentPurchases), 1, 'text-red-600', 'equipmentPurchases')}
            {renderLine('Net cash from investing', periodData.map(d => d.netCashFromInvesting), 1, 'border-t font-semibold')}
          </div>

          {/* Financing Activities */}
          <div>
            <h3 className="font-bold text-base mb-2 text-gray-900 px-4">Cash Flows from Financing Activities</h3>
            {renderLine('Net cash from financing', periodData.map(d => d.netCashFromFinancing), 1, 'border-t font-semibold')}
          </div>

          {/* Net Change */}
          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            {renderLine('Net change in cash', periodData.map(d => d.netChangeInCash), 0, 'font-bold text-lg')}
            {renderLine('Beginning cash balance', periodData.map(d => d.beginningCash), 0, 'text-sm border-t pt-2 mt-2')}
            {renderLine('Ending cash balance', periodData.map(d => d.endingCash), 0, 'font-bold text-lg border-t-2 border-gray-300 pt-2 text-blue-700')}
          </div>
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
                    ${drilldown.items.reduce((sum, i) => sum + i.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                          <td className="py-2 px-3">{format(new Date(item.date), 'MMM d, yyyy')}</td>
                          <td className="py-2 px-3">{item.description}</td>
                          <td className="py-2 px-3 text-gray-600">{item.reference || '-'}</td>
                          <td className="py-2 px-3 text-right font-medium">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
    </Card>
  );
}