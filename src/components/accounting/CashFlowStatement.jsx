import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Download } from "lucide-react";

export default function CashFlowStatement({ dateRange }) {
  const { selectedCompanyId } = useCompany();

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

  // Filter transactions for the period
  const periodTransactions = transactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    return transDate >= dateRange.from && transDate <= dateRange.to && t.status === 'completed';
  });

  // Operating Activities
  const cashFromSales = sales
    .filter(s => {
      const saleDate = new Date(s.sale_date);
      return saleDate >= dateRange.from && saleDate <= dateRange.to && s.payment_status === 'paid';
    })
    .reduce((sum, s) => sum + (s.total_paid || 0), 0);

  const cashPaidToSuppliers = purchases
    .filter(p => {
      const purchaseDate = new Date(p.order_date);
      return purchaseDate >= dateRange.from && purchaseDate <= dateRange.to && p.payment_status === 'paid';
    })
    .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

  const operatingExpenses = periodTransactions
    .filter(t => t.transaction_type === 'overhead_expense' || t.transaction_type === 'labor_expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netCashFromOperating = cashFromSales - cashPaidToSuppliers - operatingExpenses;

  // Investing Activities
  const vehiclePurchases = periodTransactions
    .filter(t => t.transaction_type === 'vehicle_purchase')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const equipmentPurchases = purchases
    .filter(p => {
      const purchaseDate = new Date(p.order_date);
      return purchaseDate >= dateRange.from && purchaseDate <= dateRange.to && 
             p.purchase_type === 'equipment' && p.payment_status === 'paid';
    })
    .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

  const netCashFromInvesting = -(vehiclePurchases + equipmentPurchases);

  // Financing Activities (placeholder - can be enhanced)
  const netCashFromFinancing = 0;

  // Net change in cash
  const netChangeInCash = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

  // Calculate beginning cash (simplified)
  const beginningCash = 0; // Would need to track this properly
  const endingCash = beginningCash + netChangeInCash;

  const handleExport = () => {
    const csv = [
      ['Statement of Cash Flows'],
      [`For the period ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`],
      [''],
      ['OPERATING ACTIVITIES'],
      ['Cash received from customers', cashFromSales.toFixed(2)],
      ['Cash paid to suppliers', `-${cashPaidToSuppliers.toFixed(2)}`],
      ['Cash paid for operating expenses', `-${operatingExpenses.toFixed(2)}`],
      ['Net cash from operating activities', netCashFromOperating.toFixed(2)],
      [''],
      ['INVESTING ACTIVITIES'],
      ['Purchase of vehicles', `-${vehiclePurchases.toFixed(2)}`],
      ['Purchase of equipment', `-${equipmentPurchases.toFixed(2)}`],
      ['Net cash from investing activities', netCashFromInvesting.toFixed(2)],
      [''],
      ['FINANCING ACTIVITIES'],
      ['Net cash from financing activities', netCashFromFinancing.toFixed(2)],
      [''],
      ['Net change in cash', netChangeInCash.toFixed(2)],
      ['Beginning cash balance', beginningCash.toFixed(2)],
      ['Ending cash balance', endingCash.toFixed(2)],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${dateRange.from.toISOString().split('T')[0]}-to-${dateRange.to.toISOString().split('T')[0]}.csv`;
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
            <p className="text-sm text-gray-500 mt-1">
              For the period {dateRange.from.toLocaleDateString()} to {dateRange.to.toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Operating Activities */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-blue-700">CASH FLOWS FROM OPERATING ACTIVITIES</h3>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between text-sm">
                <span>Cash received from customers</span>
                <span className="text-green-600">${cashFromSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cash paid to suppliers</span>
                <span className="text-red-600">-${cashPaidToSuppliers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cash paid for operating expenses</span>
                <span className="text-red-600">-${operatingExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                <span>Net cash from operating activities</span>
                <span className={netCashFromOperating >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${netCashFromOperating.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Investing Activities */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-purple-700">CASH FLOWS FROM INVESTING ACTIVITIES</h3>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between text-sm">
                <span>Purchase of vehicles</span>
                <span className="text-red-600">-${vehiclePurchases.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Purchase of equipment</span>
                <span className="text-red-600">-${equipmentPurchases.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                <span>Net cash from investing activities</span>
                <span className={netCashFromInvesting >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${netCashFromInvesting.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Financing Activities */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-orange-700">CASH FLOWS FROM FINANCING ACTIVITIES</h3>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>No financing activities recorded</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                <span>Net cash from financing activities</span>
                <span>${netCashFromFinancing.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Net Change in Cash */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Net change in cash</span>
                <span className={netChangeInCash >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${netChangeInCash.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span>Beginning cash balance</span>
                <span>${beginningCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t-2 border-gray-300 pt-2">
                <span>Ending cash balance</span>
                <span className="text-blue-700">${endingCash.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}